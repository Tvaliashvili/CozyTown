// The nightly backup. GitHub runs it at 05:00 Tbilisi time (.github/workflows/nightly-backup.yml).
// You can also run it yourself: `npm run backup`, or `npm run backup -- --to-folder backups`
// to keep the file on this computer instead of sending it to R2.
//
// What one backup holds, in a single zip, encrypted so only the holder of the private key can open it:
//   database/<table>.json   every row of every table, plus the login accounts (auth.users)
//   files/<bucket>/<name>   every photo, including sealed capsule photos
//   migrations/             the SQL that builds the tables, so the backup works on its own
//   manifest.json           what's inside, with a fingerprint (sha256) of each file to spot damage
//
// The GitHub repo is public, so its logs are too: print only counts and sizes, never names or words.

import fs from 'node:fs'
import path from 'node:path'
import { zipSync, strToU8 } from 'fflate'
import { Encrypter } from 'age-encryption'
import {
  KEEP_MONTHLY, KEEP_NIGHTLY, SIZE_ALARM_BYTES,
  connectToDatabase, connectToR2, connectToStorage, formatSize, readSettings, sha256,
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
const r2 = toFolder ? null : connectToR2(settings)
const zipEntries = {}
const manifest = { made_at: new Date().toISOString(), tables: {}, files: {}, missing_files: 0, sha256: {} }

function addToZip(name, bytes, alreadyCompressed = false) {
  // Photos are already compressed; squeezing them again only costs time.
  zipEntries[name] = [bytes, { level: alreadyCompressed ? 0 : 6 }]
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
await db.query('commit')

// ---------- 2. The photos ----------
// A few at a time: quick, without hammering Supabase.
const queue = [...storedFiles]
async function downloadNext() {
  while (queue.length > 0) {
    const file = queue.shift()
    const { data, error } = await storage.from(file.bucket_id).download(file.name)
    if (error) {
      manifest.missing_files += 1
      continue
    }
    addToZip(`files/${file.bucket_id}/${file.name}`, new Uint8Array(await data.arrayBuffer()), true)
    manifest.files[file.bucket_id] = (manifest.files[file.bucket_id] ?? 0) + 1
  }
}
await Promise.all([downloadNext(), downloadNext(), downloadNext(), downloadNext()])
if (manifest.missing_files > 0) {
  problems.push(`${manifest.missing_files} of ${storedFiles.length} photos couldn't be downloaded.`)
}

// ---------- 3. The migrations ----------
for (const file of fs.readdirSync('supabase/migrations').sort()) {
  addToZip(`migrations/${file}`, fs.readFileSync(path.join('supabase/migrations', file)))
}

// ---------- 4. Zip, encrypt, send ----------
zipEntries['manifest.json'] = strToU8(JSON.stringify(manifest, null, 2))
const zip = zipSync(zipEntries)
const encrypter = new Encrypter()
encrypter.addRecipient(PUBLIC_KEY)
const sealed = await encrypter.encrypt(zip)

const today = manifest.made_at.slice(0, 10) // 2026-11-05
const fileCount = Object.values(manifest.files).reduce((sum, count) => sum + count, 0)

if (toFolder) {
  fs.mkdirSync(toFolder, { recursive: true })
  const saved = path.join(toFolder, `cozytown-${today}.zip.age`)
  fs.writeFileSync(saved, sealed)
  console.log(`Saved ${saved}`)
} else {
  await r2.put(`nightly/${today}.zip.age`, sealed)

  // The first backup of each month is also kept for a year.
  const month = today.slice(0, 7)
  if ((await r2.list(`monthly/${month}`)).length === 0) {
    await r2.put(`monthly/${month}.zip.age`, sealed)
  }

  // Throw away the oldest, keeping the newest 30 nightly and 12 monthly.
  for (const [prefix, keep] of [['nightly/', KEEP_NIGHTLY], ['monthly/', KEEP_MONTHLY]]) {
    const backups = await r2.list(prefix)
    for (const old of backups.slice(0, Math.max(0, backups.length - keep))) {
      await r2.remove(old.key)
    }
  }

  const all = await r2.list('')
  const total = all.reduce((sum, backup) => sum + backup.size, 0)
  console.log(`R2 now holds ${all.length} backups, ${formatSize(total)} in all.`)
  if (total > SIZE_ALARM_BYTES) {
    problems.push(`Backups take ${formatSize(total)}, close to R2's free 10 GB. Time to keep fewer, or pay.`)
  }

  // The diary line the admin page reads ("Last backup: today, 05:02").
  await db.query(
    'insert into public.backup_runs (size_bytes, file_count, missing_files) values ($1, $2, $3)',
    [sealed.length, fileCount, manifest.missing_files],
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

