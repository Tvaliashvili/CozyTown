// Opens a backup made by backup.js. Needs BACKUP_PRIVATE_KEY in .env.local (see docs/BACKUPS.md).
//
//   npm run backup:check                              newest backup in R2: open it and check nothing is damaged
//   npm run backup:check -- backups/cozytown-2026-11-05.zip.age      the same, for a file on this computer
//   npm run backup:extract -- newest my-folder        unpack it into a folder (photos, letters as JSON)
//   npm run backup:restore -- newest                  put everything into an EMPTY Supabase project
//   npm run backup:restore -- newest --photos-only    finish a restore that stopped while uploading photos
//
// For a restore, first point .env.local at the new project (ref, database password, secret key)
// and run every file in supabase/migrations on it. The restore refuses a project that already has houses,
// so it can never write over the live site by mistake.

import fs from 'node:fs'
import path from 'node:path'
import { unzipSync, strFromU8 } from 'fflate'
import { Decrypter } from 'age-encryption'
import {
  PHOTO_COPIES, connectToDatabase, connectToFolder, connectToR2, connectToStorage, emptyPublicTables, formatSize,
  loadTable, need, readSettings, sha256,
} from './shared.js'

const [mode, source = 'newest', folder] = process.argv.slice(2)
const settings = readSettings()

// ---------- Open the backup ----------
// Photo copies sit next to the backup: in R2, or for a file on this computer, in the
// photos/ folder beside it (made by `npm run backup -- --to-folder`) if there is one.
let sealed
let store
if (source === 'newest') {
  store = connectToR2(settings)
  const backups = await store.list('nightly/')
  if (backups.length === 0) throw new Error('There are no backups in R2 yet.')
  const newest = backups.at(-1)
  console.log(`Downloading ${newest.key} (${formatSize(newest.size)})…`)
  sealed = await store.get(newest.key)
} else {
  sealed = new Uint8Array(fs.readFileSync(source))
  const besideIt = path.dirname(source)
  store = fs.existsSync(path.join(besideIt, PHOTO_COPIES)) ? connectToFolder(besideIt) : null
}

const decrypter = new Decrypter()
decrypter.addIdentity(need(settings, 'BACKUP_PRIVATE_KEY'))
const entries = unzipSync(await decrypter.decrypt(sealed))
const manifest = JSON.parse(strFromU8(entries['manifest.json']))

// Every photo in the backup, one at a time, as [bucket, name, bytes].
// The first backups (until 2026-11-03) hold their photos inside the zip; later ones point at photo copies.
async function* photos() {
  for (const [name, bytes] of Object.entries(entries)) {
    if (!name.startsWith('files/')) continue
    const [, bucket, ...rest] = name.split('/')
    yield [bucket, rest.join('/'), bytes]
  }
  for (const [file, copy] of Object.entries(manifest.photos ?? {})) {
    store ??= connectToR2(settings)
    const [bucket, ...rest] = file.split('/')
    // Decrypting also checks the copy: age refuses a file with even one changed byte.
    yield [bucket, rest.join('/'), await decrypter.decrypt(await store.get(copy))]
  }
}

// ---------- Check it ----------
// Every file must be there and match the fingerprint taken when the backup was made.
const damaged = Object.entries(manifest.sha256).filter(([name, hash]) => !entries[name] || sha256(entries[name]) !== hash)
const ageInDays = (Date.now() - Date.parse(manifest.made_at)) / 86_400_000

console.log(`Made ${manifest.made_at} (${ageInDays.toFixed(1)} days ago).`)
console.log('Rows per table:')
for (const [table, count] of Object.entries(manifest.tables)) console.log(`  ${table.padEnd(26)} ${count}`)
console.log(`Photos: ${JSON.stringify(manifest.files)}. Missing when backed up: ${manifest.missing_files}.`)
if (damaged.length > 0) {
  console.error(`DAMAGED: ${damaged.length} files don't match their fingerprint.`)
  process.exit(1)
}

// Photo copies are separate files, so each one is fetched and opened too.
const photoCopies = Object.keys(manifest.photos ?? {}).length
if (photoCopies > 0) {
  let opened = 0
  try {
    for await (const _photo of photos()) opened += 1
  } catch (error) {
    console.error(`DAMAGED: a photo copy is missing or won't open (${error.message}).`)
    process.exit(1)
  }
  console.log(`All ${opened} photos open.`)
}
console.log(`All ${Object.keys(manifest.sha256).length} files are complete and undamaged.`)

// ---------- Unpack it ----------
if (mode === 'extract') {
  if (!folder) throw new Error('Say which folder to unpack into, e.g. npm run backup:extract -- newest my-folder')
  function save(name, bytes) {
    const target = path.join(folder, name)
    fs.mkdirSync(path.dirname(target), { recursive: true })
    fs.writeFileSync(target, bytes)
  }
  // This holds private letters and the repo is public, so git must never pick it up, whatever the folder is called.
  save('.gitignore', '*\n')
  for (const [name, bytes] of Object.entries(entries)) {
    if (!name.startsWith('files/')) save(name, bytes)
  }
  for await (const [bucket, name, bytes] of photos()) save(`files/${bucket}/${name}`, bytes)
  console.log(`Unpacked into ${folder}. It holds private letters and photos: delete it when you're done.`)
}

// ---------- Put it back ----------
if (mode === 'restore') {
  // The database part can only run once, because afterwards the project has houses. If the upload
  // below stops halfway (a network blip), --photos-only finishes the job without touching the database.
  if (!process.argv.includes('--photos-only')) {
    const db = await connectToDatabase(settings)
    const { rows } = await db.query('select count(*)::int as count from public.houses')
    if (rows[0].count > 0) {
      throw new Error(`Project ${settings.SUPABASE_PROJECT_REF} already has houses. A restore only goes into an empty project.`)
    }

    // All tables in one go: if anything fails, nothing is half-restored.
    await db.query('begin')
    await db.query('set local session_replication_role = replica')
    await emptyPublicTables(db, Object.keys(manifest.tables))
    for (const table of Object.keys(manifest.tables)) {
      if (table === 'storage.objects') continue // these come back with the uploads below
      const count = await loadTable(db, table, strFromU8(entries[`database/${table}.json`]))
      console.log(`  ${table.padEnd(26)} ${count} rows back`)
    }
    await db.query('commit')
    await db.end()
  }

  // Photos go back under the same names, so the restored rows still point at them.
  // upsert: a photo already uploaded by a run that stopped halfway is simply written again.
  const storage = connectToStorage(settings)
  const types = Object.fromEntries(
    JSON.parse(strFromU8(entries['database/storage.objects.json']))
      .map((file) => [`${file.bucket_id}/${file.name}`, file.metadata?.mimetype]),
  )
  let uploaded = 0
  for await (const [bucket, name, bytes] of photos()) {
    const { error } = await storage.from(bucket).upload(name, bytes, { contentType: types[`${bucket}/${name}`], upsert: true })
    if (error) {
      throw new Error(`Couldn't upload a photo to ${bucket}: ${error.message}. The database is back. To finish, run: npm run backup:restore -- ${source} --photos-only`)
    }
    uploaded += 1
  }
  console.log(`Restored. ${uploaded} photos uploaded.`)
}
