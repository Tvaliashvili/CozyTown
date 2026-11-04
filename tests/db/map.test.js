// Database tests for the town map: neighbourhoods, opening streets one at a time, moving a house,
// and the quiet Garden Quarter. Run with: npm run test:db -- map
import { KEEPER, SECOND, THIRD } from './tools.js'

export default async function run(db, { as, attempt, check, addUsers, addHouse }) {
  await as(null)
  await addUsers(KEEPER, SECOND, THIRD)
  await db.query('insert into public.admins (user_id) values ($1)', [THIRD])
  const unclaimed = await addHouse(null)
  const claimed = await addHouse(KEEPER, { claimed: true })

  const map = async () => (await attempt('select * from public.get_town_map()')).result?.rows ?? []
  const quiet = async (id) => (await db.query('select quiet from public.houses where id = $1', [id])).rows[0].quiet
  const bowOnStreet = async (slug) => {
    const r = await attempt('select * from public.get_street($1)', [slug])
    return r.result?.rows ?? []
  }

  // ---------- What visitors see ----------
  await as('anon')
  let rows = await map()
  const hoods = [...new Set(rows.map((row) => row.neighbourhood_slug))]
  check('the map lists the four neighbourhoods in order',
    hoods.join(',') === 'old-town,riverside,snowy-hills,garden-quarter', hoods.join(','))
  const first = rows.find((row) => row.street_slug === 'first-street')
  check('the first street is open, in the Old Town', first?.street_open === true && first?.neighbourhood_slug === 'old-town')
  check('the map counts taken plots', first?.taken_plots >= 2 && first?.plot_count === 8, JSON.stringify(first))
  check('a neighbourhood with no street yet still shows', rows.some((row) => row.neighbourhood_slug === 'riverside' && row.street_slug === null))
  check('the map says nothing about houses',
    !Object.keys(rows[0]).some((name) => /code|title|keeper|gift|quiet/.test(name)), Object.keys(rows[0]).join(', '))
  let r = await attempt('select * from public.neighbourhoods')
  check('visitors cannot read the neighbourhoods table directly', Boolean(r.error))

  // ---------- Who may change things ----------
  for (const [who, name] of [['anon', 'a visitor'], [KEEPER, 'a keeper']]) {
    await as(who)
    r = await attempt(`select public.admin_add_street('riverside', 'Nope Street', 'არა')`)
    check(`${name} cannot add a street`, Boolean(r.error))
    r = await attempt(`select public.admin_set_street_open('first-street', false)`)
    check(`${name} cannot close a street`, Boolean(r.error))
    r = await attempt('select public.admin_move_house($1, $2, 0)', [claimed.code, 'first-street'])
    check(`${name} cannot move a house`, Boolean(r.error))
  }
  await as(KEEPER)
  r = await attempt('update public.houses set plot = 0 where id = $1', [claimed.id])
  check('a keeper cannot move their own house by hand', Boolean(r.error))
  r = await attempt('update public.houses set quiet = true where id = $1', [claimed.id])
  check('a keeper cannot set the quiet mark by hand', Boolean(r.error))

  // ---------- Adding and opening a street ----------
  await as(THIRD)
  r = await attempt(`select public.admin_add_street('riverside', '  Willow Lane ', 'ტირიფების ქუჩა') as slug`)
  check('an admin adds a street, and gets a tidy address', r.result?.rows[0].slug === 'willow-lane', r.error)
  r = await attempt(`select public.admin_add_street('riverside', 'Willow Lane', 'სხვა')`)
  check('two streets cannot share a name', r.error?.includes('already'), r.error)
  r = await attempt(`select public.admin_add_street('riverside', 'Empty', '   ')`)
  check('a street needs a Georgian name too', r.error?.includes('both'), r.error)
  r = await attempt(`select public.admin_add_street('riverside', 'ტირიფი', 'ტირიფი')`)
  check('a street needs English letters for its address', r.error?.includes('English letters'), r.error)
  r = await attempt(`select public.admin_add_street('atlantis', 'Lost Street', 'ქუჩა')`)
  check('an unknown neighbourhood is refused', r.error?.includes('No such'), r.error)

  await as('anon')
  rows = await map()
  let willow = rows.find((row) => row.street_slug === 'willow-lane')
  check('a new street starts closed', willow?.street_open === false && willow?.plot_count === 8, JSON.stringify(willow))

  await as(THIRD)
  r = await attempt(`select public.admin_set_street_open('willow-lane', true)`)
  check('an admin opens it', !r.error, r.error)
  await as('anon')
  willow = (await map()).find((row) => row.street_slug === 'willow-lane')
  check('it now shows as open', willow?.street_open === true)

  // ---------- Moving a house ----------
  await as(THIRD)
  r = await attempt(`select public.admin_move_house($1, 'willow-lane', 2)`, [unclaimed.code])
  check('an admin moves a house to another street', !r.error, r.error)
  await as('anon')
  r = await attempt('select * from public.get_house($1)', [unclaimed.code])
  const moved = r.result?.rows[0]
  check('the same link still opens it, in its new place', moved?.street_slug === 'willow-lane' && moved?.plot === 2, JSON.stringify(moved))
  rows = await bowOnStreet('willow-lane')
  check('it stands on the new street', rows.some((row) => row.plot === 2))
  willow = (await map()).find((row) => row.street_slug === 'willow-lane')
  check('the new street counts it', willow?.taken_plots === 1)

  await as(THIRD)
  r = await attempt(`select public.admin_move_house($1, 'willow-lane', 2)`, [claimed.code])
  check('a taken plot is refused', r.error?.includes('taken'), r.error)
  r = await attempt(`select public.admin_move_house($1, 'willow-lane', 8)`, [claimed.code])
  check('a plot past the end of the street is refused', r.error?.includes('only 8'), r.error)
  r = await attempt(`select public.admin_move_house('NOSUCHHOUSE', 'willow-lane', 3)`)
  check('an unknown house is refused', r.error?.includes('No such house'), r.error)

  // Closing hides a street from the map, but a house there keeps its link.
  r = await attempt(`select public.admin_set_street_open('willow-lane', false)`)
  check('an admin closes a street', !r.error, r.error)
  await as('anon')
  r = await attempt('select * from public.get_house($1)', [unclaimed.code])
  check('a house on a closed street still opens by its link', r.result?.rows[0]?.street_slug === 'willow-lane')

  // ---------- The quiet Garden Quarter ----------
  await as(THIRD)
  await attempt(`select public.admin_add_street('garden-quarter', 'Linden Path', 'ცაცხვის ბილიკი')`)
  await as(null)
  check('a house starts without the quiet mark', (await quiet(unclaimed.id)) === false)

  await as(THIRD)
  r = await attempt(`select public.admin_move_house($1, 'linden-path', 0)`, [unclaimed.code])
  check('a house moves to the Garden Quarter', !r.error, r.error)
  await as(null)
  check('it becomes quiet by itself', (await quiet(unclaimed.id)) === true)
  await as('anon')
  rows = await bowOnStreet('linden-path')
  check('no gift bow in the Garden Quarter, even unclaimed', rows.find((row) => row.plot === 0)?.gift_bow === false)
  r = await attempt('select * from public.get_house($1)', [unclaimed.code])
  check('a visitor is still never told a house is quiet', !Object.keys(r.result?.rows[0] ?? {}).some((name) => /quiet/.test(name)))

  await as(THIRD)
  r = await attempt('select public.admin_set_quiet($1, false)', [unclaimed.code])
  check('the quiet mark cannot be taken off inside the Garden Quarter', r.error?.includes('stay quiet'), r.error)
  r = await attempt(`select * from public.admin_create_order('linden-path', 1)`)
  check('a new order there works', !r.error, r.error)
  await as(null)
  const ordered = await db.query(`select h.quiet from public.houses h join public.streets s on s.id = h.street_id where s.slug = 'linden-path' and h.plot = 1`)
  check('a new order in the Garden Quarter is quiet from the start', ordered.rows[0]?.quiet === true)

  // Moving out: the family decides. It stays quiet until the admin says otherwise.
  await as(THIRD)
  r = await attempt(`select public.admin_move_house($1, 'willow-lane', 4)`, [unclaimed.code])
  check('a house moves out again', !r.error, r.error)
  await as(null)
  check('it stays quiet after moving out', (await quiet(unclaimed.id)) === true)
  await as(THIRD)
  r = await attempt('select public.admin_set_quiet($1, false)', [unclaimed.code])
  check('outside the Garden Quarter the mark can come off', !r.error, r.error)

  // ---------- Moving keeps what the house holds ----------
  await as(null)
  await db.query(`insert into public.letters (house_id, from_name, body) values ($1, 'Test', 'Stays with the house')`, [claimed.id])
  await db.query(`update public.houses set design_submitted_at = now() where id = $1`, [claimed.id])
  await as(THIRD)
  r = await attempt(`select public.admin_move_house($1, 'willow-lane', 5)`, [claimed.code])
  check('a house with a final design can still move', !r.error, r.error)
  await as(KEEPER)
  r = await attempt('select public.can_edit_house(id) as can from public.houses where code = $1', [claimed.code])
  check('its keeper is still its keeper', r.result?.rows[0]?.can === true, r.error)
  r = await attempt('select body from public.letters where house_id = $1', [claimed.id])
  check('its letters come along', r.result?.rows.length === 1, r.error)

  // ---------- The trigger can't be called from outside ----------
  await as('anon')
  r = await attempt('select public.keep_quiet_neighbourhood_quiet()')
  check('visitors cannot call the quiet rule themselves', Boolean(r.error))
}
