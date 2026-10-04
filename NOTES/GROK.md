## 2026-10-04 summary
## 2026-10-04 summary

- **Grok:** added the verified-owner unlock bypass.
- **Lead:** prepared upload-worker hosting docs and a Feed preview; those preview changes were not merged.
- **Claude/Hermes/Codex/Juno:** Claude, Hermes, and Juno had no commits or merged PRs in this repo on 2026-10-04 CT.



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

---
_Backfill below (written 2026-10-02 ~17:30 CT by Grok Developer Bot, notes only, Awad-approved via Developer Bot hub 2026-10-02 17:28 CT). Facts are from git and the GitHub REST API. All PRs in this repo are opened and merged under the `313aidaroos` GitHub account; "who" below comes from branch prefix, PR body, AI_CHANGELOG.md and Co-authored-by lines. Times are America/Chicago._

## 2026-09-28 02:35 (CT) — Grok Developer Bot: WORKBOARD claim for login sweep
- What: one-line claim added to `WORKBOARD.md` for the login sweep (became PR #11).
- Where: direct-to-main commit 6896439 (`workboard: Grok login sweep claim [skip ci]`), `WORKBOARD.md` only.
- Who: commit message names Grok; git author `313aidaroos`.
- Undo: `git revert 6896439`.

## 2026-09-28 02:40 (CT) — Grok Developer Bot: login sweep (PR #11, merged)
- What: `/login` and `/signup` share one LoginForm ("Log in with Apixis ID", Magic link / Password tabs, "Forgot password?"); `/set-password` reset mode; Cixy sign-in help card; wallet pill no longer shows "Sign in with Apixis" to signed-in people ("Link Apixis ID" for email-only accounts); Cixy knows sign-in options.
- Where: PR #11 (branch `grok/login-sweep`), squash commit 290ffe3. Files: `components/LoginForm.tsx`, `components/CixyLoginHelp.tsx` (new), `components/CixyChat.tsx`, `components/CixyWidget.tsx`, `components/ApixisWalletChip.tsx`, `app/api/wallet/balance/route.ts`, `app/login/actions.ts`, `app/login/page.tsx`, `app/signup/page.tsx`, `app/set-password/page.tsx`, `lib/cixy-prompt.ts`.
- Who: Grok Developer Bot (commit body signed "Grok Developer Bot, 2026-09-28").
- Undo: `git revert 290ffe3`.

## 2026-09-28 04:08 (CT) — JunoAI: AI_CHANGELOG.md rule (PR #12, merged)
- What: new `AI_CHANGELOG.md` (every AI must log changes); linked from `CLAUDE.md`.
- Where: PR #12 (branch `junoai/ai-changelog`), squash commit ce82e14. Files: `AI_CHANGELOG.md`, `CLAUDE.md`.
- Who: JunoAI (branch prefix + AI_CHANGELOG entry).
- Undo: `git revert ce82e14`.

## 2026-09-28 04:24 (CT) — JunoAI: shared CI (PR #13, merged)
- What: shared CI caller workflow (`node-ci / ci` check on PRs), `JUNOAI_NOTES.md`, AI_CHANGELOG entry; the CLAUDE.md link added in #12 was removed in conflict resolution (3 lines).
- Where: PR #13 (branch `junoai/ci`), squash commit 33288d4. Files: `.github/workflows/ci.yml`, `AI_CHANGELOG.md`, `CLAUDE.md`, `JUNOAI_NOTES.md`.
- Who: JunoAI (branch prefix + AI_CHANGELOG entry).
- Undo: `git revert 33288d4`.

## 2026-09-29 20:33 (CT) — Grok Developer Bot: footer "Other Ixis companies" (PR #14, OPEN)
- What: footer column with 11 approved sites (`lib/ixis-companies.ts`), grid 4 → 5 columns. Not merged, not on production. As of 2026-10-02 it has merge conflicts with main (mergeable_state `dirty`); CI and Vercel preview passed.
- Where: PR #14 (branch `grok/ixis-footer`, head debe5ed). https://github.com/313aidaroos/Lyrixis/pull/14
- Who: Grok Developer Bot (branch prefix; PR body cites Developer Bot hub approval 2026-09-29).
- Undo: close the PR (nothing on main to revert).

## 2026-09-29 20:51 (CT) — Grok Developer Bot: one account / world agent at first sign-in (PR #15, CLOSED unmerged 2026-10-01 23:18 CT)
- What: proposed world agent at first sign-in + agent link + 200 → 1000 starter copy. Closed without merging; closing comment (posted from the `313aidaroos` account, "Generated by Claude Code") says main already has the world agent at sign-in and agent link via the shared kits, and the 1,000 wording landed in #20. Branch kept. Part of the 10/01–10/02 PR cleanup (10/02 UTC).
- Where: PR #15 (branch `grok/one-account`, head 40d6563). Never on main.
- Who: Grok Developer Bot (branch prefix); closed by Claude Code.
- Undo: re-open PR #15.

## 2026-09-29 22:27 (CT) — Juno: Release Tool v1 (PR #16, OPEN)
- What: pay-per-song `/release` wizard (+1741 lines, 16 files, no new env vars per PR body; needs Wallet product `lyrixis.release.package` registered before pay works). Not merged, not on production. As of 2026-10-02 it has merge conflicts (`dirty`); CI and Vercel preview passed.
- Where: PR #16 (branch `juno/release-tool-v1`, head 9c33467). https://github.com/313aidaroos/Lyrixis/pull/16
- Who: Juno (branch prefix).
- Undo: close the PR (nothing on main to revert).

## 2026-09-29 23:16 (CT) — Vercel env: APIXIS_WORLD_KEY and APIXIS_WORLD_API added
- What: two env vars created on the `lyrixis` Vercel project (production, preview, development): `APIXIS_WORLD_KEY` (encrypted) and `APIXIS_WORLD_API` (plain). Names only recorded here. This is the key the world-agent route (PR #10) needs; without it provisioning returns `apixis_world_key_missing`.
- Where: Vercel project env (created 2026-09-29 23:16:45–46 CT).
- Who: Vercel user `313aidaroos`; which agent or person did it is unknown.
- Undo: remove `APIXIS_WORLD_KEY` and `APIXIS_WORLD_API` in Vercel and redeploy (world-agent route then does nothing).

## 2026-09-29 23:27 (CT) — Awad: test provision endpoint added (later removed)
- What: temporary `app/api/test-provision/route.ts` ("DELETE after QA").
- Where: direct-to-main commit fe7bb4b.
- Who: git author Awad Alaidaroos; whether an agent made it on his behalf is unknown.
- Undo: removed already in 865cbc2 (next entry); nothing to undo.

## 2026-09-29 23:45 (CT) — Awad: new-user sign-in fix in auth callback; /api/test-provision removed
- What: fleet-wide bug where brand-new emails got `otp_expired` on the first magic link. `app/auth/callback/page.tsx` handles `token_hash` with `verifyOtp({ type: 'email' })`, keeps PKCE and implicit flows; adds `scripts/generate_signin.mjs`; deletes `app/api/test-provision/route.ts` (now 404 on production).
- Where: direct-to-main commit 865cbc2. Files: `app/auth/callback/page.tsx`, `scripts/generate_signin.mjs`, `app/api/test-provision/route.ts` (deleted).
- Who: git author Awad Alaidaroos (message references Ominix 3d17c68, 78d2af9); agent involvement unknown.
- Undo: `git revert 865cbc2` (this would also bring back the test route).

## 2026-09-29 23:49 (CT) — Awad: new-user sign-in fix moved into middleware
- What: `middleware.ts` handles `token_hash` `verifyOtp` (type `email`) and sets cookies on the redirect response; most of the callback-page handling from 865cbc2 is removed again.
- Where: direct-to-main commit 84dd537. Files: `middleware.ts`, `app/auth/callback/page.tsx`.
- Who: git author Awad Alaidaroos; agent involvement unknown.
- Undo: `git revert 84dd537`.

## 2026-09-30 01:22 (CT) — Codex: shared-login redirect hardening (PR #17, merged)
- What: canonical ApixisWallet local-redirect validator used at login start and callback, plus regression tests.
- Where: PR #17 (branch `codex/tester-readiness`), squash commit f54e7b9. Files: `lib/apixis-redirect.ts` (new), `lib/apixis-login.ts`, `lib/__tests__/apixis-redirect.test.ts`, `AI_CHANGELOG.md`.
- Who: Codex (branch prefix + AI_CHANGELOG entry); Co-authored-by Awad Alaidaroos.
- Undo: `git revert f54e7b9`.

## 2026-09-30 02:33 (CT) — Claude: re-sync Apixis kits (PR #18, merged)
- What: `lib/apixis-login.ts` re-copied (verifyOtp type `email`), `lib/apixis-wallet.ts` → SDK v3.1 (marketplaceOrder/Settle), world kit re-synced (15 clients, 1,000 starter Ixis).
- Where: PR #18 (branch `claude/awesome-newton-3tygzi`), squash commit e25307d. Files: `lib/apixis-login.ts`, `lib/apixis-wallet.ts`, `lib/apixis-world.ts`, `lib/apixis-world-provision.ts`, `lib/apixis-world-agent.test.ts`, `AI_CHANGELOG.md`.
- Who: Claude (Co-authored-by: Claude).
- Undo: `git revert e25307d`.

## 2026-10-01 20:56 (CT) — Claude: full .env.example (PR #19, merged)
- What: `.env.example` lists every env var the code reads. No code change.
- Where: PR #19, squash commit 1386597. Files: `.env.example`, `AI_CHANGELOG.md`.
- Who: Claude (Co-authored-by: Claude).
- Undo: `git revert 1386597`.

## 2026-10-01 23:10 (CT) — Claude: starter in-world Ixis wording 1,000 not 200 (PR #20, merged)
- What: new-account copy says the Apixis world agent starts with 1,000 in-world Ixis (D11).
- Where: PR #20, squash commit 442363e. Files: `app/api/apixis/world-agent/route.ts`, `components/ApixisWorldWelcome.tsx`, `components/LoginForm.tsx`, `lib/apixis-world-agent.ts`, `lib/apixis-world-agent.test.ts`, `lib/cixy-prompt.ts`, `AI_CHANGELOG.md`.
- Who: Claude (Co-authored-by: Claude).
- Undo: `git revert 442363e`.

## 2026-10-01 23:19–23:20 (CT) — PR cleanup: #1 and #5 closed unmerged
- What: PR #1 (`cursor/lyrixis-upload-platform-6994`, stale draft; "superseded, upload and processing are built on main") closed 23:19 CT; PR #5 (`cursor/cixy-customizer-bd03`, Cixy customizer draft; "never picked up") closed 23:20 CT. Branches kept. Together with #15 these are the only closures in this repo during the 10/01–10/02 cleanup (closed_at on 10/02 UTC).
- Who: closing comments posted from the `313aidaroos` account, "Generated by Claude Code".
- Undo: re-open PR #1 / PR #5.

## 2026-10-02 02:21 (CT) — Codex: Apixis Companies page (PR #21, merged)
- What: new `/companies` page (15 illustrated, animated company cards, reduced-motion support) and an "Apixis Companies" nav item.
- Where: PR #21 (branch `codex/companies-tab-20261002`), squash commit b932930. Files: `app/companies/page.tsx`, `app/companies/companies.css`, `components/SiteNav.tsx`, `public/companies/*.jpg` (6 images).
- Who: Codex (branch prefix; no AI_CHANGELOG entry found).
- Undo: `git revert b932930` (revert #23 and #22 first).

## 2026-10-02 02:46 (CT) — Codex: Companies card motion and copy (PR #22, merged)
- What: removed orbit/spark overlays and badge bounce; card descriptions and links aligned with the approved mockup.
- Where: PR #22 (branch `codex/refine-companies-motion-20261002`), squash commit c413496. Files: `app/companies/page.tsx`, `app/companies/companies.css`.
- Who: Codex (branch prefix).
- Undo: `git revert c413496`.

## 2026-10-02 03:18 (CT) — Codex: Recovra link fix (PR #23, merged) + production deploy
- What: Recovra card points to recovra-three.vercel.app (recovra.vercel.app serves a different app).
- Where: PR #23 (branch `codex/fix-recovra-company-link-20261002`), squash commit 475f737, `app/companies/page.tsx`. Production deployment `dpl_Fb83RLm6kPfGuS2G3KPQsjbzhH1p` built from main 475f737, READY at 03:18 CT.
- Who: Codex (branch prefix); deploy is the Vercel Git integration (creator `313aidaroos`).
- Undo: `git revert 475f737`; or promote/roll back to the previous production deployment `dpl_EbmtyMLb7RRfKS9pcxHcmLKjjEwn` (c413496).

## 2026-10-04 — Owner allowlist (Grok)
- What: lib/owners.ts adds isOwner() and currentSessionIsOwner(). An owner is a confirmed email that is alaidaroosawad@gmail.com, awad@apixis.dev or in ADMIN_EMAILS, AND a session with an email-proving sign-in (magic link/OTP, Apixis ID/OAuth, recovery). A password-only session never counts, because neither owner has an account in mkuvgkjakxkytscfvnkf yet. An owner skips the unlock gates: full lyrics and track exports on his own tracks (/api/tracks/[id], /api/tracks/[id]/exports), and catalog exports plus the catalog page unlock state. These are product gates only: no track_unlocks row, no Wallet call, no ledger entry. His real Wallet purchases still work as normal.
- Not changed: Lyrixis has no admin pages (the /admin/support link in support emails has no page), and no new admin UI was built.
- Where: lib/owners.ts (+ lib/owners.test.ts), app/api/catalog/[id]/export/route.ts, app/api/tracks/[id]/route.ts, app/api/tracks/[id]/exports/route.ts, app/catalog/[id]/page.tsx. ADMIN_EMAILS was added to the Vercel project lyrixis.
- Who: Grok.
- Undo: revert this PR and remove ADMIN_EMAILS from Vercel.
## 2026-10-04 catch-up provenance (CT)

The entries below record the day's observed commits and merged PRs. Existing detailed entries above remain the change descriptions; this section supplies exact provenance and undo pointers.

### Commits
- `04b09b3` (2026-10-04T17:57:07-05:00, 313aidaroos; 313aidaroos@users.noreply.github.com) — Upload worker hosting: Dockerfile.worker, railway.json, docs, env example, opt-in polling knobs. Undo: no main change; close/delete the branch (or revert the branch commit before reuse).
- `48c00c3` (2026-10-04T18:11:35-05:00, 313aidaroos; 313aidaroos@users.noreply.github.com) — Feed tab: Socixis Social family feed at /feed (preview only, do not merge). Undo: no main change; close/delete the branch (or revert the branch commit before reuse).
- `bfac9cc` (2026-10-04T18:14:59-05:00, 313aidaroos; alaidaroosawad@gmail.com) — Owner allowlist: proven owner session skips unlock gates (#26). Undo: undo via the merged PR below: git revert bfac9cc.

### Merged PRs
- PR #26, merge `bfac9cc`, `grok/owner-allowlist` → `main`, merged 2026-10-04 CT by 313aidaroos: Owner allowlist: proven owner session skips unlock gates. Undo: `git revert bfac9cc`.
