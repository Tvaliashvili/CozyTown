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
| Q6 | 🟢 | Speed | The landing page download is 89 KB (compressed). About 15 KB of that is every translation for every page (346 texts × 2 languages), and it grows with each feature. | Later: load the house/room texts only with the town. Not urgent yet. |
| Q7 | 🟢 | Storage | Photo **files can be left behind** with nothing pointing to them: when a house is deleted (rows go, files stay), or when a capsule photo uploads but sealing it fails. They cost storage space, nothing else. | A cleanup step in the nightly backup script (Q1): delete files whose house or photo row no longer exists. |
| Q16 | 🟢 | Backups | Every backup is a full copy of all photos, and 42 are kept. R2's free 10 GB fills up at about 200 MB per backup (~1,000 photos). The script fails loudly at 8 GB. | Before that: copy each photo to R2 only once (photos never change), and keep only the database nightly. |

### Questions for the founder (product choices made without asking)
- **Q11** Helpers can take down *any* photo on the wall, including ones the keeper hung. OK, or only their own?
- **Q12** Helpers only read the letters they wrote; the rest of the mailbox is the keeper's. OK?
- **Q13** One time capsule per house; its day can move later, never earlier. OK?
- **Q14** Invites work once, for 14 days; up to 10 helpers per house. OK?

### Accepted (checked, deliberately left as is)
- Signed-in people can ask `capsule_is_open(id)` and `is_house_keeper(id)` about any house id. They only answer
  yes/no, and house ids are never shown to anyone outside the house. The storage rules need them to be callable.
- The admin page is English only (only the founder uses it).
- Gift codes stay in the database after claiming; `claim_house()` refuses a used one for anyone else.

---

## Fixed

| ID | Date | What | Commit |
|---|---|---|---|
| Q8 | 2026-11-03 | 🟢 "Download everything" counted as looking inside an opened capsule, so the street notice vanished unseen. `open_capsule()` got a `mark_seen` switch (migration `20261106000000`, applied); the zip passes false. | *(this commit)* |
| Q9 | 2026-11-03 | 🟢 Letters, Time capsule and Family helpers now move screen-reader focus to their title when they open (Letters and the capsule also when they change view). | *(this commit)* |
| Q10 | 2026-11-03 | 🟢 The invite note told already signed-in people to sign in. Now it just says to tap the button. Georgian text is DRAFT. | *(this commit)* |
| Q4 | 2026-11-03 | 🟠 The tests lived only in Claude's temporary folders. Now they are in `tests/`: `npm run test:db` (9 files, 173 checks, all rolled back) and `npm run test:browser` (7 files, 72 checks, throwaway accounts removed). See `tests/README.md`. | *(this commit)* |
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
| Time capsule | 34 + real storage service check | choose day, seal letter + photo, refuse earlier day, open on the day, street notice |
| Helpers | 38 (+ admin & capsule tests re-run on top) | invite → join by link → write letter → keeper sees and removes |
| Download everything | - | zip contents, locked vs open capsule, offline page with no internet, `<script>` in a letter stays text |
| Georgian layout | 346 texts in both languages, none missing, none left in English | capsule, helpers, room at 360 px wide |
| Back button (Q3) | - | 17 checks: decorating panel, letters → writing → list → room, capsule, helpers, on-screen Back, reload with a page open, share sheet → card → Back. Not yet run: photo viewer, lantern sheets |
| Backups (Q1) | 7 for `backup_runs` (only admins read it, nobody on the site can write it). **Restore rehearsal:** in a rolled-back transaction, emptied all 14 tables of the live database, loaded them from a backup, and compared each row by row: all identical, `get_house()` works on the restored house | `/admin` line when there's no backup, a late one, a fresh one. Backup opened with the right key; refused with a wrong key and with one changed byte; restore refuses a project that has houses. Real upload to R2 + `backup:check` from this computer; GitHub run passed; the secret key reads the private capsule bucket (test file, deleted) |
| Security sweep | all 11 tables have row security on; visitors can read only `streets` and call only 7 functions | - |

## Phone checklist (for the founder, on real phones)

Do this on a **cheap Android** and an **iPhone**, in Georgian, ideally with someone over 60 holding the phone.

1. Open the landing page on mobile data. Does it appear within ~3 seconds?
2. Sign in, open the test house. Does the street move smoothly when you slide?
3. Go inside. Can you see the wall *and* the buttons? Add a photo from the camera.
4. Letters: write one, read it, press the phone's Back button. It should go back to the list, then to the room, then to the street, one step at a time.
5. Time capsule: choose a day, put in a letter and a photo.
6. Family helpers: invite your second email, open the link on another phone, join.
7. Download everything. Does the zip save? Open `index.html` from it in airplane mode.
8. Light a lantern as a visitor (signed out). Does the keeper see it?
9. Print the card at home (fold-over A4). Does the QR open the house?

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
