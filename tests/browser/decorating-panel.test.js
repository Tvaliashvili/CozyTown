// The decorating panel on small screens: the choices must get real room (QA Q18), and every button
// must stay big enough for a thumb. Set PANEL_SHOTS=<folder> to also save pictures of each size.
// Run with: npm run test:browser -- decorating
import path from 'node:path'
import { wait } from './kit.js'

const SCREENS = [
  { width: 320, height: 568, lang: 'ka', room: 90 },
  { width: 360, height: 640, lang: 'ka', room: 120 },
  { width: 360, height: 640, lang: 'en', room: 120 },
  { width: 390, height: 844, lang: 'ka', room: 200 },
  // A phone held sideways: the panel moves to the side, as on a big screen.
  { width: 844, height: 390, lang: 'ka', room: 90 },
  { width: 768, height: 1024, lang: 'ka', room: 200 },
]

export default async function run({ check, newUser, newHouse, openPage, base }) {
  const keeper = await newUser('panel')
  const house = await newHouse(keeper.id, { title: 'Panel test' })

  for (const { width, height, lang, room } of SCREENS) {
    const name = `${width}x${height} ${lang}`
    const page = await openPage(keeper, { lang, width, height })
    await page.goto(`${base}/h/${house.code}`)
    await page.waitForSelector('.house-label', { timeout: 60000 })
    await page.evaluate(() => document.querySelector('.house-label').click())
    await page.waitForSelector('.customizer')
    await wait(800) // the panel's slide-up

    const sizes = await page.evaluate(() => {
      const height = (selector) => document.querySelector(selector)?.getBoundingClientRect().height ?? 0
      return {
        choices: height('.tab-panel'),
        // The panel is only as tall as it needs to be, so a short list of choices needs no more room.
        allFit: document.querySelector('.tab-panel').scrollHeight <= document.querySelector('.tab-panel').clientHeight,
        tab: height('.tab'),
        swatch: height('.swatch'),
        finish: height('.finish-button'),
        done: height('.customizer .pill-button'),
        sideways: document.documentElement.scrollWidth > window.innerWidth,
        panelTop: document.querySelector('.customizer').getBoundingClientRect().top,
      }
    })
    check(`${name}: all choices fit, or at least ${room} px for them`, sizes.allFit || sizes.choices >= room, JSON.stringify(sizes))
    check(`${name}: buttons stay thumb-sized`, [sizes.tab, sizes.swatch, sizes.finish, sizes.done].every((each) => each >= 44), JSON.stringify(sizes))
    check(`${name}: no sideways scroll`, !sizes.sideways)
    if (process.env.PANEL_SHOTS) await page.screenshot({ path: path.join(process.env.PANEL_SHOTS, `panel-${width}x${height}-${lang}.png`) })
    await page.close()
  }
}
