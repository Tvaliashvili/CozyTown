// The time capsule, as a keeper: choose a day, seal a letter and a photo, try to move the day
// earlier (refused), then let the day come and open it. Run with: npm run test:browser -- capsule
import { daysFromNow, wait } from './kit.js'

export default async function run({ db, check, newUser, newHouse, openPage, clickText, waitForText, text, photoFile, base }) {
  const keeper = await newUser('capsule')
  const house = await newHouse(keeper.id, { title: 'Capsule test' })
  const page = await openPage(keeper)

  // Types a day into the date box the way React notices.
  const setDate = (value) => page.$eval('#capsule-date', (input, v) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, v)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  }, value)

  await page.goto(`${base}/h/${house.code}/inside`)
  await waitForText(page, '.room-card', 'Time capsule', 60000)
  await clickText(page, '.room-card', 'Time capsule')
  await page.waitForSelector('#capsule-date')

  await setDate('2020-01-01')
  await page.$eval('form.letter-form', (form) => form.requestSubmit())
  await wait(1500)
  check('a day in the past is not accepted', !(await page.$('.capsule-chest')))

  await setDate(daysFromNow(100))
  await clickText(page, 'button[type=submit]', 'Lock it')
  await page.waitForSelector('.capsule-chest', { timeout: 15000 })
  check('choosing a day locks the chest', true)

  await clickText(page, 'button', 'Put something in')
  await page.waitForSelector('#capsule-body')
  await page.type('#capsule-body', 'Dear Nino,\nThis was sealed by the test.')
  await page.type('#capsule-from', 'Mum')
  await (await page.$('.letter-form input[type=file]')).uploadFile(await photoFile())
  await page.waitForSelector('.capsule-photo-preview img', { timeout: 15000 })
  await clickText(page, 'button[type=submit]', 'Seal it')
  await page.waitForSelector('.capsule-sealed', { timeout: 20000 })
  check('a letter and a photo are sealed', true)

  await clickText(page, 'button', 'Move the day later')
  await page.waitForSelector('#capsule-date')
  await setDate(daysFromNow(50))
  await clickText(page, 'button[type=submit]', 'Lock it')
  await wait(2000)
  // The date box blocks it in the browser; the server's own refusal is in tests/db/capsule.test.js.
  const { rows: [kept] } = await db.query(`select opens_on::text opens from public.capsules where house_id = $1`, [house.id])
  check('moving the day earlier is refused', kept.opens === daysFromNow(100) && !(await page.$('.capsule-chest')), kept.opens)
  await setDate(daysFromNow(120))
  await clickText(page, 'button[type=submit]', 'Lock it')
  await page.waitForSelector('.capsule-chest', { timeout: 15000 })
  check('moving the day later works', true)
  await clickText(page, '.letters-head button', 'Back')

  // The day comes
  await db.query(`update public.capsules set opens_on = (now() at time zone 'Asia/Tbilisi')::date where house_id = $1`, [house.id])
  await page.goto(`${base}/h/${house.code}`)
  await page.waitForSelector('.street-actions', { timeout: 60000 })
  await page.waitForSelector('.capsule-news', { timeout: 15000 }).catch(() => {})
  check('the street tells the keeper it has opened', (await text(page, '.street-actions')).includes('time capsule has opened'))
  await clickText(page, '.street-actions button', 'Go inside')
  await page.waitForSelector('.room-card.glowing', { timeout: 20000 })
  check('the capsule card glows in the room', true)
  await page.click('.room-card.glowing')
  await page.waitForSelector('.capsule-opened', { timeout: 15000 })
  const photoShows = await page.waitForFunction(() => document.querySelector('.capsule-photo')?.naturalWidth > 0, { timeout: 15000 })
    .then(() => true, () => false)
  check('the opened capsule shows the photo', photoShows)
  check('the opened capsule shows the letter', (await text(page, '.letters-inner')).includes('sealed by the test'))

  await clickText(page, '.letters-head button', 'Back')
  await clickText(page, '.room-top button', 'Street')
  await wait(2000)
  check('the street notice is gone once seen', !(await text(page, '.street-actions')).includes('time capsule has opened'))
  const { rows: [chest] } = await db.query('select keeper_opened_at is not null seen from public.capsules where house_id = $1', [house.id])
  check('the database remembers it was seen', chest.seen)
}
