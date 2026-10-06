-- Rollback for 0006_lyrixis_voices.sql. Destroys ALL Lyrixis Voices data. Run only with Awad's OK.
drop view if exists public.voice_catalog;
drop view if exists public.voice_ledger_balances;
drop table if exists public.voice_invites, public.voice_audit_events, public.voice_reports, public.voice_idempotency, public.voice_api_keys,
  public.voice_ledger_entries, public.voice_ledger_transactions, public.voice_ledger_accounts, public.voice_packages,
  public.voice_custom_requests, public.voice_auditions, public.voice_jobs, public.voice_approval_requests,
  public.voice_purchases, public.voice_pronunciations, public.voice_scripts, public.voice_projects,
  public.voice_workspace_members, public.voice_workspaces, public.voice_reviews, public.voice_verifications,
  public.voice_consents, public.voice_training_uploads, public.voice_samples, public.voice_pricing_configs,
  public.voice_permission_versions, public.voices, public.voice_creators, public.voice_terms_versions,
  public.voice_comp_rules cascade;
drop function if exists public.voice_post_ledger(text, text, uuid, text, jsonb), public.voice_take_allowance(uuid, integer),
  public.voice_restore_allowance(uuid, integer), public.voice_lease_job(uuid, integer), public.voices_is_admin(), public.voices_workspace_ids(), public.voices_creator_id(),
  public.voice_purchases_freeze(), public.voice_ledger_check_balanced(), public.voice_ledger_append_only();
delete from storage.buckets where id in ('voices-public-samples','voices-training-private','voices-outputs-private');
