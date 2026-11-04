// Georgian text must stay readable: no spaced-out capitals (a style meant for English labels),
// and nothing tiny. Run with: npm run test:browser -- georgian-text
import { wait } from './kit.js'

// Below this is too small. The tabs in the decorating panel are the smallest Georgian text we allow.
const SMALLEST_PX = 14.5

// Every element with Georgian words of its own that breaks the rules.
function badGeorgianText(page) {
  return page.evaluate((smallest) => {
    const bad = []
    for (const element of document.querySelectorAll('body *')) {
      const words = [...element.childNodes].filter((node) => node.nodeType === 3).map((node) => node.textContent).join(' ').trim()
      if (!/[\u10A0-\u10FF\u1C90-\u1CBF]/.test(words)) continue
      const style = getComputedStyle(element)
      const spaced = style.letterSpacing !== 'normal' && parseFloat(style.letterSpacing) > 0
      if (parseFloat(style.fontSize) < smallest || spaced || style.textTransform !== 'none') {
        bad.push(`${words.slice(0, 24)} (${style.fontSize}, ${style.letterSpacing}, ${style.textTransform})`)
      }
    }
    return bad
  }, SMALLEST_PX)
}

export default async function run({ check, openPage, base }) {
  const page = await openPage(null, { lang: 'ka' })
  const pages = [
    ['the landing page', '/', '.landing-footer'],
    ['the sign-in page', '/signin', 'form'],
    ['the town map', '/map', '.map-place'],
    ['the terms', '/terms', '.legal-body'],
    ['the demo street', '/town', '.hint'],
  ]
  for (const [name, address, ready] of pages) {
    await page.goto(base + address)
    await page.waitForSelector(ready, { timeout: 60000 })
    await wait(500)
    const bad = await badGeorgianText(page)
    check(`${name}: Georgian text is readable`, bad.length === 0, bad.join(' / '))
  }

  // Still on the demo street: on a phone the top bar's buttons stay in one line, with no tagline on the hills.
  const bar = await page.evaluate(() => ({
    back: document.querySelector('.top-bar-title .pill-button').getBoundingClientRect().top,
    language: document.querySelector('.top-bar-buttons .pill-button').getBoundingClientRect().top,
    tagline: getComputedStyle(document.querySelector('.top-bar-tagline')).display,
  }))
  check('on a phone the back button is level with the other buttons', Math.abs(bar.back - bar.language) < 2, JSON.stringify(bar))
  check('on a phone the tagline is hidden', bar.tagline === 'none', bar.tagline)

  // Then open the decorating panel.
  await page.evaluate(() => document.querySelector('.house-label').click())
  await page.waitForSelector('.tab')
  await wait(500)
  let bad = await badGeorgianText(page)
  check('the decorating panel: Georgian text is readable', bad.length === 0, bad.join(' / '))
  const sideways = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
  check('the decorating panel: the page does not scroll sideways', !sideways)

  // English keeps its small spaced labels: this is a Georgian fix only.
  const english = await openPage(null, { lang: 'en' })
  await english.goto(base + '/')
  await english.waitForSelector('.step-number')
  const label = await english.$eval('.step-number', (element) => {
    const style = getComputedStyle(element)
    return `${style.fontSize} ${style.letterSpacing} ${style.textTransform}`
  })
  check('English labels are unchanged', label === '14px 1px uppercase', label)
}
