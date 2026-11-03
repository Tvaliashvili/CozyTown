// Database tests for houses: claiming a gift, what a keeper may change, photo uploads, and what
// visitors and strangers can see. Run with: npm run test:db
import { KEEPER, SECOND } from './tools.js'

export default async function run(db, { as, attempt, check, addUsers, addHouse }) {
  await as(null)
  await addUsers(KEEPER, SECOND)
  const house = await addHouse(null)
  const { id: houseId, code, gift_code: giftCode } = house

  // The recipient claims the gift. People type codes in lower case and with dashes, so both must work.
  await as(KEEPER)
  const typed = giftCode.match(/.{1,4}/g).join('-').toLowerCase()
  let r = await attempt('select public.claim_house($1) c', [typed])
  check('keeper claims with a typed code like "abcd-efgh-jkmn"', r.result?.rows[0]?.c === code, r.error)
  r = await attempt('select public.claim_house($1)', [giftCode])
  check('claiming the same gift again is fine', !r.error, r.error)
  r = await attempt('select id from public.houses')
  check('keeper sees only their own house', r.result?.rows.length === 1 && r.result.rows[0].id === houseId, r.error)

  r = await attempt(`update public.houses set design = '{"roofStyle":"hip"}' where id = $1`, [houseId])
  check('keeper changes the design', r.result?.rowCount === 1, r.error)
  r = await attempt('update public.houses set plot = 0 where id = $1', [houseId])
  check('keeper cannot move the house to another plot', Boolean(r.error) || r.result?.rowCount === 0, r.error)
  r = await attempt('update public.houses set keeper_id = $2 where id = $1', [houseId, SECOND])
  check('keeper cannot hand the house to someone else', Boolean(r.error) || r.result?.rowCount === 0, r.error)

  r = await attempt(`insert into public.letters (house_id, from_name, body) values ($1, 'Giorgi', 'Hello')`, [houseId])
  check('keeper writes a letter', !r.error, r.error)
  r = await attempt(`insert into public.photos (house_id, path, slot) values ($1, 'elsewhere/a.webp', 1)`, [houseId])
  check('photo path outside the house folder is refused', Boolean(r.error), r.error)
  r = await attempt(`insert into storage.objects (bucket_id, name, owner) values ('photos', $1, $2)`, [`${houseId}/a.webp`, KEEPER])
  check('keeper uploads a photo file into their house folder', !r.error, r.error)
  r = await attempt(`insert into storage.objects (bucket_id, name) values ('photos', gen_random_uuid() || '/a.webp')`)
  check('upload into another house folder is refused', Boolean(r.error), r.error)
  r = await attempt(`insert into storage.objects (bucket_id, name) values ('photos', 'junk/a.webp')`)
  check('upload into a junk folder is refused', Boolean(r.error), r.error)

  // Someone else, signed in
  await as(SECOND)
  r = await attempt('select public.claim_house($1)', [giftCode])
  check('a used gift code is refused for anyone else', Boolean(r.error), r.error)
  r = await attempt('select * from public.letters where house_id = $1', [houseId])
  check('signed-in stranger reads no letters', r.result?.rows.length === 0, r.error)
  r = await attempt('select * from public.houses where id = $1', [houseId])
  check('signed-in stranger sees no house row', r.result?.rows.length === 0, r.error)

  // A visitor with no account
  await as('anon')
  r = await attempt(`select * from public.get_street('first-street')`)
  const row = r.result?.rows.find((s) => s.plot !== undefined)
  check('visitor sees the street', r.result?.rows.length > 0, r.error)
  check('street rows carry no house codes', row && !('code' in row) && !('gift_code' in row), JSON.stringify(row))
  r = await attempt('select * from public.houses')
  check('visitor cannot read the houses table', Boolean(r.error), r.error)
  r = await attempt('select * from public.letters')
  check('visitor cannot read letters', Boolean(r.error), r.error)
  r = await attempt('select public.claim_house($1)', [giftCode])
  check('visitor cannot claim', Boolean(r.error), r.error)
  r = await attempt('select public.random_code(10)')
  check('visitor cannot make codes', Boolean(r.error), r.error)

  await as(null)
}
