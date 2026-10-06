-- Undo 20261006_enterprise_accounts.sql. Does not delete organizations or members created while it was applied.
drop table if exists public.organization_invites;
alter table public.organizations drop constraint if exists organizations_plan_check;
alter table public.organizations
  drop column if exists inquiry_id,
  drop column if exists seat_limit,
  drop column if exists enterprise_approved_by,
  drop column if exists enterprise_approved_at,
  drop column if exists plan;
drop table if exists public.enterprise_inquiries;
