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
