// Database tests for helpers (co-decorators). Run with: npm run test:db
const KEEPER = '11111111-1111-1111-1111-111111111111'
const HELPER = '22222222-2222-2222-2222-222222222222'
const STRANGER = '33333333-3333-3333-3333-333333333333'

export default async function run(db, { as, attempt, check }) {
  await as(null)
  for (const id of [KEEPER, HELPER, STRANGER]) {
    await db.query(`insert into auth.users (id, instance_id, aud, role, email) values ($1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', $2)`, [id, `${id.slice(0, 4)}@test.invalid`])
  }
  const free = await db.query(`select p from generate_series(0, 7) p where p not in (select plot from public.houses) order by p limit 1`)
  const { rows: [house] } = await db.query(
    `insert into public.houses (street_id, plot, keeper_id, claimed_at) values ((select id from public.streets where slug = 'first-street'), $1, $2, now()) returning id, code, gift_code`,
    [free.rows[0].p, KEEPER],
  )
  const { code, id: houseId } = house
  await db.query(`insert into public.letters (house_id, from_name, body, created_by) values ($1, 'Mum', 'Private to the keeper', null)`, [houseId])
  await db.query(`insert into public.lanterns (house_id, from_name) values ($1, 'Nana')`, [houseId])

  // Only the keeper invites
  await as(STRANGER)
  let r = await attempt('select public.create_helper_invite($1)', [code])
  check('stranger cannot invite', r.error?.includes('Only the keeper'), r.error)
  await as('anon')
  r = await attempt('select public.create_helper_invite($1)', [code])
  check('visitor cannot invite', Boolean(r.error), r.error)

  await as(KEEPER)
  r = await attempt('select public.create_helper_invite($1) c', [code])
  const invite = r.result?.rows[0]?.c
  check('keeper makes an invite code of 14 characters', invite?.length === 14, r.error)
  r = await attempt('select public.create_helper_invite($1) c', [code])
  const invite2 = r.result?.rows[0]?.c
  r = await attempt('select public.claim_house($1)', [invite])
  check('keeper cannot use their own invite', r.error?.includes('already the keeper'), r.error)

  // The helper joins
  await as(HELPER)
  r = await attempt('select * from public.get_house($1)', [code])
  check('before joining: not a helper', r.result?.rows[0]?.is_helper === false, r.error)
  const dashed = invite.match(/.{1,4}/g).join('-').toLowerCase()
  r = await attempt('select public.claim_house($1) c', [dashed])
  check('helper joins with the invite (dashes, lowercase ok)', r.result?.rows[0]?.c === code, r.error)
  r = await attempt('select public.claim_house($1) c', [invite])
  check('using the same invite again is fine for them', r.result?.rows[0]?.c === code, r.error)
  r = await attempt('select * from public.get_house($1)', [code])
  check('now a helper, not the keeper', r.result?.rows[0]?.is_helper === true && r.result.rows[0].is_keeper === false, r.error)
  r = await attempt('select * from public.my_houses()')
  check('my_houses lists it as helped', r.result?.rows.length === 1 && r.result.rows[0].is_keeper === false, JSON.stringify(r.result?.rows))

  // What a helper can and can't do
  r = await attempt('select id from public.houses where code = $1', [code])
  check('helper sees the house row', r.result?.rows.length === 1, r.error)
  r = await attempt(`update public.houses set title = 'hacked' where code = $1`, [code])
  check('helper cannot change the house', Boolean(r.error) || r.result?.rowCount === 0, r.error)
  r = await attempt(`insert into public.photos (house_id, path, slot) values ($1, $2, 0)`, [houseId, `${houseId}/x.webp`])
  check('helper hangs a photo', !r.error, r.error)
  r = await attempt(`insert into storage.objects (bucket_id, name, owner) values ('photos', $1, $2)`, [`${houseId}/x.webp`, HELPER])
  check('helper uploads a photo file', !r.error, r.error)
  r = await attempt(`insert into public.letters (house_id, from_name, body) values ($1, 'Cousin', 'From the helper')`, [houseId])
  check('helper writes a letter', !r.error, r.error)
  r = await attempt('select body from public.letters')
  check('helper reads only their own letter', r.result?.rows.length === 1 && r.result.rows[0].body === 'From the helper', JSON.stringify(r.result?.rows))
  r = await attempt(`delete from public.letters where body = 'Private to the keeper'`)
  check('helper cannot delete the keeper letter', r.result?.rowCount === 0, r.error)
  r = await attempt(`update public.letters set body = 'changed' where body = 'Private to the keeper'`)
  check('helper cannot change the keeper letter', r.result?.rowCount === 0, r.error)
  r = await attempt('select * from public.lanterns')
  check('helper sees no lanterns', r.result?.rows.length === 0, r.error)
  r = await attempt('select public.create_helper_invite($1)', [code])
  check('helper cannot invite others', r.error?.includes('Only the keeper'), r.error)
  r = await attempt('select * from public.get_helpers($1)', [code])
  check('helper cannot list helpers', r.error?.includes('Only the keeper'), r.error)
  r = await attempt(`select public.set_capsule_date($1, (current_date + 30))`, [code])
  check('helper cannot choose the capsule day', r.error?.includes('Only the keeper can choose'), r.error)
  await as(KEEPER)
  r = await attempt(`select public.set_capsule_date($1, ((now() at time zone 'Asia/Tbilisi')::date + 30))`, [code])
  check('keeper chooses the capsule day', !r.error, r.error)
  await as(HELPER)
  r = await attempt(`select public.add_to_capsule($1, 'Cousin', 'For later')`, [code])
  check('helper puts something in the capsule', !r.error, r.error)
  r = await attempt(`select * from public.get_capsule($1)`, [code])
  check('helper sees the capsule from outside', r.result?.rows[0]?.item_count === 1, r.error)
  r = await attempt(`select * from public.open_capsule($1)`, [code])
  check('helper cannot open it early either', r.error?.includes('still locked'), r.error)

  // The keeper's view
  await as(KEEPER)
  r = await attempt('select body from public.letters order by created_at')
  check('keeper reads every letter, including the helper one', r.result?.rows.length === 2, JSON.stringify(r.result?.rows))
  r = await attempt('select * from public.lanterns')
  check('keeper still sees lanterns', r.result?.rows.length === 1, r.error)
  r = await attempt('select * from public.get_helpers($1)', [code])
  check('keeper sees the helper by email', r.result?.rows.length === 1 && r.result.rows[0].email === '2222@test.invalid', JSON.stringify(r.result?.rows))
  r = await attempt('select * from public.get_house($1)', [code])
  check('keeper: is_keeper true, is_helper false', r.result?.rows[0]?.is_keeper === true && r.result.rows[0].is_helper === false, r.error)

  // Used and expired invites
  await as(STRANGER)
  r = await attempt('select public.claim_house($1)', [invite])
  check('used invite is refused for someone else', r.error?.includes('already used'), r.error)
  await as(null)
  await db.query(`update public.helper_invites set expires_at = now() - interval '1 minute' where code = $1`, [invite2])
  await as(STRANGER)
  r = await attempt('select public.claim_house($1)', [invite2])
  check('expired invite is refused', r.error?.includes('expired'), r.error)
  r = await attempt('select public.claim_house($1)', ['NOPENOPENOPENO'])
  check('unknown code is refused', r.error?.includes('No house'), r.error)
  r = await attempt('select * from public.helper_invites')
  check('nobody reads invites directly', Boolean(r.error), r.error)

  // Gift codes still work
  await as(null)
  const { rows: [gift] } = await db.query(
    `insert into public.houses (street_id, plot) values ((select id from public.streets where slug = 'first-street'),
     (select p from generate_series(0, 7) p where p not in (select plot from public.houses) order by p limit 1)) returning code, gift_code`)
  await as(STRANGER)
  r = await attempt('select public.claim_house($1) c', [gift.gift_code])
  check('gift codes still make you the keeper', r.result?.rows[0]?.c === gift.code, r.error)

  // Removing a helper
  await as(KEEPER)
  r = await attempt('select public.remove_helper($1, $2)', [code, HELPER])
  check('keeper removes the helper', !r.error, r.error)
  await as(HELPER)
  r = await attempt('select * from public.get_house($1)', [code])
  check('removed helper is a visitor again', r.result?.rows[0]?.is_helper === false, r.error)
  r = await attempt('select * from public.letters')
  check('removed helper reads no letters', r.result?.rows.length === 0, r.error)
  r = await attempt(`insert into public.photos (house_id, path, slot) values ($1, $2, 1)`, [houseId, `${houseId}/y.webp`])
  check('removed helper cannot hang photos', Boolean(r.error), r.error)

  await as(null)
}
