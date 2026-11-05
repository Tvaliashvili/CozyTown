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
| Q19 | 🟢 | Phones | Sign-in: on 360x640 the first box is near the bottom of the screen, under the sky picture. | Smaller `.signin-sky` on short screens. |
| Q20 | 🟢 | Phones | Room sheet: the Share pill sits beside the house name, so a normal Georgian name wraps to 2-3 lines and pushes "Add a photo" down. | Move Share to `.room-top`, or make it a link under the counts. |
| Q21 | 🟢 | Speed | Photos from before small copies load in full in the frames: a visit to the test house costs 286 KB of photos, ~75 KB if all had copies. | One-off script making small copies for rows with empty `small_path`. |
| Q22 | 🟢 | Phones | Landing is 8,600 px tall at 360 px in Georgian (13.5 screens). | Step pictures beside the text, 2 occasions per row, frames 2x2, less section padding: saves ~2,000 px. Founder's CSS, so only if wanted. |
| Q23 | 🟢 | Phones | Helpers and capsule pages open with 6-7 lines before the main button. Keeper's lantern rows are ~130 px each. Empty frames are 35-48 px tap targets at 320-360 px. | Shorter intros, one-line lantern rows, a bigger invisible tap area on `.frame.empty`. |
| Q24 | 🟢 | Tablets | Street on portrait tablets: the house is ~40% of the width, with ~370 px of empty road below it. | Bring the camera closer on tall screens (`CameraRig.jsx`). |
| Q25 | 🟢 | Room | Long wall: if a keeper moves many photos to the album, gaps stay. With photos only in frames 0 and 11 a visitor swipes past a bare stretch (furniture only) to the second photo. New photos fill the gaps first. | Close the gaps when showing it to visitors, if real keepers run into this. |
| Q26 | 🟢 | Room | Long wall on computers: a mouse wheel doesn't move it; only the arrows, or a trackpad's sideways swipe. | Turn the wheel into sideways scrolling, if anyone asks. |

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
- **Town map (founder asked for my call, 2026-11-04):** First Street is in the Old Town (it is where the town began). `/map` stays
  reachable to anyone who types it (nobody does without a link; locking it would stop signed-out testing). The map shows no
  free-plot counts, only "All plots are taken" (while the town is small, counts only say how empty it is; they return with the
  buying flow). A house in the Garden Quarter is recognisable as a memorial house: inherent, the buyer chooses it, so the privacy
  page says so and the admin forms remind the founder to check with the family. Georgian names stay for the founder to review.

---

## Fixed

| ID | Date | What | Commit |
|---|---|---|---|
| Q18 | 2026-11-05 | 🟠 Decorating panel left only a 40-70 px strip for the choices on small phones. Up to 640 px wide (and on short screens) tabs are one line with the icon beside the word, swatches 48 px, "Make it final" 44 px: all 9 wall colours now fit on 360x640 without scrolling, buttons stay at least 44 px. Phones held sideways had no room at all: they now get the side panel, like big screens. `tests/browser/decorating-panel.test.js`. | a98cad1 |
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
| Security sweep | `security.test.js`: all 13 tables have row security on; visitors can read only `streets` and call only the 8 listed functions; every security-definer function pins `search_path` | - |
| Town map | 40+ (`map.test.js`): the map gives no house names or codes, only admins add, open, close and move, new streets start closed, a moved house keeps its link, keeper and letters, the Garden Quarter keeps every house quiet | 24 checks (`map.test.js`): no 3D downloaded on the map, tap to street and back, phone Back, nothing private sent to a visitor, Georgian at 320 px, closed and unknown streets, admin adds and opens a street and moves a house |
| Photo album | 20 in `photos.test.js`: no-frame photos, moving (not into a taken or missing frame), stranger and visitor refused, the 31st refused, deleting makes room, storage figure for admins only | 33 in `album.test.js`: several at once, frames fill first, album from the shelf, arrows and swipe, moving, Back one step at a time, delete with files, too many chosen, visitor's downloads counted, 320 px Georgian |
| Long wall | Frames 0-14 allowed, 15 refused (`photos.test.js`) | 25 in `long-wall.test.js`: the wall grows with the photos, empty frames ahead, next frame peeks in, a new photo is brought into view, arrows to both ends, a real finger swipe, visitor's downloads counted, few photos means nothing to swipe, computer layout beside the sheet, 320 px Georgian |
| Decorating panel | - | 18 in `decorating-panel.test.js`: 6 screen sizes incl. sideways: room for the choices, buttons at least 44 px, no sideways scroll |
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
13. Town map: from your house, tap the map button in the top bar. Tap the Old Town's houses, then First Street, slide along,
    then the back arrows until you're home. Does it feel like a place, not a menu? Is the drawing sharp on your screen?
14. Photo album: tap "Add photos" and pick 8 at once from the gallery. Do the frames fill first and the rest land in the album? How long does it take
    on mobile data, and does the phone stay usable? Tap the book on the shelf (is it easy to hit?), swipe through, move one to the album and hang another.
    Can someone over 60 find the album and get back out?
15. Decorating panel: tap your house. Can you reach every tab and choice with a thumb? Try it with the phone held sideways too.
16. Long wall: fill 15 frames, then swipe along the wall. Is it smooth on the cheap Android? Does a swipe ever open a photo by accident, or trigger the phone's own Back gesture
    near the screen edge? Without being told, does someone over 60 notice there's more wall? Do they use the arrow?

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

### 2026-11-04 · Town map and neighbourhoods (groundwork, not linked yet)
Asked for by the founder, ahead of the "~50+ houses" plan, to be prepared. Nothing links to it, so customers won't find it by accident.
- **Built:** `/map`, a flat tappable drawing (`public/art/town-map.svg`, 9 KB), and `/map/<street>`, a street showing outsides only.
  `/admin` got a "Town map" section (add a street, open or close it) and a "Move" button on each house.
- **Database:** migration `20261109000000_town_map.sql`, tested rolled back, then applied. New table `neighbourhoods`;
  streets got a neighbourhood and an open/closed switch. New streets start closed. First Street is open, in the Old Town.
- **Privacy:** the map returns names and counts only, never a house's code, name or keeper. A browser test reads every
  database answer the visitor receives to check this. New sentence on the privacy page (EN + KA draft), because a stranger
  can now reach an open street without a link. Before this they could too, through the database, but no page offered it.
- **Memorial houses:** a trigger makes every house in a quiet neighbourhood quiet, whichever way it arrives (order, move).
  The mark can't be taken off inside the Garden Quarter. A house that moves out stays quiet until the admin changes it.
- **Found while checking backups (🟠, older than this work, fixed):** a restore into a new project would have failed. The migrations
  add First Street, then the backup adds it again: same name, so the whole restore rolled back. The new neighbourhoods would have
  clashed the same way. `emptyPublicTables()` now clears our own tables first, with a test. Older backups need the migrations
  stored inside them (`docs/BACKUPS.md`). **Still not rehearsed:** a full restore into a real empty project.
- **Choices made without asking (say if you disagree):** First Street belongs to the Old Town. Anyone who types `/map` can open it
  (only admins would be safer but you couldn't test it signed out). The sheet shows free plots ("7 of 8 plots free"). A house on
  a closed street still opens by its link. A street's address comes from its English name.
- **Knowingly left for later:** no link to the map; no choosing a plot when buying; every street looks the same in 3D, so the Old Town
  text promises carved balconies that aren't drawn on the street yet (only on the map). A stranger browsing the Garden Quarter can
  guess its houses are memorials: that's what the neighbourhood is, and the buyer chooses it, but it's worth telling buyers.
- **Checked by eye:** the map in English and Georgian at 390 and 320 px and on a wide screen; the street reached from the map.
  **Not tested:** any real phone (Q5); the memorial error message on the admin page by clicking it (the database side is tested).
- **Founder:** Georgian DRAFT: the `map.*` texts in `src/i18n/ka-app.js`, the privacy sentence, and the names in the migration
  (ძველი ქალაქი, მდინარისპირა, თოვლიანი გორები). Tell me any changes; the names are in the database, so they change with a small migration.
- **Speed:** the map page is under 6 KB of code and style plus the drawing, and downloads no 3D. The landing page is untouched (its test still passes).

### 2026-11-04 · Town map: the open choices settled
The founder asked for my opinion on the four choices above and to apply it. Decisions are under "Accepted".
- **Changed:** the neighbourhood sheet names its streets without "7 of 8 plots free"; a full street still says "All plots are taken".
  `map.plotsFree` removed from both languages. Privacy page: one new paragraph (EN + KA draft) that a house in the Garden Quarter is
  recognisable as a memorial house on the map. Admin: picking a Garden Quarter street in "New order" or "Move" shows a reminder to
  check with the family (`GardenQuarterNote` in `src/admin/NewOrder.jsx`).
- **Tests:** the map browser test now adds its street to the Garden Quarter: checks the reminder appears, the moved house became
  quiet, and the sheet shows no numbers.
- **Founder:** the new Georgian privacy paragraph is DRAFT.
- **Founder's try-out:** the map felt like a list, because only the name pills reacted. Now each neighbourhood's part of the
  drawing (its houses, hills, gardens) is an invisible tappable shape (`area` in `src/map/places.js`), with a soft flash while
  pressed. The pills stay the real buttons for keyboards and screen readers. Browser test taps the Old Town's houses, away from its name.
- **Linked now (founder's call, 2026-11-04):** every street's top bar (real houses and `/town`) has a map button, for everyone;
  the map's back arrow steps back to the house it came from. The street reached *from* the map shows no map button (Back already
  leads there). This is earlier than the "~50+ houses" plan: visitors see one street and three "Opens later" neighbourhoods.
  Phone checklist step 13 added.
- **Hover (founder):** the territory under the mouse lights up (soft cream fill and edge) and its name lifts; keyboard focus on a
  name does the same. On phones the press flash stays. Tested: hovering the Old Town's houses lights both.
- **Redrawn from above (founder chose "bird's-eye, tilted"):** the picture now looks down at the town like a board game:
  roofs with two slopes, a main road dividing the Old Town from Riverside, the river from the hills into the gardens, a thin band
  of evening sky with the peaks at the top edge so it still flows from the header. Territories follow the snow line, the road and
  the garden's edge. Checked by eye at 390 and 320 px in both languages. Still 10 KB.
- **Founder's verdict on the redraw: horrible ("the river is starting from the sky").** Fair: hand-written drawings without a design
  step. Three styles went on the design canvas (A Storybook island, B Clean regions, C Paper map), and the founder picked **C**
  ("looks ok I guess", so worth asking again once it's seen on a phone). It's now the real map, with a new landscape drawing:
  a wide screen shows the whole map with no scrolling (founder's request). The landscape drawing isn't on the canvas.
  Tested: 1280x800, 1920x1080 and a phone held sideways: whole map fits, no scrolling, names inside the map; on a 320 px phone in
  Georgian, no two names overlap. The ink wobble is an SVG filter: about 60 ms to draw at 6x slower CPU (headless, so only a rough
  guide; check on the real phone, Q5).
- **Roof colour (founder):** the dark slate `#3f3f4f` merged with the evening sky. Replaced by teal `#2a7f8a` in the customizer's
  list, the demo neighbour and the landing drawing. `cleanDesign()` drops colours no longer on the list, so this was checked first:
  no real house used it (one house in the database, red roof). Checked by eye on the 3D street and the landing page.
- **Test timeouts:** a full browser run took over 10 minutes and failed with navigation timeouts (6 failures, then 1 on a rerun). One
  was a false alarm from the new map button, fixed in `lanterns.test.js`. The computer had ~1 GB of 6 GB free and 48% CPU when idle,
  with six old dev servers still running. `georgian-small-phone.test.js` failed now and then, at different steps (2 of 4 runs alone,
  even after closing its first page). With the founder's OK the six servers were closed: CPU fell to 17%, free memory didn't improve
  (they used little), and the test then passed 3 of 3. **Cause not proven:** CPU load is the likely one, but it wasn't compared with
  the code from before the map. If it fails again on an idle computer, treat it as a real bug. This computer has only 6 GB.
- **Georgian text (founder: "spacing between and very small"):** two labels (`.step-number`, `.control h3`) used uppercase with letter
  spacing, a style for English; Georgian has no everyday capitals, so it turned into a thin, gappy all-capitals alphabet. Those are
  now plain and bigger, and the smallest Georgian texts went up (block at the end of `src/styles.css`, Georgian only). New test
  `georgian-text-size.test.js`: no spaced or capitalised Georgian, nothing under 14.5 px on 6 screens, English unchanged. Not
  covered by that test: the keeper's room, the capsule and the printed card (keeper-room sizes were raised by reading the CSS).
- **Landing roof, again (founder: "you still didn't fix"):** the site was fixed, but the design canvas holds its own copy of the landing
  page, still dark. Now teal there too. Lesson: the canvas and the site don't share files, so check both.
- **The flat roof, properly (founder, third report):** recolouring was the wrong fix. The landing drawing's flat roof had no top surface,
  only a front edge and a side, so the sky showed through where the roof should be. Top surface added, on the site and the canvas.
  The founder had said so from the start ("looks like sky is merged with it"); I treated it as a colour problem.
- **Step pictures (founder):** step 1 used a 20 px icon meant for the occasion pills (since b9e3824), steps 2 and 3 use 64 px, so step 1 looked
  tiny and its label sat higher. New 64 px `PICTURES.chooseHouse`, and a check that the three are the same size. Step 2's picture was
  redrawn too (founder): a ring with a stick on the tag read as a magnifying glass. Now a wooden tag on a ring, with a clean QR code.
- **Regression from the map button, fixed:** on phones the title wrapped, the back button dropped out of line, and the tagline ran
  onto the hills, in both languages. Now the buttons stay level and the tagline is hidden up to 480 px wide.
- **Tests after the paper map:** `npm run test:browser` 172 passed, 0 failed, with the old servers closed. `npm run test:db` 268 passed
  earlier the same day; no database change since.
- **Growing the map (founder: "like a GTA map", meaning seen from the top with territories lighting up on hover, not zooming):**
  the drawing is extended by hand as neighbourhoods open, with streets drawn in place once there are more than a few. Recorded in CLAUDE.md.

### 2026-11-05 · Backup check and restore rehearsal
- **Healthy:** all 3 backups in R2 (2 nightly, 1 monthly) open with no damage; every photo copy a backup names is there and none is
  unaccounted for; no row points at a missing photo file. Nothing private was ever committed to the repo, and no key is in it.
- **First full restore rehearsal (`npm run test:restore`, new):** on a local Postgres 17.11, all 15 migrations (with the capsule one below)
  ran from zero and matched live with 0 differences across columns, constraints, indexes, rules, functions, triggers, permissions and
  buckets. The real newest backup then restored with every row identical, including login accounts, all links between tables whole, a
  visitor and the keeper getting the right things. **Rehearsed with Supabase's own tables copied, not a real project:** signing in with a
  restored password and uploading photos back are still unproven.
- **Fixed (🟠) unpacked backups could reach the public repo:** `backup:extract` and the docs' example folder weren't ignored by git, so
  one `git add .` would have published letters and photos. Now the folder gets its own `.gitignore`, whatever it's called, and
  `/backups/` and `/backup-folder/` are ignored too. Checked with a real extract.
- **Fixed (🟠) a restore that stopped while uploading photos couldn't finish:** the database part refuses a project with houses, and the
  database was already back. New `--photos-only`. **Not run against real storage**, only reviewed: the live project isn't a safe place to try it.
- **Changed: the schedule moved from 05:00 to 05:23 Tbilisi.** The run for 2026-11-04 started 6 hours late (07:04 UTC); on the hour is
  GitHub's busiest time. Only one scheduled run so far, so this is GitHub's own advice, not a measured cure. Docs no longer promise an exact time.
- **Watch:** the 2026-11-05 scheduled run had not started by 05:40 UTC (4h40 after its slot, while yesterday's took 6h). If `/admin` turns red, runs
  are being skipped, and the nightly needs a sturdier trigger. Founder's 2 offline copies of the private key: still unconfirmed.

### 2026-11-05 · Phone menu, sign-in link, delete an opened capsule
- **Phone menu (founder):** up to 640 px the top-bar buttons of the street and landing page go behind a sandwich button, as rows with words, beside
  a smaller one-line title. Back, a tap outside, and Escape close it. Tablets keep the row. The landing page gained no download of other pages.
- **Sign-in (founder):** "Sign in" links open the sign-in form (`/signin?login`): landing, street account, card and admin. The gift buttons and
  invite links still start on "create account", because those people are new.
- **Capsule (founder: an opened capsule was a dead end):** below an opened capsule the keeper gets "Delete it and make a new one", then a warning
  that says how to keep a copy first. Migration `20261110000000_delete_opened_capsule.sql`, tested rolled back, then applied. Photo files go in the nightly
  tidy-up. **Choice made without asking:** a capsule that's still locked can't be deleted, by anyone, because "nobody can touch it before that day" is the
  product's promise. Terms updated (EN + KA draft). "Deleted for good" means from the house: copies leave the backups within a year, as `/privacy` says.
- **Layout review, phone and tablet (Fable agent, live site, 6 sizes, both languages, visitor and keeper screens):** Q18-Q24 above. No sideways scroll anywhere, no page errors.
  Not covered: real devices, on-screen keyboards, phones held sideways, the lantern form, the photo viewer. Ran before the phone menu went live.
- **Found by the tests:** the Georgian title was clipped on a 320 px phone (fixed: it scales with the screen). Opening the share sheet from the menu
  leaves a history step behind it; one Back press still closes it and skips the step, now tested.
- **Tests:** `npm run test:db` 284 passed. `npm run test:browser` 211 passed, 1 failed: `signs-and-small-photos` timed out waiting for the photo viewer's
  take-down button, in code not touched here. That file then passed 3 of 3 alone, so load is the likely cause, not proven (like the timeouts noted on 2026-11-04).
  If it fails on an idle computer, treat it as a real bug. Landing page: ~80 KB gzip (79 before), and its test still passes.
- **Founder:** new Georgian DRAFT texts: `menu.*` in `ka.js`, `capsule.startOver`, `capsule.delete*`, `capsule.deleting` in `ka-app.js`, one Terms paragraph.

### 2026-11-05 · Photo album: 30 photos in a house
- **Built (founder approved):** a book on the shelf and a card open the album. New photos fill empty frames first, then the album. Several can be chosen at once
  (`AddMany.jsx`, one at a time, with a Stop button). The viewer has arrows and swipe, and moves a photo between wall and album. Migration
  `20261111000000_photo_album.sql`, tested rolled back, then applied: `slot` may be empty, a trigger refuses a 31st photo, and `admin_storage_use()` feeds a storage line on `/admin` (red at 700 MB).
- **Choices made without asking, for the founder to check:** 30 means in total, including the 5 in frames. "Take it off the wall" is now "Delete", since moving to the album is
  the gentle option. Visitors only get the album when it shows something the walls don't. `/privacy` now says all photos are visible to anyone with the link (EN + KA draft).
- **Measured:** a visitor's room downloads 5 small copies; opening a full album downloads 10 of 30, the rest only on scrolling. These are counts of files, not real traffic.
- **Tests, final code:** `npm run test:db` 301 passed. `npm run test:browser` 270 passed, 0 failed, 11 minutes in all, with Brave closed.
- **The earlier timeouts now have a likely cause: a busy computer.** With Brave open (5.9 GB RAM, CPU often 66-100%) full runs hit timeouts all over, and the old code
  a98cad1 failed the same way, so the album didn't cause them. Brave closed: clean, and landing went from about 5 minutes to under one. One clean run, and two other changes went in before it
  (below), so this is strong evidence, not proof. **To test: close the browser and keep the lid open.**
- **Test fixes:** the runner gives up after 15 minutes on one file, because a laptop going to sleep mid-test left it waiting for over 2 hours (not yet seen triggering). A Chrome that won't close cleanly
  no longer hides results. Longer page limits in `kit.js`. The album test keeps one page open at a time. The back-button test waits for the history steps instead of a fixed half second.
- **Not tested:** real phones (checklist steps 14-15), real phone photos, adding many on slow mobile data. After my last look at the screens, the viewer's Delete and Close button widths changed; the 320 px test checks they fit, but nobody has looked at them.
- **Not done on purpose:** shrinking photos harder (needs real phone photos to judge), refusing duplicates, selling more room, small copies for older photos (Q21). The landing page still only says "Photos on the walls".
- **Founder:** new Georgian DRAFT texts: `album.*`, `add.titleAlbum`, `add.toAlbum`, `add.adding`, `add.many*`, `room.previous`, `room.next`, `room.toWall`, `room.toAlbum`, `room.noFreeFrame`, `room.takeDown*`, `room.addPhoto`, and the `/privacy` change.

### 2026-11-05 · The long wall: 15 frames
- **Built (founder's idea and OK):** 15 frames instead of 5, on a wall that swipes sideways. Still 30 photos in a house. Migration `20261112000000_fifteen_frames.sql`, tested rolled back, then applied. Frames 0-4 didn't move, so photos already hanging stay where they are.
- **Choices made without asking, for the founder to check:** the wall grows by whole stretches, each with its own furniture (plant, sideboard, armchair, second window with no moon, floor lamp). Keepers see at least the first 5 frames, or up to their last photo plus 2 empty ones; visitors only frames with a photo. A new photo landing off-screen slides the wall to it. Frames stay the same size on the screen as before.
- **Possible next step, not done:** frames on a keeper's small phone are still small (first frame 56 px tall on 320x568, Q23), because the button sheet takes up to 56% of the height. A shorter sheet would now make them bigger, since the wall no longer needs to fit the width, but it would push Letters and the capsule further down. The founder's call, ideally after phone testing.
- **Measured:** a visitor who doesn't swipe at a full wall on a 390 px phone downloads 6 of 15 small copies (the first try downloaded 8, so the look-ahead went from 150 to 100 px). Walking the whole wall downloads 15. A full wall takes 2 arrow presses for a keeper on that phone. Counts of files, not real traffic.
- **Tests:** `npm run test:db` 302 passed. Full `npm run test:browser` 294 passed, 0 failed, then the look-ahead changed (one number) and the long-wall test was made to wait for its arrows; those two files re-run: `long-wall` 25 passed, `album` 33 passed. The rest of the suite was not re-run after that last change.
- **Intermittent failures while testing:** in about 4 of 11 `long-wall` runs an arrow was late or the page didn't load, with Brave open (0.9 of 5.9 GB free, CPU 100%). Measured, the arrow always came, between 0.6 and 7.4 seconds after the wall moved, so the likely cause is the busy computer and the 3D street drawn in software, not stuck arrows. Not proven on a real phone: watch for slow arrows in checklist step 16.
- **Not tested:** real phones, iPhone Safari (the phone's Back gesture at the screen edge, the swipe), photos from real keepers on the new frames' shapes. Test swipes were headless Chrome only.
- **Founder:** new Georgian DRAFT texts: `room.wallLeft`, `room.wallRight` (read out by screen readers, not shown on screen).

