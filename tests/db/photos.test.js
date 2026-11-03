// Database tests for the photo frames inside a house. Run with: npm run test:db
import { KEEPER, SECOND } from './tools.js'

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
  r = await hang('d.webp', null)
  check('a photo without a frame is refused', Boolean(r.error), r.error)

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

  await as(KEEPER)
  r = await attempt('delete from public.photos where house_id = $1', [houseId])
  check('keeper takes the photo down', r.result?.rowCount === 1, r.error)

  await as(null)
}
