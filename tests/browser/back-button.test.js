// The phone's Back button closes only the page on top, one step at a time (QA Q3).
// Run with: npm run test:browser -- back
import { wait } from './kit.js'

export default async function run({ check, newUser, newHouse, openPage, clickText, base }) {
  const keeper = await newUser('back')
  const house = await newHouse(keeper.id, { title: 'Back test' })
  const page = await openPage(keeper)
  const street = `/h/${house.code}`

  const back = async () => {
    await page.evaluate(() => history.back())
    await wait(700)
  }
  // Compares where we are with what we expect, e.g. { room: true, depth: 0 }.
  async function isAt(label, expect) {
    const now = await page.evaluate(() => ({
      path: location.pathname,
      depth: history.state?.overlayDepth ?? 0,
      room: Boolean(document.querySelector('.room')),
      dialog: document.querySelector('.letters h2')?.textContent ?? null,
      letterForm: Boolean(document.querySelector('.letters textarea')),
      sheet: Boolean(document.querySelector('.app.editing')),
    }))
    const wrong = Object.keys(expect).filter((key) => now[key] !== expect[key])
    check(label, wrong.length === 0, JSON.stringify(now))
  }

  await page.goto(base + street)
  await page.waitForSelector('.house-label', { timeout: 60000 })
  await wait(500)
  await page.click('.house-label')
  await wait(500)
  await isAt('decorating panel opens', { sheet: true, depth: 1 })
  await back()
  await isAt('Back closes the panel and stays on the house', { path: street, sheet: false, depth: 0 })

  await clickText(page, 'button', 'Go inside')
  await page.waitForSelector('.room-card')
  await wait(1500)
  await isAt('the room opens', { path: `${street}/inside`, room: true })

  await clickText(page, '.room-card', 'Letters')
  await wait(300)
  await isAt('letters open', { dialog: 'Letters', depth: 1 })
  await clickText(page, '.letters button', 'Write a letter')
  await wait(300)
  await isAt('writing a letter', { letterForm: true, depth: 2 })
  await back()
  await isAt('Back goes to the letters list', { dialog: 'Letters', letterForm: false, depth: 1, room: true })
  await back()
  await isAt('Back again goes to the room', { dialog: null, room: true, depth: 0, path: `${street}/inside` })

  await clickText(page, '.room-card', 'Letters')
  await wait(300)
  await clickText(page, '.letters-head button', 'Back')
  await wait(700)
  await isAt('the on-screen Back button closes letters', { dialog: null, room: true, depth: 0 })

  for (const name of ['Time capsule', 'Family helpers']) {
    await clickText(page, '.room-card', name)
    await wait(300)
    await isAt(`${name} opens`, { dialog: name, depth: 1 })
    await back()
    await isAt(`Back closes ${name}`, { dialog: null, room: true, depth: 0 })
  }

  // Reloading with a page open leaves a history step with nothing to close: it is skipped.
  await clickText(page, '.room-card', 'Letters')
  await wait(300)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.room-card', { timeout: 60000 })
  await wait(1000)
  await isAt('after a reload, the leftover step is skipped', { dialog: null, room: true, depth: 0 })
  await back()
  await isAt('Back from the room goes to the street', { path: street, room: false })

  await page.click('.top-bar-buttons button')
  await wait(500)
  await isAt('the share sheet opens', { sheet: true, depth: 1 })
  await clickText(page, 'a', 'Print a card')
  await wait(1500)
  await isAt('the card page opens', { path: `${street}/card` })
  await back()
  await page.waitForSelector('.house-label', { timeout: 60000 })
  await wait(500)
  await isAt('Back from the card returns to the street with nothing left open', { path: street, sheet: false, depth: 0 })
}
