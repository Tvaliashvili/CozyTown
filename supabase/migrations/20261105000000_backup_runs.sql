-- Phase 4: nightly backups (Q1 in docs/QA.md).
--
-- The backup itself runs on GitHub every night (.github/workflows/nightly-backup.yml) and is kept
-- in Cloudflare R2, encrypted. This table is only its diary: one short line per finished backup,
-- so the admin page can warn when backups have stopped. No photos, letters or names in here.


create table public.backup_runs (
  id bigint generated always as identity primary key,
  finished_at timestamptz not null default now(),
  -- Size of the encrypted backup file.
  size_bytes bigint not null check (size_bytes >= 0),
  file_count int not null check (file_count >= 0),
  -- Photos the backup couldn't download. Should always be 0; the admin page shows it if not.
  missing_files int not null default 0 check (missing_files >= 0)
);

alter table public.backup_runs enable row level security;
revoke all on public.backup_runs from anon, authenticated;

-- Only admins read it. Rows are written by the backup script, which signs in as the database
-- owner, so nobody using the website can add or change them.
grant select on public.backup_runs to authenticated;
create policy "Admins see backup runs" on public.backup_runs
  for select to authenticated
  using (public.is_admin());
