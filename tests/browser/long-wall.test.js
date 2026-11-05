// The long wall in the room: it grows with the photos, swipes sideways, has arrows for people who wouldn't
// think to swipe, and only downloads the frames near the screen.
// Set WALL_SHOTS=<folder> to also save pictures. Run with: npm run test:browser -- long-wall
import fs from 'node:fs/promises'
import path from 'node:path'
import { wait } from './kit.js'

export default async function run({ db, check, newUser, newHouse, openPage, photoFile, base }) {
  const keeper = await newUser('wall')
  const house = await newHouse(keeper.id, { title: 'Long wall test', design_submitted_at: new Date().toISOString() })
  const file = await photoFile()
  const inside = `${base}/h/${house.code}/inside`

  // Rows only: enough for the wall, with no files behind them. Removed with the house.
  const hangInFrames = async (slots) => {
    await db.query('delete from public.photos where house_id = $1', [house.id])
    for (const slot of slots) {
      await db.query('insert into public.photos (house_id, path, slot) values ($1, $2, $3)', [house.id, `${house.id}/row-${crypto.randomUUID()}.webp`, slot])
    }
  }
  const upTo = (count) => [...Array(count).keys()]

  const shot = async (page, name) => {
    if (!process.env.WALL_SHOTS) return
    await wait(500)
    await page.screenshot({ path: path.join(process.env.WALL_SHOTS, `${name}.png`) })
  }
  // The rows have no files, so for the pictures every photo address answers with the test photo.
  const fakePhotos = async (page) => {
    if (!process.env.WALL_SHOTS) return
    const bytes = await fs.readFile(file)
    await page.setRequestInterception(true)
    page.on('request', (request) => {
      if (request.url().includes('/storage/v1/object/public/photos/')) request.respond({ status: 200, contentType: 'image/jpeg', body: bytes })
      else request.continue()
    })
  }
  const open = async (user, options) => {
    const page = await openPage(user, options)
    await fakePhotos(page)
    await page.goto(inside)
    await page.waitForSelector('.frame', { timeout: 60000 })
    await wait(600) // the arrows settle once the sizes are measured
    return page
  }
  const sizes = (page) => page.evaluate(() => {
    const wall = document.querySelector('.room-wall')
    return { left: wall.scrollLeft, visible: wall.clientWidth, whole: wall.scrollWidth, pageSideways: document.documentElement.scrollWidth > window.innerWidth }
  })
  const slide = async (page) => {
    await wait(700) // the smooth slide after an arrow press
  }

  // ---------- A new house: the room as it always was ----------
  await hangInFrames([])
  let page = await open(keeper)
  check('a new house shows the 5 frames of the first stretch', (await page.$$('.frame.empty')).length === 5)
  check('a phone shows it all, so no arrows', !(await page.$('.wall-arrow')))
  let now = await sizes(page)
  check('and nothing to scroll', now.whole <= now.visible, JSON.stringify(now))
  await shot(page, 'new-house')
  await page.close()

  // ---------- Five photos: the wall has grown, with two empty frames ahead ----------
  await hangInFrames(upTo(5))
  page = await open(keeper)
  check('5 photos and 2 empty frames ahead', (await page.$$('.frame')).length === 7 && (await page.$$('.frame.empty')).length === 2)
  check('there is more wall to the right', Boolean(await page.$('.wall-arrow.right')) && !(await page.$('.wall-arrow.left')))
  const peek = await page.$eval('[data-slot="5"]', (frame) => frame.getBoundingClientRect().left)
  check('the next frame peeks in at the edge of the screen', peek < 390, String(peek))
  await shot(page, 'five-photos')
  await page.close()

  // ---------- A new photo lands further along, off the screen: the wall goes there ----------
  await hangInFrames(upTo(7))
  page = await open(keeper)
  const before = await page.$eval('[data-slot="7"]', (frame) => frame.getBoundingClientRect().right)
  check('the next free frame starts off the screen', before > 390, String(before))
  const [chooser] = await Promise.all([page.waitForFileChooser(), page.click('.room-sheet .big-button.accent')])
  await chooser.accept([file])
  await page.waitForSelector('.add-photo button[type=submit]:not([disabled])', { timeout: 30000 })
  await page.click('.add-photo button[type=submit]')
  await page.waitForSelector('.add-photo', { hidden: true, timeout: 30000 })
  await page.waitForSelector('[data-slot="7"] img', { timeout: 15000 })
  await slide(page)
  const landed = await page.$eval('[data-slot="7"]', (frame) => {
    const box = frame.getBoundingClientRect()
    return { left: box.left, right: box.right, width: window.innerWidth }
  })
  check('the new photo is brought into view', landed.left >= 0 && landed.right <= landed.width, JSON.stringify(landed))
  check('the wall offers the way back', Boolean(await page.$('.wall-arrow.left')))
  await page.close()

  // ---------- A full wall: the arrows walk along it ----------
  await hangInFrames(upTo(15))
  page = await open(keeper)
  check('15 photos, no empty frames', (await page.$$('.frame img')).length >= 1 && (await page.$$('.frame')).length === 15 && !(await page.$('.frame.empty')))
  await shot(page, 'full-wall-1')
  let presses = 0
  while ((await page.$('.wall-arrow.right')) && presses < 10) {
    await page.click('.wall-arrow.right')
    await slide(page)
    presses += 1
    await shot(page, `full-wall-${presses + 1}`)
  }
  console.log(`  (a full wall takes ${presses} arrow presses on a 390 px phone)`)
  check('the right arrow reaches the end of the wall', presses >= 2 && presses <= 6, String(presses))
  check('where only the left arrow is left', Boolean(await page.$('.wall-arrow.left')) && !(await page.$('.wall-arrow.right')))
  check('the page itself never scrolls sideways', !(await sizes(page)).pageSideways)
  await page.click('.wall-arrow.left')
  const rightCame = await page.waitForSelector('.wall-arrow.right', { timeout: 20000 }).then(() => true, () => false)
  await slide(page)
  now = await sizes(page)
  check('the left arrow walks back', now.left > 0 && rightCame, JSON.stringify({ ...now, rightCame }))
  await page.close()

  // ---------- A real swipe ----------
  page = await open(keeper)
  await page.touchscreen.touchStart(330, 150)
  for (let x = 310; x >= 90; x -= 20) {
    await page.touchscreen.touchMove(x, 150)
    await wait(16)
  }
  await page.touchscreen.touchEnd()
  await slide(page)
  now = await sizes(page)
  check('a finger swiping along the wall moves it', now.left > 100, JSON.stringify(now))
  await page.close()

  // ---------- A visitor: only frames with photos, and only the ones near the screen download ----------
  const visit = await openPage(null)
  const fetched = new Set()
  visit.on('request', (request) => {
    if (request.url().includes('/storage/v1/object/public/photos/')) fetched.add(request.url())
  })
  await visit.goto(inside)
  await visit.waitForSelector('.frame img', { timeout: 60000 })
  await wait(1500)
  const atFirst = fetched.size
  console.log(`  (a visitor who doesn't swipe downloads ${atFirst} of 15)`)
  check('a visitor who does not swipe downloads only part of a full wall', atFirst >= 5 && atFirst <= 6, String(atFirst))
  while (await visit.$('.wall-arrow.right')) {
    await visit.click('.wall-arrow.right')
    await slide(visit)
  }
  await wait(500)
  check('walking the whole wall downloads the rest', fetched.size === 15, String(fetched.size))
  await visit.close()

  if (process.env.WALL_SHOTS) {
    page = await open(null)
    await shot(page, 'visitor-full-wall')
    await page.close()
  }

  // ---------- A visitor in a house with few photos: no bare wall, no empty frames ----------
  await hangInFrames(upTo(3))
  page = await open(null)
  check('3 photos: 3 frames and nothing to swipe', (await page.$$('.frame')).length === 3 && !(await page.$('.wall-arrow')))
  await shot(page, 'visitor-three-photos')
  await page.close()

  // ---------- A photo far along the wall stays reachable ----------
  await hangInFrames([0, 11])
  page = await open(null)
  check('a photo on the third stretch keeps the wall that long', Boolean(await page.$('.wall-arrow.right')) && (await page.$$('.frame')).length === 2)
  await page.close()

  // ---------- A computer: the end of the wall stops beside the sheet, not behind it ----------
  await hangInFrames(upTo(15))
  page = await open(keeper, { width: 1280, height: 800 })
  await shot(page, 'computer-start')
  await page.evaluate(() => {
    const wall = document.querySelector('.room-wall')
    wall.scrollLeft = wall.scrollWidth
  })
  // Waits rather than a fixed time: with the 3D street drawn in software, a busy computer took up to 7 seconds here.
  const arrowCame = await page.waitForSelector('.wall-arrow.left', { timeout: 20000 }).then(() => true, () => false)
  check('at the end of the wall the left arrow appears', arrowCame)
  const end = await page.evaluate(() => ({
    frames: Math.max(...[...document.querySelectorAll('.frame')].map((frame) => frame.getBoundingClientRect().right)),
    sheet: document.querySelector('.room-sheet').getBoundingClientRect().left,
  }))
  check('on a computer the last frames clear the sheet', end.frames <= end.sheet, JSON.stringify(end))
  const arrow = await page.$eval('.wall-arrow.left', (button) => button.getBoundingClientRect().right)
  check('and the arrow is on the wall, not under the sheet', arrow < end.sheet, String(arrow))
  await shot(page, 'computer-end')
  await page.close()

  // ---------- Georgian, on a small phone ----------
  page = await open(keeper, { lang: 'ka', width: 320, height: 568 })
  await shot(page, 'phone-320-ka')
  now = await sizes(page)
  check('no sideways page scroll on 320 px', !now.pageSideways, JSON.stringify(now))
  const size = await page.$eval('.frame', (frame) => frame.getBoundingClientRect().height)
  const label = await page.$eval('.wall-arrow.right', (button) => button.getAttribute('aria-label'))
  check('the arrow has its Georgian name', /[ა-ჰ]/.test(label), label)
  console.log(`  (first frame on 320x568: ${Math.round(size)} px tall)`)
  await page.close()
}
