// Pieces used by both backup.js (makes backups) and restore.js (checks and restores them).
// How it all fits together, and what to do in an emergency: docs/BACKUPS.md.

import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import pg from 'pg'
import { AwsClient } from 'aws4fetch'
import { createClient } from '@supabase/supabase-js'

// The private Cloudflare R2 bucket the backups live in.
export const BUCKET = 'cozytown-backups'

// How many to keep: one per night for a month, and the first of each month for a year.
export const KEEP_NIGHTLY = 30
export const KEEP_MONTHLY = 12

// R2's free plan holds 10 GB. Past this, the backup still runs but fails loudly, so GitHub emails us.
export const SIZE_ALARM_BYTES = 8 * 1024 ** 3

// Settings come from GitHub's secrets when running there, or from .env.local on your own computer.
export function readSettings() {
  const settings = {}
  if (fs.existsSync('.env.local')) {
    for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
      if (match) settings[match[1]] = match[2].replace(/^["']|["']$/g, '')
    }
  }
  for (const [name, value] of Object.entries(process.env)) {
    if (value) settings[name] = value
  }
  return settings
}

export function need(settings, name) {
  if (!settings[name]) throw new Error(`Missing setting ${name}. See docs/BACKUPS.md.`)
  return settings[name]
}

export async function connectToDatabase(settings) {
  const client = new pg.Client({
    // The session pooler: GitHub's machines can't reach Supabase's direct (IPv6-only) address.
    host: 'aws-1-eu-central-1.pooler.supabase.com',
    port: 5432,
    user: `postgres.${need(settings, 'SUPABASE_PROJECT_REF')}`,
    password: need(settings, 'SUPABASE_DB_PASSWORD'),
    database: 'postgres',
    // Supabase signs its certificate with its own authority, which Node doesn't know.
    ssl: { rejectUnauthorized: false },
  })
  await client.connect()
  return client
}

// Signs in with the secret key, which can read every photo, including sealed capsule photos.
// Only ever used in these scripts, never in the website.
export function connectToStorage(settings) {
  const url = `https://${need(settings, 'SUPABASE_PROJECT_REF')}.supabase.co`
  return createClient(url, need(settings, 'SUPABASE_SECRET_KEY'), { auth: { persistSession: false } }).storage
}

// R2 speaks the same language as Amazon S3. aws4fetch signs each request with our R2 key.
export function connectToR2(settings) {
  const aws = new AwsClient({
    accessKeyId: need(settings, 'R2_ACCESS_KEY_ID'),
    secretAccessKey: need(settings, 'R2_SECRET_ACCESS_KEY'),
    service: 's3',
    region: 'auto',
  })
  const base = `https://${need(settings, 'R2_ACCOUNT_ID')}.r2.cloudflarestorage.com/${BUCKET}`

  async function send(path, options) {
    const response = await aws.fetch(`${base}${path}`, options)
    if (!response.ok) {
      throw new Error(`R2 said ${response.status} to ${options?.method ?? 'GET'} ${path}: ${await response.text()}`)
    }
    return response
  }

  return {
    async put(key, bytes) {
      await send(`/${key}`, { method: 'PUT', body: bytes })
    },
    async get(key) {
      const response = await send(`/${key}`)
      return new Uint8Array(await response.arrayBuffer())
    },
    async remove(key) {
      await send(`/${key}`, { method: 'DELETE' })
    },
    // Every backup whose name starts with `prefix`, oldest first (names start with the date).
    async list(prefix) {
      const found = []
      let next = ''
      do {
        const query = `?list-type=2&prefix=${encodeURIComponent(prefix)}` +
          (next ? `&continuation-token=${encodeURIComponent(next)}` : '')
        const xml = await (await send(`/${query}`)).text()
        for (const item of xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)) {
          found.push({
            key: item[1].match(/<Key>(.*?)<\/Key>/)[1],
            size: Number(item[1].match(/<Size>(\d+)<\/Size>/)[1]),
          })
        }
        next = xml.match(/<NextContinuationToken>(.*?)<\/NextContinuationToken>/)?.[1] ?? ''
      } while (next)
      return found.sort((a, b) => a.key.localeCompare(b.key))
    },
  }
}

// The same put/get/remove/list as connectToR2, but in a folder on this computer
// (backup.js --to-folder). `list` only takes folder names, like 'photos/'.
export function connectToFolder(folder) {
  return {
    async put(key, bytes) {
      fs.mkdirSync(path.dirname(path.join(folder, key)), { recursive: true })
      fs.writeFileSync(path.join(folder, key), bytes)
    },
    async get(key) {
      return new Uint8Array(fs.readFileSync(path.join(folder, key)))
    },
    async remove(key) {
      fs.rmSync(path.join(folder, key), { force: true })
    },
    async list(prefix) {
      const inside = path.join(folder, prefix)
      if (!fs.existsSync(inside)) return []
      return fs.readdirSync(inside).sort().map((name) => ({
        key: prefix + name,
        size: fs.statSync(path.join(inside, name)).size,
      }))
    },
  }
}

// Each photo is copied to the backups only once (photos never change: every upload gets a new
// random name). Its copy is named after a fingerprint of the photo's name, not the name itself:
// names in the public bucket work as links, and the R2 key alone must never open a photo.
export const PHOTO_COPIES = 'photos/'

export function photoCopyName(bucket, name) {
  return `${PHOTO_COPIES}${sha256(`${bucket}/${name}`)}.age`
}

// Next to each backup in R2, a plain list of the photo copies it needs (fingerprints only, no names),
// e.g. lists/nightly/2026-11-05.zip.age.txt. A copy no list mentions any more can go.
export function listOf(backupKey) {
  return `lists/${backupKey}.txt`
}

export function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex')
}

export function formatSize(bytes) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

// Puts one table back from its backup (the JSON text made by backup.js), keeping every value as it was:
// ids, dates, keepers. Columns the database works out by itself ("generated") are left for it to redo.
// The caller must have run `set local session_replication_role = replica` first, which switches off
// triggers and foreign-key checks, so tables can go back in any order and the design lock doesn't object.
export async function loadTable(client, table, json) {
  const rows = JSON.parse(json)
  if (rows.length === 0) return 0

  const { rows: columns } = await client.query(
    `select attname as name, pg_get_serial_sequence($1, attname) as sequence
       from pg_attribute
      where attrelid = $1::regclass and attnum > 0 and not attisdropped and attgenerated = ''`,
    [table],
  )
  // Only columns both the backup and today's table have (a newer Supabase may have added some).
  const names = columns.map((column) => column.name).filter((name) => name in rows[0])
  const list = names.map((name) => `"${name}"`).join(', ')

  await client.query(
    `insert into ${table} (${list}) overriding system value
     select ${list} from json_populate_recordset(null::${table}, $1::json)`,
    [json],
  )

  // Number counters (like backup_runs.id) carry on after the highest restored number.
  for (const column of columns) {
    if (column.sequence && names.includes(column.name)) {
      await client.query(
        `select setval($1, coalesce((select max("${column.name}") from ${table}), 0) + 1, false)`,
        [column.sequence],
      )
    }
  }
  return rows.length
}
