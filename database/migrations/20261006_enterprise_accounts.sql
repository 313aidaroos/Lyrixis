-- Label / Enterprise accounts (2026-10-06).
-- NOT applied to production by this change. Apply in the Supabase SQL editor after review.
-- Rollback: database/migrations/rollback/20261006_enterprise_accounts_down.sql

create table if not exists public.enterprise_inquiries (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  contact_name text not null,
  work_email text not null,
  phone text,
  songs_per_month text not null,
  team_seats integer not null check (team_seats >= 1 and team_seats <= 10000),
  message text not null,
  status text not null default 'new' check (status in ('new', 'approved', 'declined')),
  organization_id uuid references public.organizations (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists enterprise_inquiries_status_created_idx
  on public.enterprise_inquiries (status, created_at desc);

alter table public.organizations
  add column if not exists plan text not null default 'standard',
  add column if not exists enterprise_approved_at timestamptz,
  add column if not exists enterprise_approved_by uuid references public.users (id) on delete set null,
  add column if not exists seat_limit integer,
  add column if not exists inquiry_id uuid;

alter table public.organizations drop constraint if exists organizations_plan_check;
alter table public.organizations
  add constraint organizations_plan_check check (plan in ('standard', 'enterprise'));

create table if not exists public.organization_invites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  email text not null,
  role text not null default 'member' check (role in ('owner', 'member')),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  invited_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);

create unique index if not exists organization_invites_one_pending_email
  on public.organization_invites (organization_id, lower(email))
  where status = 'pending';

alter table public.enterprise_inquiries enable row level security;
alter table public.organization_invites enable row level security;

-- Service role bypasses RLS. No policies: the anon and signed-in keys cannot read
-- company emails, phone numbers, or invites. The app checks membership in server code.
revoke all on table public.enterprise_inquiries from anon, authenticated;
revoke all on table public.organization_invites from anon, authenticated;
