// Database tests for visitor lanterns. Run with: npm run test:db
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
  check('visitor opens house, 0 lanterns', r.result?.rows[0]?.lantern_count === 0, r.error)
  check('other columns unchanged', r.result?.rows[0]?.claimed === true && r.result.rows[0].is_keeper === false && r.result.rows[0].design_final === false, r.error)

  r = await attempt(`select public.light_lantern($1, 'Nana', 'Thinking of you')`, [code])
  check('visitor lights a lantern with name and words', !r.error, r.error)
  r = await attempt(`select public.light_lantern($1)`, [code])
  check('visitor lights a lantern without name or words', !r.error, r.error)
  r = await attempt(`select public.light_lantern($1, '   ', '  ')`, [code])
  check('blank name and words are fine too', !r.error, r.error)

  r = await attempt('select * from public.get_house($1)', [code])
  check('count is now 3', r.result?.rows[0]?.lantern_count === 3, r.error ?? JSON.stringify(r.result?.rows[0]))

  r = await attempt('select * from public.lanterns')
  check('visitor cannot read lantern messages', Boolean(r.error), r.error)
  r = await attempt(`select public.light_lantern($1, $2)`, [code, 'x'.repeat(41)])
  check('name over 40 letters refused', Boolean(r.error), r.error)
  r = await attempt(`select public.light_lantern($1, null, $2)`, [code, 'x'.repeat(281)])
  check('words over 280 letters refused', Boolean(r.error), r.error)
  r = await attempt(`select public.light_lantern('NOPE')`)
  check('unknown house refused', Boolean(r.error), r.error)

  await as(STRANGER)
  r = await attempt('select * from public.lanterns')
  check('signed-in stranger sees no lanterns', r.result?.rows.length === 0, r.error)
  r = await attempt('select * from public.get_house($1)', [code])
  check('stranger sees the count', r.result?.rows[0]?.lantern_count === 3, r.error)

  await as(KEEPER)
  r = await attempt('select from_name, message from public.lanterns order by id')
  check('keeper reads names and words', r.result?.rows.length === 3 && r.result.rows[0].from_name === 'Nana' && r.result.rows[2].from_name === null, r.error ?? JSON.stringify(r.result?.rows))
  r = await attempt('select * from public.get_house($1)', [code])
  check('keeper sees the count and is keeper', r.result?.rows[0]?.lantern_count === 3 && r.result.rows[0].is_keeper === true, r.error)

  await as('anon')
  for (let i = 0; i < 17; i++) await attempt(`select public.light_lantern($1)`, [code])
  r = await attempt(`select public.light_lantern($1)`, [code])
  check('21st lantern in an hour refused', r.error?.includes('Too many lanterns'), r.error)

  await as(null)
}
