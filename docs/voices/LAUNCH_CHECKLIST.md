# Launch checklist

## Done (this PR, demo-verified)
- [x] Marketplace, filters, voice pages, samples (no autoplay, `preload="none"`), auditions, compare, saved/recent
- [x] License flow: declared use → quote → Wallet hold → generate → capture → receipt with frozen terms → signed download
- [x] Approval-required voices (no charge until creator approves; can't be bypassed)
- [x] Creator onboarding (18+, terms, dialect required, sample, private training, consent), permissions versioning, pause/resume/retire
- [x] Provider verification (ElevenLabs CAPTCHA) with manual admin queue fallback; native-speaker dialect review
- [x] Admin: queues, link provider voice, approve/suspend, reports, refunds (credit), invites, manual allowance, pricing versions
- [x] Double-entry ledger, creator share 60% after fee & provider cost, 14-day hold, payout blocked
- [x] Workspaces: brand voice preference, spend cap, pronunciations, projects, seats, API keys
- [x] Socixis partner API (+ idempotency), Cixy read-only recommendations, AWAD COMMAND metrics
- [x] Migration 0006 + RLS tests on local Postgres; 70+ unit tests; build green

## Blockers (owner)
- [ ] **Apply migration 0006** to production Supabase — Awad
- [ ] **Register Wallet SKUs** (list in SETUP_AND_DEPLOY.md) — Wallet lead / Awad
- [ ] **ElevenLabs:** API key (Creator+ plan) and **written resale/OEM authorization** — Awad
- [ ] **PVC ownership rule:** creators make PVCs in their own ElevenLabs account and share, or partner deal — Awad
- [ ] **Creator payouts:** Wallet creator-payout (e.g. marketplace settle) or Stripe Connect; tax/KYC — Awad
- [ ] **Wallet refund API** (post-capture) — today refunds are Lyrixis credit — Wallet lead
- [ ] **Variable-amount Wallet hold** for custom recordings (live custom checkout blocked) — Wallet lead
- [ ] **Wallet subscriptions** for Solo/Label plans (manual allowance until then) — Wallet lead
- [ ] **Legal review** of license, creator terms, consent text, privacy notice; tax handling (VAT in GCC) — Awad / counsel
- [ ] Set `VOICES_SIGNING_SECRET`, `CRON_SECRET`, add the cron; then `VOICES_LIVE=true` (+ `NEXT_PUBLIC_VOICES_NAV=true`) — Awad
- [ ] Recruit real creators + native-speaker dialect reviewers; replace demo voices (demo never runs in production)
- [ ] Socixis side: store key, org mapping, UI — Socixis lead
- [ ] Verify pricing against real provider costs and drop the "illustrative" flag — Awad
