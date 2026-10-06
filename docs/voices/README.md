# Lyrixis Voices

Licensed Arabic and bilingual voice marketplace inside Lyrixis. Businesses license a creator's
consented voice for a **declared use**, pay in **Ixis through the Apixis Wallet** (100 Ixis = $1),
and get a receipt with the license terms **frozen at purchase**. Creators control permissions,
approve scripts if they want, and can pause or retire a voice at any time.

Status (2026-10-04): built on branch `grok/lyrixis-voices`, demo mode on previews, **not live**.
Production stays "opening soon" until `VOICES_LIVE=true` (after migration 0006, Wallet SKUs and
legal review). Launch mode is invite-only (`VOICES_INVITE_ONLY`, default on).

| Doc | What |
| --- | --- |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Modules, data model, money flow, state machines, future hooks |
| [PROVIDER_FINDINGS.md](PROVIDER_FINDINGS.md) | ElevenLabs / Azure / Arabic-dialect providers, costs, rules |
| [SOCIXIS_INTEGRATION.md](SOCIXIS_INTEGRATION.md) | Partner API contract (Lyrixis side) + example client |
| [CIXY_WIRING.md](CIXY_WIRING.md) | Read-only recommendation endpoint and how to wire it into Cixy |
| [ADMIN_RUNBOOK.md](ADMIN_RUNBOOK.md) | Verification, review, reports, refunds, incidents |
| [SECURITY.md](SECURITY.md) | Data handling, retention, threat model |
| [SETUP_AND_DEPLOY.md](SETUP_AND_DEPLOY.md) | Env vars, migration, cron, local DB tests |
| [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md) | Done vs blockers (who decides) |

## Awad's defaults (2026-10-04) — all editable
Stored as versioned rows (`voice_pricing_configs`, `voice_comp_rules`, `voice_packages`), not constants.

- **PAYG:** 500 Ixis per voiceover up to 60s, +250 per started extra 30s, max 300s. *Illustrative until verified against provider costs.*
- **Solo monthly:** 2,500 Ixis/mo, 8 voiceovers, overage 400. **Label/Enterprise:** 15,000/mo, 50 voiceovers, 5 seats, brand voice, overage 300. Never unlimited. Exclusive/custom deals are quoted.
- **Creator share:** 60% of (licensing amount − 5% Apixis fee − provider cost). Earned in Ixis on the Lyrixis ledger; 14-day hold then "available". **Payout is blocked** (no Wallet creator-payout or Stripe Connect yet).
- **Custom human recordings:** creator sets the price, min 2,500 Ixis, Lyrixis keeps 20% (creator 80% after the 5% fee), 1 revision included.
- **Auditions:** ≤15s, 5 free per business per day, then 25 Ixis each (Wallet redeem).
- **Verification:** provider voice verification (ElevenLabs PVC CAPTCHA) when available, else the admin manual-review queue.
- **Provider:** ElevenLabs adapter (gated on `ELEVENLABS_API_KEY`) + demo adapter. No silent fallback to another provider or voice.
- **Socixis:** Lyrixis-side API and contract only. **Cixy:** read-only recommendation endpoint; Cixy prompts untouched.
- **Launch:** invite-only; all legal text marked "requires legal review".
