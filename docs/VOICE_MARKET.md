# Lyrixis Voice market → Lyrixis Voices

The 9/22 "Voice Floor" skeleton (house shelf, XP pricing, `lib/voiceMarket.ts`, `components/VoiceFloor.tsx`) was
removed from the UI because a page that does nothing is a bug for a paying stranger (commit e308665).

On 2026-10-04 it was replaced by **Lyrixis Voices** — see [`docs/voices/README.md`](voices/README.md). Reusing
`/voices` is OK now because it does real work end to end (licensing, payments, consent, receipts), it is
**invite-only**, and production shows "Opening soon" until `VOICES_LIVE=true`.

Rules carried over: Wallet only (now Ixis, 100 = $1, not XP); Cixy's native voice is never a SKU; consent required;
no celebrity/public-figure clones.
