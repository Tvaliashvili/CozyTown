// Database tests for the time capsule. Run with: npm run test:db
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

  // Nobody else gets near it
  await as('anon')
  let r = await attempt('select * from public.get_capsule($1)', [code])
  check('visitor cannot see the capsule', Boolean(r.error), r.error)
  await as(STRANGER)
  r = await attempt('select * from public.get_capsule($1)', [code])
  check('stranger cannot see the capsule', r.error?.includes('Only the keeper'), r.error)
  r = await attempt('select public.set_capsule_date($1, $2)', [code, await inDays(30)])
  check('stranger cannot set a date', Boolean(r.error), r.error)
  await as(ADMIN)
  r = await attempt('select * from public.get_capsule($1)', [code])
  check('admin cannot see the capsule', Boolean(r.error), r.error)

  await as(KEEPER)
  r = await attempt('select * from public.get_capsule($1)', [code])
  check('keeper: no chest yet = no row', r.result?.rows.length === 0, r.error)
  r = await attempt(`select public.add_to_capsule($1, 'Mum', 'hello')`, [code])
  check('adding before a date is refused', r.error?.includes('opening date first'), r.error)
  r = await attempt('select public.set_capsule_date($1, $2)', [code, today])
  check('today is refused', r.error?.includes('in the future'), r.error)
  r = await attempt('select public.set_capsule_date($1, $2)', [code, '2200-01-01'])
  check('far future is refused', r.error?.includes('too far'), r.error)
  r = await attempt('select public.set_capsule_date($1, $2)', [code, await inDays(30)])
  check('keeper sets a date 30 days away', !r.error, r.error)
  r = await attempt('select public.set_capsule_date($1, $2)', [code, await inDays(10)])
  check('moving earlier is refused', r.error?.includes('only move later'), r.error)
  r = await attempt('select public.set_capsule_date($1, $2)', [code, await inDays(40)])
  check('moving later works', !r.error, r.error)

  r = await attempt(`select public.add_to_capsule($1, 'Mum', 'For your 18th birthday')`, [code])
  check('keeper puts a letter in', !r.error, r.error)
  r = await attempt(`select public.add_to_capsule($1, null, '   ')`, [code])
  check('empty item is refused', r.error?.includes('letter or a photo'), r.error)
  r = await attempt(`select public.add_to_capsule($1, null, null, $2, 800, 600)`, [code, `${houseId}/abc.webp`])
  check('keeper puts a photo in', !r.error, r.error)
  r = await attempt(`select public.add_to_capsule($1, null, null, $2, 800, 600)`, [code, `00000000-0000-0000-0000-000000000000/abc.webp`])
  check('photo from another folder is refused', Boolean(r.error), r.error)

  r = await attempt('select * from public.get_capsule($1)', [code])
  const chest = r.result?.rows[0]
  check('chest shows date, 2 items, locked', chest?.item_count === 2 && chest?.is_open === false && Boolean(chest?.opens_on), JSON.stringify(chest))
  r = await attempt('select * from public.open_capsule($1)', [code])
  check('keeper cannot open it early', r.error?.includes('still locked'), r.error)
  r = await attempt('select * from public.capsule_items')
  check('keeper cannot read the table directly', Boolean(r.error), r.error)
  r = await attempt('select * from public.capsules')
  check('keeper cannot read capsules table directly', Boolean(r.error), r.error)
  r = await attempt(`update public.capsules set opens_on = '2000-01-01'`)
  check('keeper cannot change the date directly', Boolean(r.error), r.error)
  r = await attempt('select * from public.get_house($1)', [code])
  check('no capsule news while locked', r.result?.rows[0]?.capsule_news === false, r.error)

  // Storage: put a file in while locked, but can't look at it
  r = await attempt(`insert into storage.objects (bucket_id, name, owner) values ('capsule', $1, $2)`, [`${houseId}/abc.webp`, KEEPER])
  check('keeper uploads a capsule photo while locked', !r.error, r.error)
  r = await attempt(`select name from storage.objects where bucket_id = 'capsule'`)
  check('keeper cannot see capsule files while locked', r.result?.rows.length === 0, r.error)
  await as(STRANGER)
  r = await attempt(`insert into storage.objects (bucket_id, name, owner) values ('capsule', $1, $2)`, [`${houseId}/evil.webp`, STRANGER])
  check('stranger cannot upload into the capsule', Boolean(r.error), r.error)

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
  check('the zip can read it on the day', r.result?.rows.length === 2, r.error)
  r = await attempt('select * from public.get_house($1)', [code])
  check('reading it for the zip keeps the news', r.result?.rows[0]?.capsule_news === true, r.error)
  r = await attempt('select * from public.open_capsule($1)', [code])
  check('keeper opens it on the day', r.result?.rows.length === 2 && r.result.rows[0].body === 'For your 18th birthday', r.error ?? JSON.stringify(r.result?.rows))
  r = await attempt('select * from public.get_house($1)', [code])
  check('news goes away after opening', r.result?.rows[0]?.capsule_news === false, r.error)
  r = await attempt(`select name from storage.objects where bucket_id = 'capsule'`)
  check('keeper sees capsule files once open', r.result?.rows.length === 1, r.error)
  r = await attempt(`select public.add_to_capsule($1, null, 'late')`, [code])
  check('adding after opening is refused', r.error?.includes('already open'), r.error)
  r = await attempt('select public.set_capsule_date($1, $2)', [code, await inDays(50)])
  check('re-locking an open capsule is refused', r.error?.includes('already open'), r.error)
  r = await attempt(`insert into storage.objects (bucket_id, name, owner) values ('capsule', $1, $2)`, [`${houseId}/late.webp`, KEEPER])
  check('uploading after opening is refused', Boolean(r.error), r.error)

  await as(null)
}
