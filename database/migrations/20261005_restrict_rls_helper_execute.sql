-- 20261005_restrict_rls_helper_execute.sql (Grok / Developer Bot, 2026-10-05) — NOT applied by this PR.
--
-- Supabase advisor: public.current_app_user_id() and public.current_org_ids() are SECURITY DEFINER
-- and executable by anon (granted explicitly in 0001_init.sql, and to PUBLIC by Postgres default).
-- Anyone with the public anon key could call them over /rest/v1/rpc. They return nothing useful
-- for anon today (auth.uid() is null), but a SECURITY DEFINER function anon can run is a standing
-- risk if either body ever changes.
--
-- Who needs them (checked live 2026-10-05, read-only):
--   * 21 RLS policies call them (users, organization_members, organizations, tracks, track_files,
--     transcriptions, lyric_lines, lyric_words, track_sections, translations, translation_lines,
--     track_metadata, exports, verification_records, processing_jobs, batches, payments, invoices,
--     api_keys, api_usage). All 21 are SELECT/UPDATE "own rows" policies created FOR role PUBLIC.
--   * No other function, view, trigger or app RPC calls them. The Next.js app and the worker read
--     these tables only with the service role (which bypasses RLS); the browser never queries them.
--
-- If we only revoked EXECUTE from anon, an anon REST read of one of those tables would fail with
-- "permission denied for function current_app_user_id" instead of returning zero rows, because the
-- policies apply to PUBLIC (anon included). So this migration also scopes those 21 policies to
-- `authenticated`. For anon the result is the same as today (no rows: no policy → RLS denies).
-- Signed-in users and the service role behave exactly as before.
--
-- Both functions stay SECURITY DEFINER on purpose: current_app_user_id() reads public.users, whose
-- own RLS policy calls current_app_user_id(); as SECURITY INVOKER that would recurse.

begin;

-- 1) EXECUTE: drop PUBLIC + anon, keep authenticated (RLS for signed-in users) and service_role.
revoke execute on function public.current_app_user_id() from public, anon;
revoke execute on function public.current_org_ids() from public, anon;
grant execute on function public.current_app_user_id() to authenticated, service_role;
grant execute on function public.current_org_ids() to authenticated, service_role;

-- 2) Policies that call them: PUBLIC → authenticated (only if they exist, so this is re-runnable).
do $$
declare
  p record;
begin
  for p in
    select schemaname, tablename, policyname
      from pg_policies
     where schemaname = 'public'
       and roles = '{public}'
       and (
         coalesce(qual, '') ~ 'current_app_user_id|current_org_ids'
         or coalesce(with_check, '') ~ 'current_app_user_id|current_org_ids'
       )
  loop
    execute format('alter policy %I on %I.%I to authenticated', p.policyname, p.schemaname, p.tablename);
  end loop;
end $$;

commit;

-- Verify after applying:
--   select proname, proacl from pg_proc where proname in ('current_app_user_id','current_org_ids');
--     → no "anon=X" and no leading "=X" (PUBLIC) entry
--   select tablename, policyname, roles from pg_policies
--    where qual ~ 'current_app_user_id|current_org_ids' or with_check ~ 'current_app_user_id|current_org_ids';
--     → roles = {authenticated} for all 21
--
-- Undo:
--   grant execute on function public.current_app_user_id() to public, anon;
--   grant execute on function public.current_org_ids() to public, anon;
--   -- and for each of the 21 policies: alter policy "<name>" on public.<table> to public;
