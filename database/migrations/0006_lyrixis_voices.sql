-- ============================================================
-- LYRIXIS VOICES — voice licensing marketplace (Arabic–English business content)
-- Migration: 0006_lyrixis_voices.sql
-- Numbering: 0006 is the next free number. (The duplicate 0005 was fixed 2026-10-05:
-- 0005_cixy_messages.sql is now 0005b_cixy_messages.sql; 0005_id_backed_public_domain.sql stays.)
-- Status: written 2026-10-04 by Grok (Lyrixis Lead). NOT applied to production
-- (mkuvgkjakxkytscfvnkf). Apply only after Awad approves; see docs/voices/DEPLOY.md.
-- Undo: database/migrations/rollback/0006_lyrixis_voices_down.sql
--
-- Model: every write goes through server routes using the service role, which re-check
-- permissions in lib/voices/service.ts. RLS here is defence in depth for READS from browsers
-- (anon / authenticated) and blocks every browser WRITE (no insert/update/delete policies).
-- Money is integer Ixis (100 Ixis = $1). Payments only through Apixis Wallet.
-- ============================================================

create extension if not exists pgcrypto;

-- ---------- helpers ----------
create or replace function public.voices_is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.users u
    where u.id = public.current_app_user_id()
      and (u.role = 'admin' or lower(u.email) in ('alaidaroosawad@gmail.com', 'awad@apixis.dev'))
  )
$$;
grant execute on function public.voices_is_admin() to authenticated, anon;

-- ---------- versioned global rules ----------
create table public.voice_comp_rules (
  id uuid primary key default gen_random_uuid(),
  applies_to text not null default 'generation' check (applies_to in ('generation','custom_recording')),
  version integer not null,
  creator_share_bps integer not null check (creator_share_bps between 0 and 10000),
  apixis_fee_bps integer not null default 500 check (apixis_fee_bps between 0 and 5000),
  earnings_hold_days integer not null default 14 check (earnings_hold_days between 0 and 120),
  notes text,
  effective_from timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (applies_to, version)
);
-- v1 (Awad, 2026-10-04): creator gets 60% of the licensing amount AFTER the 5% Apixis fee
-- (FEE_BPS=500, Wallet side) and AFTER the provider cost. Requires legal review.
alter table public.voice_comp_rules add column share_base text not null default 'licensing_minus_fee_minus_provider_cost'
  check (share_base in ('licensing_minus_fee_minus_provider_cost'));
insert into public.voice_comp_rules (version, creator_share_bps, apixis_fee_bps, earnings_hold_days, notes)
values (1, 6000, 500, 14, 'Launch rule v1 (Awad 2026-10-04) — creator 60% of (licensing amount − 5% Apixis fee − provider cost). Earned in Ixis (ledger); cash payout blocked. Requires legal review.');
-- Custom human recordings (Awad 2026-10-04): creator sets the price (min 2,500 Ixis), Lyrixis keeps 20%
-- of the amount after the 5% Apixis fee, 1 revision included.
insert into public.voice_comp_rules (applies_to, version, creator_share_bps, apixis_fee_bps, earnings_hold_days, notes)
values ('custom_recording', 1, 8000, 500, 14, 'Custom recordings v1 — creator 80% (Lyrixis keeps 20%) of (amount − 5% Apixis fee). Requires legal review.');

-- Editable, versioned pricing config (admin). Seeded with Awad's 2026-10-04 defaults, ILLUSTRATIVE
-- until verified against real provider costs. Allowances are counted voiceovers, never unlimited.
create table public.voice_pricing_configs (
  version integer primary key,
  payg_base_ixis integer not null check (payg_base_ixis > 0),
  payg_base_seconds integer not null check (payg_base_seconds > 0),
  payg_step_ixis integer not null check (payg_step_ixis > 0),
  payg_step_seconds integer not null check (payg_step_seconds > 0),
  payg_max_seconds integer not null check (payg_max_seconds > 0),
  audition_max_seconds integer not null default 15 check (audition_max_seconds between 1 and 60),
  free_auditions_per_day integer not null default 5 check (free_auditions_per_day >= 0),
  audition_ixis integer not null default 25 check (audition_ixis >= 0),
  custom_min_ixis integer not null default 2500 check (custom_min_ixis >= 0),
  custom_included_revisions integer not null default 1 check (custom_included_revisions >= 0),
  illustrative boolean not null default true,
  notes text,
  created_by uuid references public.users(id),
  active boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index voice_pricing_configs_one_active on public.voice_pricing_configs (active) where active;
insert into public.voice_pricing_configs (version, payg_base_ixis, payg_base_seconds, payg_step_ixis, payg_step_seconds, payg_max_seconds, illustrative, active, notes)
values (1, 500, 60, 250, 30, 300, true, true, 'Awad 2026-10-04: Solo PAYG 500 Ixis per voiceover up to 60s + 250 Ixis per extra 30s (max 5 min); auditions 15s max, 5 free per business per day then 25 Ixis; custom recordings min 2,500 Ixis, 1 revision. Illustrative until verified against provider costs.');

create table public.voice_terms_versions (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('license','cloning_consent','creator_terms','customer_terms')),
  version text not null,
  body_hash text not null,
  requires_legal_review boolean not null default true,
  published_at timestamptz not null default now(),
  unique (kind, version)
);

-- ---------- creators ----------
create table public.voice_creators (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete restrict,
  handle text not null unique check (handle ~ '^[a-z0-9][a-z0-9-]{2,39}$'),
  display_name text not null check (char_length(display_name) between 2 and 80),
  display_name_ar text,
  bio text check (char_length(bio) <= 2000),
  bio_ar text check (char_length(bio_ar) <= 2000),
  adult_attested_at timestamptz,               -- adults only; attestation, not ID check
  identity_check_status text not null default 'not_started'
    check (identity_check_status in ('not_started','pending','verified','failed')),
  payout_status text not null default 'blocked_no_payout_rail'
    check (payout_status in ('blocked_no_payout_rail','onboarding','ready','suspended')),
  wallet_owner text,                             -- Apixis ID sub (preferred) or verified email; Ixis earnings owner
  status text not null default 'active' check (status in ('active','suspended','deleted')),
  hire_enabled boolean not null default false,  -- "Hire the real person" (custom human recordings)
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- voices ----------
create table public.voices (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{2,60}$'),
  creator_id uuid not null references public.voice_creators(id) on delete restrict,
  display_name text not null check (char_length(display_name) between 2 and 80),
  display_name_ar text,
  description text check (char_length(description) <= 2000),
  description_ar text check (char_length(description_ar) <= 2000),
  languages text[] not null default '{}',       -- BCP-47 base: 'ar','en'
  dialects text[] not null default '{}',        -- explicit: 'ar-gulf-sa','ar-egy','ar-lev','ar-msa','en-us'…
  tones text[] not null default '{}',
  use_categories text[] not null default '{}',
  status text not null default 'draft' check (status in
    ('draft','verification_pending','review_pending','active','paused','suspended','retired')),
  status_reason text,
  verification_status text not null default 'unverified' check (verification_status in
    ('unverified','pending','provider_verified','manual_verified','rejected')),
  dialect_review_status text not null default 'pending'
    check (dialect_review_status in ('pending','approved','changes_requested')),
  licensing_mode text not null default 'approval_required' check (licensing_mode in ('instant','approval_required')),
  current_permission_version integer not null default 1,
  model_version text,                            -- provider model version, server-side
  provider text,                                 -- 'demo' | 'elevenlabs' | 'azure' …
  provider_voice_ref text,                       -- NEVER exposed to browsers (see view below)
  is_demo boolean not null default false,
  submitted_at timestamptz,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index voices_status_idx on public.voices (status);
create index voices_creator_idx on public.voices (creator_id);

create table public.voice_permission_versions (
  voice_id uuid not null references public.voices(id) on delete cascade,
  version integer not null,
  sample_playback boolean not null default true,
  auditions boolean not null default false,
  paid_generation boolean not null default false,
  publication boolean not null default false,
  custom_recordings boolean not null default false,
  assistant_use boolean not null default false,
  training_use boolean not null default false,  -- training / additional provider use
  allowed_uses text[] not null default '{}',     -- e.g. 'ads','explainer','ivr','elearning','podcast'
  blocked_uses text[] not null default '{political,adult,impersonation}'::text[],
  allowed_channels text[] not null default '{}',
  allowed_territories text[] not null default '{worldwide}',
  max_term_months integer not null default 12 check (max_term_months between 1 and 120),
  exclusivity_available boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (voice_id, version)
);

-- Public demos (creator-approved) are separate from private training audio.
create table public.voice_samples (
  id uuid primary key default gen_random_uuid(),
  voice_id uuid not null references public.voices(id) on delete cascade,
  title text not null,
  language text not null,
  dialect text,
  transcript text,
  storage_bucket text not null default 'voices-public-samples',
  storage_path text not null,
  mime_type text not null check (mime_type in ('audio/mpeg','audio/wav','audio/x-wav','audio/mp4','audio/ogg')),
  bytes integer not null check (bytes > 0 and bytes <= 10485760),
  creator_approved boolean not null default false,
  admin_approved boolean not null default false,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.voice_training_uploads (
  id uuid primary key default gen_random_uuid(),
  voice_id uuid not null references public.voices(id) on delete cascade,
  creator_id uuid not null references public.voice_creators(id) on delete cascade,
  storage_bucket text not null default 'voices-training-private' check (storage_bucket = 'voices-training-private'),
  storage_path text not null,
  mime_type text not null check (mime_type in ('audio/mpeg','audio/wav','audio/x-wav','audio/flac','audio/mp4')),
  bytes bigint not null check (bytes > 0 and bytes <= 104857600),
  duration_seconds integer check (duration_seconds >= 0),
  validation_status text not null default 'pending' check (validation_status in ('pending','passed','failed')),
  validation_notes text,
  delete_after timestamptz,                      -- retention
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.voice_consents (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.voice_creators(id) on delete restrict,
  voice_id uuid references public.voices(id) on delete restrict,
  kind text not null check (kind in ('cloning','creator_terms','marketplace_listing','adult_attestation')),
  terms_version text not null,
  text_hash text not null,
  accepted_at timestamptz not null default now(),
  ip_hash text,
  revoked_at timestamptz,
  revoke_reason text
);
create index voice_consents_voice_idx on public.voice_consents (voice_id, kind);

create table public.voice_verifications (
  id uuid primary key default gen_random_uuid(),
  voice_id uuid not null references public.voices(id) on delete cascade,
  method text not null check (method in ('provider','manual')),
  status text not null check (status in ('pending','passed','failed')),
  provider text,
  reviewer_user_id uuid references public.users(id),
  notes text,
  created_at timestamptz not null default now()
);

create table public.voice_reviews (
  id uuid primary key default gen_random_uuid(),
  voice_id uuid not null references public.voices(id) on delete cascade,
  kind text not null check (kind in ('listing','dialect','sample','report')),
  decision text not null check (decision in ('approved','changes_requested','rejected','suspended','reinstated')),
  reviewer_user_id uuid references public.users(id),
  native_speaker_of text,                        -- dialect reviewer's declared dialect
  notes text,
  created_at timestamptz not null default now()
);

-- Monthly packages: counted voiceover allowances, NEVER unlimited. Purchase needs Wallet
-- subscription SKUs (not registered yet — see docs/voices/LAUNCH_CHECKLIST.md). Illustrative.
create table public.voice_packages (
  id text primary key,
  name text not null,
  monthly_price_ixis bigint not null check (monthly_price_ixis > 0),
  voiceovers_per_month integer not null check (voiceovers_per_month > 0),
  overage_ixis integer not null check (overage_ixis > 0),
  seats integer not null default 1 check (seats > 0),
  brand_voice boolean not null default false,
  wallet_product_key text,
  wallet_overage_product_key text,
  illustrative boolean not null default true,
  active boolean not null default false,
  pricing_version integer not null default 1
);
insert into public.voice_packages (id, name, monthly_price_ixis, voiceovers_per_month, overage_ixis, seats, brand_voice,
  wallet_product_key, wallet_overage_product_key) values
  ('solo_monthly', 'Solo monthly', 2500, 8, 400, 1, false, 'lyrixis.voice.solo.monthly', 'lyrixis.voice.overage.solo'),
  ('label_enterprise', 'Label / Enterprise', 15000, 50, 300, 5, true, 'lyrixis.voice.label.monthly', 'lyrixis.voice.overage.label');
-- Exclusive and custom deals: quoted per request (voice_custom_requests), never a list price.

-- ---------- business workspaces ----------
create table public.voice_workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  brand_name text,
  owner_user_id uuid not null references public.users(id) on delete restrict,
  preferred_voice_id uuid references public.voices(id) on delete set null,  -- brand voice, NOT exclusive
  package_id text references public.voice_packages(id),
  allowance_voiceovers integer not null default 0 check (allowance_voiceovers >= 0), -- remaining this period
  allowance_period_end timestamptz,
  seats_limit integer not null default 1 check (seats_limit > 0),
  credit_ixis bigint not null default 0 check (credit_ixis >= 0),  -- Lyrixis credit from refunds (no Wallet refund API)
  monthly_spend_cap_ixis bigint check (monthly_spend_cap_ixis >= 0),
  socixis_org_id text unique,                    -- tenant mapping for the Socixis integration
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.voice_workspace_members (
  workspace_id uuid not null references public.voice_workspaces(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null default 'editor' check (role in ('owner','admin','editor','viewer')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create or replace function public.voices_workspace_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select workspace_id from public.voice_workspace_members where user_id = public.current_app_user_id()
$$;
grant execute on function public.voices_workspace_ids() to authenticated, anon;

create or replace function public.voices_creator_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.voice_creators where user_id = public.current_app_user_id()
$$;
grant execute on function public.voices_creator_id() to authenticated, anon;

create table public.voice_projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.voice_workspaces(id) on delete cascade,
  name text not null,
  created_by uuid references public.users(id),
  created_at timestamptz not null default now()
);

-- Customer scripts. Never used for training (see docs/voices/SECURITY.md).
create table public.voice_scripts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.voice_workspaces(id) on delete cascade,
  project_id uuid references public.voice_projects(id) on delete set null,
  body text not null check (char_length(body) <= 20000), -- emptied by the 180-day retention sweep; hash kept
  script_hash text not null,                     -- sha256 of NFC-normalized body
  language text,
  created_by uuid references public.users(id),
  delete_after timestamptz,
  created_at timestamptz not null default now()
);

create table public.voice_pronunciations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.voice_workspaces(id) on delete cascade,
  term text not null,
  say_as text not null,
  language text not null default 'ar',
  created_at timestamptz not null default now(),
  unique (workspace_id, term, language)
);

-- ---------- purchases, approvals, jobs ----------
create table public.voice_purchases (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.voice_workspaces(id) on delete restrict,
  buyer_user_id uuid not null references public.users(id) on delete restrict,
  voice_id uuid not null references public.voices(id) on delete restrict,
  creator_id uuid not null references public.voice_creators(id) on delete restrict,
  script_id uuid references public.voice_scripts(id) on delete set null,
  kind text not null default 'generation' check (kind in ('generation','custom_recording')),
  status text not null check (status in
    ('pending_approval','approved','rejected','awaiting_payment','payment_held',
     'fulfilled','failed_released','refunded','cancelled')),
  funding text not null check (funding in ('wallet','allowance','credit','demo')),
  billed_seconds integer,
  allowance_units integer not null default 0 check (allowance_units >= 0),
  price_ixis bigint not null check (price_ixis >= 0),
  wallet_product_key text,
  wallet_reservation_id text unique,
  wallet_receipt_id text,
  idempotency_key text not null unique,
  terms_version text not null,
  terms_hash text not null,
  terms_snapshot jsonb not null,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index voice_purchases_ws_idx on public.voice_purchases (workspace_id, created_at desc);
create index voice_purchases_voice_idx on public.voice_purchases (voice_id);

-- Terms snapshot, price and parties are frozen after insert.
create or replace function public.voice_purchases_freeze()
returns trigger language plpgsql as $$
begin
  if new.terms_snapshot is distinct from old.terms_snapshot
     or new.terms_hash is distinct from old.terms_hash
     or new.terms_version is distinct from old.terms_version
     or new.price_ixis is distinct from old.price_ixis
     or new.voice_id is distinct from old.voice_id
     or new.workspace_id is distinct from old.workspace_id
     or new.buyer_user_id is distinct from old.buyer_user_id
     or new.creator_id is distinct from old.creator_id then
    raise exception 'voice_purchases: terms, price and parties are immutable' using errcode = 'P0001';
  end if;
  new.updated_at = now();
  return new;
end $$;
create trigger voice_purchases_freeze before update on public.voice_purchases
  for each row execute function public.voice_purchases_freeze();

create table public.voice_approval_requests (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null unique references public.voice_purchases(id) on delete cascade,
  voice_id uuid not null references public.voices(id) on delete cascade,
  creator_id uuid not null references public.voice_creators(id) on delete cascade,
  script_excerpt text not null,                  -- what the creator reviews
  declared_use text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected','expired')),
  decided_at timestamptz,
  decision_note text,
  created_at timestamptz not null default now()
);

create table public.voice_jobs (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null unique references public.voice_purchases(id) on delete cascade,
  workspace_id uuid not null references public.voice_workspaces(id) on delete cascade,
  status text not null default 'queued' check (status in
    ('queued','running','succeeded','failed','blocked','cancelled')),
  attempts integer not null default 0,
  max_attempts integer not null default 3 check (max_attempts between 1 and 5),
  timeout_ms integer not null default 60000,
  lease_until timestamptz,
  provider text not null,
  is_demo boolean not null default false,
  output_bucket text default 'voices-outputs-private',
  output_path text,
  output_mime text,
  output_seconds numeric(10,2),
  chars_billed integer,
  provider_cost_usd_micros bigint not null default 0,
  error_code text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index voice_jobs_status_idx on public.voice_jobs (status, lease_until);

create table public.voice_auditions (
  id uuid primary key default gen_random_uuid(),
  voice_id uuid not null references public.voices(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  workspace_id uuid references public.voice_workspaces(id) on delete set null,
  chars integer not null check (chars between 1 and 400),
  provider text not null,
  is_demo boolean not null default false,
  provider_cost_usd_micros bigint not null default 0,
  charged_ixis integer not null default 0,
  wallet_receipt_id text,
  created_at timestamptz not null default now()
);
create index voice_auditions_ws_idx on public.voice_auditions (workspace_id, created_at desc);
create index voice_auditions_user_idx on public.voice_auditions (user_id, created_at desc);

-- Custom human recordings: request → quote → accept & pay → deliver → revision/accept → payout eligibility.
-- Manual / admin-assisted. No escrow: payment is a Wallet hold captured on acceptance.
create table public.voice_custom_requests (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.voice_workspaces(id) on delete cascade,
  voice_id uuid not null references public.voices(id) on delete restrict,
  creator_id uuid not null references public.voice_creators(id) on delete restrict,
  brief text not null check (char_length(brief) between 10 and 5000),
  declared_use text not null,
  status text not null default 'requested' check (status in
    ('requested','quoted','accepted_held','delivered','revision_requested','accepted','declined','cancelled')),
  quote_ixis bigint check (quote_ixis >= 0),
  purchase_id uuid references public.voice_purchases(id),
  revisions_used integer not null default 0,
  max_revisions integer not null default 1,
  delivery_path text,
  manual_process boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- double-entry earnings ledger (Ixis) ----------
create table public.voice_ledger_accounts (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,                     -- e.g. 'wallet_clearing', 'creator:<id>:pending'
  kind text not null check (kind in ('asset','liability','revenue','expense','contra_revenue')),
  owner_creator_id uuid references public.voice_creators(id),
  owner_workspace_id uuid references public.voice_workspaces(id),
  bucket text check (bucket in ('pending','available','paid')),
  created_at timestamptz not null default now()
);

create table public.voice_ledger_transactions (
  id uuid primary key default gen_random_uuid(),
  idempotency_key text not null unique,          -- e.g. 'capture:<reservationId>' — duplicate callbacks no-op
  kind text not null check (kind in
    ('purchase_capture','allowance_spend','allowance_restore','allowance_topup','earnings_release',
     'refund','adjustment','provider_cost','payout')),
  purchase_id uuid references public.voice_purchases(id),
  memo text,
  actor_user_id uuid references public.users(id),
  created_at timestamptz not null default now()
);

create table public.voice_ledger_entries (
  id bigint generated always as identity primary key,
  transaction_id uuid not null references public.voice_ledger_transactions(id) on delete restrict,
  account_id uuid not null references public.voice_ledger_accounts(id) on delete restrict,
  amount_ixis bigint not null check (amount_ixis <> 0),  -- debit > 0, credit < 0
  line text not null,                            -- 'customer_payment','tax','licensing_amount','creator_share',
                                                 -- 'provider_cost','platform_fee','processing_fee','refund','adjustment'
  created_at timestamptz not null default now()
);
create index voice_ledger_entries_acct_idx on public.voice_ledger_entries (account_id);
create index voice_ledger_entries_tx_idx on public.voice_ledger_entries (transaction_id);

-- Every transaction must balance to zero (checked at commit).
create or replace function public.voice_ledger_check_balanced()
returns trigger language plpgsql as $$
declare s bigint;
begin
  select coalesce(sum(amount_ixis), 0) into s from public.voice_ledger_entries where transaction_id = new.transaction_id;
  if s <> 0 then
    raise exception 'voice ledger transaction % does not balance (sum=%)', new.transaction_id, s using errcode = 'P0001';
  end if;
  return null;
end $$;
create constraint trigger voice_ledger_balanced after insert on public.voice_ledger_entries
  deferrable initially deferred for each row execute function public.voice_ledger_check_balanced();

-- Append-only: corrections are new 'adjustment' / 'refund' transactions.
create or replace function public.voice_ledger_append_only()
returns trigger language plpgsql as $$
begin
  raise exception 'voice ledger is append-only' using errcode = 'P0001';
end $$;
create trigger voice_ledger_entries_no_update before update or delete on public.voice_ledger_entries
  for each row execute function public.voice_ledger_append_only();
create trigger voice_ledger_tx_no_update before update or delete on public.voice_ledger_transactions
  for each row execute function public.voice_ledger_append_only();

create or replace view public.voice_ledger_balances with (security_invoker = true) as
  select a.id as account_id, a.code, a.kind, a.bucket, a.owner_creator_id, a.owner_workspace_id,
         coalesce(sum(e.amount_ixis), 0)::bigint as balance_ixis
  from public.voice_ledger_accounts a
  left join public.voice_ledger_entries e on e.account_id = a.id
  group by a.id;

-- ---------- invite-only launch (VOICES_INVITE_ONLY=true) ----------
create table public.voice_invites (
  email text primary key check (email = lower(email)),
  role text not null default 'customer' check (role in ('customer','creator','both')),
  invited_by uuid references public.users(id),
  note text,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

-- ---------- API keys (Socixis and future partners), idempotency, reports, audit ----------
create table public.voice_api_keys (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.voice_workspaces(id) on delete cascade,
  label text not null,
  key_prefix text not null,
  key_hash text not null unique,                 -- sha256(secret); the secret is shown once
  scopes text[] not null,
  partner text not null default 'socixis',
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_by uuid references public.users(id),
  created_at timestamptz not null default now()
);

create table public.voice_idempotency (
  key text not null,
  workspace_id uuid not null references public.voice_workspaces(id) on delete cascade,
  route text not null,
  request_hash text not null,
  response jsonb not null,
  status_code integer not null,
  created_at timestamptz not null default now(),
  primary key (workspace_id, route, key)
);

create table public.voice_reports (
  id uuid primary key default gen_random_uuid(),
  voice_id uuid not null references public.voices(id) on delete cascade,
  reporter_user_id uuid references public.users(id) on delete set null,
  reason text not null check (reason in ('impersonation','no_consent','misuse','quality','other')),
  details text check (char_length(details) <= 4000),
  status text not null default 'open' check (status in ('open','actioned','dismissed')),
  created_at timestamptz not null default now()
);

create table public.voice_audit_events (
  id bigint generated always as identity primary key,
  actor_user_id uuid references public.users(id) on delete set null,
  actor_kind text not null default 'user' check (actor_kind in ('user','admin','system','api_key')),
  category text not null check (category in ('consent','permission','payment','admin','job','security','data')),
  action text not null,
  entity_type text,
  entity_id text,
  metadata jsonb,                                -- sanitized: no scripts, audio, emails or provider refs
  created_at timestamptz not null default now()
);
create index voice_audit_entity_idx on public.voice_audit_events (entity_type, entity_id, created_at desc);
create trigger voice_audit_append_only before update or delete on public.voice_audit_events
  for each row execute function public.voice_ledger_append_only();

-- ---------- updated_at ----------
create trigger voice_creators_updated before update on public.voice_creators for each row execute function public.set_updated_at();
create trigger voices_updated before update on public.voices for each row execute function public.set_updated_at();
create trigger voice_jobs_updated before update on public.voice_jobs for each row execute function public.set_updated_at();
create trigger voice_custom_requests_updated before update on public.voice_custom_requests for each row execute function public.set_updated_at();

-- ---------- public catalog view (no provider refs, no creator user ids) ----------
create or replace view public.voice_catalog with (security_invoker = true) as
  select v.id, v.slug, v.display_name, v.display_name_ar, v.description, v.description_ar,
         v.languages, v.dialects, v.tones, v.use_categories, v.licensing_mode, v.status,
         case when v.verification_status in ('provider_verified','manual_verified') then v.verification_status end as earned_verification,
         v.dialect_review_status, v.is_demo,
         c.handle as creator_handle, c.display_name as creator_name, c.display_name_ar as creator_name_ar
  from public.voices v join public.voice_creators c on c.id = v.creator_id
  where v.status = 'active' and c.status = 'active';

-- ---------- atomic server-side operations (service role only) ----------
-- Post one balanced ledger transaction. Idempotent on p_key: a duplicate Wallet callback /
-- capture retry returns the existing transaction and posts nothing.
create or replace function public.voice_post_ledger(p_key text, p_kind text, p_purchase uuid, p_memo text, p_entries jsonb)
returns table (transaction_id uuid, duplicate boolean)
language plpgsql security definer set search_path = public as $$
declare tx uuid; e jsonb; acct uuid;
begin
  select id into tx from public.voice_ledger_transactions where idempotency_key = p_key;
  if found then return query select tx, true; return; end if;
  insert into public.voice_ledger_transactions (idempotency_key, kind, purchase_id, memo)
    values (p_key, p_kind, p_purchase, p_memo)
    on conflict (idempotency_key) do nothing returning id into tx;
  if tx is null then
    select id into tx from public.voice_ledger_transactions where idempotency_key = p_key;
    return query select tx, true; return;
  end if;
  for e in select * from jsonb_array_elements(p_entries) loop
    insert into public.voice_ledger_accounts (code, kind, owner_creator_id, owner_workspace_id, bucket)
      values (e->>'account', e->>'kind', nullif(e->>'creator_id','')::uuid, nullif(e->>'workspace_id','')::uuid, nullif(e->>'bucket',''))
      on conflict (code) do nothing;
    select id into acct from public.voice_ledger_accounts where code = e->>'account';
    insert into public.voice_ledger_entries (transaction_id, account_id, amount_ixis, line)
      values (tx, acct, (e->>'amount')::bigint, e->>'line');
  end loop;
  return query select tx, false;
end $$;

-- Take / restore counted allowance atomically (never below zero).
create or replace function public.voice_take_allowance(p_workspace uuid, p_units integer)
returns boolean language sql security definer set search_path = public as $$
  with u as (
    update public.voice_workspaces set allowance_voiceovers = allowance_voiceovers - p_units
    where id = p_workspace and allowance_voiceovers >= p_units and p_units > 0 returning 1)
  select exists (select 1 from u)
$$;
create or replace function public.voice_restore_allowance(p_workspace uuid, p_units integer)
returns void language sql security definer set search_path = public as $$
  update public.voice_workspaces set allowance_voiceovers = allowance_voiceovers + p_units
  where id = p_workspace and p_units > 0
$$;

-- Lease a queued job (one worker at a time); expired leases can be re-taken.
create or replace function public.voice_lease_job(p_job uuid, p_lease_ms integer)
returns boolean language sql security definer set search_path = public as $$
  with u as (
    update public.voice_jobs set status = 'running', attempts = attempts + 1,
      lease_until = now() + make_interval(secs => p_lease_ms / 1000.0)
    where id = p_job and attempts < max_attempts
      and (status = 'queued' or (status = 'running' and lease_until < now())) returning 1)
  select exists (select 1 from u)
$$;
revoke execute on function public.voice_post_ledger(text, text, uuid, text, jsonb) from public, anon, authenticated;
revoke execute on function public.voice_take_allowance(uuid, integer) from public, anon, authenticated;
revoke execute on function public.voice_restore_allowance(uuid, integer) from public, anon, authenticated;
revoke execute on function public.voice_lease_job(uuid, integer) from public, anon, authenticated;
grant execute on function public.voice_post_ledger(text, text, uuid, text, jsonb) to service_role;
grant execute on function public.voice_take_allowance(uuid, integer) to service_role;
grant execute on function public.voice_restore_allowance(uuid, integer) to service_role;
grant execute on function public.voice_lease_job(uuid, integer) to service_role;

-- ============================================================
-- RLS
-- ============================================================
alter table public.voice_comp_rules enable row level security;
alter table public.voice_terms_versions enable row level security;
alter table public.voice_creators enable row level security;
alter table public.voices enable row level security;
alter table public.voice_permission_versions enable row level security;
alter table public.voice_pricing_configs enable row level security;
alter table public.voice_samples enable row level security;
alter table public.voice_training_uploads enable row level security;
alter table public.voice_consents enable row level security;
alter table public.voice_verifications enable row level security;
alter table public.voice_reviews enable row level security;
alter table public.voice_workspaces enable row level security;
alter table public.voice_workspace_members enable row level security;
alter table public.voice_projects enable row level security;
alter table public.voice_scripts enable row level security;
alter table public.voice_pronunciations enable row level security;
alter table public.voice_purchases enable row level security;
alter table public.voice_approval_requests enable row level security;
alter table public.voice_jobs enable row level security;
alter table public.voice_auditions enable row level security;
alter table public.voice_custom_requests enable row level security;
alter table public.voice_packages enable row level security;
alter table public.voice_ledger_accounts enable row level security;
alter table public.voice_ledger_transactions enable row level security;
alter table public.voice_ledger_entries enable row level security;
alter table public.voice_api_keys enable row level security;
alter table public.voice_idempotency enable row level security;
alter table public.voice_reports enable row level security;
alter table public.voice_audit_events enable row level security;
alter table public.voice_invites enable row level security;

-- Public reads: rules, terms, active catalog, approved samples, current permissions/pricing of active voices.
create policy vc_rules_read on public.voice_comp_rules for select using (true);
create policy vt_terms_read on public.voice_terms_versions for select using (true);
create policy vp_packages_read on public.voice_packages for select using (true);

create policy voice_creators_read on public.voice_creators for select using (
  status = 'active' or user_id = public.current_app_user_id() or public.voices_is_admin());

-- Column-level: browsers may never read provider refs or the creator's user id link through voices.
create policy voices_read on public.voices for select using (
  status = 'active' or creator_id = public.voices_creator_id() or public.voices_is_admin());
revoke select on public.voices from anon, authenticated;
grant select (id, slug, creator_id, display_name, display_name_ar, description, description_ar, languages, dialects,
  tones, use_categories, status, status_reason, verification_status, dialect_review_status, licensing_mode,
  current_permission_version, is_demo, submitted_at, approved_at, created_at, updated_at)
  on public.voices to anon, authenticated;

create policy vperm_read on public.voice_permission_versions for select using (
  voice_id in (select id from public.voices where status = 'active' or creator_id = public.voices_creator_id())
  or public.voices_is_admin());
create policy vprice_read on public.voice_pricing_configs for select using (true);
create policy vsamples_read on public.voice_samples for select using (
  (creator_approved and admin_approved and voice_id in (select id from public.voices where status = 'active'))
  or voice_id in (select id from public.voices where creator_id = public.voices_creator_id())
  or public.voices_is_admin());

-- Private: only the owning creator (metadata only; audio sits in a private bucket) and admins.
create policy vtrain_read on public.voice_training_uploads for select using (
  creator_id = public.voices_creator_id() or public.voices_is_admin());
create policy vconsent_read on public.voice_consents for select using (
  creator_id = public.voices_creator_id() or public.voices_is_admin());
create policy vverif_read on public.voice_verifications for select using (
  voice_id in (select id from public.voices where creator_id = public.voices_creator_id()) or public.voices_is_admin());
create policy vreview_read on public.voice_reviews for select using (
  voice_id in (select id from public.voices where creator_id = public.voices_creator_id()) or public.voices_is_admin());

-- Workspace-scoped (tenant isolation).
create policy vws_read on public.voice_workspaces for select using (
  id in (select public.voices_workspace_ids()) or public.voices_is_admin());
create policy vwsm_read on public.voice_workspace_members for select using (
  workspace_id in (select public.voices_workspace_ids()) or public.voices_is_admin());
create policy vproj_read on public.voice_projects for select using (
  workspace_id in (select public.voices_workspace_ids()) or public.voices_is_admin());
-- Scripts: workspace members only. Not even admins read script bodies from the browser.
create policy vscript_read on public.voice_scripts for select using (
  workspace_id in (select public.voices_workspace_ids()));
create policy vpron_read on public.voice_pronunciations for select using (
  workspace_id in (select public.voices_workspace_ids()));
create policy vpurch_read on public.voice_purchases for select using (
  workspace_id in (select public.voices_workspace_ids())
  or creator_id = public.voices_creator_id() or public.voices_is_admin());
create policy vappr_read on public.voice_approval_requests for select using (
  creator_id = public.voices_creator_id()
  or purchase_id in (select id from public.voice_purchases where workspace_id in (select public.voices_workspace_ids()))
  or public.voices_is_admin());
create policy vjobs_read on public.voice_jobs for select using (
  workspace_id in (select public.voices_workspace_ids()) or public.voices_is_admin());
create policy vaud_read on public.voice_auditions for select using (
  user_id = public.current_app_user_id() or public.voices_is_admin());
create policy vcustom_read on public.voice_custom_requests for select using (
  workspace_id in (select public.voices_workspace_ids()) or creator_id = public.voices_creator_id() or public.voices_is_admin());

-- Ledger: creators see their own accounts; admins see all.
create policy vlacct_read on public.voice_ledger_accounts for select using (
  owner_creator_id = public.voices_creator_id()
  or owner_workspace_id in (select public.voices_workspace_ids()) or public.voices_is_admin());
create policy vlent_read on public.voice_ledger_entries for select using (
  account_id in (select id from public.voice_ledger_accounts
                 where owner_creator_id = public.voices_creator_id()
                    or owner_workspace_id in (select public.voices_workspace_ids()))
  or public.voices_is_admin());
create policy vltx_read on public.voice_ledger_transactions for select using (public.voices_is_admin());

-- Admin-only reads.
create policy vreports_read on public.voice_reports for select using (
  reporter_user_id = public.current_app_user_id() or public.voices_is_admin());
create policy vaudit_read on public.voice_audit_events for select using (public.voices_is_admin());
create policy vinvite_read on public.voice_invites for select using (public.voices_is_admin());
-- voice_api_keys and voice_idempotency: no browser policies at all (service role only).

-- No insert/update/delete policies for anon/authenticated on any voice_* table: all writes go
-- through server routes with the service role, after lib/voices/service.ts checks.

-- ---------- storage (private buckets; expiring signed URLs only) ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('voices-public-samples', 'voices-public-samples', false, 10485760, array['audio/mpeg','audio/wav','audio/x-wav','audio/mp4','audio/ogg']),
  ('voices-training-private', 'voices-training-private', false, 104857600, array['audio/mpeg','audio/wav','audio/x-wav','audio/flac','audio/mp4']),
  ('voices-outputs-private', 'voices-outputs-private', false, 52428800, array['audio/mpeg','audio/wav','audio/x-wav'])
on conflict (id) do nothing;
-- No storage.objects policies for these buckets: browsers get short-lived signed URLs minted
-- server-side after an authorization check. Training audio is never signed for anyone but
-- admins doing a manual review.
