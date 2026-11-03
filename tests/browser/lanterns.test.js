// A visitor with no account lights a lantern; the keeper sees it as new.
// Run with: npm run test:browser -- lanterns
import { wait } from './kit.js'

export default async function run({ db, check, newUser, newHouse, openPage, clickText, waitForText, text, base }) {
  const keeper = await newUser('lantern')
  const house = await newHouse(keeper.id, { title: 'Lantern test', design_submitted_at: new Date().toISOString() })

  const visitor = await openPage(null)
  await visitor.goto(`${base}/h/${house.code}`)
  await visitor.waitForSelector('.street-actions .gold', { timeout: 60000 })
  check('a visitor gets no account button', !(await visitor.$('.top-bar-buttons a')))
  await visitor.click('.street-actions .gold')
  await visitor.waitForSelector('#lantern-name')
  await visitor.type('#lantern-name', 'Test visitor')
  await visitor.type('#lantern-message', 'Testing the lantern screen')
  await visitor.click('.lantern-sheet button[type=submit]')
  const lit = await visitor.waitForSelector('.lantern-lit', { timeout: 15000 }).then(() => true, () => false)
  check('the visitor lights a lantern', lit)
  const { rows: [saved] } = await db.query('select from_name, message from public.lanterns where house_id = $1', [house.id])
  check('the lantern is saved with name and words', saved?.from_name === 'Test visitor' && saved?.message === 'Testing the lantern screen')

  const page = await openPage(keeper)
  await page.goto(`${base}/h/${house.code}`)
  await waitForText(page, '.street-actions button', 'Lanterns from visitors', 60000)
  // The "new" chip appears once the keeper's lantern list has loaded, a moment after the button.
  const chip = await waitForText(page, '.street-actions .new-chip', '1 new', 15000).then(() => true, () => false)
  check('the keeper sees "1 new"', chip)
  await clickText(page, '.street-actions button', 'Lanterns from visitors')
  const listed = await waitForText(page, '.keeper-lantern', 'Test visitor', 15000).then(() => true, () => false)
  check("the keeper reads the visitor's lantern", listed)
  await clickText(page, '.lantern-sheet .soft', '')
  await wait(1000)
  check('once seen, it is no longer new', !(await text(page, '.street-actions')).includes('1 new'))
}
