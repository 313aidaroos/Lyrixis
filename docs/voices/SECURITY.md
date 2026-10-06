# Security & data handling

- **Access:** all writes go through server routes using the Supabase service role; browsers get read-only RLS
  (catalog, own workspace, own creator rows). Provider voice refs are column-hidden from `anon`/`authenticated`.
  Cross-tenant reads return 404. RPCs (`voice_post_ledger`, `voice_take_allowance`, `voice_restore_allowance`,
  `voice_lease_job`) are `service_role` only. Tested in `database/tests/0006_voices_rls_test.sql`.
- **Storage:** three private buckets; audio is served only via 5-minute signed URLs (Supabase in live, HMAC
  `VOICES_SIGNING_SECRET` in demo). Downloads are audited.
- **Uploads:** magic-byte sniffing (wav/mp3/m4a/ogg/flac), size caps (samples 10 MB, training 100 MB), declared type
  must match content. Names screened for impersonation ("official", "Cixy", royal/political titles, AR + EN).
- **Retention:** training audio 365 days (`delete_after`) and deleted on retire; scripts 180 days; outputs kept for
  the license term. **Scripts and outputs are never used to train models.** Consent IP is stored hashed only.
- **Logging:** never log scripts, audio or provider response bodies; errors carry codes only. Audit events are
  append-only (`voice_audit_events`).
- **Abuse:** blocked uses (political, adult, impersonation, fraud, hate) can't be enabled by creators; audition
  limits per business/day, per user/hour and a platform daily budget; best-effort per-IP POST limit.
- **Partner keys:** `lyxv_` secrets shown once, SHA-256 stored, scoped, org-bound. Metrics key is separate.
- **Money:** idempotent Wallet holds (`lyxv-<purchaseId>`), capture only after delivery, balanced append-only
  ledger, idempotent postings, frozen purchase terms (DB trigger).
- ⚠ Legal texts (license, creator terms, consent) are drafts — **require legal review**.
