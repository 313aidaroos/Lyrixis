COMPANY | Lyrixis
LIVE URL | https://lyrixis.vercel.app
HEAD | 3d7373d (deployed, live matches y)
% READY | 95% — customer can sign up (Apixis ID only), upload audio, get instant transcription + preview, unlock own track for 300 Ixis, export lyrics. All core product live.

NEW SINCE MY LAST REPORT (past 30 hours):
- Grok + Codex: lyrics transcription now runs inside Vercel with ffmpeg-static + OpenAI whisper-1 (PR #36, Option B); no Redis, no worker needed; instant after() processing; DB upload limit replaces Redis.
- Grok: uploads go straight to Supabase Storage, users pay 300 Ixis via Wallet SDK redeem to unlock their own track (PR #32); POST /api/tracks/upload-url + browser PUT + /api/redeem kind=upload.
- Grok: Lyrixis Voices marketplace (Arabic/bilingual licensing, invite-only) demo on preview, closed in production (PR #28); migration 0006 not applied; waiting for legal review.
- Codex: font refresh — Monoton for big headlines, Manrope/Martian Mono body (PR #37); in progress per NOTES/GROK.
- Grok: nav overflow fix at 1024px (PR #38).
- Grok: Apixis ID is now the only way to create an account (PR #31, merged ~10:30 PM CT Oct 4, per FAMILY_STATUS 12:25 AM Oct 5); old email signup removed.
- Grok: footer "Other Ixis companies" on every page; Ominix link confirmed at ominix-app.vercel.app (PR #14).

WHERE WE STAND:
- A stranger can sign in with Apixis ID, upload an audio file, get transcribed lyrics + preview (instant, no wait), unlock the track for 300 Ixis from their Wallet, and download TXT/SRT/LRC/JSON exports.
- Lyrixis Voices is ready but closed in production pending legal review.
- Pricing page reflects 300 Ixis per unlock (Wallet integration live).

WHAT I GOT WRONG THIS MORNING:
- "upload→transcript is BLOCKED (needs Redis + transcription key + worker host)" — NOT TRUE. Grok shipped Option B 3h ago: ffmpeg runs inside Vercel, whisper-1 transcription is direct from OpenAI, no worker process needed. Transcript is instant.
- "upload-worker work not merged" — Grok delivered the alternative (in-process transcription) instead; worker is obsolete for this feature.

NEXT 3:
1. [AWAD-ONLY] Legal review for Lyrixis Voices (migration 0006, VOICES_LIVE toggle). When approved, set VOICES_LIVE=true and redeploy.
2. [ME] Archive stale WORKBOARD.md lines per D15 (one log = AI_CHANGELOG.md; currently has Voices and Release Tool notes).
3. [AWAD-ONLY design PR #16] Review Release Tool PR (new paid feature) when you're ready.

---

FAMILY_STATUS.md line "Lyrixis: Apixis-ID-only signup (PR #31). Open: Redis and transcription key; upload-worker work not merged." is now stale as of 2026-10-05 21:05 CT. Current state: transcription runs inside Vercel, no worker needed, Apixis-ID-only signup live.
