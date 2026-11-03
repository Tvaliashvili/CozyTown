// Applies one migration file to the real Supabase database, in a single transaction
// (if any part fails, nothing changes).
//   npm run migrate -- supabase/migrations/<file>.sql
// Test it first: npm run test:db -- --with supabase/migrations/<file>.sql
// Never apply the same file twice, and never edit a file that has been applied: write a new one.

import fs from 'node:fs'
import { readSettings, connectToDatabase } from './backup/shared.js'

const file = process.argv[2]
if (!file || !fs.existsSync(file)) throw new Error('Usage: npm run migrate -- supabase/migrations/<file>.sql')

const db = await connectToDatabase(readSettings())
try {
  await db.query('begin')
  await db.query(fs.readFileSync(file, 'utf8'))
  await db.query('commit')
  console.log('Applied', file)
} catch (error) {
  await db.query('rollback')
  console.error('Not applied, nothing changed:', error.message)
  process.exitCode = 1
} finally {
  await db.end()
}
