Grok Bot (Developer Bot hub + product leads) notes. Every change Grok Bot makes to this product (code, env, database, deploys) gets a dated entry here so Claude, Hermes and Codex stay on the same page.

## 2026-09-27 (CT) — Developer Bot (hub)
- Wallet registration: added `lyrixis` to `wallet_api_clients` in Supabase project `kzneeksminozmhnqaaun`, with `require_sso=false`.
- Callback URLs registered: https://lyrixis.vercel.app/auth/apixis/callback.
- Vercel env: replaced `WALLET_API_KEY` with a per-product `apx_live_` key, added `APIXIS_CLIENT_ID=lyrixis`, and left legacy `APIXIS_WALLET_API_KEY` present (name-only check); production was redeployed from the same product commit.
- Cleanup status: the attempted deletion of legacy `APIXIS_WALLET_API_KEY` variables was stopped at about 22:45 CT; no deletion was made here.
- Undo: restore `WALLET_API_KEY` to its legacy value and deactivate the `lyrixis` client row.

## 2026-09-27 (CT) — Grok Bot: Apixis Wallet balance pill (PR #6 built on + merged, merge 42c600d)
- What: merged Claude's Apixis ID / shared-Wallet PR #6 (Sign in with Apixis, SDK v3 `lib/apixis-wallet.ts`, `lib/apixis-login.ts`, `/auth/apixis/start|callback`, `GET /api/wallet/balance`, chip in `AppNav`) after updating it with main, plus Grok's commit 7daf776: shared-fetch Ixis pill that refetches on focus/visibility/pageshow and shows "Sign in with Apixis" when not linked; pill also in `SiteNav` for signed-in visitors (desktop + mobile); route returns `linked`.
- Where (Grok commit): `components/ApixisWalletChip.tsx`, `components/SiteNav.tsx`, `app/api/wallet/balance/route.ts`.
- Note: PR #6 (Claude) also changes `app/api/redeem/route.ts` to pass the Apixis `sub` as Wallet owner.
- Not touched by Grok: Wallet code/env/keys, Stripe, checkout, payment links.
- Undo: `git revert -m 1 42c600da733ec75b85da343720a4a99e59f2a100` (all of PR #6), or revert only 7daf776 for the pill.

## 2026-09-28 (CT) — Grok Developer Bot: own Apixis world agent for every new Lyrixis signup
- What: new Lyrixis accounts (created after 2026-09-28 07:30 UTC, email verified or signed in with Apixis ID) get their own Apixis world agent (default Apixis body, customizable later) plus the one-time 200 in-world Ixis starter grant. Creation is server-side: `GET /api/apixis/world-agent` calls Apixis.dev `POST https://www.apixis.dev/api/agent/provision` with the product key `APIXIS_WORLD_KEY` (Vercel env, sensitive). Idempotent (DB unique constraints on the Apixis side; Supabase auth `app_metadata.apixis_world_agent_*` flag here). A one-time welcome card on `/dashboard` (Cixy as guide, agent name, "Enter the world" via Apixis ID, "Not now") and an "Apixis World ↗" link in `AppNav`. No backfill of older accounts.
- Where: `app/api/apixis/world-agent/route.ts`, `components/ApixisWorldWelcome.tsx`, `lib/apixis-world.ts`, `lib/apixis-world-provision.ts`, `lib/apixis-world-agent.ts`, `lib/apixis-world-agent.test.ts`, `app/dashboard/page.tsx`, `components/AppNav.tsx`, `public/cixy/cixy-combo-a-avatar.webp`, `.env.example`.
- Not touched: login/signup pages, Wallet pill/balance route, Stripe/payments, existing accounts.
- Undo: revert the PR's squash commit; optionally remove Vercel env `APIXIS_WORLD_KEY` (the route then does nothing). Agents already created live in Apixis.dev (`apixis.agents`) and are not deleted by reverting.

## 2026-09-29 (CT) — Grok (Lyrixis Lead): one Apixis ID = one Wallet = one world agent
- What: audit of Awad's one-account brief (2026-09-29 8:45 PM CT). Already on main: Wallet SSO "Log in with Apixis ID" (PR #6 merge 42c600d, #11), shared-Wallet balance pill in AppNav + SiteNav (7daf776), redeem-only spending via `lib/apixis-wallet.ts`, world-agent provisioning (#10). Gaps fixed here: (1) the agent was only provisioned when the dashboard card loaded, so it is now also created server-side at the first sign-in (Apixis ID callback, and the magic-link callback pings `GET /api/apixis/world-agent`); (2) AppNav link now reads "Your agent is in the Apixis world ↗" once the agent exists; (3) card + link share one fetch (no double provision call).
- Where: `lib/apixis-world-agent-server.ts` (new, mirrors Renoxis `lib/renoxis/world-agent-server.ts`), `lib/apixis-world-client.ts` (new), `components/ApixisWorldLink.tsx` (new), `app/api/apixis/world-agent/route.ts`, `lib/apixis-login.ts`, `app/auth/callback/callback-client.tsx`, `components/AppNav.tsx`, `components/ApixisWorldWelcome.tsx`.
- Storage: no migration. Agent id/time stay in Supabase auth `app_metadata.apixis_world_agent_id` / `_at` / `_name` (same as Renoxis). Idempotent: flag skip here + Apixis.dev dedupes by verified email (one citizen, one agent, 1000 starter once — granted by Apixis.dev, never locally).
- Blocked: `APIXIS_WORLD_KEY` is NOT set on Vercel project `lyrixis` (checked by name 2026-09-29), so provisioning returns `apixis_world_key_missing` until Developer Bot issues it. Not minted here.
- Not touched: Cixy prompt content (except the starter number, see follow-up below), Stripe, Wallet settings/keys/internals, PR #14.
- Who: Lyrixis Lead / Grok. PR against main, not merged, not deployed to production.
- Undo: revert the PR (or its merge/squash commit).
- 2026-09-29 (CT) follow-up (Awad 8:54 PM CT): new-signup starter grant is now 1000 Ixis (was 200). Apixis.dev makes the grant; Lyrixis never grants Ixis locally. Updated copy/tests/comments to 1000: `components/LoginForm.tsx`, `components/ApixisWorldWelcome.tsx`, `lib/apixis-world-agent.test.ts`, comments in `lib/apixis-world*.ts` and `app/api/apixis/world-agent/route.ts`; in `lib/cixy-prompt.ts` only the starter number changed (nothing else in Cixy files). Older dated entries above keep their historical 200. Same undo (revert the PR).
