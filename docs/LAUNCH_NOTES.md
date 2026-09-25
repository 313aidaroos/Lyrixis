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

## What changed, file by file

Each changed backend code file also starts with a one-line `Change note (Claude, Sep 2026)` comment saying the same thing.

| File | Change |
|---|---|
| `.env.example` | Added 10 key(s) the code reads that were missing: `ANTHROPIC_API_KEY`, `RESEND_API_KEY`, `WALLET_API_KEY`, `AI_MODEL`, `AI_PROVIDER`, `ANTHROPIC_MODEL`, `APIXIS_WALLET_API_URL`, `EMAIL_FROM`, `NEXT_PUBLIC_APP_URL`, `APIXIS_WALLET_API_KEY`. |
| `app/api/cixy/route.ts` | GET = config check only (no paid call); POST rate limited. Kept this over main's paid health ping. |
| `components/SupportForm.tsx` | Escaped two apostrophes: `next build` failed on main. Text identical. |
| `database/migrations/20260923_lock_my_track_unlocks_view.sql` | View is `security_invoker`; browser writes revoked (closed free unlocks). |
| `docs/LAUNCH_NOTES.md` | This file. |
| `lib/rate-limit.ts` | New. `assertRateLimit()` (Redis-backed). |

**Removed:** `README 2.md` (older duplicate).

_Changes are backend and plumbing only. Pages, design and UI are not changed except where noted as a build or lint fix with no visual change._
