// The landing page stays light (Q6): it must not download the town, the database client or the texts
// for the other pages. Those texts must still be there once someone moves on, in both languages.
// Run with: npm run test:browser -- landing
import enApp from '../../src/i18n/en-app.js'
import { wait } from './kit.js'

// Text keys look like "signin.title". If one shows up on screen, its text didn't load.
const KEYS = Object.keys(enApp).filter((key) => key.includes('.'))

function keysOnScreen(page) {
  return page.evaluate((keys) => {
    const shown = document.body.innerText
    return keys.filter((key) => shown.includes(key))
  }, KEYS)
}

export default async function run({ check, openPage, clickText, waitForText, base }) {
  for (const lang of ['en', 'ka']) {
    const page = await openPage(null, { lang })
    const downloads = []
    page.on('request', (request) => downloads.push(new URL(request.url()).pathname))
    await page.reload()
    await page.waitForSelector('.landing-footer')
    await wait(1000)

    const heavy = downloads.filter((file) => /-app\.js|TownApp|supabase|three/.test(file))
    check(`${lang} landing: doesn't download the other pages' texts, the town or the database client`,
      heavy.length === 0, heavy.join(', '))
    const onLanding = await keysOnScreen(page)
    check(`${lang} landing: no text keys on screen`, onLanding.length === 0, onLanding.join(', '))
    const pictures = await page.$$eval('.step > svg', (all) => all.map((each) => each.getBoundingClientRect().width))
    check(`${lang} landing: the three step pictures are the same size`,
      pictures.length === 3 && new Set(pictures).size === 1, pictures.join(', '))

    await clickText(page, 'a', lang === 'en' ? 'Sign in' : 'შესვლა')
    await page.waitForSelector('form', { timeout: 30000 })
    const missing = await keysOnScreen(page)
    check(`${lang} sign-in (reached from the landing page): every text loaded`, missing.length === 0, missing.join(', '))

    await page.goto(`${base}/town`)
    await waitForText(page, 'body', lang === 'en' ? 'Slide your finger' : 'გაასრიალეთ', 45000)
    const missingInTown = await keysOnScreen(page)
    check(`${lang} town (opened directly): every text loaded`, missingInTown.length === 0, missingInTown.join(', '))
  }
}
