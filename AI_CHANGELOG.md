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

## 2026-09-29 — Grok (Lyrixis Lead)
- Changed: `lib/apixis-world-agent-server.ts`, `lib/apixis-world-client.ts`, `components/ApixisWorldLink.tsx` (new); `app/api/apixis/world-agent/route.ts`, `lib/apixis-login.ts`, `app/auth/callback/callback-client.tsx`, `components/AppNav.tsx`, `components/ApixisWorldWelcome.tsx`, `WORKBOARD.md`, `NOTES/GROK.md`
- Why: one Apixis ID = one Wallet = one world agent: provision the agent at first sign-in, show "Your agent is in the Apixis world" link
