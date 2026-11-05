// Runs the browser tests: starts the site on this computer, opens it in headless Chrome as
// throwaway keepers, helpers and visitors, and removes every account, house and photo afterwards.
// It talks to the real Supabase database, so it needs .env.local (including SUPABASE_SECRET_KEY).
//   npm run test:browser              all tests
//   npm run test:browser -- capsule   only files whose name contains "capsule"

import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import puppeteer from 'puppeteer-core'
import { readSettings, connectToDatabase, connectToStorage } from '../../scripts/backup/shared.js'
import { makeKit, wait, TEST_EMAIL_END } from './kit.js'

const PORT = 5199
const BASE = `http://localhost:${PORT}`
// If the laptop sleeps during a test, its database connection dies and the test would wait for ever.
// The slowest file takes about 7 minutes on a busy computer.
const FILE_TIME_LIMIT_MS = 15 * 60 * 1000
const CHROMES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
].filter(Boolean)

const folder = path.dirname(fileURLToPath(import.meta.url))
const only = process.argv[2]
const files = fs.readdirSync(folder).filter((name) => name.endsWith('.test.js') && (!only || name.includes(only))).sort()

const settings = readSettings()
const db = await connectToDatabase(settings)
const storage = connectToStorage(settings)

// Leftovers from a run that crashed half-way: test accounts and the houses they keep.
await db.query(`delete from public.houses where keeper_id in (select id from auth.users where email like $1)`, [`%${TEST_EMAIL_END}`])
await db.query(`delete from auth.users where email like $1`, [`%${TEST_EMAIL_END}`])

// Start the site (Vite) unless it is already running on that port.
let server
if (!(await isUp())) {
  server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' })
  for (let i = 0; i < 60 && !(await isUp()); i++) await wait(500)
  if (!(await isUp())) throw new Error('The site did not start on port ' + PORT)
}

const browser = await puppeteer.launch({
  executablePath: CHROMES.find((file) => fs.existsSync(file)),
  // Software drawing, so the 3D street works without a graphics card.
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
})

let passed = 0
let failed = 0
try {
  for (const file of files) {
    console.log(`\n${file}`)
    const { default: runTest } = await import(pathToFileURL(path.join(folder, file)))
    const kit = makeKit({ settings, db, storage, browser, base: BASE })
    // Stops everything. The accounts it leaves behind are removed at the start of the next run.
    const timeLimit = setTimeout(() => {
      console.log(`\n${file} stopped answering after 15 minutes. Did the computer go to sleep? Run it again.`)
      browser.process()?.kill()
      server?.kill()
      process.exit(1)
    }, FILE_TIME_LIMIT_MS)
    try {
      await runTest(kit)
    } catch (error) {
      kit.check('test finished without crashing', false, error.message.split('\n')[0])
    } finally {
      kit.check('no errors on the page', kit.pageErrors.length === 0, kit.pageErrors.join(' / '))
      await kit.cleanUp()
      for (const context of browser.browserContexts().slice(1)) {
        await context.close().catch((error) => console.log(`  (couldn't close a page: ${error.message})`))
      }
      clearTimeout(timeLimit)
    }
    passed += kit.results.passed
    failed += kit.results.failed
  }
} finally {
  // On Windows, Chrome can hold on to a temp file for a moment. That must not hide the real result.
  await browser.close().catch((error) => console.log(`(Chrome didn't close cleanly: ${error.message})`))
  server?.kill()
  await db.end()
}

console.log(`\n${passed} passed, ${failed} failed (test accounts and houses removed)`)
process.exitCode = failed ? 1 : 0

async function isUp() {
  try {
    return (await fetch(BASE)).ok
  } catch {
    return false
  }
}
