// Database tests for the admin page functions. Run with: npm run test:db
const ADMIN = '11111111-1111-1111-1111-111111111111'
const KEEPER = '22222222-2222-2222-2222-222222222222'

export default async function run(db, { as, attempt, check }) {
  await as(null)
  for (const id of [ADMIN, KEEPER]) {
    await db.query(`insert into auth.users (id, instance_id, aud, role, email) values ($1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', $2)`, [id, `${id.slice(0, 4)}@test.invalid`])
  }
  await db.query('insert into public.admins (user_id) values ($1)', [ADMIN])
  const { rows: freeRows } = await db.query(`select p from generate_series(0, 7) p where p not in (select plot from public.houses) order by p`)
  const [plotA, plotB] = freeRows.map((row) => row.p)
  const taken = (await db.query('select plot from public.houses limit 1')).rows[0].plot

  const create = `select * from public.admin_create_order(street_slug => 'first-street', plot_number => $1, house_title => $2,
    start_design => '{"wallColor":"#cfe3d2"}', buyer => ' Giorgi ', contact => '@giorgi', price => 49, is_paid => true,
    order_note => 'card + keychain', letter_from => 'Giorgi', letter_body => $3)`

  // Strangers and keepers can't use admin functions
  await as('anon')
  let r = await attempt(create, [plotA, "Nino's house", 'Happy birthday'])
  check('visitor cannot create an order', Boolean(r.error), r.error)
  r = await attempt('select * from public.admin_list_houses()')
  check('visitor cannot list houses', Boolean(r.error), r.error)

  await as(KEEPER)
  r = await attempt(create, [plotA, "Nino's house", 'Happy birthday'])
  check('keeper cannot create an order', r.error?.includes('Admins only'), r.error)
  r = await attempt('select * from public.admin_list_houses()')
  check('keeper cannot list houses', r.error?.includes('Admins only'), r.error)
  r = await attempt('select * from public.orders')
  check('keeper sees no orders', r.result?.rows.length === 0, r.error)

  // The admin creates an order
  await as(ADMIN)
  r = await attempt(create, [plotA, "  Nino's house ", 'Happy birthday, Nino'])
  const codes = r.result?.rows[0]
  check('admin creates an order and gets two codes', codes?.code?.length === 10 && codes?.gift_code?.length === 12, r.error)

  r = await attempt(create, [taken, 'x', ''])
  check('taken plot is refused', r.error?.includes('That plot is taken'), r.error)
  r = await attempt(create, [99, 'x', ''])
  check('plot past the end is refused', r.error?.includes('only 8 plots'), r.error)
  r = await attempt(`select * from public.admin_create_order('no-street', 1)`)
  check('unknown street is refused', r.error?.includes('No such street'), r.error)

  r = await attempt(`select * from public.admin_create_order(street_slug => 'first-street', plot_number => $1, letter_body => '   ')`, [plotB])
  check('order without letter or details works', Boolean(r.result?.rows[0]?.code), r.error)
  const codeB = r.result?.rows[0]?.code

  r = await attempt('select * from public.admin_list_houses()')
  const listed = r.result?.rows.find((row) => row.code === codes?.code)
  check('list shows the new house first or second', r.result?.rows.slice(0, 2).some((row) => row.code === codes?.code), r.error)
  check('list has trimmed title and buyer', listed?.title === "Nino's house" && listed?.buyer_name === 'Giorgi', JSON.stringify(listed))
  check('list has price, paid, note, contact', Number(listed?.price_gel) === 49 && listed?.paid === true && listed?.note === 'card + keychain' && listed?.buyer_contact === '@giorgi')
  check('unclaimed house shows its gift code', listed?.gift_code === codes?.gift_code)
  check('unclaimed house has no keeper email', listed?.keeper_email === null)
  const listedB = r.result?.rows.find((row) => row.code === codeB)
  check('order without details: paid is false, title empty', listedB?.paid === false && listedB?.title === null, JSON.stringify(listedB))

  // The admin can't read letters, even the one they put in
  r = await attempt('select * from public.letters')
  check('admin cannot read letters', r.result?.rows.length === 0, r.error)

  // Admin updates the order
  r = await attempt(`update public.orders set paid = false, note = 'waiting for transfer' where house_id = (select id from public.houses where code = $1)`, [codes?.code])
  check('admin marks order unpaid and edits note', r.result?.rowCount === 1, r.error)

  // Admin adds a letter later
  r = await attempt(`select public.admin_add_letter($1, 'Mum', 'Second letter')`, [codes?.code])
  check('admin adds a letter', !r.error, r.error)
  r = await attempt(`select public.admin_add_letter($1, 'Mum', '  ')`, [codes?.code])
  check('empty letter is refused', r.error?.includes('empty'), r.error)
  r = await attempt(`select public.admin_add_letter('NOPE', 'Mum', 'hi')`)
  check('letter to unknown house is refused', r.error?.includes('No such house'), r.error)

  await as(KEEPER)
  r = await attempt(`select public.admin_add_letter($1, 'x', 'hi')`, [codes?.code])
  check('keeper cannot use admin_add_letter', r.error?.includes('Admins only'), r.error)
  r = await attempt(`update public.orders set paid = true`)
  check('keeper cannot change orders', Boolean(r.error) || r.result?.rowCount === 0, r.error)

  // The recipient claims the gift: now the letters are theirs to read; the order stays hidden
  r = await attempt('select public.claim_house($1)', [codes?.gift_code])
  check('keeper claims the house', r.result?.rows[0]?.claim_house === codes?.code, r.error)
  r = await attempt('select from_name, body from public.letters order by created_at')
  check('keeper reads both letters', r.result?.rows.length === 2 && r.result.rows[0].body === 'Happy birthday, Nino', JSON.stringify(r.result?.rows))
  r = await attempt('select design from public.houses where code = $1', [codes?.code])
  check('keeper gets the starting design', r.result?.rows[0]?.design?.wallColor === '#cfe3d2', r.error)
  r = await attempt('select * from public.orders')
  check('keeper still sees no order', r.result?.rows.length === 0, r.error)

  await as(ADMIN)
  r = await attempt('select * from public.admin_list_houses()')
  const claimed = r.result?.rows.find((row) => row.code === codes?.code)
  check('claimed house: gift code hidden, keeper email shown', claimed?.gift_code === null && claimed?.keeper_email === '2222@test.invalid', JSON.stringify(claimed))

  r = await attempt(`select 1 from pg_proc where proname = 'admin_create_house'`)
  check('old admin_create_house is gone', r.result?.rows.length === 0)

  await as(null)
}
