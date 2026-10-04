# Architecture

```
app/voices/*                 pages (server components) + components/voices/* (client bits)
app/api/voices/*             catalog, actions/[action] (dispatcher), files (demo), recommend, demo-persona, jobs/run
app/api/v1/voices/[...path]  partner API (Socixis) + AWAD COMMAND metrics
lib/voices/service.ts        VoicesService — every rule lives here (one class, testable)
lib/voices/repo.ts           VoicesRepo interface → memory-repo.ts (demo/tests) | supabase-repo.ts (live, service role)
lib/voices/wallet-port.ts    WalletPort → liveWallet() wraps lib/apixis-wallet.ts (unchanged) | DemoWallet
lib/voices/providers/*       VoiceProvider → demo (synthetic tone) | elevenlabs (gated on ELEVENLABS_API_KEY)
lib/voices/ledger.ts         double-entry builders (capture, allowance spend/top-up, release, refund)
lib/voices/http.ts           zod-validated action dispatcher;  partner-api.ts  Socixis handler
lib/voices/context.ts        mode selection: demo (previews/local) vs live (production always live)
database/migrations/0006_lyrixis_voices.sql   tables, RLS, RPCs, buckets (+ rollback, + local tests)
```

## Modes
- **demo** — `VERCEL_ENV != production` and `VOICES_DATA_MODE != live`. In-memory repo seeded with 6 fictional
  "Demo ·" voices, DemoWallet (5,000 demo Ixis per persona, resets on cold start), demo tone audio, persona switcher.
- **live** — production always. Supabase (service role, server-only) + Apixis Wallet + ElevenLabs. Pages render
  "Opening soon" unless `VOICES_LIVE=true`.

## Money flow (Wallet only)
1. Quote → purchase row with **frozen terms snapshot** + `terms_hash` (DB trigger blocks edits to price/terms).
2. Approval-required voices stop at `pending_approval`; nothing is held until the creator approves.
3. `wallet.reserve(product, key=lyxv-<purchaseId>)` → `payment_held` → job queued.
4. Job runs (lease, re-check voice status/consent/permissions, script-hash check, pronunciations, timeout,
   ≤3 attempts). Success → output stored privately → `wallet.capture` → ledger `purchase_capture` (idempotent
   on `capture:<reservation>`) → `fulfilled`. Final failure/block → `wallet.release` → `failed_released`.
5. Ledger lines: wallet_clearing (asset) = Apixis fee payable + provider cost payable + creator pending + Lyrixis
   revenue. A deferred DB constraint enforces balance per transaction; entries are append-only.
6. Earnings: pending for 14 days → available (`releaseMaturedEarnings`). Payout **blocked** (`payout_blocked`).
7. Refunds: the Wallet has no post-capture refund API, so an admin refund gives **Lyrixis credit** (or restores the
   allowance) and reverses every ledger line (claws back pending first, then available as an adjustment).
8. Allowance (plans): admin grants units manually until Wallet subscriptions exist; allowance spends recognise
   `monthly_price / voiceovers` per unit (Solo 312 Ixis) so creators earn on plan usage too.
9. Custom recordings: demo works end-to-end; live `accept` throws `custom_payment_blocked` (Wallet needs a
   variable-amount hold; fixed SKUs only today).

## State machines
- Voice: `draft → verification_pending → review_pending → active ⇄ paused`, `→ suspended` (admin), `→ retired`.
  Approval requires verified (provider or manual) + active consent + provider ref + admin decision.
- Purchase: see SOCIXIS_INTEGRATION.md. Job: `queued → running → succeeded | failed | blocked | cancelled`.

## Future hooks (stubs, not built)
- **Agencies** (one org managing many creators): `voice_creators` is per user; add `agency_id` later.
- **Exclusives**: `exclusivity` is always `non_exclusive` in the snapshot; `exclusivity_available` permission exists; quoted manually.
- **Cixy voices**: Cixy's native voice is never a SKU. Recommendation only (CIXY_WIRING.md).
- **Singing / music**: out of scope; `use_categories` can add `singing` once a provider supports it with consent.
- **Second provider** (Azure CNV / dialect specialist): implement `VoiceProvider`; one provider per voice, no fallback.
