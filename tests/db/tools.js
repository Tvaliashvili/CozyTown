// Small helpers every database test uses. Each test runs inside one transaction that is
// rolled back at the end (see run.js), so nothing a test makes is ever saved.

// Pretend-people for the tests. They only exist inside the rolled-back transaction.
export const KEEPER = '11111111-1111-1111-1111-111111111111'
export const SECOND = '22222222-2222-2222-2222-222222222222'
export const THIRD = '33333333-3333-3333-3333-333333333333'

export function makeTools(db) {
  const results = { passed: 0, failed: 0 }

  // Prints PASS or FAIL for one check and counts it.
  function check(name, ok, detail = '') {
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${!ok && detail ? '  - ' + detail : ''}`)
    if (ok) results.passed++
    else results.failed++
  }

  // Acts as someone: 'anon' = a visitor with no account, a user id = that signed-in person,
  // null = the database owner (who can do anything; used to set things up).
  async function as(who) {
    await db.query('reset role')
    if (who === 'anon') {
      await db.query(`select set_config('request.jwt.claims', '{"role":"anon"}', true)`)
      await db.query('set local role anon')
    } else if (who) {
      await db.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ sub: who, role: 'authenticated' })])
      await db.query('set local role authenticated')
    }
  }

  // Runs a query that may be refused without spoiling the rest of the transaction.
  // Returns { result } when it worked, { error } with the message when it was refused.
  async function attempt(sql, params) {
    await db.query('savepoint t')
    try {
      const result = await db.query(sql, params)
      await db.query('release savepoint t')
      return { result }
    } catch (error) {
      await db.query('rollback to savepoint t')
      return { error: error.message }
    }
  }

  // Makes pretend sign-in accounts.
  async function addUsers(...ids) {
    for (const id of ids) {
      await db.query(
        `insert into auth.users (id, instance_id, aud, role, email)
         values ($1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', $2)`,
        [id, `${id.slice(0, 4)}@test.invalid`],
      )
    }
  }

  // Makes a house on a free plot of the first street. Returns { id, code, gift_code }.
  async function addHouse(keeperId, { claimed = false } = {}) {
    const free = await db.query(
      `select p from generate_series(0, (select plot_count - 1 from public.streets where slug = 'first-street')) p
       where p not in (select plot from public.houses) order by p desc limit 1`,
    )
    if (!free.rows.length) throw new Error('No free plot left on first-street for the test house')
    const { rows: [house] } = await db.query(
      `insert into public.houses (street_id, plot, keeper_id, claimed_at)
       values ((select id from public.streets where slug = 'first-street'), $1, $2, case when $3 then now() end)
       returning id, code, gift_code`,
      [free.rows[0].p, keeperId, claimed],
    )
    return house
  }

  return { check, as, attempt, addUsers, addHouse, results }
}
