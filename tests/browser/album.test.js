// The photo album: adding many at once, the frames filling first, moving photos between the wall and the
// album, going through them, the limit of 30, and what a visitor downloads.
// Set ALBUM_SHOTS=<folder> to also save pictures. Run with: npm run test:browser -- album
import path from 'node:path'
import { wait } from './kit.js'

export default async function run({ db, check, newUser, newHouse, openPage, clickText, waitForText, text, photoFile, base }) {
  const keeper = await newUser('album')
  const house = await newHouse(keeper.id, { title: 'Album test', design_submitted_at: new Date().toISOString() })
  const rows = async () => (await db.query('select id, path, small_path, slot, caption from public.photos where house_id = $1 order by created_at', [house.id])).rows
  const shot = async (page, name) => {
    if (process.env.ALBUM_SHOTS) await page.screenshot({ path: path.join(process.env.ALBUM_SHOTS, `${name}.png`) })
  }
  // Rows only: enough for counting and for the screen, with no files behind them. Removed with the house.
  const addRows = async (count, slots = []) => {
    for (let i = 0; i < count; i++) {
      await db.query(
        'insert into public.photos (house_id, path, slot, caption) values ($1, $2, $3, $4)',
        [house.id, `${house.id}/row-${crypto.randomUUID()}.webp`, slots[i] ?? null, `Row ${i}`],
      )
    }
  }
  const file = await photoFile()
  const choose = async (page, click, files) => {
    const [chooser] = await Promise.all([page.waitForFileChooser(), click()])
    await chooser.accept(files)
  }

  // ---------- Two photos at once: no questions, and the empty frames fill first ----------
  let page = await openPage(keeper)
  await page.goto(`${base}/h/${house.code}/inside`)
  await page.waitForSelector('.frame.empty', { timeout: 60000 })
  check('the keeper sees the album card', Boolean(await waitForText(page, '.room-card', 'Photo album', 10000).catch(() => null)))
  check('it says how much room there is', (await text(page, '.room-sheet')).includes('0 of 30 photos'))
  await shot(page, 'room-empty')
  await choose(page, () => page.click('.room-sheet .big-button.accent'), [file, file])
  await page.waitForFunction(() => document.querySelectorAll('.frame img').length === 2, { timeout: 60000 })
  let now = await rows()
  check('both photos arrived, in the first two frames', now.map((row) => row.slot).join() === '0,1', JSON.stringify(now.map((row) => row.slot)))
  check('both have small copies', now.every((row) => row.small_path))
  check('the progress box closes by itself', !(await page.$('.add-many-bar')))

  // ---------- Frames full: a new photo goes in the album ----------
  await addRows(13, [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14])
  await page.reload()
  await page.waitForSelector('.frame img', { timeout: 60000 })
  await page.waitForFunction(() => !document.querySelector('.frame.empty'))
  await choose(page, () => page.click('.room-sheet .big-button.accent'), [file])
  await page.waitForSelector('.add-photo button[type=submit]:not([disabled])', { timeout: 30000 })
  check('it asks about the album, not the wall', (await text(page, '#add-photo-title')).includes('album'))
  await page.type('#photo-caption', 'Summer')
  await page.click('.add-photo button[type=submit]')
  await page.waitForSelector('.add-photo', { hidden: true, timeout: 30000 })
  now = await rows()
  const inAlbum = now.find((row) => row.slot === null)
  check('it is saved with no frame, with its words', inAlbum?.caption === 'Summer', JSON.stringify(now.map((row) => [row.slot, row.caption])))

  // ---------- The album, and going through the photos ----------
  await page.click('.album-spot')
  await page.waitForSelector('.album-grid')
  check('the book on the shelf opens the album', (await text(page, '#album-title')).includes('Photo album'))
  check('it shows all 16 photos', (await page.$$('.album-photo')).length === 16)
  await shot(page, 'album')
  await (await page.$$('.album-photo'))[15].click()
  await page.waitForSelector('.viewer')
  check('tapping the last one opens it, 16 of 16', (await text(page, '.viewer-count')).includes('16 / 16'))
  check('its words show', (await text(page, '.viewer-caption')) === 'Summer')
  check('with a full wall it says why it can not be hung', (await text(page, '.viewer-note')).includes('All frames are full'))
  check('and offers no hang button', !(await page.$('.viewer-move')))
  await shot(page, 'viewer-album-photo')

  await page.click('.viewer-arrow.next')
  check('the next arrow goes round to the first', (await text(page, '.viewer-count')).includes('1 / 16'))
  await page.touchscreen.touchStart(300, 200)
  await page.touchscreen.touchMove(100, 205)
  await page.touchscreen.touchEnd()
  await wait(100)
  check('swiping left goes to the next one', (await text(page, '.viewer-count')).includes('2 / 16'), await text(page, '.viewer-count'))
  await shot(page, 'viewer-framed-photo')

  // ---------- Moving between the wall and the album ----------
  check('a framed photo can go to the album', (await text(page, '.viewer-move')).includes('album'))
  const framed = now.find((row) => row.slot === 1)
  await page.click('.viewer-move')
  await waitForText(page, '.viewer-move', 'Hang it', 15000)
  let moved = (await rows()).find((row) => row.id === framed.id)
  check('it has left its frame', moved.slot === null, String(moved.slot))
  await page.click('.viewer-move')
  await waitForText(page, '.viewer-move', 'album', 15000)
  moved = (await rows()).find((row) => row.id === framed.id)
  check('and can be hung again in the free frame', moved.slot === 1, String(moved.slot))

  // ---------- Back closes one thing at a time, Delete works from the album ----------
  await page.goBack()
  await page.waitForSelector('.viewer', { hidden: true })
  check('Back closes the photo and stays in the album', Boolean(await page.$('.album-grid')))
  const lastTile = (await page.$$('.album-photo'))[15]
  await lastTile.click()
  await page.waitForSelector('.viewer-delete')
  await page.click('.viewer-delete')
  await page.waitForSelector('.viewer-confirm .big-button.accent')
  await shot(page, 'viewer-confirm')
  await page.click('.viewer-confirm .big-button.accent')
  await page.waitForSelector('.viewer', { hidden: true, timeout: 15000 })
  await wait(800)
  check('a photo can be deleted from the album', (await page.$$('.album-photo')).length === 15)
  const { rows: left } = await db.query(`select name from storage.objects where bucket_id = 'photos' and name = any($1)`, [[inAlbum.path, inAlbum.small_path]])
  check('its files are gone too', left.length === 0, left.map((row) => row.name).join(', '))
  await page.goBack()
  await page.waitForSelector('.album-grid', { hidden: true })
  check('Back closes the album and stays in the room', Boolean(await page.$('.room-sheet')))

  // ---------- A visitor, when only the walls have photos ----------
  // One page at a time from here: each keeps a software-drawn 3D street running under the room,
  // and with two open the second can stall for minutes on a computer short of memory.
  await page.close()
  const wallOnly = await openPage(null)
  await wallOnly.goto(`${base}/h/${house.code}/inside`)
  await wallOnly.waitForSelector('.frame img', { timeout: 60000 })
  check('a visitor gets no album when the walls show everything', !(await wallOnly.$('.album-spot')) && !(await wallOnly.$('.room-sheet .room-card')))
  await wallOnly.close()

  // ---------- Choosing more than fits ----------
  await addRows(14)
  page = await openPage(keeper)
  await page.goto(`${base}/h/${house.code}/inside`)
  await page.waitForSelector('.frame img', { timeout: 60000 })
  await waitForText(page, '.room-card', '29 of 30', 20000)
  await choose(page, () => page.click('.room-sheet .big-button.accent'), [file, file, file])
  await waitForText(page, '.dialog', "2 didn't fit", 60000)
  check('what fits is added, and it says what did not', (await rows()).length === 30)
  await shot(page, 'too-many')
  await clickText(page, '.dialog button', 'OK')
  await page.waitForSelector('.dialog', { hidden: true })
  check('a full house says so, and offers no more adding',
    (await text(page, '.room-sheet .big-button.accent')).includes('The album is full')
    && await page.$eval('.room-sheet .big-button.accent', (button) => button.disabled))

  // ---------- A visitor in a full house: only what they look at downloads ----------
  await page.close()
  const visitor = await openPage(null)
  const fetched = new Set()
  visitor.on('request', (request) => {
    if (request.url().includes('/storage/v1/object/public/photos/')) fetched.add(request.url())
  })
  await visitor.goto(`${base}/h/${house.code}/inside`)
  await visitor.waitForSelector('.frame img', { timeout: 60000 })
  await wait(1500)
  console.log(`  (walking in: ${fetched.size} of the 15 frames download)`)
  check('walking in downloads only the frames near the screen', fetched.size <= 6, String(fetched.size))
  await visitor.click('.room-sheet .room-card')
  await visitor.waitForSelector('.album-grid')
  await wait(1000)
  const firstScreen = fetched.size
  console.log(`  (opening the album: ${firstScreen} of 30 small copies)`)
  check('opening a full album downloads about one screen, not all 30', firstScreen <= 16, String(firstScreen))
  check('a visitor can not add to it', !(await visitor.$('.letters .big-button.accent')))
  await shot(visitor, 'album-visitor')
  await visitor.evaluate(() => {
    const page = document.querySelector('.letters')
    page.scrollTop = page.scrollHeight
  })
  await wait(1000)
  check('scrolling down loads the rest', fetched.size > firstScreen, String(fetched.size))
  await (await visitor.$$('.album-photo'))[0].click()
  await visitor.waitForSelector('.viewer')
  check('a visitor can look, but not move or delete', !(await visitor.$('.viewer-move')) && !(await visitor.$('.viewer-delete')) && Boolean(await visitor.$('.viewer-arrow.next')))
  await visitor.close()

  // ---------- Georgian, on a small phone ----------
  const small = await openPage(keeper, { lang: 'ka', width: 320, height: 568 })
  await small.goto(`${base}/h/${house.code}/inside`)
  await small.waitForSelector('.frame img', { timeout: 60000 })
  await shot(small, 'room-320-ka')
  await small.click('.album-spot')
  await small.waitForSelector('.album-grid')
  await wait(500)
  check('the album has no sideways scroll on 320 px', !(await small.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)))
  await (await small.$$('.album-photo'))[0].click()
  await small.waitForSelector('.viewer-delete')
  await wait(500)
  const room = await small.evaluate(() => ({
    photo: document.querySelector('.viewer-photo').getBoundingClientRect().height,
    bottom: document.querySelector('.viewer-buttons').getBoundingClientRect().bottom,
    delete: document.querySelector('.viewer-delete').getBoundingClientRect().height,
  }))
  check('on 320x568 the photo keeps at least 180 px and the buttons fit', room.photo >= 180 && room.bottom <= 568, JSON.stringify(room))
  await shot(small, 'viewer-320-ka')
}
