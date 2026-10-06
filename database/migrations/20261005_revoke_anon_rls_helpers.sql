-- 2026-10-05 (Grok, Lyrixis Lead; Awad approved "go cleanup" 8:31 PM CT).
-- Supabase advisor: SECURITY DEFINER helpers callable by anon. anon had EXECUTE twice over
-- (direct grant + the default PUBLIC grant), so revoke both. authenticated KEEPS EXECUTE: the
-- "own …" RLS policies on users/tracks/batches/api_keys/… call these helpers for signed-in users.
-- The app reads those tables only with the service role, so anon never needs them; an anon
-- PostgREST read of those tables now fails with "permission denied for function" instead of [].
-- Applied to production mkuvgkjakxkytscfvnkf on 2026-10-05.
-- Undo: grant execute on function public.current_app_user_id(), public.current_org_ids() to public, anon;
revoke execute on function public.current_app_user_id() from public, anon;
revoke execute on function public.current_org_ids() from public, anon;
grant execute on function public.current_app_user_id() to authenticated, service_role;
grant execute on function public.current_org_ids() to authenticated, service_role;
