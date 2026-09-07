-- Additive: tag marketing waitlist / enterprise form submissions.
-- Does not rewrite 0001. RLS remains service-role only (no anon insert policy).

alter table public.enterprise_leads
  add column if not exists source text not null default 'waitlist';

comment on column public.enterprise_leads.source is
  'Origin of the lead. Marketing form submissions use waitlist.';

create index if not exists enterprise_leads_created_at_idx
  on public.enterprise_leads (created_at desc);
