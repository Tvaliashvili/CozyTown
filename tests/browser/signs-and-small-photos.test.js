// Small photo copies in the frames, and the mailbox flag from a keeper's point of view.
// (The 3D signs themselves are drawn on a canvas, so the page can't read them. Their rules are in
// tests/db/signs.test.js, and they are checked by eye: see "Street signs" in docs/QA.md.)
// Run with: npm run test:browser -- signs
import { wait } from './kit.js'

export default async function run({ db, check, newUser, newHouse, openPage, clickText, waitForText, photoFile, base }) {
  const keeper = await newUser('signs')
  const house = await newHouse(keeper.id, { title: 'Signs test', design_submitted_at: new Date().toISOString() })
  const flagIsUp = async () => (await db.query('select new_letter from public.get_house($1)', [house.code])).rows[0].new_letter

  // ---------- A photo goes up: two files, the frame shows the small one ----------
  const page = await openPage(keeper)
  await page.goto(`${base}/h/${house.code}/inside`)
  await page.waitForSelector('.frame.empty', { timeout: 60000 })
  const file = await photoFile()
  const [chooser] = await Promise.all([page.waitForFileChooser(), page.click('.frame.empty')])
  await chooser.accept([file])
  await page.waitForSelector('.add-photo button[type=submit]:not([disabled])', { timeout: 30000 })
  await page.click('.add-photo button[type=submit]')
  await page.waitForSelector('.frame img', { timeout: 30000 })

  const { rows: [photo] } = await db.query('select path, small_path from public.photos where house_id = $1', [house.id])
  check('a new photo has a small copy', Boolean(photo?.small_path), JSON.stringify(photo))
  check('the small copy is in the same house folder', photo?.small_path?.startsWith(`${house.id}/`))
  const sizes = await db.query(
    `select name, (metadata->>'size')::int as size from storage.objects where bucket_id = 'photos' and name = any($1)`,
    [[photo.path, photo.small_path]],
  )
  const sizeOf = (name) => sizes.rows.find((row) => row.name === name)?.size
  console.log(`  (full ${Math.round(sizeOf(photo.path) / 1024)} KB, small ${Math.round(sizeOf(photo.small_path) / 1024)} KB)`)
  check('the small copy is smaller than the full photo', sizeOf(photo.small_path) < sizeOf(photo.path))

  // ---------- A visitor's room downloads only the small copy, until they tap ----------
  const visitor = await openPage(null)
  const fetched = []
  visitor.on('request', (request) => {
    if (request.url().includes('/storage/v1/object/public/photos/')) fetched.push(request.url())
  })
  await visitor.goto(`${base}/h/${house.code}/inside`)
  await visitor.waitForSelector('.frame img', { timeout: 60000 })
  await visitor.waitForFunction(() => document.querySelector('.frame img')?.complete, { timeout: 15000 })
  const fileName = (path) => path.split('/').pop()
  check('the frame downloads the small copy', fetched.some((url) => url.includes(fileName(photo.small_path))), fetched.join(', '))
  check('the frame does not download the full photo', !fetched.some((url) => url.includes(fileName(photo.path))), fetched.join(', '))
  await visitor.click('.frame')
  await visitor.waitForSelector('.viewer img')
  const showsFull = await visitor.waitForFunction(
    (name) => document.querySelector('.viewer img')?.src.includes(name), { timeout: 15000 }, fileName(photo.path),
  ).then(() => true, () => false)
  check('tapping the frame opens the full photo', showsFull)

  // ---------- A photo from before small copies still works ----------
  await db.query(`update public.photos set small_path = null where house_id = $1`, [house.id])
  const older = await openPage(null)
  await older.goto(`${base}/h/${house.code}/inside`)
  await older.waitForSelector('.frame img', { timeout: 60000 })
  const olderSrc = await older.$eval('.frame img', (img) => img.src)
  check('an older photo shows its full file in the frame', olderSrc.includes(fileName(photo.path)), olderSrc)
  await db.query(`update public.photos set small_path = $2 where house_id = $1`, [house.id, photo.small_path])

  // ---------- Taking it down removes both files ----------
  await page.goto(`${base}/h/${house.code}/inside`)
  await page.waitForSelector('.frame img', { timeout: 60000 })
  await page.click('.frame')
  await page.waitForSelector('.viewer .big-button.soft')
  await page.click('.viewer .big-button.soft')
  await page.waitForSelector('.viewer-confirm .big-button.accent')
  await page.click('.viewer-confirm .big-button.accent')
  await page.waitForSelector('.viewer', { hidden: true, timeout: 15000 })
  await wait(1000)
  const { rows: left } = await db.query(`select name from storage.objects where bucket_id = 'photos' and name = any($1)`, [[photo.path, photo.small_path]])
  check('taking a photo down deletes both files', left.length === 0, left.map((row) => row.name).join(', '))

  // ---------- The mailbox flag ----------
  check('no letters yet: flag down', (await flagIsUp()) === false)
  await db.query(`insert into public.letters (house_id, from_name, body) values ($1, 'Mum', 'Thinking of you')`, [house.id])
  check('a letter from someone else: flag up', (await flagIsUp()) === true)

  await page.goto(`${base}/h/${house.code}/inside`)
  const glow = await waitForText(page, '.room-card.glowing', 'A new letter is waiting', 60000).then(() => true, () => false)
  check('the letters card tells the keeper', glow)
  check('just walking in leaves the flag up', (await flagIsUp()) === true)

  await clickText(page, '.room-card', 'Letters')
  await waitForText(page, '.letter-item', 'Mum', 15000)
  let down = false
  for (let i = 0; i < 25 && !down; i++) {
    await wait(200)
    down = (await flagIsUp()) === false
  }
  check('opening the letters puts the flag down', down)

  await page.goBack()
  const calm = await page.waitForFunction(
    () => !document.querySelector('.letters') && !document.querySelector('.room-card.glowing'), { timeout: 10000 },
  ).then(() => true, () => false)
  check('the letters card stops glowing', calm)
}
