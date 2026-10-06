# Apixis family: shared login + shared Wallet (read before touching auth, Ixis or billing)

Lead developer: Claude (backend). Owner: Awad. The source of truth for the whole family is **ApixisWallet → `AGENTS.md`**. This note is the short version for this site.

## Rules
1. **There is one Ixis balance: Apixis Wallet.** This site never stores, grants or computes its own Ixis balance and never runs its own Stripe checkout for plans or Ixis. It redeems from the Wallet.
2. **`lib/apixis-wallet.ts` and `lib/apixis-login.ts` are copies** of `ApixisWallet/sdk/apixis-wallet.ts` and `sdk/apixis-login-next.ts` (SDK v3). Don't fork or edit them here. Change them in ApixisWallet, then copy them over.
3. **Who pays is the Apixis ID `sub`.** Pass `owner: await apixisOwner(user.email)` to `redeem()`. It uses the `sub` when the person signed in with Apixis, otherwise their verified email. Never pass this site's own Supabase uid, and never take an email from the request body.
4. **Every paid action follows the same path:** `redeem()` does reserve → provision (write access) → capture. If the Wallet says `already_captured`, the customer was charged, so keep their access. Only a released hold means "not charged".

## What's wired here
| Piece | Where |
|---|---|
| Sign in with Apixis | `/auth/apixis/start?next=…` → Wallet → `/auth/apixis/callback`, plus the button in `components/SignInWithApixis.tsx` on the login page |
| Shared balance + Buy Ixis link | `GET /api/wallet/balance` (the person's one Wallet balance, plus a `buy` URL that returns here) and `components/ApixisWalletChip.tsx` |
| Buy Ixis | `buyIxisUrl("<app>", returnUrl)`. The Wallet sells the pack, then sends the person back here with the Ixis. The return host must be on the Wallet allowlist. |

## Env (Vercel, this site)
- `WALLET_API_KEY`: this site's own `apx_live_…` key (from the Wallet lead)
- `APIXIS_CLIENT_ID`: this site's Apixis ID client name
- `APIXIS_WALLET_API_URL=https://apixis-wallet.vercel.app`
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (or `_PUBLISHABLE_KEY`)
- `SUPABASE_SERVICE_ROLE_KEY` (server only; needed to create the session after Apixis sign-in)
- The Wallet must register this callback: `https://<this-site-domain>/auth/apixis/callback`

## AI Receptionist: family add-on (D18). Read before anything phone-related

Approved by Awad on 2026-10-06. The full spec is ApixisWallet → `docs/AI_RECEPTIONIST.md`; if this note disagrees with it, the spec wins.

- Lyrixis will offer the **AI Receptionist** for **$100/month (10,000 Ixis)**, renewing every 30 days. There is one Wallet SKU for the whole family: `apixis.receptionist.monthly` (app `Family`).
- **Do not build** a receptionist, voice agent, call-answering or phone-number feature in this repo, and **do not add or price** a receptionist SKU here. The one engine lives in Apixis.dev (`/api/receptionist/*`).
- This repo never holds voice-provider or phone-provider keys and never calls those services.
- What this site will get: an "AI Receptionist" card on the signed-in account page, a setup page and a calls page, using `sdk/apixis-receptionist.ts` copied byte-for-byte from Apixis.dev (copy, never fork). Script preset: `general`.
- Every call opens with the recording notice. Illinois requires all-party consent, and the family applies that everywhere.
- **Status here:** Not started. Comes after Awad reviews the Contraxis pilot. Do not start it early.
