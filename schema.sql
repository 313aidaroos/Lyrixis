-- ============================================================
-- LYRIXIS — initial schema (PostgreSQL / Supabase)
-- Migration: 0001_init.sql
-- ============================================================

create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- ---------- enums ----------
create type track_status as enum (
  'uploaded','queued','processing','transcribing','aligning',
  'analyzing','completed','failed','manual_review'
);
create type explicit_status as enum ('clean','explicit','possibly_explicit','unknown');
create type verification_level as enum ('ai_generated','ai_reviewed','human_verified','rights_holder_verified');
create type account_role as enum ('user','enterprise','admin');
create type job_state as enum ('pending','running','succeeded','failed','cancelled');

-- ---------- identity ----------
create table users (
  id uuid primary key default uuid_generate_v4(),
  auth_id uuid unique,                  -- supabase auth.users.id
  email text unique not null,
  full_name text,
  role account_role not null default 'user',
  balance_cents bigint not null default 0,
  stripe_customer_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table organizations (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique not null,
  billing_email text,
  stripe_customer_id text,
  balance_cents bigint not null default 0,
  custom_rate_cents integer,            -- overrides pricing_tiers when set
  created_at timestamptz not null default now()
);

create table organization_members (
  organization_id uuid references organizations(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  role text not null default 'member',  -- owner | admin | member
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

-- ---------- tracks ----------
create table tracks (
  id uuid primary key default uuid_generate_v4(),
  public_id text unique not null default ('trx_' || encode(gen_random_bytes(8),'hex')),
  user_id uuid not null references users(id) on delete cascade,
  organization_id uuid references organizations(id) on delete set null,
  batch_id uuid,
  title text,
  artist text,
  duration_seconds numeric(10,3),
  original_filename text,
  audio_path text,                       -- private bucket key, NEVER a public url
  audio_sha256 text,
  status track_status not null default 'uploaded',
  language text,
  language_confidence numeric(5,4),
  dialect text,
  dialect_confidence numeric(5,4),
  explicit_status explicit_status not null default 'unknown',
  explicit_confidence numeric(5,4),
  transcription_confidence numeric(5,4),
  verification verification_level not null default 'ai_generated',
  rights_confirmed boolean not null default false,
  rights_confirmed_at timestamptz,
  paid boolean not null default false,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on tracks (user_id, created_at desc);
create index on tracks (organization_id, created_at desc);
create index on tracks (status);
create index on tracks (batch_id);

create table track_files (
  id uuid primary key default uuid_generate_v4(),
  track_id uuid not null references tracks(id) on delete cascade,
  kind text not null,                    -- original | normalized | vocals | instrumental
  storage_path text not null,
  mime_type text,
  bytes bigint,
  created_at timestamptz not null default now()
);

create table transcriptions (
  id uuid primary key default uuid_generate_v4(),
  track_id uuid not null references tracks(id) on delete cascade,
  version integer not null default 1,
  source text not null,                  -- ai | user_correction | human_verified
  provider text,                         -- e.g. whisper-large-v3
  full_text text,
  confidence numeric(5,4),
  created_by uuid references users(id),
  is_current boolean not null default true,
  created_at timestamptz not null default now()
);
create index on transcriptions (track_id, version desc);

create table lyric_lines (
  id uuid primary key default uuid_generate_v4(),
  transcription_id uuid not null references transcriptions(id) on delete cascade,
  line_index integer not null,
  text text not null,
  start_ms integer,
  end_ms integer,
  confidence numeric(5,4),
  section_id uuid,
  speaker_label text,                    -- vocal change / featured artist marker
  is_low_confidence boolean generated always as (confidence < 0.80) stored
);
create index on lyric_lines (transcription_id, line_index);

create table lyric_words (
  id uuid primary key default uuid_generate_v4(),
  line_id uuid not null references lyric_lines(id) on delete cascade,
  word_index integer not null,
  text text not null,
  start_ms integer,
  end_ms integer,
  confidence numeric(5,4)
);
create index on lyric_words (line_id, word_index);

create table track_sections (
  id uuid primary key default uuid_generate_v4(),
  track_id uuid not null references tracks(id) on delete cascade,
  label text not null,                   -- intro|verse|pre_chorus|chorus|bridge|outro|instrumental
  ordinal integer,
  start_ms integer not null,
  end_ms integer not null,
  confidence numeric(5,4)
);

create table translations (
  id uuid primary key default uuid_generate_v4(),
  track_id uuid not null references tracks(id) on delete cascade,
  target_language text not null,
  kind text not null default 'translation', -- translation | transliteration
  provider text,
  status job_state not null default 'pending',
  cost_cents integer,
  created_at timestamptz not null default now(),
  unique (track_id, target_language, kind)
);

create table translation_lines (
  id uuid primary key default uuid_generate_v4(),
  translation_id uuid not null references translations(id) on delete cascade,
  line_index integer not null,
  text text not null
);

create table track_metadata (
  track_id uuid primary key references tracks(id) on delete cascade,
  album text, isrc text, upc text,
  release_date date,
  label text, publisher text,
  songwriters text[], producers text[], featured_artists text[],
  copyright_owner text,
  source text not null default 'user',    -- user | distributor | authorized_db | rights_holder
  is_authoritative boolean not null default false,
  updated_at timestamptz not null default now()
);

create table exports (
  id uuid primary key default uuid_generate_v4(),
  track_id uuid not null references tracks(id) on delete cascade,
  format text not null,                   -- txt|json|csv|srt|lrc|vtt|ttml
  storage_path text,
  bytes bigint,
  generated_at timestamptz not null default now()
);

create table verification_records (
  id uuid primary key default uuid_generate_v4(),
  track_id uuid not null references tracks(id) on delete cascade,
  level verification_level not null,
  verified_by uuid references users(id),
  notes text,
  created_at timestamptz not null default now()
);

-- ---------- jobs ----------
create table processing_jobs (
  id uuid primary key default uuid_generate_v4(),
  track_id uuid not null references tracks(id) on delete cascade,
  batch_id uuid,
  step text not null,                     -- validate|normalize|separate|transcribe|align|sections|explicit|export
  state job_state not null default 'pending',
  attempts integer not null default 0,
  queue_job_id text,
  provider text,
  started_at timestamptz,
  finished_at timestamptz,
  error text,
  created_at timestamptz not null default now()
);
create index on processing_jobs (state, created_at);
create index on processing_jobs (batch_id);

create table batches (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  organization_id uuid references organizations(id) on delete set null,
  name text,
  total integer not null default 0,
  completed integer not null default 0,
  failed integer not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- money ----------
create table pricing_tiers (
  id uuid primary key default uuid_generate_v4(),
  min_songs integer not null,
  max_songs integer,                      -- null = unbounded
  rate_cents integer not null,
  active boolean not null default true,
  effective_from timestamptz not null default now()
);

create table feature_prices (
  id uuid primary key default uuid_generate_v4(),
  key text unique not null,               -- translation | transliteration | human_verification | priority
  price_cents integer not null,
  active boolean not null default true
);

create table payments (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete set null,
  organization_id uuid references organizations(id) on delete set null,
  stripe_payment_intent_id text unique,
  amount_cents bigint not null,
  currency text not null default 'usd',
  kind text not null,                     -- single_track | balance_topup | invoice
  status text not null,
  track_id uuid references tracks(id) on delete set null,
  created_at timestamptz not null default now()
);

create table invoices (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid references organizations(id) on delete cascade,
  stripe_invoice_id text,
  amount_cents bigint not null,
  status text not null,
  period_start date, period_end date,
  created_at timestamptz not null default now()
);

-- unit economics: one row per track, written by workers from real provider usage
create table track_costs (
  track_id uuid primary key references tracks(id) on delete cascade,
  transcription_cost_cents numeric(12,4) not null default 0,
  translation_cost_cents numeric(12,4) not null default 0,
  storage_cost_cents numeric(12,4) not null default 0,
  processing_cost_cents numeric(12,4) not null default 0,
  total_cost_cents numeric(12,4) generated always as (
    transcription_cost_cents + translation_cost_cents + storage_cost_cents + processing_cost_cents
  ) stored,
  customer_revenue_cents numeric(12,4) not null default 0,
  updated_at timestamptz not null default now()
);
-- gross profit / margin are derived in queries, never stored stale:
--   revenue - total_cost  AS gross_profit
--   (revenue - total_cost) / nullif(revenue,0) AS gross_margin

-- ---------- api ----------
create table api_keys (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade,
  organization_id uuid references organizations(id) on delete cascade,
  name text not null,
  key_prefix text not null,               -- shown in UI, e.g. lyx_live_9f2a
  key_hash text not null,                 -- sha256 of full key. Full key NEVER stored.
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index on api_keys (key_hash);

create table api_usage (
  id bigserial primary key,
  api_key_id uuid references api_keys(id) on delete set null,
  user_id uuid references users(id) on delete set null,
  endpoint text not null,
  method text not null,
  status_code integer,
  tracks_count integer default 0,
  created_at timestamptz not null default now()
);
create index on api_usage (user_id, created_at desc);

-- ---------- misc ----------
create table enterprise_leads (
  id uuid primary key default uuid_generate_v4(),
  name text, company text, work_email text,
  track_count text, use_case text, integration text, message text,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

create table audit_logs (
  id bigserial primary key,
  actor_user_id uuid references users(id) on delete set null,
  action text not null,
  entity_type text, entity_id uuid,
  metadata jsonb,
  ip inet,
  created_at timestamptz not null default now()
);
create index on audit_logs (entity_type, entity_id, created_at desc);

-- ---------- seed pricing (editable from admin, never hardcoded in app) ----------
insert into pricing_tiers (min_songs,max_songs,rate_cents) values
  (1,99,299),(100,999,149),(1000,9999,75),(10000,99999,40),(100000,999999,20),(1000000,null,20);

insert into feature_prices (key,price_cents) values
  ('translation',99),('transliteration',49),('human_verification',999),('priority',199);

-- ============================================================
-- RLS — enable on every user-facing table.
-- Workers use the service role key and bypass RLS.
-- ============================================================
alter table tracks enable row level security;
alter table transcriptions enable row level security;
alter table exports enable row level security;
alter table api_keys enable row level security;
alter table payments enable row level security;

create policy "own tracks" on tracks for select using (
  user_id = (select id from users where auth_id = auth.uid())
  or organization_id in (
    select organization_id from organization_members
    where user_id = (select id from users where auth_id = auth.uid())
  )
);
-- Repeat the equivalent policy for every child table (join through track_id).
-- track_costs, admin views and pricing_tiers: service-role / admin only.
