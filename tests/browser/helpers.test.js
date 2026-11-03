// Family helpers: the keeper invites, the helper joins through the link, writes a letter,
// then the keeper removes them. Run with: npm run test:browser -- helpers
import { wait } from './kit.js'

export default async function run({ db, check, newUser, newHouse, openPage, clickText, waitForText, text, base }) {
  const keeper = await newUser('keeper')
  const helper = await newUser('helper')
  const house = await newHouse(keeper.id, { title: 'Helper test' })
  await db.query(`insert into public.letters (house_id, from_name, body) values ($1, 'Mum', 'Only for the keeper')`, [house.id])

  // The keeper makes an invitation
  const k = await openPage(keeper)
  await k.goto(`${base}/h/${house.code}/inside`)
  await waitForText(k, '.room-card', 'Family helpers', 60000)
  await clickText(k, '.room-card', 'Family helpers')
  await k.waitForSelector('.helper-list, .capsule-small')
  await clickText(k, 'button', 'Invite someone')
  await k.waitForSelector('.invite-link', { timeout: 15000 })
  const link = await k.$eval('.invite-link', (input) => input.value)
  const inviteCode = new URL(link).searchParams.get('code')
  check('the invitation is a /signin?code= link', new URL(link).pathname === '/signin' && inviteCode?.length > 0, link)

  // The helper opens the link (on this computer instead of cozytown.ge) and joins
  const h = await openPage(helper)
  await h.goto(`${base}/signin?code=${inviteCode}`)
  await h.waitForSelector('.signin-invited', { timeout: 20000 })
  check('the code is already filled in', (await h.$eval('#gift-code', (input) => input.value)).replace(/-/g, '') === inviteCode.replace(/-/g, ''))
  await h.waitForFunction(() => !document.querySelector('form.signin-step button[type=submit]').disabled, { timeout: 15000 })
  await h.click('form.signin-step button[type=submit]')
  const joined = await h.waitForFunction((code) => location.pathname === `/h/${code}`, { timeout: 20000 }, house.code).then(() => true, () => false)
  check('joining opens the house', joined)

  await h.waitForSelector('.street-actions', { timeout: 60000 })
  await clickText(h, '.street-actions button', 'Go inside')
  await waitForText(h, '.room-card', 'Time capsule', 20000)
  await wait(500)
  check('the helper has no "Download everything"', !(await text(h, '.room-sheet')).includes('Download everything'))

  await clickText(h, '.room-card', 'Letters')
  await h.waitForSelector('.letters-inner .big-button')
  await wait(500)
  check("the helper can't read the keeper's letters", !(await text(h, '.letters-inner')).includes('Only for the keeper'))
  await clickText(h, '.letters-inner button', 'Write a letter')
  await h.type('#letter-body', 'A letter from the helper')
  await h.type('#letter-from', 'Cousin Dato')
  await clickText(h, 'button[type=submit]', 'Put it in the mailbox')
  const wrote = await waitForText(h, '.letter-item', 'Cousin Dato', 15000).then(() => true, () => false)
  check('the helper writes a letter and sees it', wrote)
  await clickText(h, '.letters-head button', 'Back')
  await clickText(h, '.room-card', 'Time capsule')
  await h.waitForSelector('.letters-inner .capsule-text')
  check("the helper can't choose the capsule's day", !(await h.$('#capsule-date')))

  await h.goto(`${base}/signin`)
  const listed = await waitForText(h, 'a.big-button', 'Open', 15000).then(() => true, () => false)
  check('the sign-in page lists the house the helper helps with', listed)

  // The keeper sees the helper's letter and removes the helper
  await k.goto(`${base}/h/${house.code}/inside`)
  await waitForText(k, '.room-card', 'Family helpers', 60000)
  await clickText(k, '.room-card', 'Letters')
  const keeperSees = await waitForText(k, '.letter-item', 'Cousin Dato', 15000).then(() => true, () => false)
  check("the keeper reads the helper's letter", keeperSees)
  await clickText(k, '.letters-head button', 'Back')
  await clickText(k, '.room-card', 'Family helpers')
  await k.waitForSelector('.helper-row', { timeout: 15000 })
  check('the keeper sees the helper in the list', true)
  await clickText(k, '.helper-row button', 'Remove')
  await clickText(k, '.helper-row button', 'Yes, remove')
  const removed = await k.waitForSelector('.helper-row', { hidden: true, timeout: 15000 }).then(() => true, () => false)
  check('the keeper removes the helper', removed)

  const { rows: [left] } = await db.query('select count(*)::int n from public.house_helpers where house_id = $1', [house.id])
  check('the database has no helper left', left.n === 0)
}
