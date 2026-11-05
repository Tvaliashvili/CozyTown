// Database tests for the time capsule: filled and sealed once by the keeper, then locked until
// its day. Run with: npm run test:db
import { LEFTOVER_FILES_SQL } from '../../scripts/backup/shared.js'

const KEEPER = '11111111-1111-1111-1111-111111111111'
const STRANGER = '22222222-2222-2222-2222-222222222222'
const ADMIN = '33333333-3333-3333-3333-333333333333'

export default async function run(db, { as, attempt, check }) {
  await as(null)
  for (const id of [KEEPER, STRANGER, ADMIN]) {
    await db.query(`insert into auth.users (id, instance_id, aud, role, email) values ($1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', $2)`, [id, `${id.slice(0, 4)}@test.invalid`])
  }
  await db.query('insert into public.admins (user_id) values ($1)', [ADMIN])
  const free = await db.query(`select p from generate_series(0, 7) p where p not in (select plot from public.houses) order by p limit 1`)
  const { rows: [house] } = await db.query(
    `insert into public.houses (street_id, plot, keeper_id) values ((select id from public.streets where slug = 'first-street'), $1, $2) returning id, code`,
    [free.rows[0].p, KEEPER],
  )
  const { code, id: houseId } = house
  const today = (await db.query(`select (now() at time zone 'Asia/Tbilisi')::date::text d`)).rows[0].d
  const inDays = async (n) => (await db.query(`select ((now() at time zone 'Asia/Tbilisi')::date + $1::int)::text d`, [n])).rows[0].d
  const photo = (name) => ({ path: `${houseId}/${name}.webp`, width: 800, height: 600 })
  const seal = (date, from, body, photos = []) =>
    attempt('select public.seal_capsule($1, $2, $3, $4, $5)', [code, date, from, body, JSON.stringify(photos)])

  // Nobody else gets near it
  await as('anon')
  let r = await attempt('select * from public.get_capsule($1)', [code])
  check('visitor cannot see the capsule', Boolean(r.error), r.error)
  r = await seal(await inDays(30), null, 'hello')
  check('visitor cannot seal a capsule', Boolean(r.error), r.error)
  await as(STRANGER)
  r = await attempt('select * from public.get_capsule($1)', [code])
  check('stranger cannot see the capsule', r.error?.includes('Only the keeper'), r.error)
  r = await seal(await inDays(30), null, 'hello')
  check('stranger cannot seal a capsule', Boolean(r.error), r.error)
  r = await attempt(`insert into storage.objects (bucket_id, name, owner) values ('capsule', $1, $2)`, [`${houseId}/evil.webp`, STRANGER])
  check('stranger cannot upload into the capsule', Boolean(r.error), r.error)
  await as(ADMIN)
  r = await attempt('select * from public.get_capsule($1)', [code])
  check('admin cannot see the capsule', Boolean(r.error), r.error)

  // The old step-by-step functions are gone
  await as(KEEPER)
  r = await attempt('select public.set_capsule_date($1, $2)', [code, await inDays(30)])
  check('set_capsule_date no longer exists', r.error?.includes('does not exist'), r.error)
  r = await attempt(`select public.add_to_capsule($1, 'Mum', 'hello')`, [code])
  check('add_to_capsule no longer exists', r.error?.includes('does not exist'), r.error)

  // The keeper fills it in
  r = await attempt('select * from public.get_capsule($1)', [code])
  check('keeper: not sealed yet = no row', r.result?.rows.length === 0, r.error)
  r = await seal(today, 'Mum', 'hello')
  check('today is refused', r.error?.includes('in the future'), r.error)
  r = await seal('2200-01-01', 'Mum', 'hello')
  check('far future is refused', r.error?.includes('too far'), r.error)
  r = await seal(await inDays(30), 'Mum', '   ')
  check('an empty capsule is refused', r.error?.includes('letter or a photo'), r.error)
  r = await seal(await inDays(30), 'Mum', 'hello', Array.from({ length: 11 }, (_, i) => photo(`p${i}`)))
  check('more than 10 photos is refused', r.error?.includes('Up to 10'), r.error)
  r = await seal(await inDays(30), null, null, [{ path: '00000000-0000-0000-0000-000000000000/abc.webp', width: 1, height: 1 }])
  check('a photo from another house folder is refused', Boolean(r.error), r.error)
  r = await attempt('select * from public.get_capsule($1)', [code])
  check('refused attempts leave no capsule behind', r.result?.rows.length === 0, r.error)

  // Photos are uploaded before sealing
  r = await attempt(`insert into storage.objects (bucket_id, name, owner) values ('capsule', $1, $2)`, [`${houseId}/a.webp`, KEEPER])
  check('keeper uploads a capsule photo before sealing', !r.error, r.error)
  r = await attempt(`select name from storage.objects where bucket_id = 'capsule'`)
  check('keeper cannot see capsule files while locked', r.result?.rows.length === 0, r.error)

  r = await seal(await inDays(30), 'Mum', 'For your 18th birthday', [photo('a'), photo('b')])
  check('keeper seals a letter and 2 photos in one go', !r.error, r.error)
  r = await attempt('select * from public.get_capsule($1)', [code])
  const chest = r.result?.rows[0]
  check('chest shows date, 3 items, locked', chest?.item_count === 3 && chest?.is_open === false && Boolean(chest?.opens_on), JSON.stringify(chest))

  // Sealed means sealed
  r = await seal(await inDays(60), 'Mum', 'one more thing')
  check('sealing a second time is refused', r.error?.includes('already sealed'), r.error)
  r = await attempt(`insert into storage.objects (bucket_id, name, owner) values ('capsule', $1, $2)`, [`${houseId}/late.webp`, KEEPER])
  check('uploading after sealing is refused', Boolean(r.error), r.error)
  r = await attempt('select * from public.open_capsule($1)', [code])
  check('keeper cannot open it early', r.error?.includes('still locked'), r.error)
  r = await attempt('select * from public.capsule_items')
  check('keeper cannot read the table directly', Boolean(r.error), r.error)
  r = await attempt('select * from public.capsules')
  check('keeper cannot read capsules table directly', Boolean(r.error), r.error)
  r = await attempt(`update public.capsules set opens_on = '2000-01-01'`)
  check('keeper cannot change the date directly', Boolean(r.error), r.error)
  r = await attempt(`insert into public.capsule_items (house_id, body) values ($1, 'sneaky')`, [houseId])
  check('keeper cannot slip something in directly', Boolean(r.error), r.error)
  r = await attempt('select * from public.get_house($1)', [code])
  check('no capsule news while locked', r.result?.rows[0]?.capsule_news === false, r.error)

  // The day comes
  await as(null)
  await db.query(`update public.capsules set opens_on = $2 where house_id = $1`, [houseId, today])
  await as(KEEPER)
  r = await attempt('select * from public.get_house($1)', [code])
  check('capsule news for the keeper once open', r.result?.rows[0]?.capsule_news === true, r.error)
  await as('anon')
  r = await attempt('select * from public.get_house($1)', [code])
  check('no capsule news for visitors', r.result?.rows[0]?.capsule_news === false, r.error)
  await as(STRANGER)
  r = await attempt('select * from public.open_capsule($1)', [code])
  check('stranger still cannot open it', Boolean(r.error), r.error)
  r = await attempt(`select name from storage.objects where bucket_id = 'capsule'`)
  check('stranger cannot see capsule files', r.result?.rows.length === 0, r.error)

  await as(KEEPER)
  // "Download everything" reads it without counting as looking inside (QA Q8)
  r = await attempt('select * from public.open_capsule($1, mark_seen => false)', [code])
  check('the zip can read it on the day', r.result?.rows.length === 3, r.error)
  r = await attempt('select * from public.get_house($1)', [code])
  check('reading it for the zip keeps the news', r.result?.rows[0]?.capsule_news === true, r.error)
  r = await attempt('select * from public.open_capsule($1)', [code])
  const items = r.result?.rows ?? []
  check(
    'keeper opens it: the letter first, signed, then the photos in order',
    items.length === 3 && items[0].body === 'For your 18th birthday' && items[0].from_name === 'Mum'
      && items[1].photo_path.endsWith('/a.webp') && items[2].photo_path.endsWith('/b.webp') && items[1].from_name === null,
    r.error ?? JSON.stringify(items),
  )
  r = await attempt('select * from public.get_house($1)', [code])
  check('news goes away after opening', r.result?.rows[0]?.capsule_news === false, r.error)
  r = await attempt(`select name from storage.objects where bucket_id = 'capsule'`)
  check('keeper sees capsule files once open', r.result?.rows.length === 1, r.error)
  r = await seal(await inDays(50), null, 'late')
  check('re-sealing an open capsule is refused', r.error?.includes('already sealed'), r.error)

  // Deleting an opened capsule, to start a new one
  const remove = () => attempt('select public.delete_opened_capsule($1)', [code])
  const itemsLeft = async () => {
    await as(null)
    return (await db.query('select count(*)::int n from public.capsule_items where house_id = $1', [houseId])).rows[0].n
  }
  await as('anon')
  r = await remove()
  check('visitor cannot delete an opened capsule', Boolean(r.error), r.error)
  await as(STRANGER)
  r = await remove()
  check('stranger cannot delete an opened capsule', Boolean(r.error), r.error)
  await as(ADMIN)
  r = await remove()
  check('admin cannot delete an opened capsule', Boolean(r.error), r.error)
  await as(null)
  await db.query('insert into public.house_helpers (house_id, user_id) values ($1, $2)', [houseId, STRANGER])
  await as(STRANGER)
  r = await remove()
  check('helper cannot delete an opened capsule', r.error?.includes('Only the keeper'), r.error)
  check('none of them removed anything', (await itemsLeft()) === 3)

  await as(KEEPER)
  r = await remove()
  check('keeper deletes the opened capsule', !r.error, r.error)
  check('everything inside went with it', (await itemsLeft()) === 0)
  await as(KEEPER)
  r = await attempt('select * from public.get_capsule($1)', [code])
  check('the house has no capsule now', r.result?.rows.length === 0, r.error)
  r = await remove()
  check('deleting twice (double tap) is harmless', !r.error, r.error)
  r = await attempt('select * from public.get_house($1)', [code])
  check('no capsule news after deleting', r.result?.rows[0]?.capsule_news === false, r.error)
  r = await attempt(`select name from storage.objects where bucket_id = 'capsule'`)
  check('old capsule files can no longer be read', r.result?.rows.length === 0, r.error)

  await as(null)
  await db.query(`update storage.objects set created_at = now() - interval '8 days' where bucket_id = 'capsule' and name = $1`, [`${houseId}/a.webp`])
  const leftover = (await db.query(LEFTOVER_FILES_SQL)).rows.map((file) => file.name)
  check('the nightly tidy-up will remove the old photo files', leftover.includes(`${houseId}/a.webp`))

  // And a new one, which is as locked as the first
  await as(KEEPER)
  r = await attempt(`insert into storage.objects (bucket_id, name, owner) values ('capsule', $1, $2)`, [`${houseId}/new.webp`, KEEPER])
  check('keeper can upload photos for a new capsule', !r.error, r.error)
  r = await seal(await inDays(40), 'Mum', 'A new one', [photo('new')])
  check('keeper seals a new capsule', !r.error, r.error)
  r = await remove()
  check('a capsule that is still locked cannot be deleted', r.error?.includes('still locked'), r.error)
  r = await attempt('select * from public.open_capsule($1)', [code])
  check('the new capsule is locked too', r.error?.includes('still locked'), r.error)

  await as(null)
}
