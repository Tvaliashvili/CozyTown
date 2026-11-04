// Database tests for the backup log that /admin reads, and for putting seeded tables back in a restore.
// Run with: npm run test:db -- backups
import { emptyPublicTables, loadTable } from '../../scripts/backup/shared.js'
import { KEEPER, SECOND } from './tools.js'

export default async function run(db, { as, attempt, check, addUsers }) {
  await as(null)
  await addUsers(KEEPER, SECOND)
  await db.query('insert into public.admins (user_id) values ($1)', [SECOND])

  let r = await attempt('insert into public.backup_runs (size_bytes, file_count) values (100, 3)')
  check('the backup script (database owner) writes a row', !r.error, r.error)
  r = await attempt('insert into public.backup_runs (size_bytes, file_count) values (-1, 1)')
  check('a negative size is refused', Boolean(r.error), r.error)

  await as('anon')
  r = await attempt('select * from public.backup_runs')
  check('visitor cannot read the backup log', Boolean(r.error), r.error)

  await as(KEEPER)
  r = await attempt('select * from public.backup_runs')
  check('a keeper sees no backup rows', r.result?.rows.length === 0, r.error)
  r = await attempt('insert into public.backup_runs (size_bytes, file_count) values (1, 1)')
  check('a keeper cannot write the backup log', Boolean(r.error), r.error)

  await as(SECOND)
  r = await attempt('select * from public.backup_runs')
  check('an admin reads the backup log', r.result?.rows.length > 0, r.error)
  r = await attempt('insert into public.backup_runs (size_bytes, file_count) values (1, 1)')
  check('an admin cannot write the backup log either', Boolean(r.error), r.error)

  // ---------- A restore goes in after the migrations ----------
  // The migrations add the first street and the neighbourhoods themselves, and the backup holds them too.
  await as(null)
  const tables = ['public.neighbourhoods', 'public.streets']
  const saved = async (table) =>
    (await db.query(`select coalesce(json_agg(t order by t.id), '[]')::text as json from ${table} t`)).rows[0].json
  const before = { [tables[0]]: await saved(tables[0]), [tables[1]]: await saved(tables[1]) }

  await db.query('set local session_replication_role = replica')
  await db.query('savepoint restore_clash')
  let clashed = false
  try {
    await loadTable(db, tables[0], before[tables[0]])
  } catch {
    clashed = true
  }
  await db.query('rollback to savepoint restore_clash')
  check('without emptying first, the seeded rows clash with the backup (the reason for the step)', clashed)

  await emptyPublicTables(db, ['auth.users', ...tables])
  for (const table of tables) await loadTable(db, table, before[table])
  check('a restore brings back the neighbourhoods exactly', (await saved(tables[0])) === before[tables[0]])
  check('a restore brings back the streets exactly', (await saved(tables[1])) === before[tables[1]])
  const users = await db.query('select count(*)::int as count from auth.users')
  check('emptying leaves the login accounts alone', users.rows[0].count > 0)
  await db.query('set local session_replication_role = origin')
}
