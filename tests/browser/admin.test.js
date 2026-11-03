// The founder's admin page: create an order with a first letter, mark it paid, add a letter,
// search, and unlock a paid redesign. Run with: npm run test:browser -- admin
import { wait } from './kit.js'

export default async function run({ db, check, newUser, openPage, removeLater, clickText, waitForText, text, base }) {
  const visitor = await openPage(null)
  await visitor.goto(base + '/admin')
  await visitor.waitForSelector('.admin-box')
  check('signed out, the admin page shows no orders', !(await visitor.$('.admin-house')))

  const founder = await newUser('admin')
  await db.query('insert into public.admins (user_id) values ($1)', [founder.id])
  const page = await openPage(founder)
  await page.goto(base + '/signin')
  const link = await waitForText(page, 'a', 'Admin page', 15000).then(() => true, () => false)
  check('the sign-in page has the "Admin page" button', link)

  // Wait for the list of taken plots too, so the plot buttons don't change under the click.
  await page.goto(base + '/admin', { waitUntil: 'networkidle0' })
  await page.waitForSelector('.admin-plots')
  const free = await page.$$('.admin-plots .choice:not(:disabled)')
  if (!free.length) throw new Error('No free plot on the street for the test order')
  await free[free.length - 1].click()
  await waitForText(page, 'button[type=submit]', 'Create the house', 5000)
  const fill = async (labelStart, words) => {
    const box = await page.evaluateHandle((start) =>
      [...document.querySelectorAll('.admin-field')].find((l) => l.querySelector('.field-label')?.textContent.startsWith(start))
        .querySelector('input, textarea'), labelStart)
    await box.type(words)
  }
  const buyer = `TEST BUYER ${Date.now()}`
  await fill('House name', "Test Nino's house")
  await fill("Buyer's name", buyer)
  await fill('How to reach', '@test_buyer')
  await fill('Price', '49')
  await fill('Note', 'card + keychain')
  await fill('From', 'Giorgi')
  await fill('Letter.', 'Happy birthday, Nino!')
  await clickText(page, 'button[type=submit]', 'Create')
  await page.waitForSelector('.admin-created', { timeout: 15000 })

  const { rows: [made] } = await db.query(
    `select h.id, h.code, h.title, o.paid, o.price_gel, (select count(*)::int from public.letters l where l.house_id = h.id) letters
     from public.houses h join public.orders o on o.house_id = h.id where o.buyer_name = $1`, [buyer])
  if (made) removeLater(made.id)
  check('the order and house are created', made?.title === "Test Nino's house" && Number(made?.price_gel) === 49, JSON.stringify(made))
  check("the buyer's first letter is in the mailbox", made?.letters === 1)
  check('a new order starts unpaid', made?.paid === false)
  check('the page shows the new codes', (await text(page, '.admin-created')).includes(made?.code))

  // The order's row in the house list (which refreshes a moment after creating)
  await waitForText(page, '.admin-house', made.code, 15000)
  const inRow = (code, action) => page.evaluate((c, a) => {
    const row = [...document.querySelectorAll('.admin-house')].find((li) => li.textContent.includes(c))
    return new Function('row', a)(row)
  }, made.code, action)
  await inRow(made.code, `[...row.querySelectorAll('button')].find((b) => b.textContent === 'Mark paid').click()`)
  await wait(2000)
  await inRow(made.code, `[...row.querySelectorAll('button')].find((b) => b.textContent === 'Add a letter').click()`)
  await wait(200)
  const letterBox = await page.evaluateHandle((c) =>
    [...document.querySelectorAll('.admin-house')].find((li) => li.textContent.includes(c)).querySelector('textarea'), made.code)
  await letterBox.type('A second letter from Mum')
  await inRow(made.code, `row.querySelector('button[type=submit]').click()`)
  await wait(2500)
  const { rows: [after] } = await db.query(
    `select o.paid, (select count(*)::int from public.letters l where l.house_id = o.house_id) letters from public.orders o where o.house_id = $1`, [made.id])
  check('"Mark paid" marks it paid', after.paid === true)
  check('"Add a letter" adds a second letter', after.letters === 2)

  await page.type('input[type=search]', buyer)
  await wait(300)
  check('search finds the order', (await page.$$('.admin-house')).length === 1)

  await db.query('update public.houses set design_submitted_at = now() where id = $1', [made.id])
  await page.reload()
  await waitForText(page, '.admin-house', made.code, 15000)
  await inRow(made.code, `[...row.querySelectorAll('button')].find((b) => b.textContent.startsWith('Unlock')).click()`)
  await wait(2500)
  const { rows: [unlocked] } = await db.query('select design_submitted_at from public.houses where id = $1', [made.id])
  check('"Unlock" opens the design for a paid redesign', unlocked.design_submitted_at === null)
}
