// The nightly backup. GitHub runs it at 05:00 Tbilisi time (.github/workflows/nightly-backup.yml).
// You can also run it yourself: `npm run backup`, or `npm run backup -- --to-folder backups`
// to keep everything on this computer instead of sending it to R2.
//
// What one night's backup holds, in a single zip, encrypted so only the holder of the private key can open it:
//   database/<table>.json   every row of every table, plus the login accounts (auth.users)
//   migrations/             the SQL that builds the tables, so the backup works on its own
//   manifest.json           what's inside, with a fingerprint (sha256) of each file to spot damage,
//                           and which photo copy belongs to which photo
// The photos themselves (including sealed capsule photos) are copied once each, encrypted one by one,
// into photos/ next to the backups. A photo copy stays as long as any kept backup still needs it.
//
// Afterwards it tidies up (Q7 in docs/QA.md): photo files in Supabase that no photo or capsule item
// points to any more (a deleted house, a failed upload) are deleted, a week after they were uploaded.
//
// The GitHub repo is public, so its logs are too: print only counts and sizes, never names or words.

import fs from 'node:fs'
import path from 'node:path'
import { zipSync, strToU8 } from 'fflate'
import { Encrypter } from 'age-encryption'
import {
  KEEP_MONTHLY, KEEP_NIGHTLY, LEFTOVER_FILES_SQL, PHOTO_COPIES, SIZE_ALARM_BYTES,
  connectToDatabase, connectToFolder, connectToR2, connectToStorage, formatSize, listOf, photoCopyName,
  readSettings, sha256,
} from './shared.js'

const PUBLIC_KEY = fs.readFileSync(new URL('./public-key.txt', import.meta.url), 'utf8').trim()

// Tables outside `public` worth keeping. auth.users holds the keepers' emails and password hashes,
// so everyone can sign in as before after a restore. storage.objects is kept for reference only:
// those rows come back by themselves when the files are uploaded again.
const EXTRA_TABLES = ['auth.users', 'auth.identities', 'storage.objects']

const settings = readSettings()
const toFolder = process.argv.includes('--to-folder') ? process.argv[process.argv.indexOf('--to-folder') + 1] : null
const problems = []

const db = await connectToDatabase(settings)
const storage = connectToStorage(settings)
const store = toFolder ? connectToFolder(toFolder) : connectToR2(settings)
const encrypter = new Encrypter()
encrypter.addRecipient(PUBLIC_KEY)
const zipEntries = {}
const manifest = { made_at: new Date().toISOString(), tables: {}, files: {}, missing_files: 0, sha256: {}, photos: {} }

function addToZip(name, bytes) {
  zipEntries[name] = bytes
  manifest.sha256[name] = sha256(bytes)
}

// ---------- 1. The database ----------
// One read-only transaction, so every table is copied as it was at the same moment.
await db.query('begin isolation level repeatable read read only')

const { rows: publicTables } = await db.query(
  `select schemaname || '.' || tablename as name from pg_tables where schemaname = 'public' order by 1`,
)
const tables = [...publicTables.map((table) => table.name), ...EXTRA_TABLES]

for (const table of tables) {
  const [schema, name] = table.split('.')
  // json_agg turns the whole table into JSON inside the database, so no value is changed on the way.
  const { rows } = await db.query(
    `select coalesce(json_agg(t), '[]')::text as json, count(*)::int as count from "${schema}"."${name}" t`,
  )
  addToZip(`database/${table}.json`, strToU8(rows[0].json))
  manifest.tables[table] = rows[0].count
}

const { rows: storedFiles } = await db.query('select bucket_id, name from storage.objects order by 1, 2')
const { rows: leftoverFiles } = await db.query(LEFTOVER_FILES_SQL)
await db.query('commit')

// ---------- 2. The photos ----------
// Only photos with no copy yet are downloaded, a few at a time: quick, without hammering Supabase.
const copied = new Set((await store.list(PHOTO_COPIES)).map((copy) => copy.key))
const queue = []
for (const file of storedFiles) {
  const copy = photoCopyName(file.bucket_id, file.name)
  if (copied.has(copy)) {
    manifest.photos[`${file.bucket_id}/${file.name}`] = copy
    manifest.files[file.bucket_id] = (manifest.files[file.bucket_id] ?? 0) + 1
  } else {
    queue.push({ ...file, copy })
  }
}
const newPhotos = queue.length

async function copyNext() {
  while (queue.length > 0) {
    const file = queue.shift()
    const { data, error } = await storage.from(file.bucket_id).download(file.name)
    if (error) {
      manifest.missing_files += 1
      continue
    }
    await store.put(file.copy, await encrypter.encrypt(new Uint8Array(await data.arrayBuffer())))
    copied.add(file.copy)
    manifest.photos[`${file.bucket_id}/${file.name}`] = file.copy
    manifest.files[file.bucket_id] = (manifest.files[file.bucket_id] ?? 0) + 1
  }
}
await Promise.all([copyNext(), copyNext(), copyNext(), copyNext()])
if (manifest.missing_files > 0) {
  problems.push(`${manifest.missing_files} of ${storedFiles.length} photos couldn't be downloaded.`)
}

// ---------- 3. The migrations ----------
for (const file of fs.readdirSync('supabase/migrations').sort()) {
  addToZip(`migrations/${file}`, fs.readFileSync(path.join('supabase/migrations', file)))
}

// ---------- 4. Zip, encrypt, send ----------
zipEntries['manifest.json'] = strToU8(JSON.stringify(manifest, null, 2))
const sealed = await encrypter.encrypt(zipSync(zipEntries, { level: 6 }))

const today = manifest.made_at.slice(0, 10) // 2026-11-05
const fileCount = Object.values(manifest.files).reduce((sum, count) => sum + count, 0)
// The photo copies this backup needs, for its list (see listOf in shared.js).
const photoList = strToU8([...new Set(Object.values(manifest.photos))].sort().join('\n'))

if (toFolder) {
  const saved = `cozytown-${today}.zip.age`
  await store.put(saved, sealed)
  console.log(`Saved ${path.join(toFolder, saved)}, photo copies in ${path.join(toFolder, PHOTO_COPIES)}`)
} else {
  // Each backup's list goes up first, so a photo copy is never without a list that keeps it.
  const nightly = `nightly/${today}.zip.age`
  await store.put(listOf(nightly), photoList)
  await store.put(nightly, sealed)

  // The first backup of each month is also kept for a year.
  const month = today.slice(0, 7)
  if ((await store.list(`monthly/${month}`)).length === 0) {
    await store.put(listOf(`monthly/${month}.zip.age`), photoList)
    await store.put(`monthly/${month}.zip.age`, sealed)
  }

  // Throw away the oldest, keeping the newest 30 nightly and 12 monthly.
  for (const [prefix, keep] of [['nightly/', KEEP_NIGHTLY], ['monthly/', KEEP_MONTHLY]]) {
    const backups = await store.list(prefix)
    for (const old of backups.slice(0, Math.max(0, backups.length - keep))) {
      await store.remove(old.key)
      await store.remove(listOf(old.key))
    }
  }

  // Throw away photo copies that no kept backup needs any more: photos deleted from the site
  // longer ago than the oldest backup. (Backups from before photos were copied once each have
  // no list; they hold their own photos inside.)
  const needed = new Set()
  for (const list of await store.list('lists/')) {
    for (const copy of new TextDecoder().decode(await store.get(list.key)).split('\n')) needed.add(copy)
  }
  let copiesRemoved = 0
  for (const copy of copied) {
    if (!needed.has(copy)) {
      await store.remove(copy)
      copied.delete(copy)
      copiesRemoved += 1
    }
  }

  const all = await store.list('')
  const total = all.reduce((sum, item) => sum + item.size, 0)
  console.log(`Photo copies: ${newPhotos} new, ${copiesRemoved} no longer needed and removed, ${copied.size} kept.`)
  console.log(`R2 now holds ${all.length} files, ${formatSize(total)} in all.`)
  if (total > SIZE_ALARM_BYTES) {
    problems.push(`Backups take ${formatSize(total)}, close to R2's free 10 GB. Time to keep fewer, or pay.`)
  }

  // ---------- 5. Tidy up left-over photo files on the site (Q7) ----------
  // Only files that are safely copied into the backups. If suddenly most files look left over,
  // something is wrong with the check itself: stop and shout instead of deleting.
  const toDelete = leftoverFiles.filter((file) => copied.has(photoCopyName(file.bucket_id, file.name)))
  if (toDelete.length > 20 && toDelete.length > storedFiles.length / 2) {
    problems.push(`${toDelete.length} of ${storedFiles.length} photo files look left over. Not deleting any: please check.`)
  } else {
    for (const bucket of new Set(toDelete.map((file) => file.bucket_id))) {
      const names = toDelete.filter((file) => file.bucket_id === bucket).map((file) => file.name)
      for (let start = 0; start < names.length; start += 100) {
        const { error } = await storage.from(bucket).remove(names.slice(start, start + 100))
        if (error) problems.push(`Couldn't delete left-over files in ${bucket}: ${error.message}`)
      }
    }
    console.log(`Left-over photo files on the site: ${toDelete.length} deleted.`)
  }

  // The diary line the admin page reads ("Last backup: today, 05:02").
  // size_bytes is the total R2 holds (since photos are copied once, one night's zip says little).
  await db.query(
    'insert into public.backup_runs (size_bytes, file_count, missing_files) values ($1, $2, $3)',
    [total, fileCount, manifest.missing_files],
  )
  await db.query(`delete from public.backup_runs where finished_at < now() - interval '90 days'`)
}
await db.end()

const rowCount = Object.values(manifest.tables).reduce((sum, count) => sum + count, 0)
console.log(`Backup ${today}: ${tables.length} tables, ${rowCount} rows, ${fileCount} photos, ${formatSize(sealed.length)} encrypted.`)

// A failed run makes GitHub send an email, which is how we hear about problems.
if (problems.length > 0) {
  for (const problem of problems) console.error(`PROBLEM: ${problem}`)
  process.exitCode = 1
}
