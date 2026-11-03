// Database tests for the design lock. Run with: npm run test:db
const KEEPER = '11111111-1111-1111-1111-111111111111'
const STRANGER = '22222222-2222-2222-2222-222222222222'

export default async function run(db, { as, attempt, check }) {
  await as(null)
  for (const id of [KEEPER, STRANGER]) {
    await db.query(`insert into auth.users (id, instance_id, aud, role, email) values ($1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', $2)`, [id, `${id.slice(0, 4)}@test.invalid`])
  }
  const free = await db.query(`select p from generate_series(0, 7) p where p not in (select plot from public.houses) order by p desc limit 1`)
  const { rows: [house] } = await db.query(
    `insert into public.houses (street_id, plot, keeper_id) values ((select id from public.streets where slug = 'first-street'), $1, $2) returning code`,
    [free.rows[0].p, KEEPER],
  )
  const code = house.code

  await as('anon')
  let r = await attempt('select * from public.get_house($1)', [code])
  check('visitor can open house by code', r.result?.rows.length === 1 && r.result.rows[0].is_keeper === false && r.result.rows[0].claimed === true, r.error)
  r = await attempt('select * from public.get_house($1)', ['NOPE'])
  check('wrong code returns nothing', r.result?.rows.length === 0, r.error)
  r = await attempt(`select public.submit_design($1, '{}')`, [code])
  check('visitor cannot submit', Boolean(r.error), r.error)

  await as(KEEPER)
  r = await attempt('select * from public.get_house($1)', [code])
  check('keeper is recognised', r.result?.rows[0].is_keeper === true && r.result.rows[0].design_final === false, r.error)
  r = await attempt(`update public.houses set design = '{"wallColor":"#cfe3d2"}' where code = $1`, [code])
  check('keeper can change design before submitting', r.result?.rowCount === 1, r.error)
  r = await attempt(`update public.houses set design_submitted_at = null where code = $1`, [code])
  check('keeper cannot touch the lock column', Boolean(r.error), r.error)
  r = await attempt(`select public.submit_design($1, '{"wallColor":"#a8d8d2"}')`, [code])
  check('keeper can submit', !r.error, r.error)
  r = await attempt('select design, design_final from public.get_house($1)', [code])
  check('submitted design is saved and final', r.result?.rows[0].design.wallColor === '#a8d8d2' && r.result.rows[0].design_final === true, r.error)
  r = await attempt(`update public.houses set design = '{"wallColor":"#ffffff"}' where code = $1`, [code])
  check('design change after submit is refused', /final/.test(r.error ?? ''), r.error)
  r = await attempt(`update public.houses set title = 'Nino', keeper_seen_at = now() where code = $1`, [code])
  check('title and last-seen still change after submit', r.result?.rowCount === 1, r.error)
  r = await attempt(`select public.submit_design($1, '{}')`, [code])
  check('cannot submit twice', /final/.test(r.error ?? ''), r.error)
  r = await attempt('select public.admin_unlock_design($1)', [code])
  check('keeper cannot unlock (not admin)', /Admins only/.test(r.error ?? ''), r.error)

  await as(STRANGER)
  r = await attempt(`select public.submit_design($1, '{}')`, [code])
  check('stranger cannot submit', /Only the keeper/.test(r.error ?? ''), r.error)
  r = await attempt(`update public.houses set design = '{}' where code = $1`, [code])
  check('stranger update touches nothing', r.result?.rowCount === 0, r.error)

  await as(null)
  await db.query('insert into public.admins (user_id) values ($1)', [STRANGER])
  await as(STRANGER)
  r = await attempt('select public.admin_unlock_design($1)', [code])
  check('admin can unlock', !r.error, r.error)
  await as(KEEPER)
  r = await attempt(`update public.houses set design = '{"wallColor":"#ffffff"}' where code = $1`, [code])
  check('keeper can redesign after unlock', r.result?.rowCount === 1, r.error)

  await as(null)
}
