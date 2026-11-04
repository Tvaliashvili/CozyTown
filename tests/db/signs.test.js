// Database tests for the signs on the street: gift bow, mailbox flag, capsule gift box,
// and the "quiet" switch for memorial houses. Run with: npm run test:db -- signs
import { KEEPER, SECOND, THIRD } from './tools.js'

export default async function run(db, { as, attempt, check, addUsers, addHouse }) {
  await as(null)
  await addUsers(KEEPER, SECOND, THIRD)
  const unclaimed = await addHouse(null)
  const claimed = await addHouse(KEEPER, { claimed: true })
  await db.query('insert into public.house_helpers (house_id, user_id) values ($1, $2)', [claimed.id, SECOND])
  await db.query('insert into public.admins (user_id) values ($1)', [THIRD])

  const street = async () => {
    const r = await attempt(`select * from public.get_street('first-street')`)
    return r.result?.rows ?? []
  }
  const house = async (code) => {
    const r = await attempt('select * from public.get_house($1)', [code])
    return r.result?.rows[0]
  }
  const bowOn = (rows, id) => rows.find((row) => row.plot === id)?.gift_bow
  const plotOf = async (id) => (await db.query('select plot from public.houses where id = $1', [id])).rows[0].plot
  const unclaimedPlot = await plotOf(unclaimed.id)
  const claimedPlot = await plotOf(claimed.id)

  // ---------- The gift bow ----------
  await as('anon')
  let rows = await street()
  check('a stranger sees a bow on an unclaimed house', bowOn(rows, unclaimedPlot) === true)
  check('no bow on a claimed house', bowOn(rows, claimedPlot) === false)
  check('the street says nothing about letters or capsules',
    !Object.keys(rows[0]).some((name) => /letter|capsule|quiet/.test(name)), Object.keys(rows[0]).join(', '))

  await as(THIRD)
  let r = await attempt('select public.admin_set_quiet($1, true)', [unclaimed.code])
  check('an admin marks a house as a memorial', !r.error, r.error)
  await as('anon')
  rows = await street()
  check('no bow on an unclaimed memorial house', bowOn(rows, unclaimedPlot) === false)
  const visitorView = await house(unclaimed.code)
  check('a visitor is never told a house is a memorial', !Object.keys(visitorView).some((name) => /quiet/.test(name)))
  await as(THIRD)
  await attempt('select public.admin_set_quiet($1, false)', [unclaimed.code])
  await as('anon')
  rows = await street()
  check('the mark can be taken off again', bowOn(rows, unclaimedPlot) === true)

  for (const [who, name] of [['anon', 'a visitor'], [KEEPER, 'the keeper'], [SECOND, 'a helper']]) {
    await as(who)
    r = await attempt('select public.admin_set_quiet($1, true)', [claimed.code])
    check(`${name} cannot mark a house as a memorial`, Boolean(r.error))
  }
  await as(KEEPER)
  r = await attempt('update public.houses set quiet = true where id = $1', [claimed.id])
  check('the keeper cannot change the mark directly', Boolean(r.error))
  r = await attempt('update public.houses set letters_seen_at = now() where id = $1', [claimed.id])
  check('the keeper cannot change the mailbox time directly', Boolean(r.error))

  // ---------- The mailbox flag ----------
  // All of this runs in one transaction, where now() never moves, so "newer than" is set up by hand.
  const seenLongAgo = () => db.query(`update public.houses set letters_seen_at = now() - interval '1 day' where id = $1`, [claimed.id])

  await as('anon')
  check('no letters: flag down', (await house(claimed.code)).new_letter === false)

  await as(KEEPER)
  await attempt('insert into public.letters (house_id, body) values ($1, $2)', [claimed.id, 'My own note'])
  await as('anon')
  check("the keeper's own letter doesn't raise the flag", (await house(claimed.code)).new_letter === false)

  await as(SECOND)
  r = await attempt('insert into public.letters (house_id, body) values ($1, $2)', [claimed.id, 'From a helper'])
  check('a helper writes a letter', !r.error, r.error)
  await as('anon')
  check("a helper's letter raises the flag, also for a visitor with the link", (await house(claimed.code)).new_letter === true)
  r = await attempt('select public.mark_letters_seen($1)', [claimed.code])
  check('a visitor cannot put the flag down', Boolean(r.error))

  await as(SECOND)
  r = await attempt('select public.mark_letters_seen($1)', [claimed.code])
  check('a helper cannot put the flag down', Boolean(r.error))
  await as(THIRD)
  r = await attempt('select public.mark_letters_seen($1)', [claimed.code])
  check('an admin cannot put the flag down', Boolean(r.error))

  await as(KEEPER)
  r = await attempt('select public.mark_letters_seen($1)', [claimed.code])
  check('the keeper puts the flag down', !r.error, r.error)
  check('flag down after the keeper opens the mailbox', (await house(claimed.code)).new_letter === false)

  await as(null)
  await seenLongAgo()
  await db.query(`update public.letters set created_at = now() - interval '2 days' where house_id = $1`, [claimed.id])
  await as('anon')
  check('letters older than the last look stay down', (await house(claimed.code)).new_letter === false)

  await as(THIRD)
  r = await attempt('select public.admin_add_letter($1, $2, $3)', [claimed.code, 'Buyer', 'A later letter'])
  check("the buyer's letter goes in through the admin page", !r.error, r.error)
  await as('anon')
  check("the buyer's letter raises the flag", (await house(claimed.code)).new_letter === true)

  await as(KEEPER)
  await attempt('delete from public.letters where house_id = $1', [claimed.id])
  await as('anon')
  check('flag down when no letters are left', (await house(claimed.code)).new_letter === false)

  await as(null)
  await db.query('insert into public.letters (house_id, from_name, body) values ($1, $2, $3)', [unclaimed.id, 'Buyer', 'Happy birthday'])
  await as('anon')
  check('an unclaimed house with the buyer\'s letter has its flag up', (await house(unclaimed.code)).new_letter === true)

  // ---------- The capsule gift box ----------
  await as(null)
  await db.query(`insert into public.capsules (house_id, opens_on) values ($1, public.tbilisi_today() + 5)`, [claimed.id])
  await as('anon')
  check('no gift box before the day', (await house(claimed.code)).capsule_gift === false)

  await as(null)
  await db.query('update public.capsules set opens_on = public.tbilisi_today() where house_id = $1', [claimed.id])
  await as('anon')
  const onTheDay = await house(claimed.code)
  check('gift box on the day', onTheDay.capsule_gift === true)
  check('a visitor still gets no capsule news', onTheDay.capsule_news === false)

  await as(THIRD)
  await attempt('select public.admin_set_quiet($1, true)', [claimed.code])
  await as(KEEPER)
  const quietView = await house(claimed.code)
  check('no gift box on a memorial house', quietView.capsule_gift === false)
  check('its keeper still gets the news, in words', quietView.capsule_news === true)
  await as(THIRD)
  await attempt('select public.admin_set_quiet($1, false)', [claimed.code])

  await as(null)
  await db.query('update public.capsules set keeper_opened_at = now() where house_id = $1', [claimed.id])
  await as('anon')
  check('gift box gone once the keeper has looked inside', (await house(claimed.code)).capsule_gift === false)

  // ---------- Making a memorial house straight from the order form ----------
  await as(null)
  const free = (await db.query(
    `select p from generate_series(0, (select plot_count - 1 from public.streets where slug = 'first-street')) p
     where p not in (select plot from public.houses) order by p limit 1`,
  )).rows[0]?.p
  await as(THIRD)
  r = await attempt(`select * from public.admin_create_order(street_slug => 'first-street', plot_number => $1, quiet_house => true)`, [free])
  check('the order form can make a memorial house', !r.error, r.error)
  const list = await attempt('select code, quiet from public.admin_list_houses()')
  check('the admin list shows the mark', list.result?.rows.find((row) => row.code === r.result?.rows[0].code)?.quiet === true, list.error)

  await as(null)
}
