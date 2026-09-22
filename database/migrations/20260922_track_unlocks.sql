-- 20260922_track_unlocks.sql
-- Per-user unlock of a PUBLIC catalog recording (cache of the Wallet entitlement, which is the
-- source of truth). The old model flipped tracks.paid = true globally: one buyer would have
-- unlocked the track for everyone, and the public catalog (catalog_recordings) had no unlock
-- path at all — Redeem 404'd (verified live 2026-09-22).
create table if not exists public.track_unlocks (
  user_id uuid not null references public.users(id) on delete cascade,
  recording_public_id text not null,
  receipt_id text,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, recording_public_id)
);
alter table public.track_unlocks enable row level security;
-- server (service role) writes; users may read their own
drop policy if exists "own unlocks" on public.track_unlocks;
create policy "own unlocks" on public.track_unlocks for select
  using (user_id in (select id from public.users where auth_id = auth.uid()));
