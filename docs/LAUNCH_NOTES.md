# Lyrixis: launch notes

_Updated 2026-09-25. One notes file per repo: what was changed, file by file, and everything you need to connect. The full family report: https://claude.ai/artifact/QERxA6PMsFK1vdR51Ex2NQ_

## Status

Ready after keys. Production build fixed today.

## Connect (in order)

1. **Apixis Wallet key.** In the ApixisWallet repo run `npm run family-keys` once. It prints one SQL block (paste it in the Wallet's Supabase SQL editor) and one env block per site. Paste this site's block: `WALLET_API_KEY`, `APIXIS_CLIENT_ID`, `APIXIS_WALLET_API_URL`.
2. Supabase: see `.env.example`.
3. AI: `ANTHROPIC_API_KEY`.
4. `RESEND_API_KEY` for support email.

Every key this repo reads is listed in `.env.example` (required, optional, and legacy names to leave unset).

## Apixis Wallet

App `lyrixis`. Sells `lyrixis.track.unlock` (300 Ixis per track).

## Database

`20260923_lock_my_track_unlocks_view.sql` applied live (2026-09-23).

## Open items

- Public catalog 'add' page is open to anyone: keep or require sign-in (your call).
- Host the worker (`npm run worker`) on Railway/Fly with Redis and a transcription key: uploads never process without it.
- Price mismatch: `pricing_tiers` quotes $2.99 while the Wallet charges 300 Ixis ($3.00). Pick one.

## What changed, file by file

Each changed backend code file also starts with a one-line `Change note (Claude, Sep 2026)` comment saying the same thing.

| File | Change |
|---|---|
| `.env.example` | Stripe block removed; missing keys added. |
| `README.md` | Payments section describes the Wallet unlock (300 Ixis), not $2.99 card checkout. |
| `app/api/cixy/route.ts` | GET = config check only (no paid call); POST rate limited. Kept this over main's paid health ping. |
| `components/SupportForm.tsx` | Escaped two apostrophes: `next build` failed on main. Text identical. |
| `database/migrations/20260923_lock_my_track_unlocks_view.sql` | View is `security_invoker`; browser writes revoked (closed free unlocks). |
| `docs/LAUNCH_NOTES.md` | This file. |
| `lib/env.ts` | Removed the Stripe key getters (checkout code was dead). |
| `lib/pipeline.test.ts` | New. 10 tests: upload validation, TXT/SRT/LRC/JSON exports, Wallet unlock (capture, release, take-back, insufficient). |
| `lib/rate-limit.ts` | New. `assertRateLimit()` (Redis-backed). |
| `package-lock.json` | Regenerated. |
| `package.json` | Removed the unused `stripe` package. |

**Removed:** `README 2.md` (older duplicate). `services/billing.ts` and `lib/stripe.ts` (dead Stripe checkout).

_Changes are backend and plumbing only. Pages, design and UI are not changed except where noted as a build or lint fix with no visual change._
