# QA log · Cozy Town

Testing, quality checks and code reviews, kept over time. Newest review at the bottom.

**How to read it**
- **Severity**: 🔴 high = can lose data, leak private things, or block a customer · 🟠 medium = real people
  will trip over it · 🟢 low = small, or only in rare cases.
- Every finding has an ID (Q1, Q2…) that never changes, so it can be mentioned in commits and chats.
- When something is fixed, it moves to "Fixed" with the date and commit.

**For Claude, each session:** after finishing a main piece of work, test it and add what you found here.
Every few features, do a wider review (security, phones, Georgian, speed) and add a dated entry to the review log.

---

## Open findings

| ID | Sev | Area | What's wrong | Suggested fix |
|---|---|---|---|---|
| Q5 | 🟠 | Phones | **Never tested on a real budget Android** (open since Phase 1). All testing so far is a desktop browser pretending to be a phone. | Founder: run the phone checklist below on a cheap Android and an iPhone. |

### Questions for the founder (product choices made without asking)
None open. Q11-Q14 confirmed by the founder on 2026-11-04 (see below).

### Accepted (checked, deliberately left as is)
- **Q11** Helpers can take down *any* photo on the wall, including ones the keeper hung. (Founder OK, 2026-11-04.)
- **Q12** Helpers only read the letters they wrote; the rest of the mailbox is the keeper's. (Founder OK, 2026-11-04.)
- **Q13** One time capsule per house. ~~Its day can move later, never earlier.~~ Changed by the founder on 2026-11-04: the keeper
  fills it (letter + up to 10 photos) and picks the day on one page, then locks it once. After that nothing can be added
  and the day can't move. Helpers can no longer put things in.
- **Q14** Invites work once, for 14 days; up to 10 helpers per house. (Founder OK, 2026-11-04.)
- Signed-in people can ask `capsule_is_open(id)`, `capsule_is_sealed(id)` and `is_house_keeper(id)` about any house id. They only answer
  yes/no, and house ids are never shown to anyone outside the house. The storage rules need them to be callable.
- The admin page is English only (only the founder uses it).
- Gift codes stay in the database after claiming; `claim_house()` refuses a used one for anyone else.

---

## Fixed

| ID | Date | What | Commit |
|---|---|---|---|
| Q6 | 2026-11-04 | 🟢 The landing page downloaded every text for every page. Now `en.js`/`ka.js` hold only the landing page's 63 texts; the other 291 are in `en-app.js`/`ka-app.js` and download with the first other page (`lazyPage` in `App.jsx`). Landing page: **89.2 → 79.0 KB** gzip. | *(this commit)* |
| Q16 | 2026-11-03 | 🟢 Every backup was a full copy of all photos (42 kept), so R2's free 10 GB would have filled at ~1,000 photos. Now each photo is copied to R2 **once**, encrypted on its own, and the nightly zip holds only the database (25 KB instead of 277 KB today). A copy is deleted once no kept backup lists it. Room now for ~40,000 photos. `/admin` shows how much of the 10 GB is used. | 7e8678b |
| Q7 | 2026-11-03 | 🟢 Photo files with nothing pointing to them (deleted house, failed capsule upload) were left behind for ever. The nightly backup now deletes them from Supabase, if they are over a week old and already copied into the backups. If more than half of all files look left over, it deletes nothing and fails. | 7e8678b |
| Q17 | 2026-11-03 | 🟢 A link tapped in the very first instant after a page loaded changed the address but not the page (the router started listening a moment late). Found by the new legal-pages test. `usePath` now catches up once when it starts listening. | 6e7b365 |
| Q8 | 2026-11-03 | 🟢 "Download everything" counted as looking inside an opened capsule, so the street notice vanished unseen. `open_capsule()` got a `mark_seen` switch (migration `20261106000000`, applied); the zip passes false. | 36833e5 |
| Q9 | 2026-11-03 | 🟢 Letters, Time capsule and Family helpers now move screen-reader focus to their title when they open (Letters and the capsule also when they change view). | 36833e5 |
| Q10 | 2026-11-03 | 🟢 The invite note told already signed-in people to sign in. Now it just says to tap the button. Georgian text is DRAFT. | 36833e5 |
| Q4 | 2026-11-03 | 🟠 The tests lived only in Claude's temporary folders. Now they are in `tests/`: `npm run test:db` (9 files, 173 checks, all rolled back) and `npm run test:browser` (7 files, 72 checks, throwaway accounts removed). See `tests/README.md`. | a9aeb0c |
| Q1 | 2026-11-03 | 🔴 There was no backup. Now every night (05:00 Tbilisi) GitHub saves the database, login accounts and every photo, encrypted, to Cloudflare R2: 30 nightly + 12 monthly. `/admin` turns red if backups stop. First real run on GitHub passed and `npm run backup:check` opened it. See `docs/BACKUPS.md`. | 12efae9 |
| Q3 | 2026-11-03 | 🟠 The phone's Back button left the whole room (or the house) instead of closing the page on top. Now every page or sheet that opens over the screen (letters, a letter, capsule, helpers, a photo, the decorating panel, lantern and share sheets, "make it final") adds a history step, so Back closes just that. `src/lib/useBackState.js`. | *(this commit)* |
| Q2 | 2026-11-03 | 🔴 On small phones (360×640) the keeper's room panel covered the whole wall: photos shrank to a speck. The panel now takes at most ~56% of the screen and scrolls. | *(this review)* |
| Q15 | 2026-11-03 | 🟢 Time capsule: after a photo that couldn't be opened, picking the same file again did nothing. | *(this review)* |
| - | 2026-11-03 | Export zip stalled forever (fflate's background worker); switched to `zipSync`. Found by the export browser test. | 67f09db |
| - | 2026-11-03 | Helpers saw "Choose a day for it to open" on the capsule card, but only the keeper can. | 49fd6ee |
| - | 2026-11-03 | Invite link landed on "Enter your gift code / Open my house" wording; now "Join the house". | 49fd6ee |
| - | 2026-11-03 | Capsule page called a React hook inside a condition (would crash on some renders). Caught in review before testing. | e3e765c |

---

## What is tested, and how

Everything below can be re-run: `npm run test:db` (~1 min) and `npm run test:browser` (~4 min), or `npm test` for both. See `tests/README.md`.

| Feature | Database tests (rolled back, never saved) | Browser test (headless Chrome, throwaway accounts) |
|---|---|---|
| Admin page & orders | 29 | create order, letter, mark paid, unlock, search |
| Time capsule | 37 (sealed once: refused twice, after opening, by helpers; no uploads after sealing; old functions gone; letter first, then photos in order) + real storage service check | 18 checks: letter + 2 photos + day on one page, remove a photo, past day refused, warning step saves nothing, going back keeps everything, locked = nothing more can go in, open on the day shows both photos, street notice |
| Helpers | 38 (+ admin & capsule tests re-run on top) | invite → join by link → write letter → keeper sees and removes |
| Download everything | - | zip contents, locked vs open capsule, offline page with no internet, `<script>` in a letter stays text |
| Georgian layout | 357 texts in both languages, none missing, none left in English | capsule, helpers, room at 360 px wide |
| Back button (Q3) | - | 17 checks: decorating panel, letters → writing → list → room, capsule, helpers, on-screen Back, reload with a page open, share sheet → card → Back. Not yet run: photo viewer, lantern sheets |
| Landing page stays light (Q6) | - | 9 checks (`landing.test.js`), en + ka: the landing page downloads no other-page texts, no town, no database client; no text key (like `signin.title`) on screen on the landing page, on sign-in reached from it, or on `/town` opened directly. Found the footer's Terms/Privacy texts had moved by mistake |
| Backups (Q1) | 7 for `backup_runs` (only admins read it, nobody on the site can write it). **Restore rehearsal:** in a rolled-back transaction, emptied all 14 tables of the live database, loaded them from a backup, and compared each row by row: all identical, `get_house()` works on the restored house | `/admin` line when there's no backup, a late one, a fresh one. Backup opened with the right key; refused with a wrong key and with one changed byte; restore refuses a project that has houses. Real upload to R2 + `backup:check` from this computer; GitHub run passed; the secret key reads the private capsule bucket (test file, deleted). **Once-only photo copies (Q16) and tidy-up (Q7), 2026-11-03:** a folder backup opened, extracted photos were byte-identical to the live ones, one changed byte in a photo copy was caught; the old-style backup still opens; two real runs on R2 with a planted, backdated left-over file: run 1 copied 4 photos and deleted the planted file only, run 2 copied 0 and removed the planted copy no backup needed; `backup:check` then opened all 3 photos. Not rehearsed: a full restore from a new-style backup into an empty project |
| Security sweep | `security.test.js`: all 12 tables have row security on; visitors can read only `streets` and call only the 7 listed functions; every security-definer function pins `search_path` | - |
| Terms & Privacy | - | both pages in English and Georgian at 360 px: titles, sections, no sideways scroll, no long dashes; footer and sign-in links work |

## Phone checklist (for the founder, on real phones)

Do this on a **cheap Android** and an **iPhone**, in Georgian, ideally with someone over 60 holding the phone.

1. Open the landing page on mobile data. Does it appear within ~3 seconds?
2. Sign in, open the test house. Does the street move smoothly when you slide?
3. Go inside. Can you see the wall *and* the buttons? Add a photo from the camera.
4. Letters: write one, read it, press the phone's Back button. It should go back to the list, then to the room, then to the street, one step at a time.
5. Time capsule: write a letter, add 2-3 photos, choose a day, lock it. Is the warning clear? After locking, is it obvious nothing more can go in?
6. Family helpers: invite your second email, open the link on another phone, join.
7. Download everything. Does the zip save? Open `index.html` from it in airplane mode.
8. Light a lantern as a visitor (signed out). Does the keeper see it?
9. Print the card at home (fold-over A4). Does the QR open the house?
10. Read the Terms and Privacy pages (links at the bottom of the landing page). Is anything untrue or unclear?
11. Street signs: open `/town` and slide along. Can you spot the bow on a roof, the raised mailbox flag and the gift box at a door, on a small screen? Do they feel calm, not busy?
12. Photos on slow internet: go inside a house with photos. Do the frames look sharp? Tap one: it should appear at once and get sharper a moment later.

Write what went wrong under a new review entry below.

---

## Review log

### 2026-11-03 · Phase 3 review (admin, capsule, helpers, export)
- **Code reviewed:** every file changed in Phase 3 (`src/admin/`, `src/inside/Capsule.jsx`, `Helpers.jsx`,
  `Room.jsx`, `src/export/`, `src/data/*.js`, `src/pages/SignIn.jsx`, 4 migrations).
- **Database:** RLS on all tables; every security-definer function checks who's asking and uses
  `set search_path = ''`; visitors' callable functions listed above; helpers can't spoof `created_by`
  (not in the insert grant). Re-ran the admin and capsule tests after the helpers migration: all pass.
- **Phones:** found Q2 (fixed) at 360×640; Back button behaviour Q3 confirmed on the capsule page.
- **Speed:** landing 89 KB gzip; 3D town, sign-in, admin and export each download only when needed.
  Export code is 8.6 KB gzip and loads only on the button press.
- **Found:** Q1 no backups (🔴), Q3-Q10 above; fixed Q2 and Q15.

### 2026-11-03 · Nightly backups (Q1, start of Phase 4)
- **Built:** `scripts/backup/` (backup, check, unpack, restore), `.github/workflows/nightly-backup.yml`,
  migration `20261105000000_backup_runs` (applied), "Last backup" line on `/admin`, `docs/BACKUPS.md`.
- **Choices:** plain Node instead of `pg_dump` (nothing extra to install, same on GitHub and this computer);
  each table is saved as JSON made inside the database, so no value changes on the way. The backup is
  encrypted with `age` (public key in the repo, private key only with the founder). Restore loads all tables
  in one transaction with triggers off, and refuses a project that already has houses.
- **Security:** the repo is public, so the job prints only counts and sizes. It runs only on its schedule
  or by hand, never for pull requests, so forks never get the secrets. The Supabase secret key is used only
  by these scripts, never in `src/`.
- **Tested:** see the "Backups" row above. Founder made the R2 key and Supabase secret key; Claude made the bucket and set the GitHub secrets with `gh`. First GitHub run passed.
- **Found:** Q16 (full copies will outgrow 10 GB one day).

### 2026-11-03 · Tests in the project, small fixes, Terms and Privacy
- **Built:** `tests/` (Q4), fixes for Q8, Q9, Q10, `npm run migrate`, and `/terms` + `/privacy`
  (`src/legal/`, lazy-loaded; linked from the landing footer and the "Create my account" form).
- **Database:** migration `20261106000000_export_keeps_capsule_news` (applied): `open_capsule()` got an optional
  `mark_seen`. The site that was live before kept working, because the old call still matches.
- **Terms and Privacy are DRAFTS.** Each sentence was checked against how the site really works (e.g. photo files
  have public random addresses, backups run on GitHub and are kept up to a year, photos lose their location
  data when shrunk). Still needed from the founder: business name, ID number, address, contact
  (`src/legal/company.js`), a decision on the refund rule and the age limit (proposals in `terms.js`), the Georgian
  review, and ideally a lawyer before the first paid order.
- **Tests:** `npm test` all green: 175 database checks, 100 browser checks. Landing page still 89 KB gzip.
- **Found and fixed:** Q17 (router missed a very early tap).
- **Noticed:** in headless Chrome, Georgian dates show in English ("November 3, 2026") because that Chrome has no
  Georgian date data. Real phones should be fine; check on the phone test (Q5).

### 2026-11-03 · Backups copy each photo once (Q16), left-over files cleaned up (Q7)
- **Built:** `scripts/backup/`: photos go to `photos/` in R2 once each (named by a sha256 of bucket + name, because
  the name alone opens a public photo), each backup gets a list in `lists/`, and a copy goes when no list names it.
  `restore.js` reads old backups (photos inside the zip) and new ones. Then the run deletes Supabase files that no
  `photos` or `capsule_items` row points to, once over 7 days old and copied. `backup_runs.size_bytes` now means
  everything R2 holds (the migration comment still says "the backup file").
- **Checked against `/privacy`:** "gone from the safety copies at the latest after a year" still holds: a photo copy
  lives while a nightly (30 days) or monthly (12 months) backup lists it.
- **Tests:** see the Backups row above. `npm run test:db -- backups` 7 passed. No database or website changes apart
  from the `/admin` backup line.
- **Watch:** the first nightly run on GitHub with the new code (tomorrow 05:00). If `/admin` is red, check Actions.

### 2026-11-04 · Lighter landing page (Q6)
- **Built:** texts split into landing (`en.js`, `ka.js`) and the rest (`en-app.js`, `ka-app.js`). Every lazy page
  (town, sign-in, card, admin, legal) waits for the rest before showing, so no page can show a raw key.
- **Founder:** Georgian texts for the landing page are still in `ka.js`; everything else (sign-in, the house,
  the room, capsule, helpers, card...) is now in `ka-app.js`. Same keys, same DRAFT notes.
- **Tests:** `npm run test:browser` all green, 109 checks. Both languages have the same 63 + 291 keys.
- **Founder confirmed Q11-Q14** (2026-11-04): moved to "Accepted".

### 2026-11-04 · Time capsule is filled and locked once
- **Why:** founder: choosing a day first and then adding things again and again felt odd. A time capsule should be
  filled, locked and left alone.
- **Built:** one page with the letter, "from", up to 10 photos (chosen several at once, each removable) and the day.
  "Lock the time capsule" shows a warning step ("Lock it until ...? After this you can't add anything, change anything
  or look inside...", plus what's going in) with "Yes, lock it" / "Go back and change something" (keeps everything).
  Photos upload one at a time with "photo 2 of 3". Then the locked chest, with no buttons.
- **Database** (migration `20261107000000_seal_capsule_once.sql`, tested rolled back, then applied): `set_capsule_date`
  and `add_to_capsule` are gone. New `seal_capsule()` takes the day, letter and photos in one go, keeper only, and
  refuses a second time. Capsule photo uploads: keeper only, and only before sealing (new yes/no helper
  `capsule_is_sealed(id)`, same kind as `capsule_is_open`). Capsules made the old way count as sealed.
- **Changed for helpers:** they no longer add to the capsule (only the keeper picks the day, so only the keeper makes it).
  Helper texts, Terms (EN + KA) and CLAUDE.md updated. Privacy page needed no change.
- **Not handled:** if the keeper leaves the page half-way, what they wrote is lost (not saved as a draft). If sealing
  fails after photos uploaded, those files are cleaned up by the nightly run after 7 days (Q7).
- **Founder:** new Georgian capsule texts are DRAFT, like the rest.
- **Tests:** `npm run test:db` 176 passed; `npm run test:browser` 115 passed (capsule: 18 checks).

### 2026-11-04 · Small photos in the frames, first signs on the street
From the founder's plans in CLAUDE.md (written from a phone session, merged as PR #1).
- **Small photos:** each new photo also gets a 480 px copy, which the frames show. The full photo downloads only when
  tapped; meanwhile the viewer shows the small copy, so tapping isn't a blank wait on slow internet. Older photos have
  no copy and show the full file, as before. No old photos were converted.
- **Size:** the test picture (a 10 KB screenshot) is too simple to judge by. A busy made-up 1280 px picture came to 138 KB full
  and 28 KB small. **Not measured on real phone photos or real traffic**, so the savings in CLAUDE.md are estimates.
- **Backups:** the nightly tidy-up (Q7) would have deleted every small copy as "left over" after 7 days. It now counts both
  files as in use, with a test. Run the migrations before this code reaches the nightly backup: done in that order.
- **Signs:** bow on the roof (gift not claimed), mailbox flag up (a letter the keeper hasn't looked at), gift box at the door
  (capsule day has come and the keeper hasn't looked inside). The old flag always stood upright; now it lies flat when no letter waits.
- **Who sees them:** flag and box only with that house's link; on neighbours, only the bow. Privacy page updated (EN + KA draft).
- **Memorial houses (product choice, please check):** there was no way to tell a memorial house apart, so its first
  buyer would have got a cheerful bow. Added `houses.quiet`: a checkbox on the order form and a button in the house list.
  A quiet house shows no bow and no gift box; its keeper still gets the capsule news in words. Visitors are never told.
- **Choices made without asking (say if you disagree):** anyone with the link sees the flag and the box, not just the keeper.
  The box stays until the keeper looks inside, however long that takes, not only on the day. The bow shows on neighbours.
- **Found by the tests:** on an unclaimed house, a letter with no recorded writer didn't raise the flag. Fixed before applying.
- **Speed:** phone street view on the demo with signs: 118 draw calls, 2.3k triangles, within budget. Signs don't move, so they add no redrawing.
- **Checked by eye only (the canvas can't be read by tests):** bow on all 3 roof types, flag, gift box, in screenshots from a desktop browser.
- **Not tested:** the memorial checkbox and button by clicking them on the page (the database side is tested); the gift box
  leaving the street when the keeper opens the capsule; any of this on a real phone (Q5, steps 11-12 added to the checklist).
- **Founder:** two new Georgian texts are DRAFT: `room.lettersNew` and the privacy page changes.
- **Tests:** `npm run test:db` 218 passed; `npm run test:browser` 130 passed. Migrations `20261108000000_small_photos.sql` and
  `20261108100000_street_signs.sql` tested rolled back, then applied.

