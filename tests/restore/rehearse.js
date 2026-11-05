// A full restore rehearsal, on a throwaway Postgres on this computer. Nothing on the live site changes:
// it only reads the structure of Supabase's own tables, and downloads the newest backup from R2.
//
//   1. Rebuilds the database from zero by running every migration in order.
//   2. Compares the result with the live database: columns, rules, functions, permissions, buckets.
//      A difference means the migrations no longer describe what is really live.
//   3. Restores the newest backup into it, the way restore.js does.
//   4. Checks every row came back, and that a visitor and the keeper still get what they should.
//
// It can't check what only Supabase's real services do: signing in with a restored password, and
// uploading photos back. The Postgres download is big, so it stays out of package.json:
//
//   npm install --no-save embedded-postgres@17.11.0-beta.19      (once; the same version as live: 17.11)
//   npm run test:restore
//
// It prints only structure and counts, never people's words. The local copy is deleted at the end.

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createHash } from 'node:crypto'
import pg from 'pg'
import { unzipSync, strFromU8 } from 'fflate'
import { Decrypter } from 'age-encryption'
import { connectToDatabase, connectToR2, emptyPublicTables, loadTable, need, readSettings } from '../../scripts/backup/shared.js'

const { default: EmbeddedPostgres } = await import('embedded-postgres').catch(() => {
  console.error('First run: npm install --no-save embedded-postgres@17.11.0-beta.19')
  process.exit(1)
})

const PORT = 54329
const settings = readSettings()
const live = await connectToDatabase(settings)
const liveRows = async (sql, values) => (await live.query(sql, values)).rows

const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'cozytown-restore-'))
const server = new EmbeddedPostgres({
  databaseDir: path.join(folder, 'data'),
  user: 'postgres',
  password: 'local',
  port: PORT,
  persistent: false,
  // UTF8: Georgian text. On Windows it would otherwise pick a code page that can't hold it.
  initdbFlags: ['--encoding=UTF8', '--locale=C'],
  onLog: () => {},
  onError: () => {},
})
await server.initialise()
await server.start()
const local = new pg.Client({ host: 'localhost', port: PORT, user: 'postgres', password: 'local', database: 'postgres' })
await local.connect()
// Dates are compared as text, so both sides must print them in the same time zone (Supabase uses UTC).
await local.query(`set timezone = 'UTC'`)
const rows = async (sql, values) => (await local.query(sql, values)).rows

let failures = 0
function check(ok, words) {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${words}`)
  if (!ok) failures += 1
}

// What Supabase already has in a new project, before any migration runs.
async function pretendToBeNewSupabaseProject() {
  await local.query(`
    create schema auth; create schema storage; create schema extensions;
    create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
    grant usage on schema public, auth, storage, extensions to anon, authenticated, service_role;
    create extension if not exists pgcrypto with schema extensions;
    alter default privileges in schema public grant all on tables to postgres, anon, authenticated, service_role;
    alter default privileges in schema public grant all on functions to postgres, anon, authenticated, service_role;
    alter default privileges in schema public grant all on sequences to postgres, anon, authenticated, service_role;
  `)

  // Supabase's own tables get their shape copied from the live project.
  const tables = ['auth.users', 'auth.identities', 'storage.buckets', 'storage.objects']
  const enums = await liveRows(`
    select distinct n.nspname as schema, t.typname as name,
      (select array_agg(e.enumlabel::text order by e.enumsortorder) from pg_enum e where e.enumtypid = t.oid) as labels
    from pg_attribute a join pg_type t on t.oid = a.atttypid join pg_namespace n on n.oid = t.typnamespace
    where t.typtype = 'e' and a.attnum > 0 and a.attrelid = any($1::regclass[])`, [tables])
  for (const type of enums) {
    await local.query(`create type ${type.schema}.${type.name} as enum (${type.labels.map((label) => `'${label}'`).join(',')})`)
  }
  for (const table of tables) {
    const columns = await liveRows(`
      select a.attname as name, format_type(a.atttypid, a.atttypmod) as type, a.attnotnull as required,
        a.attgenerated as generated, pg_get_expr(d.adbin, d.adrelid) as value
      from pg_attribute a left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
      where a.attrelid = $1::regclass and a.attnum > 0 and not a.attisdropped order by a.attnum`, [table])
    const lines = columns.map((column) => {
      let line = `"${column.name}" ${column.type}`
      if (column.generated) line += ` generated always as (${column.value}) stored`
      else if (column.value) line += ` default ${column.value}`
      return column.required ? `${line} not null` : line
    })
    await local.query(`create table ${table} (${lines.join(', ')})`)
    const keys = await liveRows(`select pg_get_constraintdef(oid) as def from pg_constraint where conrelid = $1::regclass and contype in ('p', 'u')`, [table])
    for (const key of keys) await local.query(`alter table ${table} add ${key.def}`)
    await local.query(`grant select, insert, update, delete on ${table} to service_role`)
  }
  await local.query(`
    alter table storage.objects enable row level security;
    alter table storage.buckets enable row level security;
    grant select on auth.users to authenticated;
    grant select, insert, update, delete on storage.objects to anon, authenticated;
    grant select on storage.buckets to anon, authenticated;
  `)
  const helpers = await liveRows(`
    select pg_get_functiondef(p.oid) as def from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where (n.nspname = 'auth' and p.proname in ('uid', 'role', 'jwt', 'email'))
       or (n.nspname = 'storage' and p.proname in ('foldername', 'filename', 'extension'))`)
  for (const helper of helpers) await local.query(helper.def)
  await local.query(`
    grant execute on all functions in schema auth to anon, authenticated, service_role;
    grant execute on all functions in schema storage to anon, authenticated, service_role;
  `)
}

async function runEveryMigration() {
  const files = fs.readdirSync('supabase/migrations').sort()
  for (const file of files) {
    try {
      await local.query(`begin; ${fs.readFileSync(path.join('supabase/migrations', file), 'utf8')}; commit`)
    } catch (error) {
      check(false, `migration ${file}: ${error.message}`)
      throw new Error('Stopping: the rest depends on this migration.')
    }
  }
  check(true, `all ${files.length} migrations run from zero`)
}

// Each query gives { k: the thing's name, v: its definition }, on both databases.
const COMPARE = {
  columns: `select table_name || '.' || column_name as k, data_type || '|' || is_nullable || '|' || coalesce(column_default, '') || '|' || coalesce(generation_expression, '') as v from information_schema.columns where table_schema = 'public'`,
  constraints: `select c.conrelid::regclass::text || '.' || c.conname as k, pg_get_constraintdef(c.oid) as v from pg_constraint c where c.connamespace = 'public'::regnamespace`,
  indexes: `select indexname as k, indexdef as v from pg_indexes where schemaname = 'public'`,
  rules: `select schemaname || '.' || tablename || '.' || policyname as k, permissive || '|' || array_to_string(roles, ',') || '|' || cmd || '|' || coalesce(qual, '') || '|' || coalesce(with_check, '') as v from pg_policies where schemaname in ('public', 'storage')`,
  functions: `select p.oid::regprocedure::text as k, pg_get_functiondef(p.oid) as v from pg_proc p where p.pronamespace = 'public'::regnamespace`,
  triggers: `select t.tgrelid::regclass::text || '.' || t.tgname as k, pg_get_triggerdef(t.oid) as v from pg_trigger t join pg_proc p on p.oid = t.tgfoid where not t.tgisinternal and p.pronamespace = 'public'::regnamespace`,
  'row security': `select relname as k, relrowsecurity::text as v from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r'`,
  'table permissions': `select table_name || '.' || grantee || '.' || privilege_type as k, 'yes' as v from information_schema.role_table_grants where table_schema = 'public' and grantee in ('anon', 'authenticated', 'service_role', 'PUBLIC')`,
  'function permissions': `select p.oid::regprocedure::text || '.' || r.rolname as k, has_function_privilege(r.oid, p.oid, 'execute')::text as v from pg_proc p cross join pg_roles r where p.pronamespace = 'public'::regnamespace and r.rolname in ('anon', 'authenticated', 'service_role')`,
  buckets: `select id as k, public::text || '|' || coalesce(file_size_limit::text, '') || '|' || coalesce(array_to_string(allowed_mime_types, ','), '') as v from storage.buckets`,
}

async function compareWithLive() {
  // Migration files on Windows have different line endings from what was applied. That isn't a difference.
  const asMap = (found) => new Map(found.map((row) => [row.k, String(row.v).replaceAll('\r', '')]))
  for (const [what, sql] of Object.entries(COMPARE)) {
    const onLive = asMap(await liveRows(sql))
    const rebuilt = asMap(await rows(sql))
    const different = []
    for (const [name, value] of onLive) {
      if (!rebuilt.has(name)) different.push(`only on live: ${name}`)
      else if (rebuilt.get(name) !== value) different.push(`differs: ${name}`)
    }
    for (const name of rebuilt.keys()) if (!onLive.has(name)) different.push(`only in the migrations: ${name}`)
    check(different.length === 0, `${what}: ${onLive.size} on live, all the same when rebuilt${different.length ? `\n        ${different.slice(0, 20).join('\n        ')}` : ''}`)
  }
}

async function restoreNewestBackup() {
  const store = connectToR2(settings)
  const decrypter = new Decrypter()
  decrypter.addIdentity(need(settings, 'BACKUP_PRIVATE_KEY'))
  const newest = (await store.list('nightly/')).at(-1)
  const entries = unzipSync(await decrypter.decrypt(await store.get(newest.key)))
  const manifest = JSON.parse(strFromU8(entries['manifest.json']))
  const tables = Object.keys(manifest.tables).filter((table) => table !== 'storage.objects')

  await local.query('begin')
  await local.query('set local session_replication_role = replica')
  await emptyPublicTables(local, tables)
  for (const table of tables) await loadTable(local, table, strFromU8(entries[`database/${table}.json`]))
  await local.query('commit')
  check(true, `restored ${newest.key}`)

  // Same values, whatever order the rows or their fields are in. A fingerprint, so no words get printed.
  const tidy = (value) => {
    if (Array.isArray(value)) return value.map(tidy)
    if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, tidy(value[key])]))
    return value
  }
  const fingerprint = (list) => createHash('sha256').update(list.map((row) => JSON.stringify(tidy(row))).sort().join('\n')).digest('hex')
  for (const table of tables) {
    const inBackup = JSON.parse(strFromU8(entries[`database/${table}.json`]))
    const [schema, name] = table.split('.')
    const [{ json }] = await rows(`select coalesce(json_agg(t), '[]')::text as json from "${schema}"."${name}" t`)
    check(fingerprint(inBackup) === fingerprint(JSON.parse(json)), `${table}: ${inBackup.length} rows identical to the backup`)
  }
  return manifest
}

async function checkRestoredSite(manifest) {
  // Foreign keys were off during the load: adding each one again makes Postgres check every row.
  const links = await rows(`select conrelid::regclass::text as tbl, conname as name, pg_get_constraintdef(oid) as def from pg_constraint where contype = 'f' and connamespace = 'public'::regnamespace`)
  let broken = 0
  for (const link of links) {
    await local.query('begin')
    try {
      await local.query(`alter table ${link.tbl} drop constraint "${link.name}"`)
      await local.query(`alter table ${link.tbl} add constraint "${link.name}" ${link.def}`)
    } catch (error) {
      broken += 1
      console.log(`        broken link ${link.tbl}.${link.name}: ${error.message}`)
    }
    await local.query('rollback')
  }
  check(broken === 0, `all ${links.length} links between tables are whole`)

  const [house] = await rows('select code, keeper_id from public.houses limit 1')
  if (!house) {
    console.log('  (the backup has no houses, so the visitor and keeper checks are skipped)')
    return
  }
  await local.query('begin')
  await local.query('set local role anon')
  check((await rows('select public.get_house($1) as house', [house.code]))[0].house, 'a visitor opens the restored house by its code')
  const photos = await rows('select * from public.get_house_photos($1)', [house.code])
  check(photos.length === manifest.tables['public.photos'], `a visitor sees the restored photos (${photos.length})`)
  const letters = await rows('select * from public.letters').catch(() => [])
  check(letters.length === 0, 'a visitor still cannot read letters')
  await local.query('rollback')

  if (house.keeper_id) {
    await local.query('begin')
    await local.query('set local role authenticated')
    await rows(`select set_config('request.jwt.claims', $1, true), set_config('request.jwt.claim.sub', $2, true)`, [JSON.stringify({ sub: house.keeper_id, role: 'authenticated' }), house.keeper_id])
    check((await rows('select * from public.my_houses()')).length >= 1, 'the keeper still owns the restored house')
    await local.query('rollback')
  }

  await local.query('begin')
  await local.query('insert into public.backup_runs (size_bytes, file_count, missing_files) values (1, 1, 0)')
  check(true, 'number counters carry on after the restored rows')
  await local.query('rollback')

  const inBackup = new Set(Object.keys(manifest.photos ?? {}))
  const wanted = await rows(`
    select 'photos/' || path as file from public.photos
    union select 'photos/' || small_path from public.photos where small_path is not null
    union select 'capsule/' || photo_path from public.capsule_items where photo_path is not null`)
  check(wanted.every(({ file }) => inBackup.has(file)), `all ${wanted.length} photo files the restored rows point at are in the backup`)
}

try {
  await pretendToBeNewSupabaseProject()
  await runEveryMigration()
  await compareWithLive()
  await checkRestoredSite(await restoreNewestBackup())
} catch (error) {
  check(false, error.message)
} finally {
  await local.end().catch(() => {})
  await server.stop().catch(() => {})
  await live.end()
  fs.rmSync(folder, { recursive: true, force: true })
}

console.log(failures === 0 ? '\nAll passed. The local copy is deleted.' : `\n${failures} failed. The local copy is deleted.`)
process.exit(failures === 0 ? 0 : 1)
