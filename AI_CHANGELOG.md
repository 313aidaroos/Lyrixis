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


## 2026-09-30 — Codex — Tester readiness: shared-login redirects

- Copied the canonical ApixisWallet local-redirect validator and used it at login start and callback. Preserved this app’s existing Supabase adapter and routes.
- Added regression cases for external URLs, backslashes, encoded separators/control characters and normal return destinations. No design changes.

## 2026-09-30 — Claude (branch claude/awesome-newton-3tygzi)
- Changed: `lib/apixis-login.ts` re-copied from `ApixisWallet/sdk/apixis-login-next.ts` — `verifyOtp({ type: "email" })` (D16: new addresses get a `signup` token that `magiclink` rejects). `lib/apixis-wallet.ts` → SDK v3.1 (adds `marketplaceOrder`/`marketplaceSettle`). `lib/apixis-world*.ts` re-synced with Apixis.dev (15 clients incl. ominix, wattixis; 1,000 starter Ixis, D11).
- Changed: `lib/apixis-world-agent.test.ts` expects 15 clients.
- Why: family backend pass per Awad's 2026-09-30 decisions (ApixisWallet/AGENTS.md §0c D11–D16; live board: ApixisWallet/docs/FAMILY_STATUS.md). One SDK, one login kit, one world kit — copied from canonical, never patched by hand.

## 2026-10-02 — Claude (Claude Code)
- Changed: `.env.example` now lists every env var the code reads (missing names appended with a one-line note each).
- Why: so the owner can add keys in Vercel from one complete list. No code changed.

## 2026-10-02 (late night) — Claude
- Changed: new-account wording now says the Apixis world agent starts with **1,000** in-world Ixis (was 200). Apixis.dev really grants 1,000 (D11, `STARTER_IXIS_DEFAULTS.visitor`); shared world-kit comments changed identically in every copy.
- Why: the site was telling new people the wrong number.

## 2026-10-04 — Claude (Claude Code, full-portfolio review)
- Changed: `NOTES/CLAUDE.md` — this repo's slice of the 24-repo review (what is live, what is open, who owns each item, drift found). No code, env, database or deploy changes.
- Why: Awad asked for every repo to be read twice with a done / to-do / owner status, and for the notes in each repo to be updated. Notes only; Awad approved the merge on 2026-10-04.

## 2026-10-04 (CT) — Grok (Claude-audit lock fixes, PR from `grok/claude-audit-fixes`)
- Changed: `/tracks/[id]` no longer shows the dead Stripe checkout (404 `/api/checkout`) or a USD price; removed "As-salamu alaykum" from the magic-link screen and the support auto-reply; Ominix link on `/companies` → `ominix-app.vercel.app`; 1,000 Ixis wording names Apixis.dev; `NOTES/GROK.md` Claude #27 entry + hub decision (uploads will reuse `lyrixis.track.unlock`, not built yet).
- Why: Awad's locks (no Stripe/card checkout, no religious content outside Halaxis, Apixis.dev grants the 1,000 Ixis) and notes for every Claude change.
