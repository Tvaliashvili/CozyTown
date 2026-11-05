// The sandwich menu on phones, on the landing page and the street, and where "Sign in" lands.
// Run with: npm run test:browser -- phone-menu
import { wait } from './kit.js'

export default async function run({ check, openPage, clickText, text, newUser, newHouse, base }) {
  // Nothing sticks out sideways, and every row in the open menu is big enough to tap.
  const fits = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
  const rowsAreBig = (page) => page.$$eval('.phone-menu-items > *', (rows) =>
    rows.length > 0 && rows.every((row) => row.getBoundingClientRect().height >= 48))
  const inScreen = (page, selector) => page.$eval(selector, (element) => {
    const box = element.getBoundingClientRect()
    return box.left >= 0 && box.right <= window.innerWidth
  })

  // ---------- The landing page, in Georgian on the smallest phone ----------
  const page = await openPage(null, { lang: 'ka', width: 320, height: 568 })
  await page.goto(base + '/')
  await page.waitForSelector('.phone-menu-button')
  check('landing: the links are tucked away on a phone', !(await page.$eval('.hero-nav-links', (e) => e.offsetParent)))
  check('landing: name and menu button sit on one line', await page.evaluate(() =>
    Math.abs(document.querySelector('.brand').getBoundingClientRect().top - document.querySelector('.phone-menu-button').getBoundingClientRect().top) < 12))
  check('landing: nothing sticks out at 320 px', await fits(page))

  await page.click('.phone-menu-button')
  await page.waitForSelector('.hero-nav-links a[href="#how"]', { visible: true })
  const menuWords = await text(page, '.hero-nav-links')
  check('landing: the open menu holds both links, language and sign-in', ['როგორ მუშაობს', 'ფასები', 'ენა', 'შესვლა'].every((words) => menuWords.includes(words)), menuWords)
  check('landing: every row is big enough to tap', await rowsAreBig(page))
  check('landing: the open menu stays on the screen', await inScreen(page, '.hero-nav-links'))

  await page.goBack()
  await wait(300)
  check("landing: the phone's Back button closes the menu and stays on the page", !(await page.$('.phone-menu.open')) && new URL(page.url()).pathname === '/')

  await page.click('.phone-menu-button')
  await page.waitForSelector('.phone-menu.open')
  await page.mouse.click(160, 500)
  await wait(300)
  check('landing: tapping outside closes the menu', !(await page.$('.phone-menu.open')))

  await page.click('.phone-menu-button')
  await page.waitForSelector('.phone-menu.open')
  await page.click('.hero-nav-links a[href="#prices"]')
  await wait(800)
  check('landing: a link in the menu closes it and scrolls down to its section',
    !(await page.$('.phone-menu.open')) && (await page.evaluate(() => window.scrollY)) > 300)
  await page.evaluate(() => window.scrollTo(0, 0))

  await page.click('.phone-menu-button')
  await page.waitForSelector('.phone-menu.open')
  await clickText(page, '.hero-nav-links button', 'EN')
  await wait(300)
  check('landing: the language button works from the menu', (await text(page, '.brand')).includes('Cozy Town') && !(await page.$('.phone-menu.open')))

  // ---------- "Sign in" opens the sign-in form, the gift button opens "create account" ----------
  await page.click('.phone-menu-button')
  await page.waitForSelector('.phone-menu.open')
  await clickText(page, '.hero-nav-links a', 'Sign in')
  await page.waitForSelector('.account-form', { timeout: 20000 })
  check('"Sign in" opens the sign-in form', (await text(page, '.account-form button[type=submit]')).includes('Sign in'))
  await page.goto(base + '/')
  await page.waitForSelector('.hero-text')
  await page.click('.hero-text a[href="/signin"]')
  await page.waitForSelector('.account-form', { timeout: 20000 })
  check('someone with a gift still starts on creating an account', (await text(page, '.account-form button[type=submit]')).includes('Create my account'))

  // ---------- The street, as a keeper with all the buttons, in Georgian on the smallest phone ----------
  const keeper = await newUser('menu')
  const house = await newHouse(keeper.id, { title: 'Menu test' })
  const street = await openPage(keeper, { lang: 'ka', width: 320, height: 568 })
  await street.goto(`${base}/h/${house.code}`)
  await street.waitForSelector('.phone-menu-button', { timeout: 60000 })
  check('street: nothing sticks out at 320 px', await fits(street))
  check('street: the menu button is fully on the screen', await inScreen(street, '.phone-menu-button'))
  check('street: the title stays on one line', await street.$eval('.top-bar h1', (title) => title.getClientRects().length === 1 && title.offsetHeight < 40))
  check('street: the title is not cut off', await street.$eval('.top-bar h1', (title) => title.scrollWidth <= title.clientWidth))
  await street.click('.phone-menu-button')
  await street.waitForSelector('.top-bar-buttons a[href="/map"]', { visible: true })
  const streetWords = await text(street, '.top-bar-buttons')
  check('street: the open menu has words for map, share, account and language',
    ['რუკა', 'გაზიარება', 'ანგარიში', 'ენა'].every((words) => streetWords.includes(words)), streetWords)
  check('street: every row is big enough to tap', await rowsAreBig(street))
  check('street: the open menu stays on the screen', await inScreen(street, '.top-bar-buttons'))
  await street.click('.top-bar-buttons a[href^="/signin"]')
  await street.waitForSelector('.signin', { timeout: 20000 })
  check("street: the account button still opens the account page", new URL(street.url()).pathname === '/signin')

  // ---------- A tablet keeps the row of buttons, with no menu ----------
  const tablet = await openPage(keeper, { lang: 'ka', width: 768, height: 1024 })
  await tablet.goto(`${base}/h/${house.code}`)
  await tablet.waitForSelector('.top-bar-buttons a[href="/map"]', { visible: true, timeout: 60000 })
  check('tablet: no sandwich button', await tablet.$eval('.phone-menu-button', (button) => getComputedStyle(button).display === 'none'))
  check('tablet: words stay hidden, the icons have the row', await tablet.$eval('.top-bar-buttons a[href="/map"] .menu-label', (label) => getComputedStyle(label).display === 'none'))
  check('tablet: nothing sticks out', await fits(tablet))
}
