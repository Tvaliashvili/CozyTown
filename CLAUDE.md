# Cozy Town · მყუდრო ქალაქი

A 3D cozy town on the web where people buy a little house for someone they love, then fill it
with photos, letters and a time capsule. Sold as a gift, often with a physical QR keychain or card.
Launching in Tbilisi, Georgia first.

## Who you're working with
The founder knows HTML and CSS and a little JavaScript, and works on this full time.
Claude writes most of the code. Keep code readable for a beginner: plain JavaScript (no TypeScript),
small files, clear names, short comments that explain *why*. Explain changes in plain words.

## Product decisions (settled - don't re-litigate)
- **Name**: Cozy Town (English) / მყუდრო ქალაქი (Georgian). **Domain**: `cozytown.ge`
  (cozytown.com is taken - listed for ~$12k, not worth it). Keep the domain on auto-renew:
  every printed QR depends on it.
- **Ownership**: the company owns the platform; customers get a license to a house and own their
  content. The person who controls a house is its **keeper**. Buyer gets a gift code → recipient
  claims it and becomes keeper → keeper can invite co-decorators.
- **Promise**: "Your memories are always yours. Download everything any time. If we ever close,
  we give at least 6 months' notice." Never promise "forever".
- **Export**: zip of all photos + letters + a simple offline HTML page of the house.
- **Privacy**: houses are private by default, opened only by an unguessable link / QR.
  Strangers on the street see exteriors only. Children's and memorial photos are sensitive.
- **Accounts**: only keepers (and the helpers they invite) sign in. Visitors need no account and can light a lantern anonymously.
- **Easy enough for grandparents**: tap-to-move camera, no avatar, no joystick, big buttons.
- **The outside of a house is designed once, by the keeper** (the recipient, after claiming the gift;
  the admin can set a starting design from the buyer's order). It can be changed freely until it's
  submitted; after that the server refuses design changes, and a redesign is a paid extra, **15 ₾**
  (manual for now: admin calls `admin_unlock_design()` after payment). Photos, letters and lanterns
  are not affected.
- **Time capsule**: locked even for the keeper; the server refuses to reveal contents before the date.
- **QR URLs are printed on physical objects - the URL format must never change.**
  Format: `https://cozytown.ge/h/<code>`.
- **Languages**: Georgian and English from day one (Noto Sans Georgian or a BPG font).
- **Performance**: must run smoothly on budget Android phones. Low-poly, few draw calls,
  compress photos on the device before upload.

## Tech stack
| Layer | Choice |
|---|---|
| Frontend | Vite + React, plain JavaScript |
| 3D | React Three Fiber + drei |
| 3D art | Houses built in code from simple parametric parts; CC0 props from Kenney / Quaternius |
| Backend | Supabase free tier: Postgres, Auth, Storage, row-level security |
| Hosting | Cloudflare Pages (free) |
| Email | **None for now.** The founder will set up private email hosting later and plug its SMTP into Supabase |
| Payments | **Manual for MVP** (bank transfer, orders via Instagram/Facebook/form, admin page creates houses). Stripe doesn't serve Georgia; later use Bank of Georgia or TBC e-commerce gateway |

Consequences of "no email yet":
- Keeper login is **email + password with no email confirmation** (Supabase "Confirm email" is off,
  because its default mailer won't send to regular users). Google sign-in was set aside (founder,
  Nov 2026) as too fiddly for now. There is no "forgot password" email: the admin resets passwords by hand.
  Once custom SMTP exists, turn on confirmation and add password-reset links.
- Notifications ("someone lit a lantern", "your capsule opened") are **in-app** for now:
  shown when the keeper next opens their house.

Budget is near zero: stay on free tiers. Supabase free has no automatic backups, so we run our own
nightly backup (database + storage) from the start. Move to Supabase Pro once paying customers arrive.

**Hosting limits and costs** (rough, Nov 2026 - check current pricing pages):
- Photos live in **Supabase Storage**, not Cloudflare. The Cloudflare Worker only serves the site and has
  a generous free limit. Cloudflare R2 (10 GB free) holds only our backups so far.
- Supabase free: ~1 GB storage, ~5 GB downloads/month. A photo is ~250 KB after shrinking, so a
  5-photo house is ~1.25 MB → ~800 full houses of storage. **Downloads run out before storage**, so
  the frames now show small copies (~30 KB each) and a room visit costs ~150 KB instead of ~1.25 MB,
  plus ~250 KB per photo someone taps open. Room for ~8,000 visits a month if people open 2 photos each,
  up to ~30,000 if they only look at the wall, instead of ~4,000 (estimates, not measured on real traffic).
- Supabase Pro ≈ $25/month (~68 ₾) ≈ two house sales a month.
- Each house pays once but costs every month: costs grow with *total* houses, income only with
  *new* sales. That's why monthly income matters (see "Ways to earn"). Until it exists, set aside
  a small part of every sale (e.g. 5 ₾) as a hosting fund.
- Next cheap fix, for later: move photos to Cloudflare R2 (no download fees). It needs a small server
  function for uploads, since secret keys can't be in the browser, and its 10 GB is shared with the backups.

## Infrastructure
- Code: https://github.com/Tvaliashvili/CozyTown (branch `main`).
- Supabase project `cozytown`, ref `ynkupominvvioqpwihfv`, region eu-central-1 (Frankfurt), free plan.
  The org "Unicraft" also holds another project - its free plan allows only 2 active projects.
- Secrets live in `.env.local` (git-ignored): DB password, plus `VITE_SUPABASE_URL` / `VITE_SUPABASE_KEY`
  (the public publishable key, safe in the browser; data access is controlled by database rules).
  Never commit secrets or put the service/secret key in frontend code.
- Database changes live in `supabase/migrations/` (one SQL file per change, never edit an applied one).
  Applied over the session pooler `aws-1-eu-central-1.pooler.supabase.com:5432`, user `postgres.<ref>`:
  test first with `npm run test:db -- --with supabase/migrations/<file>.sql` (rolled back), then apply with
  `npm run migrate -- supabase/migrations/<file>.sql`.
- Hosting is a Cloudflare **Worker with static assets** (not Pages), name `cozytown`, live at
  https://cozytown.sandrotvaliashvili10.workers.dev. Settings in `wrangler.jsonc` (SPA fallback so
  `/h/<code>` works). Cloudflare builds from GitHub `main` on each push; the build needs the two
  `VITE_SUPABASE_*` values as build variables. Manual deploy: `npm run build` then `npx wrangler deploy`
  with `CLOUDFLARE_API_TOKEN` from `.env.local`.
- Admin: after the founder first signs up, add their user id to `public.admins` in the SQL editor.
- **Backups**: a nightly GitHub Action (`.github/workflows/nightly-backup.yml`, 05:00 Tbilisi) runs
  `scripts/backup/backup.js`: all tables (incl. `auth.users`) as JSON + migrations, zipped, plus each photo
  copied once (`photos/` in R2, kept while any backup lists it), all encrypted with `age` (public key in `scripts/backup/public-key.txt`, private key `BACKUP_PRIVATE_KEY` only in
  `.env.local` and the founder's safe copies), sent to the private R2 bucket `cozytown-backups`. `/admin`
  shows the last one from `public.backup_runs`. Check: `npm run backup:check`. Restore: `docs/BACKUPS.md`.
  New tables in `public` are included automatically. The repo is public: backup logs must never print names or words.
  The same run deletes photo files on the site that no `photos` / `capsule_items` row points to (after 7 days, Q7).

## How the site is organised
- Pages: `/` landing (`src/pages/Landing.jsx`), `/signin` (email + password sign-in + gift-code claim),
  `/town` demo street saved in the browser (`src/TownApp.jsx`) and `/h/<code>` a real house from the
  database (`src/HouseTown.jsx`, talks to the database through `src/data/houses.js`). Both draw the
  same screen, `src/StreetView.jsx`. A tiny router in `src/router.jsx`.
- `/h/<code>/inside` is the room inside a house (`src/inside/`): a 2D SVG drawing with 5 picture
  frames (`frames.js`; the database allows slots 0-4), plus letters. It covers the street, which stays
  loaded underneath. Anyone with the link sees the photos; letters are keeper-only.
  Photo files are in a public bucket under long random names; only `get_house_photos()` reveals them.
  Photos are shrunk on the device first (`src/lib/shrinkPhoto.js`). Each photo on the wall has two files:
  the full one (`path`) and a small copy for the frames (`small_path`, ~30 KB; empty on older photos, which then
  show the full file). The full one downloads only when tapped; the zip and the backups use the real files.
  Anything that deletes or tidies photo files must handle both (`LEFTOVER_FILES_SQL` in `scripts/backup/shared.js`).
- **Signs on the street** (`src/scene/House.jsx`, still, never moving): big bow on the roof = gift not claimed
  (`get_street`, so also on neighbours); mailbox flag up = a letter the keeper hasn't looked at, gift box at the door
  = capsule day has come and the keeper hasn't looked inside (both from `get_house`, so only with that house's link).
  The flag goes down through `mark_letters_seen()` when the keeper opens the letters. `houses.quiet` marks a memorial
  house (admin page: order form or house list): no bow, no gift box. The database never tells visitors a house is quiet.
- The **time capsule** (`src/inside/Capsule.jsx`, `src/data/capsule.js`) is one chest per house with one
  opening day (Tbilisi time). **Filled and locked once** (founder, Nov 2026): on one page the keeper writes a
  letter, adds up to 10 photos and picks the day, then a warning step, then `seal_capsule()` saves it all at
  once. After that nothing can be added and the day can't move. Helpers can't make or fill it. Nobody reads
  the tables directly; `get_capsule`, `seal_capsule` and `open_capsule` check the rules. Capsule photos sit
  in the private `capsule` bucket (upload: keeper, before sealing), downloadable only once open.
  `get_house().capsule_news` tells the keeper on the street when it has opened.
- **Helpers** (co-decorators, `src/inside/Helpers.jsx`, `src/data/helpers.js`): the keeper makes a one-time
  invite code (14 days) and sends `/signin?code=<code>`. The sign-in code box takes gift codes (→ keeper)
  and invite codes (→ helper) through the same `claim_house()`. Helpers hang photos and write letters,
  but read only their own letters, can't change the outside or the capsule (they see it once it opens),
  and don't see lanterns. `can_edit_house()` = keeper or helper; `is_house_keeper()` = keeper only.
- **Download everything** (keeper only, bottom of the room): `src/export/exportHouse.js` builds the zip on the
  phone with `fflate` (`zipSync`; the worker version stalled) and is lazy-loaded on the button press.
  It holds photos/, letters/, capsule/ (only once open), lanterns.txt and an offline index.html with a
  flat SVG of the house (`src/export/houseDrawing.js`). All people's words are HTML-escaped in that page.
- `/terms` and `/privacy` (`src/legal/`): plain reading pages, lazy-loaded, linked from the landing footer and
  the "Create my account" form. Texts in `terms.js` / `privacy.js`, business details in `company.js`
  (`isDraft` shows a draft notice). When a feature changes what we keep or who sees it, update `privacy.js`.
- `/h/<code>/card` is the printable bank-card-size card (`src/card/`), for the keeper or an admin.
  While the house is unclaimed it carries the gift code. Prints as a print-shop PDF (3 mm bleed) or
  a fold-over A4 sheet. QR codes always use `houseUrl()` from `src/data/links.js` (never the
  current address), because they get printed. Keepers reach it from the street's share button.
- `/admin` is the founder's page for manual orders (`src/admin/`, English only, talks through
  `src/data/admin.js`). One form creates the house, the order (buyer, contact, price, paid, note - kept in
  `public.orders`, admins only) and the buyer's first letter. The house list marks orders paid, adds
  letters (write-only: admins can't read letters), unlocks a paid redesign and links to the card.
  Signed-in admins get an "Admin page" button on `/signin`.
- Designs from the database always go through `cleanDesign()` (`src/data/design.js`), which drops
  any value the customizer doesn't offer.
- The town and the sign-in page are lazy-loaded, so the landing page doesn't download three.js or
  the Supabase client. Keep it that way: the landing page must stay light for budget phones.
- Illustrations are SVG files in `public/art/`; small icons are in `src/ui/icons.jsx`.
- The approved design lives on the Claude Design canvas "Cozy Town Design".

## Quality (QA log)
`docs/QA.md` is the running QA/QC and code-review log: open findings with severity, what's fixed,
what's tested and how, a phone checklist for the founder, and dated reviews. After each main piece of
work, test it and update the log; every few features, do a wider review (security, phones, Georgian, speed).

Tests live in `tests/` (see `tests/README.md`): `npm run test:db` (database rules, rolled back) and
`npm run test:browser` (headless Chrome with throwaway accounts, removed afterwards). Add tests there for new
features, not in temporary folders. A new function visitors may call goes into `VISITOR_FUNCTIONS` in
`tests/db/security.test.js`.

## How the 3D code works (read before changing src/scene)
- Run `npm run dev` (Vite 6 - Node is 22.11, too old for Vite 7). `?debug` shows FPS and exposes `window.__gl`.
- **The canvas only redraws on demand** (`frameloop="demand"` in `Town.jsx`). Anything that animates
  must call `invalidate()` each frame it changes, or it will freeze.
- **Shadows don't update automatically** (`shadowMap.autoUpdate = false`). `ShadowRefresher` in
  `Town.jsx` re-renders them when the house design changes; anything else that moves a shadow-casting
  object must set `gl.shadowMap.needsUpdate = true`.
- Materials are shared per color via `getMaterial()` in `materials.js` - never create materials inline.
- Don't use drei's `<Html>`: it crashes under React 19 StrictMode. Use `ScreenAnchor.jsx` to pin a
  normal DOM element (rendered in `App.jsx`) to a 3D point.
- Budget at last check: ~120 draw calls, ~2.4k triangles in phone street view.
- House geometry is built from parts in `src/scene/parts/`, sized by `parts/dimensions.js`.
  Options live in `src/data/options.js`; translations in `src/i18n/`: `en.js`/`ka.js` hold only the landing page's
  texts; every other text goes in `en-app.js`/`ka-app.js`, which download with the first non-landing page (Q6).

## MVP plan (target: selling by ~Jan 25, 2027; Valentine's Feb 14; Georgian Mother's Day Mar 3)
- [ ] **Phase 0 - Setup & validation (wk 1)**: name, domain, Instagram, founder builds landing page
      + waitlist, 15-20 customer conversations; project scaffold, GitHub, Supabase project.
- [x] **Phase 1 - 3D prototype (wk 2-4)**: one street (~8 plots), tap-to-move camera,
      customizer (roof, colors, door, windows, garden, mailbox, lanterns). Test on a cheap Android.
      *(Built Nov 2026; still needs a real budget-Android test.)*
- [ ] **Phase 2 - Real houses (wk 5-7)**: keeper login, gift-code claim, save houses, one cozy
      interior room with photo frames and mailbox letters, private link, QR, printable PDF card, lanterns.
- [x] **Phase 3 - Capsule & sharing (wk 8-9)**: server-locked time capsule, co-decorator invites,
      export zip, Georgian/English, admin page for manual orders. *(Built Nov 2026; Georgian texts
      are DRAFT until the founder reviews them.)*
- [ ] **Phase 4 - Pilot & polish (wk 10-11)**: 10-20 friends-and-family houses, grandparent
      usability fixes, performance, terms and privacy pages.
- [ ] **Launch**: Valentine's soft launch with manual payments; Mother's Day push with keychains.

**Living street (polish, first step built Nov 2026: mailbox flag, gift bow, capsule gift box)**:
the street was completely still and felt a bit lonely. Small, calm signs of what's
happening in each house. Still to add from this list:
- *Tied to the house*: mailbox flag up for a new letter; lit lanterns glow; gift box with a ribbon
  on the doorstep on capsule-opening day; a big gift bow on unclaimed houses; balloons on a
  birthday/anniversary (if the keeper adds the date); a warm window light after a recent visit.
  Memorial houses get only quiet signs (e.g. a small candle in the window).
- *Ambient*: a cat asleep on a doorstep, birds on a roof, day/night following Tbilisi time,
  seasons (snow, autumn leaves), chimney smoke, a bicycle by a fence.
- **Never** police, ambulance, coroner or anything alarming: some houses are memorials or for babies.
- **Static first**: the canvas only redraws on demand, so things that move all the time (walking
  people, driving cars) cost battery and FPS on budget phones. Start with still signs; add gentle,
  slow animation later only if needed.
- **Privacy**: visit signs stay soft and vague; strangers must not be able to tell who visits whom or when.

**Town map and neighbourhoods (planned, founder decided Nov 2026: start small, then expand)**:
- Layers: town → neighbourhood → street (8 plots, already in the database) → house. Neighbourhoods
  are one new table on top of `streets`.
- **Launch with the one street we have.** Build the map once there are several full streets (~50+ houses).
  Then open **one street at a time**, the next only when the current one is nearly full, so the
  town never looks empty or abandoned.
- The map is a flat, light illustrated drawing you tap (not another 3D scene), for budget phones.
- **Visitors still go straight to the house**: the QR opens `/h/<code>` directly. The map is only
  for exploring and for choosing a plot when buying; grandparents never have to navigate it.
- Neighbourhoods with character: an Old Town with carved wooden balconies (a Tbilisi touch),
  Riverside, Snowy Hills, and the quiet Garden Quarter (below).
- **Family streets**: a family buys neighbouring plots (grandma's house next to the grandchildren's),
  a reason to buy more than one house.
- Strangers browsing the map see outsides only; house names are already shown inside only.

**Memorial houses get their own quiet neighbourhood**, "The Garden Quarter" (ბაღების უბანი),
inside Cozy Town, not a separate site:
- Calm mood: evening light, gardens, candles; no balloons and no cheerful gift offers.
- **Never call it a cemetery**: a peaceful garden, not a graveyard.
- **The buyer chooses**: a family may want a memorial house on the same street as their other houses. Allow it.
- A house can move there later (e.g. when its person passes away). Links are `/h/<code>` with no
  street in them, so printed QR codes keep working after a move.
- Arrives together with the map.

**Market check (web search, Nov 2026, US results only)**: nothing found combining a *gift* of a cozy
*place* with a printed QR, for *living* people, in Georgian. Pieces exist separately: memorial
sites (MuchLoved, Keeper, Mimorial: virtual candles and roses), QR memorial keychains (Memorygram
~$69.99), browser 3D farewell rooms (farvel), time-capsule apps (FutureMe, Capsy), couples apps
(Between, Paired). People already pay for keepsake QRs and virtual flowers. Some memorial sites have
closed and left dead QR codes, so our 6-months-notice + export promise is a selling point.
Still to check: Georgian sellers on Instagram/Facebook. Real proof = customer conversations and Valentine's pre-orders.

**Out of MVP on purpose**: live multiplayer, avatars, voice/video, public browsable interiors,
decorations shop, subscriptions, online payments, email notifications.

**After launch**: Georgian bank payment gateway, email (custom SMTP), voice notes, public visitable
houses, seasonal decorations, subscription, legacy keeper for memorial/baby houses.

## Pricing hypothesis (test, not decided)
Digital house ~39 ₾ · with printed card ~49 ₾ · with engraved wooden keychain ~69-79 ₾.

## Ways to earn beyond selling houses (ideas, founder liked them, Nov 2026)
**Rule**: nothing paid ever locks away what's already there. If someone stops paying, their house,
photos and letters stay visible and downloadable; only *new* paid extras stop. Lanterns stay free.
1. **Small gifts left at a house**: for a few lari, anyone leaves a bouquet, birthday cake, balloon
   or New Year tree with a short note; it appears on the doorstep (ties into the living street).
   Repeats every birthday/anniversary. Memorial houses: only quiet gifts (candle, flowers), never pushed.
2. **Seasonal decorations**: New Year lights and snow, spring flowers, Valentine's; sold each season, every year.
3. **Physical products from the house**: yearly printed photo book of its photos and letters,
   framed picture of the house, house-shaped New Year ornament (same print shops as cards/keychains).
4. **Optional "Cozy Town Plus" (later, ~5-9 ₾/month)**: more photos/albums, voice notes, more
   co-decorators, letters scheduled for a future date, seasonal decorations included.
   The basic house is complete without it.
5. **Group and business houses**: weddings (guests leave letters/photos; sold via wedding planners),
   colleague farewells/retirements, school graduation classes.
6. **Partner shops**: real flowers or cake from a Tbilisi florist/bakery delivered with the digital gift, for a commission.

**Avoid**: ads on the street; selling or sharing anything about people's houses.
**Limits**: small payments need the Bank of Georgia / TBC gateway (nobody bank-transfers 3 ₾),
and they only sell if people come back to the house (living street, bigger room).
**Order**: at launch with manual payment → physical products, wedding/group houses. After the
gateway → gifts at the door, seasonal decorations. Later → Plus subscription, partner shops.

## Founder owns
Landing page and CSS styling, Georgian copy and translations, choosing colors/props for the look,
phone and grandparent testing, print/engraving shops, Instagram, handling first orders.
