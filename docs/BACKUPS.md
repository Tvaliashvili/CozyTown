# Backups · Cozy Town

Supabase's free plan keeps no backups, so we make our own, every night.

## What happens each night

At **05:00 Tbilisi time** GitHub runs `scripts/backup/backup.js` (set up in
`.github/workflows/nightly-backup.yml`). It:

1. copies **every table** in the database, including the login accounts (so keepers' passwords still work
   after a restore),
2. downloads **every photo**, including sealed time-capsule photos,
3. adds the **migrations** (the SQL that builds the tables), so one backup is enough to rebuild everything,
4. zips it all and **encrypts** it. Only the private key (`BACKUP_PRIVATE_KEY`, see below) can open it,
5. uploads it to the private Cloudflare R2 bucket `cozytown-backups`,
6. keeps the last **30 nights** and the first backup of each month for **12 months**, deleting older ones,
7. writes one line in `public.backup_runs`, which the **admin page** shows at the top:
   green "Last backup: …", or **red** if no backup has finished for 30 hours.

If a run fails, GitHub sends an email to the account that last pushed a change to the workflow file.
A red line on `/admin` means the same thing.

The repo is public, so anyone can read the run's log. The script only prints counts and sizes, and
the backup itself is encrypted before it leaves GitHub's computer.

## The private key: the one thing you must not lose

`BACKUP_PRIVATE_KEY` is in `.env.local` on the founder's computer, **and nowhere else**. GitHub only has
the public half (`scripts/backup/public-key.txt`), which can lock backups but not open them.

**If this computer is lost and nobody has a copy of the key, every backup is useless.** Keep two more copies:
- in a password manager (Bitwarden is free), and
- printed on paper, somewhere safe at home.

It's one line starting with `AGE-SECRET-KEY-1`.

## One-time setup (founder)

1. **Cloudflare → R2 Object Storage.** Switch R2 on (Cloudflare asks for a card; under 10 GB it stays free).
2. **Create bucket** named exactly `cozytown-backups`. Leave the other options as they are.
3. **R2 → Manage API tokens → Create API token.** Permission: *Object Read & Write*, only for the bucket
   `cozytown-backups`. Copy the **Access Key ID** and **Secret Access Key** (shown only once), and the
   **Account ID** (on the R2 overview page).
4. **Supabase → Project Settings → API Keys → Secret keys.** Copy the secret key (`sb_secret_…`).
   It can read everything, so it only goes into GitHub secrets and `.env.local`, never into the website code.
5. **GitHub → the CozyTown repo → Settings → Secrets and variables → Actions → New repository secret**,
   six times:

   | Name | Value |
   |---|---|
   | `SUPABASE_PROJECT_REF` | `ynkupominvvioqpwihfv` |
   | `SUPABASE_DB_PASSWORD` | the database password from `.env.local` |
   | `SUPABASE_SECRET_KEY` | from step 4 |
   | `R2_ACCOUNT_ID` | from step 3 |
   | `R2_ACCESS_KEY_ID` | from step 3 |
   | `R2_SECRET_ACCESS_KEY` | from step 3 |

6. Add the same four new values (`SUPABASE_SECRET_KEY`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`,
   `R2_SECRET_ACCESS_KEY`) to `.env.local` too, so backups can be checked from this computer.
7. **GitHub → Actions → Nightly backup → Run workflow.** After a minute or two it should turn green, and
   `/admin` should show "Last backup: …".

## Once a month: check that a backup really opens

```
npm run backup:check
```

This downloads the newest backup, opens it with the private key, and checks every file against the
fingerprint taken when it was made. It prints how many rows and photos are inside. If it says
"All … files are complete and undamaged", all is well.

## If the worst happens

**Someone needs one of their own photos or letters back** (or asks for "everything we have about me"):
```
npm run backup:extract -- newest backup-folder
```
Photos are in `backup-folder/files/`, letters in `backup-folder/database/public.letters.json`.
It's private: delete the folder when done.

An older backup: download it from R2 in the Cloudflare dashboard, then
`npm run backup:extract -- path/to/2026-11-05.zip.age backup-folder`.

**The Supabase project is gone or broken:**
1. Make a new Supabase project (same region, eu-central-1).
2. Run every file in `supabase/migrations/` on it, in order (the migrations are also inside the backup).
3. Set Authentication → "Confirm email" off, as before.
4. In `.env.local`, change `SUPABASE_PROJECT_REF`, `SUPABASE_DB_PASSWORD`, `SUPABASE_SECRET_KEY`,
   `VITE_SUPABASE_URL` and `VITE_SUPABASE_KEY` to the new project's values.
5. `npm run backup:restore -- newest`. It refuses a project that already has houses, so it can't overwrite
   live data. Everything goes into the database in one go: if anything fails, nothing is half-done.
6. Update the two `VITE_SUPABASE_*` build variables in Cloudflare and the secrets in GitHub, then redeploy.

Printed QR codes keep working: they point at `cozytown.ge/h/<code>`, and the house codes come back with
the backup.

## Limits to know about

- Each backup is a full copy. With 30 + 12 copies, R2's 10 GB fills up once one backup is about 200 MB
  (roughly 1,000 photos). The script fails loudly past 8 GB. Before then, switch to copying each photo
  only once (photos never change), or move to a paid plan.
- GitHub pauses scheduled jobs in a public repo after **60 days with no new commits**. The red line on
  `/admin` will show it; pressing "Enable workflow" on the Actions tab turns it back on.
- The whole backup is built in memory, which is fine up to about 1 GB.
- Signed-in sessions aren't kept: after a restore, everyone signs in again (same email and password).
