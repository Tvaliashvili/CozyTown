// Opens a backup made by backup.js. Needs BACKUP_PRIVATE_KEY in .env.local (see docs/BACKUPS.md).
//
//   npm run backup:check                              newest backup in R2: open it and check nothing is damaged
//   npm run backup:check -- backups/cozytown-2026-11-05.zip.age      the same, for a file on this computer
//   npm run backup:extract -- newest my-folder        unpack it into a folder (photos, letters as JSON)
//   npm run backup:restore -- newest                  put everything into an EMPTY Supabase project
//
// For a restore, first point .env.local at the new project (ref, database password, secret key)
// and run every file in supabase/migrations on it. The restore refuses a project that already has houses,
// so it can never write over the live site by mistake.

import fs from 'node:fs'
import path from 'node:path'
import { unzipSync, strFromU8 } from 'fflate'
import { Decrypter } from 'age-encryption'
import {
  connectToDatabase, connectToR2, connectToStorage, formatSize, loadTable, need, readSettings, sha256,
} from './shared.js'

const [mode, source = 'newest', folder] = process.argv.slice(2)
const settings = readSettings()

// ---------- Open the backup ----------
let sealed
if (source === 'newest') {
  const r2 = connectToR2(settings)
  const backups = await r2.list('nightly/')
  if (backups.length === 0) throw new Error('There are no backups in R2 yet.')
  const newest = backups.at(-1)
  console.log(`Downloading ${newest.key} (${formatSize(newest.size)})…`)
  sealed = await r2.get(newest.key)
} else {
  sealed = new Uint8Array(fs.readFileSync(source))
}

const decrypter = new Decrypter()
decrypter.addIdentity(need(settings, 'BACKUP_PRIVATE_KEY'))
const entries = unzipSync(await decrypter.decrypt(sealed))
const manifest = JSON.parse(strFromU8(entries['manifest.json']))

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
console.log(`All ${Object.keys(manifest.sha256).length} files are complete and undamaged.`)

// ---------- Unpack it ----------
if (mode === 'extract') {
  if (!folder) throw new Error('Say which folder to unpack into, e.g. npm run backup:extract -- newest my-folder')
  for (const [name, bytes] of Object.entries(entries)) {
    const target = path.join(folder, name)
    fs.mkdirSync(path.dirname(target), { recursive: true })
    fs.writeFileSync(target, bytes)
  }
  console.log(`Unpacked into ${folder}. It holds private letters and photos: delete it when you're done.`)
}

// ---------- Put it back ----------
if (mode === 'restore') {
  const db = await connectToDatabase(settings)
  const { rows } = await db.query('select count(*)::int as count from public.houses')
  if (rows[0].count > 0) {
    throw new Error(`Project ${settings.SUPABASE_PROJECT_REF} already has houses. A restore only goes into an empty project.`)
  }

  // All tables in one go: if anything fails, nothing is half-restored.
  await db.query('begin')
  await db.query('set local session_replication_role = replica')
  for (const table of Object.keys(manifest.tables)) {
    if (table === 'storage.objects') continue // these come back with the uploads below
    const count = await loadTable(db, table, strFromU8(entries[`database/${table}.json`]))
    console.log(`  ${table.padEnd(26)} ${count} rows back`)
  }
  await db.query('commit')
  await db.end()

  // Photos go back under the same names, so the restored rows still point at them.
  const storage = connectToStorage(settings)
  const types = Object.fromEntries(
    JSON.parse(strFromU8(entries['database/storage.objects.json']))
      .map((file) => [`${file.bucket_id}/${file.name}`, file.metadata?.mimetype]),
  )
  let uploaded = 0
  for (const [name, bytes] of Object.entries(entries)) {
    if (!name.startsWith('files/')) continue
    const [, bucket, ...rest] = name.split('/')
    const { error } = await storage.from(bucket).upload(rest.join('/'), bytes, {
      contentType: types[`${bucket}/${rest.join('/')}`],
    })
    if (error) throw new Error(`Couldn't upload a photo to ${bucket}: ${error.message}`)
    uploaded += 1
  }
  console.log(`Restored. ${uploaded} photos uploaded.`)
}
