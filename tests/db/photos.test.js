// Database tests for the photo frames inside a house. Run with: npm run test:db
import { KEEPER, SECOND } from './tools.js'
import { LEFTOVER_FILES_SQL } from '../../scripts/backup/shared.js'

export default async function run(db, { as, attempt, check, addUsers, addHouse }) {
  await as(null)
  await addUsers(KEEPER, SECOND)
  const { id: houseId, code } = await addHouse(KEEPER, { claimed: true })

  let r = await attempt(`select public from storage.buckets where id = 'photos'`)
  check('photos bucket is public (files have long random names)', r.result?.rows[0]?.public === true, r.error)

  await as(KEEPER)
  const hang = (path, slot) => attempt('insert into public.photos (house_id, path, slot, caption) values ($1, $2, $3, $4)',
    [houseId, `${houseId}/${path}`, slot, 'Hi'])
  r = await hang('a.webp', 0)
  check('keeper hangs a photo in frame 0', !r.error, r.error)
  r = await hang('b.webp', 0)
  check('a second photo in the same frame is refused', Boolean(r.error), r.error)
  r = await hang('c.webp', 5)
  check('frame 5 is refused (there are only 5 frames)', Boolean(r.error), r.error)

  await as(SECOND)
  r = await hang('e.webp', 1)
  check("stranger cannot hang a photo in someone's house", Boolean(r.error), r.error)

  await as('anon')
  r = await attempt('select * from public.get_house_photos($1)', [code])
  check('visitor with the link sees the photo', r.result?.rows.length === 1 && r.result.rows[0].caption === 'Hi', r.error)
  r = await attempt('select * from public.get_house_photos($1)', ['NOSUCHCODE'])
  check('a wrong code shows no photos', r.result?.rows.length === 0, r.error)
  r = await attempt('select * from public.photos')
  check('visitor cannot read the photos table directly', Boolean(r.error), r.error)

  // ---------- The small copy for the frames ----------
  await as(KEEPER)
  const hangWithSmall = (name, small, slot) => attempt(
    'insert into public.photos (house_id, path, small_path, slot) values ($1, $2, $3, $4)',
    [houseId, `${houseId}/${name}.webp`, small, slot],
  )
  r = await hangWithSmall('f', `${houseId}/f-small.webp`, 1)
  check('keeper hangs a photo with a small copy', !r.error, r.error)
  r = await hangWithSmall('g', 'some-other-house/g-small.webp', 2)
  check("a small copy in another house's folder is refused", Boolean(r.error), r.error)
  r = await attempt('update public.photos set small_path = $1 where house_id = $2', [`${houseId}/x.webp`, houseId])
  check('the small copy cannot be changed afterwards', Boolean(r.error), r.error)

  await as('anon')
  r = await attempt('select * from public.get_house_photos($1)', [code])
  const withSmall = r.result?.rows.find((photo) => photo.slot === 1)
  const withoutSmall = r.result?.rows.find((photo) => photo.slot === 0)
  check('a visitor gets the small copy address', withSmall?.small_path === `${houseId}/f-small.webp`, r.error)
  check('an older photo simply has no small copy', withoutSmall && withoutSmall.small_path === null, r.error)

  // The nightly tidy-up must never take a small copy for a left-over file (Q7).
  await as(null)
  const addFile = (name) => db.query(
    `insert into storage.objects (bucket_id, name, created_at) values ('photos', $1, now() - interval '30 days')`,
    [name],
  )
  await addFile(`${houseId}/f.webp`)
  await addFile(`${houseId}/f-small.webp`)
  await addFile(`${houseId}/forgotten.webp`)
  r = await attempt(LEFTOVER_FILES_SQL)
  const leftover = (r.result?.rows ?? []).map((file) => file.name).filter((name) => name.startsWith(houseId))
  check('tidy-up finds the forgotten file', leftover.includes(`${houseId}/forgotten.webp`), r.error)
  check('tidy-up leaves the full photo alone', !leftover.includes(`${houseId}/f.webp`))
  check('tidy-up leaves the small copy alone', !leftover.includes(`${houseId}/f-small.webp`))

  await as(KEEPER)
  r = await attempt('delete from public.photos where house_id = $1', [houseId])
  check('keeper takes the photos down', r.result?.rowCount === 2, r.error)

  // ---------- The album: photos without a frame, up to 30 in a house ----------
  r = await hang('wall.webp', 0)
  check('a framed photo first', !r.error, r.error)
  r = await hang('album-1.webp', null)
  check('keeper adds a photo to the album, no frame', !r.error, r.error)
  r = await hang('album-2.webp', null)
  check('several album photos are fine', !r.error, r.error)

  const move = (name, slot) => attempt('update public.photos set slot = $1 where path = $2', [slot, `${houseId}/${name}.webp`])
  r = await move('album-1', 1)
  check('an album photo can be hung in a free frame', r.result?.rowCount === 1, r.error)
  r = await move('album-2', 1)
  check('but not in a frame that is taken', Boolean(r.error), r.error)
  r = await move('album-2', 5)
  check('and not in a frame that does not exist', Boolean(r.error), r.error)
  r = await move('wall', null)
  check('a framed photo can move to the album', r.result?.rowCount === 1, r.error)

  // Everything in this rolled-back test happens at the same moment, so give the last photo a later time.
  await as(null)
  await db.query(`update public.photos set created_at = now() + interval '1 minute' where path = $1`, [`${houseId}/album-2.webp`])
  await as('anon')
  r = await attempt('select slot, path from public.get_house_photos($1)', [code])
  const order = r.result?.rows.map((photo) => photo.path.split('/')[1]).join(' ')
  check('the frames come first, then the album, oldest first', order === 'album-1.webp wall.webp album-2.webp', order ?? r.error)
  r = await attempt('update public.photos set slot = null where house_id = $1', [houseId])
  check('a visitor cannot move photos', Boolean(r.error), r.error)

  await as(SECOND)
  r = await attempt('update public.photos set slot = 3 where house_id = $1', [houseId])
  check("a stranger's move changes nothing", !r.error && r.result?.rowCount === 0, r.error)

  await as(KEEPER)
  for (let i = 3; i < 30; i++) await hang(`fill-${i}.webp`, null)
  r = await attempt('select count(*)::int as n from public.photos where house_id = $1', [houseId])
  check('a house fills up to 30 photos', r.result?.rows[0].n === 30, JSON.stringify(r.result?.rows[0]))
  r = await hang('one-too-many.webp', null)
  check('the 31st is refused', r.error?.includes('room for 30'), r.error)
  r = await move('album-2', 2)
  check('a full house can still move photos around', r.result?.rowCount === 1, r.error)
  r = await attempt('delete from public.photos where path = $1', [`${houseId}/album-2.webp`])
  check('deleting one', r.result?.rowCount === 1, r.error)
  r = await hang('room-again.webp', null)
  check('makes room for a new one', !r.error, r.error)

  // ---------- What the admin page shows ----------
  r = await attempt('select * from public.admin_storage_use()')
  check('a keeper cannot see how much storage is used', r.error?.includes('Admins only'), r.error)
  await as('anon')
  r = await attempt('select * from public.admin_storage_use()')
  check('nor can a visitor', Boolean(r.error), r.error)
  await as(null)
  await db.query('insert into public.admins (user_id) values ($1)', [SECOND])
  await as(SECOND)
  r = await attempt('select * from public.admin_storage_use()')
  check('an admin can', r.result?.rows[0]?.files > 0 && Number(r.result.rows[0].bytes) >= 0, r.error)

  await as(null)
}
