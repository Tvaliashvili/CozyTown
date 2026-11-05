// The time capsule, as a keeper: write a letter, add photos, pick the day, see the warning, lock it.
// Then nothing more can go in. Let the day come and open it. Run with: npm run test:browser -- capsule
import fs from 'node:fs'
import { daysFromNow, wait } from './kit.js'

export default async function run({ db, check, newUser, newHouse, openPage, clickText, waitForText, text, photoFile, base }) {
  const keeper = await newUser('capsule')
  const house = await newHouse(keeper.id, { title: 'Capsule test' })
  const page = await openPage(keeper)
  const photo = await photoFile()
  const secondPhoto = photo.replace(/\.jpg$/, '-2.jpg')
  fs.copyFileSync(photo, secondPhoto)
  const thumbnails = () => page.$$eval('.capsule-photo-list img', (imgs) => imgs.length)

  // Types a day into the date box the way React notices.
  const setDate = (value) => page.$eval('#capsule-date', (input, v) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, v)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  }, value)

  await page.goto(`${base}/h/${house.code}/inside`)
  await waitForText(page, '.room-card', 'Time capsule', 60000)
  await clickText(page, '.room-card', 'Time capsule')
  await page.waitForSelector('#capsule-date')
  check('everything is on one page: letter, photos and the day', Boolean(await page.$('#capsule-body')) && Boolean(await page.$('.letter-form input[type=file][multiple]')))

  await page.type('#capsule-body', 'Dear Nino,\nThis was sealed by the test.')
  await page.type('#capsule-from', 'Mum')
  await (await page.$('.letter-form input[type=file]')).uploadFile(photo, secondPhoto)
  await page.waitForFunction(() => document.querySelectorAll('.capsule-photo-list img').length === 2, { timeout: 20000 })
  check('two photos chosen at once both show', true)
  await page.click('.capsule-photo-remove')
  await wait(300)
  check('a photo can be taken out before locking', (await thumbnails()) === 1)
  await (await page.$('.letter-form input[type=file]')).uploadFile(secondPhoto)
  await page.waitForFunction(() => document.querySelectorAll('.capsule-photo-list img').length === 2, { timeout: 20000 })

  await setDate('2020-01-01')
  await page.$eval('form.letter-form', (form) => form.requestSubmit())
  await wait(800)
  check('a day in the past is not accepted', !(await page.$('.capsule-warning')))

  await setDate(daysFromNow(100))
  await clickText(page, 'button[type=submit]', 'Lock the time capsule')
  await page.waitForSelector('.capsule-warning')
  const warning = await text(page, '.capsule-warning')
  check('a warning says it can not be undone', warning.includes("can't add anything") && warning.includes('a letter and 2 photos'), warning)
  const { rows: [notYet] } = await db.query('select count(*)::int n from public.capsules where house_id = $1', [house.id])
  check('nothing is saved before saying yes', notYet.n === 0)

  await clickText(page, '.letter-form button', 'Go back and change')
  await page.waitForSelector('#capsule-body')
  check('going back keeps the letter and photos', (await page.$eval('#capsule-body', (t) => t.value)).includes('sealed by the test') && (await thumbnails()) === 2)

  await clickText(page, 'button[type=submit]', 'Lock the time capsule')
  await page.waitForSelector('.capsule-warning')
  await clickText(page, '.letter-form button', 'Yes, lock it')
  await page.waitForSelector('.capsule-sealed', { timeout: 30000 })
  check('after locking it shows the locked chest', Boolean(await page.$('.capsule-chest')))
  check('after locking nothing more can be added', !(await page.$('#capsule-body')) && !(await page.$('.letters input[type=file]')))
  const { rows: [kept] } = await db.query(
    `select c.opens_on::text opens, (select count(*)::int from public.capsule_items i where i.house_id = c.house_id) n
     from public.capsules c where c.house_id = $1`, [house.id])
  check('the database has the day and 3 things inside', kept?.opens === daysFromNow(100) && kept?.n === 3, JSON.stringify(kept))
  await clickText(page, '.letters-head button', 'Back')
  await waitForText(page, '.room-card', '3 things inside', 10000)
  check('the room card shows it is locked', (await text(page, '.room-sheet')).includes('3 things inside'))

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
  const photosShow = await page.waitForFunction(
    () => [...document.querySelectorAll('.capsule-photo')].filter((img) => img.naturalWidth > 0).length === 2,
    { timeout: 15000 },
  ).then(() => true, () => false)
  check('the opened capsule shows both photos', photosShow)
  check('the opened capsule shows the letter', (await text(page, '.letters-inner')).includes('sealed by the test'))

  await clickText(page, '.letters-head button', 'Back')
  await clickText(page, '.room-top button', 'Street')
  await wait(2000)
  check('the street notice is gone once seen', !(await text(page, '.street-actions')).includes('time capsule has opened'))
  const { rows: [chest] } = await db.query('select keeper_opened_at is not null seen from public.capsules where house_id = $1', [house.id])
  check('the database remembers it was seen', chest.seen)

  // Done with it: delete it and make a new one
  await clickText(page, '.street-actions button', 'Go inside')
  await page.waitForSelector('.room-card', { timeout: 20000 })
  await clickText(page, '.room-card', 'Time capsule')
  await page.waitForSelector('.capsule-start-over', { timeout: 15000 })
  await page.click('.capsule-start-over')
  await page.waitForSelector('.capsule-warning')
  const deleteWarning = await text(page, '.capsule-warning')
  check('deleting warns that it is for good, and how to keep a copy', deleteWarning.includes('gone for good') && deleteWarning.includes('Download everything'), deleteWarning)
  await clickText(page, '.letter-form button', 'No, keep it')
  await page.waitForSelector('.capsule-opened', { timeout: 15000 })
  const { rows: [stillThere] } = await db.query('select count(*)::int n from public.capsule_items where house_id = $1', [house.id])
  check('"No, keep it" keeps everything', stillThere.n === 3)
  await page.waitForSelector('.capsule-start-over', { timeout: 15000 })
  await page.click('.capsule-start-over')
  await page.waitForSelector('.capsule-warning')
  await page.goBack()
  await page.waitForSelector('.capsule-opened', { timeout: 15000 })
  check("the phone's Back button leaves the warning too", !(await page.$('.capsule-warning')))
  await page.waitForSelector('.capsule-start-over', { timeout: 15000 })
  await page.click('.capsule-start-over')
  await page.waitForSelector('.capsule-warning')
  await clickText(page, '.letter-form button', 'Yes, delete it')
  await page.waitForSelector('#capsule-date', { timeout: 15000 })
  check('after deleting, the form for a new capsule shows', true)
  const { rows: [gone] } = await db.query(
    `select (select count(*)::int from public.capsules where house_id = $1) chests, (select count(*)::int from public.capsule_items where house_id = $1) items`, [house.id])
  check('the database has no capsule left', gone.chests === 0 && gone.items === 0, JSON.stringify(gone))
  await wait(800)
  await page.type('#capsule-body', 'A second capsule.')
  await setDate(daysFromNow(10))
  await clickText(page, 'button[type=submit]', 'Lock the time capsule')
  await page.waitForSelector('.capsule-warning')
  await clickText(page, '.letter-form button', 'Yes, lock it')
  await page.waitForSelector('.capsule-sealed', { timeout: 30000 })
  check('a new capsule can be locked', Boolean(await page.$('.capsule-chest')))
  check('a locked capsule offers no delete button', !(await page.$('.capsule-start-over')))
  fs.rmSync(secondPhoto, { force: true })
}
