# Tests

Two kinds, both run against the real Supabase project using the settings in `.env.local`.

| Command | What it does | Time |
|---|---|---|
| `npm run test:db` | Checks the database rules: who may read and change what. Each test runs inside a transaction that is **rolled back**, so nothing is ever saved. | ~1 min |
| `npm run test:browser` | Starts the site on this computer and uses it in headless Chrome as throwaway keepers, helpers, visitors and an admin. Every account, house and photo it makes is **removed** at the end (and leftovers from a crashed run are removed at the start). | ~4 min |
| `npm test` | Both, database first. | |
| `npm run test:restore` | A full restore rehearsal on a throwaway Postgres on this computer (first: `npm install --no-save embedded-postgres@17.11.0-beta.19`). Rebuilds the database from the migrations, compares it with live, restores the newest backup into it. Changes nothing on the site. See `docs/BACKUPS.md`. | ~1 min |

Run only some: `npm run test:db -- capsule` runs the files whose name contains "capsule".

Each line prints `PASS` or `FAIL`. The last line counts them; the command fails if anything failed.

## When to run them
- Before every commit that changes the database (`supabase/migrations/`) or `src/data/`: `npm run test:db`.
- Before pushing a feature: `npm test`.
- After adding a database function that visitors may call, add its name to `VISITOR_FUNCTIONS` in
  `tests/db/security.test.js`. That test fails on purpose when visitors can reach something unexpected.

## Adding a test
- Database: copy a file in `tests/db/`. It gets `as(who)` (act as `'anon'`, a user id, or `null` for
  the owner), `attempt(sql)` (a query that may be refused), `check(name, ok)`, `addUsers()` and `addHouse()`.
- Browser: copy a file in `tests/browser/`. The kit (`kit.js`) gives `newUser()`, `newHouse()`,
  `openPage(user, { lang, width, height })`, `clickText()`, `waitForText()`, `text()` and `check()`.

Needs Chrome (or Edge) installed. Set `CHROME_PATH` if it lives somewhere unusual.

`npm run test:browser` starts by deleting **every** `@cozytown-test.dev` account (leftovers from a crash), so never run
it while something else is using test accounts.
