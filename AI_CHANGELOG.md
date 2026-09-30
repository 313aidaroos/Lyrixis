# AI Change Log

## Rules for AI models, bots, and agents

If you are an AI (Claude, ChatGPT, Grok, Gemini, Copilot, Cursor, JunoAI, or any other model, bot, or agent) and you add, modify, or delete anything in this repository, you **must** append a dated entry to this file describing what you changed and why — one entry per work session, no exceptions. This log is how the repository owner tracks what every AI did. Human commits do not need entries.

Entry format:

## YYYY-MM-DD — <your name/model>
- Changed: <files or area>
- Why: <reason>

---

## 2026-09-28 — JunoAI
- Changed: created this file
- Why: owner's standing rule — every AI that touches this repo must log its changes here

## 2026-09-28 — JunoAI
- Changed: added .github/workflows/ci.yml (shared CI caller)
- Why: automated build/test gate via the family reusable workflow

## 2026-09-29 — JunoAI
- Changed: built Release Tool v1 — `/release` wizard, `releases` table (+RLS), release/pay/package/verify API routes, Ixis payment via Apixis Wallet, zip release packages, tests
- Why: owner's request for a sellable pay-per-song product on the Lyrixis codebase (PR for owner review, not merged)
