-- SECURITY: my_track_unlocks ran as its owner (bypassing RLS) and default grants gave
-- anon/authenticated INSERT/UPDATE/DELETE on it. The view is auto-updatable, so a signed-in
-- user could insert track_unlocks rows = free paid unlocks. The app reads unlocks with the
-- service role only. Applied live 2026-09-23.
alter view public.my_track_unlocks set (security_invoker = true);
revoke all on public.my_track_unlocks from anon, authenticated;
grant select on public.my_track_unlocks to service_role;
