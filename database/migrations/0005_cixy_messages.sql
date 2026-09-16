-- Cixy conversation log. Anonymous session id only — no email, name, or IP.

create table if not exists public.cixy_messages (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  model text,
  used_catalog boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists cixy_messages_session_idx
  on public.cixy_messages (session_id, created_at);

alter table public.cixy_messages enable row level security;
-- No anon policies: service role only.
