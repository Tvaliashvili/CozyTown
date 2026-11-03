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
  `scripts/backup/backup.js`: all tables (incl. `auth.users`) as JSON + every photo + migrations, zipped,
  encrypted with `age` (public key in `scripts/backup/public-key.txt`, private key `BACKUP_PRIVATE_KEY` only in
  `.env.local` and the founder's safe copies), sent to the private R2 bucket `cozytown-backups`. `/admin`
  shows the last one from `public.backup_runs`. Check: `npm run backup:check`. Restore: `docs/BACKUPS.md`.
  New tables in `public` are included automatically. The repo is public: backup logs must never print names or words.

## How the site is organised
- Pages: `/` landing (`src/pages/Landing.jsx`), `/signin` (email + password sign-in + gift-code claim),
  `/town` demo street saved in the browser (`src/TownApp.jsx`) and `/h/<code>` a real house from the
  database (`src/HouseTown.jsx`, talks to the database through `src/data/houses.js`). Both draw the
  same screen, `src/StreetView.jsx`. A tiny router in `src/router.jsx`.
- `/h/<code>/inside` is the room inside a house (`src/inside/`): a 2D SVG drawing with 5 picture
  frames (`frames.js`; the database allows slots 0-4), plus letters. It covers the street, which stays
  loaded underneath. Anyone with the link sees the photos; letters are keeper-only.
  Photo files are in a public bucket under long random names; only `get_house_photos()` reveals them.
  Photos are shrunk on the device first (`src/lib/shrinkPhoto.js`).
- The **time capsule** (`src/inside/Capsule.jsx`, `src/data/capsule.js`) is one chest per house with one
  opening day (Tbilisi time). The keeper picks the day and can only move it later. Items (letter and/or
  photo) can be added until then. Nobody reads the tables directly; `get_capsule`, `add_to_capsule` and
  `open_capsule` check the date. Capsule photos sit in the private `capsule` bucket, downloadable only once
  open. `get_house().capsule_news` tells the keeper on the street when it has opened.
- **Helpers** (co-decorators, `src/inside/Helpers.jsx`, `src/data/helpers.js`): the keeper makes a one-time
  invite code (14 days) and sends `/signin?code=<code>`. The sign-in code box takes gift codes (→ keeper)
  and invite codes (→ helper) through the same `claim_house()`. Helpers hang photos, write letters and fill
  the capsule, but read only their own letters, can't change the outside or the capsule's day, and don't
  see lanterns. `can_edit_house()` = keeper or helper; `is_house_keeper()` = keeper only.
- **Download everything** (keeper only, bottom of the room): `src/export/exportHouse.js` builds the zip on the
  phone with `fflate` (`zipSync`; the worker version stalled) and is lazy-loaded on the button press.
  It holds photos/, letters/, capsule/ (only once open), lanterns.txt and an offline index.html with a
  flat SVG of the house (`src/export/houseDrawing.js`). All people's words are HTML-escaped in that page.
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
  Options live in `src/data/options.js`; translations in `src/i18n/`.

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

**Out of MVP on purpose**: live multiplayer, avatars, voice/video, public browsable interiors,
decorations shop, subscriptions, online payments, email notifications.

**After launch**: Georgian bank payment gateway, email (custom SMTP), voice notes, public visitable
houses, seasonal decorations, subscription, legacy keeper for memorial/baby houses.

## Pricing hypothesis (test, not decided)
Digital house ~39 ₾ · with printed card ~49 ₾ · with engraved wooden keychain ~69-79 ₾.

## Founder owns
Landing page and CSS styling, Georgian copy and translations, choosing colors/props for the look,
phone and grandparent testing, print/engraving shops, Instagram, handling first orders.
