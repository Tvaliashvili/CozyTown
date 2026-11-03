// Runs the database tests against the real Supabase database, each inside a transaction
// that is rolled back, so nothing is ever saved.
//   npm run test:db              all tests
//   npm run test:db -- capsule   only files whose name contains "capsule"
//   npm run test:db -- --with supabase/migrations/<new>.sql
//       tries a migration that isn't applied yet: it runs inside each test's transaction first,
//       so the tests see the database as it will be, and then it is rolled back with everything else.
// Needs SUPABASE_PROJECT_REF and SUPABASE_DB_PASSWORD in .env.local.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { readSettings, connectToDatabase } from '../../scripts/backup/shared.js'
import { makeTools } from './tools.js'

const folder = path.dirname(fileURLToPath(import.meta.url))
const args = process.argv.slice(2)
const withIndex = args.indexOf('--with')
const migration = withIndex >= 0 ? fs.readFileSync(args.splice(withIndex, 2)[1], 'utf8') : null
const only = args[0]
const files = fs.readdirSync(folder)
  .filter((name) => name.endsWith('.test.js') && (!only || name.includes(only)))
  .sort()

const db = await connectToDatabase(readSettings())
let passed = 0
let failed = 0
try {
  for (const file of files) {
    console.log(`\n${file}`)
    const { default: runTest } = await import(pathToFileURL(path.join(folder, file)))
    const tools = makeTools(db)
    await db.query('begin')
    try {
      if (migration) await db.query(migration)
      await runTest(db, tools)
    } catch (error) {
      // A crash in the test itself (not a refused query) counts as one failure.
      tools.check('test finished without crashing', false, error.message)
    } finally {
      await db.query('rollback')
    }
    passed += tools.results.passed
    failed += tools.results.failed
  }
} finally {
  await db.end()
}

console.log(`\n${passed} passed, ${failed} failed (everything rolled back)`)
process.exitCode = failed ? 1 : 0
