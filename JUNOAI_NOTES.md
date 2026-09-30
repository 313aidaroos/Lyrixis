# JunoAI Notes

## 2026-09-28 — JunoAI
- Added `.github/workflows/ci.yml`: thin caller of the shared reusable workflow (313aidaroos/github-actions node-ci). (PR: https://github.com/313aidaroos/Lyrixis/pull/13)
- Why: build/test gate on every push; no duplicated workflow files.

## 2026-09-29 — JunoAI (Release Tool v1)
- Changed: added the sellable Release Tool flow — new `/release` wizard page (Upload → Transcribe → Review lyrics → Metadata → Split sheet → Pay & download), `releases` table in schema.sql (RLS: users see only their own), API routes `POST /api/releases`, `POST /api/releases/[id]/pay` (Ixis via Apixis Wallet redeem, server-side quote from services/pricing.ts), `GET /api/releases/[id]/package` (zip download), `POST /api/tracks/[id]/verify` (explicit "Lyrics verified" → human_verified verification record), `GET /api/tracks/[id]/lyrics` (owner-only full lines for review; existing track-detail 30s preview untouched). New pure modules: `lib/release-schema.ts` (zod, client+server), `lib/release-package.ts` (store-only zip writer — no new deps, split-sheet/metadata/README builders), `services/releases.ts`. Tests in `lib/release-package.test.ts` (47/47 pass, typecheck clean). Nav: added "Release" link in AppNav; `/release/*` added to middleware matcher.
- Why: owner's request — build a sellable pay-per-song product on the Lyrixis codebase. PR opened for owner review; NOT merged.
- Trust anchor: download requires a human_verified verification record (enforced server-side in the package route, not just the UI).
- Pricing: frontend never prices. USD quote via services/pricing.ts recorded on the release for accounting; the Ixis charge goes through Wallet product key `lyrixis.release.package` (redeem flow, same pattern as /api/redeem).
- Follow-ups / v2 (intentionally not built): Stripe card payments, official ISRC registrar guidance, multi-track EP/album batching, distributor-direct submission, analytics. Wallet product key `lyrixis.release.package` must be registered in the Apixis Wallet catalog before pay works in prod.
