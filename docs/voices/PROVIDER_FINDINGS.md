# Provider findings (researched 2026-10-04 — verify before launch)

Sources: elevenlabs.io docs/pricing/terms pages, Microsoft Learn (Custom Neural Voice), vendor sites.
Nothing here is legal advice; items marked ⚠ need Awad / counsel.

## ElevenLabs (chosen by Awad)
- **Cost (API):** ~$0.10 / 1K chars for Multilingual v2/v3, ~$0.05 / 1K for Flash/Turbo (plan-dependent).
  Lyrixis reads `ELEVENLABS_USD_PER_1K_CHARS` to record provider cost per job (feeds the creator-share base).
  A 60s Arabic voiceover ≈ 700–900 chars ≈ $0.07–0.09 → 7–9 Ixis vs 500 Ixis price: margin is healthy, so 500 is
  probably conservative; still flagged illustrative.
- **Arabic:** officially Saudi (ar-SA) and UAE (ar-AE) accents on Multilingual v2 / Flash v2.5; PVC supported for
  ar-SA and ar-AE. **No Egyptian / Levantine / Iraqi locale.** Our Egyptian/Levantine voices therefore rely on
  the creator's own PVC capturing their accent, plus native-speaker dialect review on Lyrixis. ⚠ quality unverified.
- **Professional Voice Cloning (PVC):** Creator plan or higher. Flow (all implemented in `lib/voices/providers/elevenlabs.ts`):
  `POST /v1/voices/pvc` → `POST /v1/voices/pvc/{id}/samples` → `GET /v1/voices/pvc/{id}/captcha` (owner reads text)
  → `POST /v1/voices/pvc/{id}/captcha` (recording) → `POST /v1/voices/pvc/{id}/train` → `GET /v1/voices/{id}` (state)
  → `POST /v1/text-to-speech/{id}`. Manual verification (`POST /v1/voices/pvc/{id}/verification`) is the fallback.
- ⚠ **Ownership rule:** ElevenLabs only lets you PVC **your own** voice. A Lyrixis account can't legally PVC a
  creator even with consent. Options: (a) each creator makes the PVC in **their own** ElevenLabs account and shares
  it to Lyrixis (voice sharing / library), (b) ElevenLabs written approval / partner agreement for Lyrixis-hosted
  PVCs. The adapter supports both by storing a `provider_voice_ref`; the creator-own path needs a "connect your
  ElevenLabs voice" step (stubbed — admin can set the ref).
- ⚠ **Resale:** ElevenLabs terms prohibit reselling/sub-licensing the service without written authorization; B2B2C
  needs their OEM/partner terms (end-user terms at least as protective, ElevenLabs as third-party beneficiary).
  **Lyrixis needs written authorization before selling ElevenLabs output to businesses.**
- Voice Library already pays creators (Stripe Connect, 30-day–2-year notice periods, $10 threshold) — a competing
  channel; our value is dialect review, per-use licensing, approvals and the Apixis Wallet.
- Voice clones can't be exported. Paid plans grant commercial rights to outputs. Their terms give ElevenLabs a
  license to submitted content — disclose to creators (done in consent text draft).

## Azure Custom Neural Voice (alternative)
- Limited Access: application + approved use case; recorded talent consent statement; speaker verification;
  mandatory disclosure for voice talent. Strongest consent tooling.
- Arabic locales: ar-AE, ar-EG, ar-OM, ar-SA, ar-SY, ar-TN (only ar-EG and ar-SA cross-lingual). Covers Egyptian
  and Levantine (Syria) where ElevenLabs doesn't.
- Pricing: per 1M chars + training per compute hour + endpoint hosting per model-hour (fixed cost per voice).
- Good second adapter for Egyptian/Levantine once approved; interface in `providers/types.ts` fits it.

## Arabic-dialect specialists (terms unverified)
- **Hamsa** — Egyptian, Gulf (per-country), Levantine, Iraqi TTS. **Hakim** — claims 15 dialects.
  **Munsit / Faseeh** — cloning API "coming soon". Need: cloning consent flow, commercial/resale terms, data use.

## Summary
1. ElevenLabs works today for Saudi/Emirati and as a quality baseline; cheap per voiceover.
2. Blockers: written resale/OEM authorization, and the "own voice only" PVC rule (creator-owned PVCs or partner deal).
3. Dialect coverage gap (Egyptian/Levantine) → Azure CNV or a dialect specialist as a second adapter later.
