// Database tests for the backup log that /admin reads. Run with: npm run test:db
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

  await as(null)
}
