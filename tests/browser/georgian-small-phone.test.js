// Georgian texts are longer: nothing may scroll sideways on a 360 px phone, and on a small
// 360x640 screen the keeper's panel must leave room for the photo wall (QA Q2).
// Run with: npm run test:browser -- georgian
import { wait } from './kit.js'

export default async function run({ check, newUser, newHouse, openPage, base }) {
  const keeper = await newUser('ka')
  const house = await newHouse(keeper.id, { title: 'ნინოს სახლი' })
  const sideways = (page) => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)

  const page = await openPage(keeper, { lang: 'ka', width: 360, height: 740 })
  await page.goto(`${base}/h/${house.code}/inside`)
  await page.waitForSelector('.room-export', { timeout: 60000 })
  await wait(1000)
  check('the room in Georgian has no sideways scroll', !(await sideways(page)))
  await (await page.$$('.room-card'))[1].click()
  await page.waitForSelector('#capsule-date')
  check('the capsule page in Georgian has no sideways scroll', !(await sideways(page)))
  await page.click('.letters-head button')
  await wait(300)
  await (await page.$$('.room-card'))[2].click()
  await page.waitForSelector('.letters-inner .big-button')
  await page.click('.letters-inner .big-button.accent')
  await page.waitForSelector('.invite-box')
  check('the helpers page in Georgian has no sideways scroll', !(await sideways(page)))

  // Done with this page. Each one keeps a software-drawn 3D street running underneath the room,
  // and two at once can make the next page time out on a computer short of memory.
  await page.close()

  const small = await openPage(keeper, { lang: 'ka', width: 360, height: 640 })
  await small.goto(`${base}/h/${house.code}/inside`)
  await small.waitForSelector('.room-export', { timeout: 60000 })
  await wait(1500)
  const sheet = await small.$eval('.room-sheet', (e) => ({ top: e.getBoundingClientRect().top, scrolls: getComputedStyle(e).overflowY }))
  check("on 360x640 the keeper's panel leaves the top 40% for the wall", sheet.top >= 640 * 0.4, JSON.stringify(sheet))
  check('and the panel scrolls', ['auto', 'scroll'].includes(sheet.scrolls), sheet.scrolls)
}
