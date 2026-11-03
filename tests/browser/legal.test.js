// The Terms and Privacy pages: reachable from the landing page and the sign-in form, readable
// in both languages on a small phone. Run with: npm run test:browser -- legal
import { wait } from './kit.js'

export default async function run({ check, openPage, clickText, base }) {
  for (const lang of ['en', 'ka']) {
    const page = await openPage(null, { lang, width: 360, height: 740 })
    for (const which of ['terms', 'privacy']) {
      await page.goto(`${base}/${which}`)
      await page.waitForSelector('.legal-body h2', { timeout: 15000 })
      const shown = await page.evaluate(() => ({
        title: document.querySelector('.legal-top h1')?.textContent ?? '',
        sections: document.querySelectorAll('.legal-body h2').length,
        sideways: document.documentElement.scrollWidth > window.innerWidth,
        georgian: /[ა-ჿ]/.test(document.querySelector('.legal-body').textContent),
        longDash: /[–—]/.test(document.body.textContent),
      }))
      check(`${lang} /${which}: has a title and sections`, shown.title.length > 0 && shown.sections >= 8, JSON.stringify(shown))
      check(`${lang} /${which}: written in the chosen language`, shown.georgian === (lang === 'ka'))
      check(`${lang} /${which}: no sideways scroll on a 360 px phone`, !shown.sideways)
      check(`${lang} /${which}: no long dashes`, !shown.longDash)
    }
  }

  const page = await openPage(null)
  await page.goto(base + '/')
  await clickText(page, '.landing-footer a', 'Privacy')
  await page.waitForSelector('.legal-body h2')
  check('the landing footer links to Privacy', await page.evaluate(() => location.pathname === '/privacy'))
  await clickText(page, '.legal-other a', 'Terms')
  await wait(300)
  check('Privacy links to the Terms', await page.evaluate(() => location.pathname === '/terms'))

  await page.goto(base + '/signin')
  await page.waitForSelector('.signin-agree', { timeout: 15000 })
  const links = await page.$$eval('.signin-agree a', (list) => list.map((a) => a.getAttribute('href')))
  check('creating an account links to both pages', links.join(',') === '/terms,/privacy', links.join(','))
}
