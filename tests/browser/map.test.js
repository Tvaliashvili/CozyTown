// The town map: a visitor taps from the map to a street and back, and an admin adds a street,
// opens it and moves a house there. Run with: npm run test:browser -- map
import enApp from '../../src/i18n/en-app.js'
import { wait } from './kit.js'

const MAP_KEYS = Object.keys(enApp).filter((key) => key.startsWith('map.'))

export default async function run({ db, check, newUser, newHouse, openPage, clickText, waitForText, text, base }) {
  const secretTitle = `Private name ${Date.now()}`
  const house = await newHouse(null, { title: secretTitle })

  // ---------- A visitor on the map ----------
  const page = await openPage(null, { lang: 'en' })
  const downloads = []
  const answers = []
  page.on('request', (request) => downloads.push(new URL(request.url()).pathname))
  page.on('response', async (response) => {
    if (response.url().includes('/rest/v1/')) answers.push(await response.text().catch(() => ''))
  })
  await page.goto(`${base}/map`, { waitUntil: 'networkidle0' })
  await page.waitForSelector('.map-place')

  const heavy = downloads.filter((file) => /three|TownApp|StreetVisit/.test(file))
  check('the map downloads no 3D', heavy.length === 0, heavy.join(', '))
  const names = await page.$$eval('.map-place strong', (all) => all.map((each) => each.textContent))
  check('the map shows all four neighbourhoods',
    ['Old Town', 'Riverside', 'Snowy Hills', 'The Garden Quarter'].every((name) => names.includes(name)), names.join(', '))
  const opened = await page.$$eval('.map-place.open strong', (all) => all.map((each) => each.textContent))
  check('the Old Town is marked open', opened.includes('Old Town'), opened.join(', '))
  const sizes = await page.$$eval('.map-place', (all) => all.map((each) => each.getBoundingClientRect().height))
  check('every name is big enough to tap', sizes.every((height) => height >= 48), sizes.join(', '))
  const scrolls = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
  check('the page does not scroll sideways', !scrolls)

  // A neighbourhood with no open street
  await clickText(page, '.map-place', 'The Garden Quarter')
  await page.waitForSelector('.map-sheet')
  check('a closed neighbourhood says it opens later', (await text(page, '.map-sheet')).includes('Nobody lives here yet'))
  check('no street to enter there', !(await page.$('.map-street')))

  await page.goBack()
  await page.waitForFunction(() => !document.querySelector('.map-sheet'))
  check("the phone's Back closes the sheet and stays on the map", new URL(page.url()).pathname === '/map')

  // Into a street, by tapping the drawing itself (the Old Town's houses, away from its name)
  const board = await page.$eval('.map-board', (each) => {
    const box = each.getBoundingClientRect()
    return { left: box.left, top: box.top, width: box.width, height: box.height }
  })
  await page.mouse.click(board.left + board.width * 0.12, board.top + board.height * 0.56)
  await page.waitForSelector('.map-sheet')
  check('tapping the drawn houses opens their neighbourhood', (await text(page, '#map-sheet-title')) === 'Old Town')
  await page.waitForSelector('.map-street')
  const sheetText = await text(page, '.map-sheet')
  check('the sheet names the street without plot numbers', sheetText.includes('First Street') && !/\d of \d/.test(sheetText), sheetText)
  await page.click('.map-street')
  await page.waitForSelector('canvas', { timeout: 60000 })
  await waitForText(page, '.top-bar-title', 'First Street')
  check('the street opens from the map', new URL(page.url()).pathname === '/map/first-street')
  check('no house is singled out', !(await page.$('.house-label')))
  check('no button to claim or decorate a house', !(await page.$('.gift-call')))
  check('no second map button on a street reached from the map', !(await page.$('.top-bar-buttons a[href="/map"]')))
  await wait(500)
  const said = answers.join(' ')
  check("nothing sent to the visitor holds a house's name or code", !said.includes(secretTitle) && !said.includes(house.code))
  check('no name on screen', !(await text(page, 'body')).includes(secretTitle))

  await page.click('.top-bar-title a.pill-button')
  await page.waitForSelector('.map-place')
  await wait(300)
  check('the back button returns to the map, with the sheet closed', new URL(page.url()).pathname === '/map' && !(await page.$('.map-sheet')))

  // ---------- From a house to the map and back ----------
  await page.goto(`${base}/h/${house.code}`)
  await page.waitForSelector('canvas', { timeout: 60000 })
  await page.waitForSelector('.top-bar-buttons a[href="/map"]')
  check("a house's street has a button to the map", true)
  await page.click('.top-bar-buttons a[href="/map"]')
  await page.waitForSelector('.map-place')
  await page.click('.map-nav a.pill-button')
  await page.waitForSelector('canvas', { timeout: 60000 })
  check("the map's back arrow returns to the house", new URL(page.url()).pathname === `/h/${house.code}`)
  // Leave this page on something light: a 3D street starting up (software-drawn here) is enough to make
  // the next page's load time out.
  await page.goto(`${base}/map`)
  await page.waitForSelector('.map-place')

  // ---------- In Georgian ----------
  const georgian = await openPage(null, { lang: 'ka' })
  await georgian.goto(`${base}/map`)
  await georgian.waitForSelector('.map-place')
  await clickText(georgian, '.map-place', 'ძველი ქალაქი')
  await georgian.waitForSelector('.map-sheet')
  const shownKeys = await georgian.evaluate((keys) => keys.filter((key) => document.body.innerText.includes(key)), MAP_KEYS)
  check('Georgian: every text is there', shownKeys.length === 0, shownKeys.join(', '))
  const small = await openPage(null, { lang: 'ka', width: 320, height: 568 })
  await small.goto(`${base}/map`)
  await small.waitForSelector('.map-place')
  const insideScreen = await small.$$eval('.map-place', (all) =>
    all.every((each) => {
      const box = each.getBoundingClientRect()
      return box.left >= 0 && box.right <= window.innerWidth
    }))
  check('Georgian on a small phone: every name stays on screen', insideScreen)

  // ---------- Streets that can't be visited ----------
  const missing = await openPage(null, { lang: 'en' })
  await missing.goto(`${base}/map/no-such-street`)
  await waitForText(missing, '.dialog', 'isn’t open yet')
  check('an unknown street gets a kind message', Boolean(await missing.$('.dialog a[href="/map"]')))

  // ---------- The admin ----------
  const streetName = `Map Test ${Date.now()}`
  const slug = streetName.toLowerCase().replace(/ /g, '-')
  try {
    const founder = await newUser('map')
    await db.query('insert into public.admins (user_id) values ($1)', [founder.id])
    const admin = await openPage(founder)
    await admin.goto(`${base}/admin`, { waitUntil: 'networkidle0' })
    await admin.waitForSelector('.admin-town')
    await clickText(admin, '.admin-town button', 'Add a street to The Garden Quarter')
    await admin.waitForSelector('.admin-town form')
    const boxes = await admin.$$('.admin-town form input')
    await boxes[0].type(streetName)
    await boxes[1].type('სატესტო ქუჩა')
    await clickText(admin, '.admin-town form button', 'Add it')
    await waitForText(admin, '.admin-street', streetName)
    const inRow = (selector) => admin.evaluateHandle((name, s) =>
      [...document.querySelectorAll('.admin-street')].find((row) => row.textContent.includes(name)).querySelector(s), streetName, selector)
    check('a new street starts closed', (await (await inRow('.chip')).evaluate((chip) => chip.textContent)) === 'Closed')

    await page.goto(`${base}/map/${slug}`)
    await waitForText(page, '.dialog', 'isn’t open yet')
    check('a closed street cannot be visited from outside', true)

    await (await inRow('button')).evaluate((button) => button.click())
    await admin.waitForFunction((name) =>
      [...document.querySelectorAll('.admin-street')].some((row) => row.textContent.includes(name) && row.querySelector('.chip.green')), {}, streetName)
    check('the admin opens it', true)

    await page.goto(`${base}/map`)
    await page.waitForSelector('.map-place')
    await clickText(page, '.map-place', 'The Garden Quarter')
    await waitForText(page, '.map-sheet', streetName)
    const sheet = await text(page, '.map-sheet')
    check('it appears on the map, with no plot numbers', sheet.includes(streetName) && !/\d of \d|plots/.test(sheet), sheet)

    // Move the house there; its link stays the same.
    const row = await admin.evaluateHandle((code) =>
      [...document.querySelectorAll('.admin-house')].find((each) => each.textContent.includes(code)), house.code)
    await row.evaluate((each) => [...each.querySelectorAll('button')].find((b) => b.textContent === 'Move').click())
    await admin.waitForFunction((each) => each.querySelector('select'), {}, row)
    const select = await row.$('select')
    await select.select(slug)
    await admin.waitForFunction((each) => !each.querySelector('.admin-plots .choice:disabled'), {}, row)
    check('picking a Garden Quarter street reminds the admin to check with the family',
      Boolean(await row.$('.admin-note')))
    await row.evaluate((each) => each.querySelectorAll('.admin-plots .choice')[2].click())
    await wait(100)
    await row.evaluate((each) => [...each.querySelectorAll('button')].find((b) => b.textContent === 'Move the house').click())
    await admin.waitForFunction((code, name) =>
      [...document.querySelectorAll('.admin-house')].some((each) => each.textContent.includes(code) && each.textContent.includes(`${name}, plot 3`)),
      { timeout: 15000 }, house.code, streetName)
    const { rows: [moved] } = await db.query(
      'select h.plot, s.slug from public.houses h join public.streets s on s.id = h.street_id where h.id = $1', [house.id])
    check('the admin moves a house to the new street', moved.slug === slug && moved.plot === 2, JSON.stringify(moved))
    const { rows: [{ quiet }] } = await db.query('select quiet from public.houses where id = $1', [house.id])
    check('in the Garden Quarter it became quiet', quiet === true)

    await page.goto(`${base}/h/${house.code}`)
    await page.waitForSelector('canvas', { timeout: 60000 })
    await waitForText(page, '.house-label', secretTitle)
    check('the house still opens with the same link', true)
  } finally {
    // The street and the move are real rows: undo them, so a test run leaves nothing behind.
    await db.query('delete from public.houses where id = $1', [house.id])
    await db.query('delete from public.streets where slug = $1', [slug])
  }
}
