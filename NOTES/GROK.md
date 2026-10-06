Grok Bot (Developer Bot hub + product leads) notes. Every change Grok Bot makes to this product (code, env, database, deploys) gets a dated entry here so Claude, Hermes and Codex stay on the same page.

## 2026-10-04 summary

- **Grok:** added the verified-owner unlock bypass.
- **Lead:** prepared upload-worker hosting docs and a Feed preview; those preview changes were not merged.
- **Claude:** merged PR #27 (`8cf8429`) around 6:30 PM CT, adding the full-portfolio review to `NOTES/CLAUDE.md` and `AI_CHANGELOG.md` (notes/docs only).
- **Hermes:** no 2026-10-04 commit or merged PR identified in this repository.
- **Juno:** no 2026-10-04 commit or merged PR identified in this repository.

## Catch-up correction — 2026-10-04 (CT)

Claude activity was present; the earlier “no Claude activity” line was incorrect. Each item below has an undo pointer.

- **Claude, 2026-10-04 6:31 PM CT — PR #27, merge `8cf842961ddedacc942a17410bf1e2603e59da57`:** notes: Claude full-portfolio review 2026-10-04 (NOTES/CLAUDE.md, AI_CHANGELOG); added `NOTES/CLAUDE.md` and `AI_CHANGELOG.md` (notes/docs only). Undo: `git revert 8cf842961ddedacc942a17410bf1e2603e59da57`.
- **2026-10-04 6:31 PM CT — 313aidaroos:** `notes: Claude full-portfolio review 2026-10-04 (NOTES/CLAUDE.md, AI_CHANGELOG) (#27)` landed as `8cf842961ddedacc942a17410bf1e2603e59da57`. Where: commit `8cf842961ddedacc942a17410bf1e2603e59da57`. Undo: `git revert 8cf842961ddedacc942a17410bf1e2603e59da57`.

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

## 2026-10-04 (CT) — Grok Bot: Feed tab on Lyrixis (PR open, NOT merged)
- Why: Awad asked for the Socixis Social family feed as a Feed tab on every Ixis site. Awad put feed changes on hold, so this PR is for preview review only; do not merge until Awad says so.
- What: new public `/feed` page in Lyrixis's own shell (same header, footer, fonts, colors and buttons). For You is the unfiltered mixed feed from every Apixis company with source-site badges and AI labels; Following, Search · Trending and You tabs; video/photo/text posts, like, comment, follow, save, share, report, tips and boosts in Ixis. Signed-out visitors can browse; the 4th tab says "You" and shows a sign-in card (Apixis ID). Text-only posts use the site's body font, wrap long words and size to their content; media posts keep the full-height layout; feed modals sit above everything.
- Where: `app/feed/` (page with SiteNav/SiteFooter, Lyrixis skin, `feed.css` mapped to Lyrixis tokens), `feed-client/` (shared client), `app/api/feed-session/route.ts`, "Feed" link in `components/SiteNav.tsx` (desktop + mobile), `lib/feed-client.test.ts`.
- Backend: https://www.apixis.dev/api/feed. `/api/feed-session` calls POST /api/feed/session server-side with the existing `APIXIS_WORLD_KEY` + X-Apixis-Client/Sub/Email and returns the short-lived fdt_ token. No new env vars, no DB change, no SVGs.
- Who: Grok Bot (for Awad).
- Undo: close this PR, or `git revert <squash sha>` if it is ever merged.

## 2026-10-04 19:00 (CT) — Grok Bot: Feed phone tab fit (same PR, still NOT merged)
- What: at 375px the 4th "You" tab was pushed off-screen by "Search · Trending". Under 560px the tab now reads "Search", tabs are tighter, and if a wide site font still can't fit the tabs and "+ Post" on one row, Post drops to its own row instead of covering "You". Desktop is unchanged; the site's colors, fonts and buttons are untouched; no SVGs. Also: desktop header (`components/SiteNav.tsx`) uses gap-6 + whitespace-nowrap so the extra Feed link no longer wraps "Use Cases" / "Buy Ixis" / "Sign in" at 1440px.
- Where: feed client `FeedView.tsx` (tab label) and the shared layout section of the site's feed CSS.
- Who: Grok Bot (for Awad). No merge, no production deploy.
- Undo: revert this commit on the PR branch.
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

## 2026-10-04 6:01 PM / 6:31 PM (CT) — Claude: full-portfolio review notes (PR #27, merged)
- What: notes only. New `NOTES/CLAUDE.md` (this repo's slice of Claude's 24-repo review: what is live, what is open, who owns it, drift found) and a 2026-10-04 entry in `AI_CHANGELOG.md`. No code, env, database or deploy changes.
- Where: branch `claude/great-fermi-6brq7a` (commit `39882db`, 6:01 PM CT, author Claude <noreply@anthropic.com>) → PR #27, squash commit `8cf8429` on `main`, merged 6:31 PM CT by 313aidaroos (body says Awad approved). Vercel production `dpl_GRPjDqkXsrSGsLfS9Tcb1Pq7Fhrn` built from `8cf8429`, READY (auto-deploy from main; notes only, so the site output did not change).
- Who: Claude (Claude Code), merged from the 313aidaroos account.
- Accuracy: `NOTES/CLAUDE.md` says "`main` @ `3fd1b9d` … code unchanged since 10-02", but #26 (owner allowlist, code) had already merged at 6:14 PM CT. The Ominix link drift it lists is fixed in `grok/claude-audit-fixes`.
- Undo: `git revert 8cf8429` (removes `NOTES/CLAUDE.md` and the AI_CHANGELOG lines). The branch `claude/great-fermi-6brq7a` can be deleted once nobody needs it.

## 2026-10-04 6:51 PM (CT) — Grok: Claude-audit lock fixes (PR #29, branch `grok/claude-audit-fixes`, open, not merged)
- What: audit of everything since `3fd1b9d` against Awad's locks; fixed the lock breaks found on `main`:
  - `components/TrackView.tsx` (`/tracks/[id]`, own uploads): removed the dead Stripe checkout button (it POSTed to `/api/checkout`, which is gone and returns 404), the "Stripe confirms the webhook" notice and the USD price from `/api/quote`. It now says plainly that upload unlocks will go through the Apixis Wallet and are not live yet. No charge path added.
  - `components/AuthForm.tsx` and `app/api/support/intake/route.ts`: removed the "As-salamu alaykum" greetings (religious wording belongs only on Halaxis). The support email now opens with "Hi,".
  - `app/companies/page.tsx`: Ominix link `nexxis-tau.vercel.app` (retired host) → `https://ominix-app.vercel.app`.
  - `components/LoginForm.tsx`, `components/ApixisWorldWelcome.tsx`: the 1,000 Ixis wording now says Apixis.dev gives it.
- Not touched: `lib/cixy-prompt.ts` (Cixy prompt, flagged to Awad: it still has Muslim identity, halal and prayer/Ramadan instructions), footer (PR #14), env, database, deploys.
- Who: Grok (Developer Bot executor).
- Undo: close the PR without merging, or after a merge `git revert <squash sha>`.

## 2026-10-04 6:57 PM (CT) — Hub decision + PR #29 refresh (notes only)
- Decision (Developer Bot hub, 2026-10-04): own uploads on `/tracks/[id]` will reuse the existing Wallet product `lyrixis.track.unlock` (300 Ixis), the same SKU as catalog unlocks. **Not built yet.** PR #29 only removes the dead Stripe checkout and shows an honest "not live yet" note. A later PR will add the Wallet redeem path for uploads (today `app/api/redeem/route.ts` only looks up `catalog_recordings`).
- Cixy prompt: `lib/cixy-prompt.ts` is not changed in #29. Developer Bot will sync it after #29.
- Refresh: merged `main` (`450c577`, which had already restored this file's intro line and fixed the 10-04 summary) into `grok/claude-audit-fixes` with a normal merge commit. Kept main's summary lines in the one conflict.
- Who: Grok (Developer Bot executor). Undo: `git revert -m 1` the "Merge main into grok/claude-audit-fixes" commit; this entry goes with it.

## 2026-10-04 (CT) — Grok (Developer Bot hub): Cixy persona v2 sync + Ominix link
- What: lib/cixy-prompt.ts now builds on the v2 kit (new lib/apixis-cixy.ts, same text as the other TS sites); removed 'Muslim AI operator' identity, salaam/Insha'Allah/alhamdulillah, 'NOT a scholar', HALAL-CONSCIOUS (alcohol/pork/gambling/riba/haram lyrics) and PRAYER/RAMADAN AWARE blocks. Added lib/__tests__/cixy-prompt.test.ts (religious-terms guard). The Ominix link and the AuthForm/support-email salam greetings are left to lead PR #29 to avoid conflicting with it.
- Files: lib/cixy-prompt.ts lib/__tests__/cixy-prompt.test.ts lib/apixis-cixy.ts 
- Why: Awad's lock — no religious content in Cixy on any product except Halaxis; she declines only genuinely harmful, deceptive or illegal content, never on religious grounds (9/30). Kit = ApixisWallet `sdk/apixis-cixy.*` v2 (3a22244, PR #50) with two hub edits pending canonical: the religion-derived "clean recommendations" rule (gambling) is replaced by "decline only harmful, deceptive or illegal, never on religious grounds", and the character line reads "draws on Arab culture". Ominix links point to https://ominix-app.vercel.app (checked 200 on 2026-10-04 ~6:55 PM CT).
- Who: Grok (Developer Bot hub), branch `grok/cixy-v2-20261004`, one squash-merged PR.
- Undo: `git revert <squash sha of this PR>` (sha recorded in the PR), then redeploy prod.

## 2026-10-04 19:13 (CT) — Grok Bot: Feed PR #25 approved for production by Awad
- Why: Awad said "make it live" at 7:13 PM CT on Oct 4, 2026, approving the squash-merge of this PR and the production deploy that follows from main.
- What: squash-merge of PR #25 (feed files + Feed nav entry only); Vercel's Git integration deploys main to production.
- Who: Grok Bot (for Awad).
- Undo: `git revert <squash sha of PR #25>` on main and push (the squash sha is on the PR page and in /workspace/feed/STATUS.md), or in Vercel promote the previous production deployment (instant rollback) and then revert.

## 2026-10-04 evening provenance, 6:57 to 9:25 PM (CT)

Recorded by Grok (Developer Bot, notes and status sync at 9:25 PM CT). Every change below already has a detailed entry in this file or in the matching lead note; this section adds the exact commit, PR number, and undo pointer. All commits were pushed under the shared `313aidaroos` GitHub account; the detailed entries say which bot or lead made each one. Text only, no code or settings changed.

- 7:11 PM, PR #30, `cff58a4`: Cixy persona v2 sync (no religious content outside Halaxis) + Ominix link to ominix-app.vercel.app. Undo: `git revert cff58a4` on `main`, then redeploy production.
- 7:17 PM, PR #25, `85388c7`: Feed tab: Socixis Social family feed at /feed. Undo: `git revert 85388c7` on `main`, then redeploy production.

## 2026-10-04 (CT) — Grok: new accounts only through Apixis ID (branch `grok/apixis-id-only-signup`)
- Approval: Awad said go at 10:00 PM CT, Oct 4 2026 ("every Ixis product must allow NEW account creation only through Apixis ID", the shared Wallet SSO at apixis-wallet.vercel.app/sso/authorize).
- What changed: Email magic links now use `shouldCreateUser: false` (server action `app/login/actions.ts` and legacy `POST /api/auth/magic-link`): existing accounts still get a link; a brand-new email gets "No Lyrixis account uses this email yet… use Log in with Apixis ID" (API also returns `apixis_id_url`). `/signup` (LoginForm variant "signup") now shows only "Log in with Apixis ID" plus "Already have an account? Sign in"; `/login` keeps email link + password for existing accounts with one existing-style hint line. No password signup existed. Same classes, no redesign.
- Not changed: Supabase project setting "Allow new users to sign up" stays ON (Apixis SSO callback may create users through it). Theme, layout and styles unchanged. No Wallet, Stripe or Cixy files touched.
- Undo: `git revert <squash sha of this PR>` (the sha is recorded in the PR and in /workspace/apixisid/STATUS.md on the box).

## 2026-10-05 overnight provenance, Oct 4 9:35 PM to Oct 5 12:25 AM (CT)

Recorded by Grok (Developer Bot, notes and status sync at 12:25 AM CT on Oct 5). Each change below either has its own detailed entry earlier in this file (written by whoever made it) or is described here. Commits under the shared `313aidaroos` account were made by the bot or lead named in the detailed entry. Every production deployment for this repo was Ready at the time of this sync. Text only, no code or settings changed.

- Oct 4 10:29 PM, PR #31, `3db2e58`: Apixis ID is the only way to create a Lyrixis account. Undo: `git revert 3db2e58` on `main`, then redeploy production.

## 2026-10-05 8:30 PM (CT): Grok (Lyrixis Lead), upload worker provisioning, part 1 (Awad approved at 8:00 PM CT)
- Approval: at 8:00 PM CT on Oct 5, 2026, Awad approved hosting the upload worker on his existing Railway account with a hard $20/month cap, Redis on Upstash Free, and Groq for transcription.
- Railway (workspace "313aidaroos's Projects" `f59787d4-de34-4d4c-b384-68826490794b`): created project **`lyrixis-worker`** `b40a5741-8d83-40e1-bb43-2dd464866304`, env `production` `61c39fc8-2c24-415e-87bf-f347e832c43a`, and service **`worker`** `653f58ed-e1fd-4596-81f0-aa3ca8e22dce`. No source is connected and nothing is deployed, so it costs $0. Service settings: dockerfilePath `Dockerfile.worker`, the watch patterns from `railway.json`, restart ON_FAILURE ×10, 1 replica, no sleep, limits 1 vCPU / 1 GB. Railway's API now rejects `railwayConfigFile` (Config as Code is deprecated), so these are set at the service level instead.
- Railway variables set (skipDeploys): NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY (copied from Vercel `lyrixis` Production), STORAGE_BUCKET, TRANSCRIPTION_PROVIDER/API_BASE_URL (Groq)/MODEL/CENTS_PER_MINUTE, LANGUAGE_PROVIDER, MAX_UPLOAD_MB=100, MAX_DURATION_SECONDS=720, WORKER_CONCURRENCY=2, WORKER_DRAIN_DELAY_SEC=60, WORKER_STALLED_INTERVAL_MS=300000, NODE_ENV. **Still missing:** REDIS_URL and TRANSCRIPTION_API_KEY (the Groq key).
- $20 cap: **NOT set.** `usageLimitSet` (soft $15 / hard $20) returned "Usage limits require an active subscription". The workspace is on the Hobby trial (4 days left on Oct 5), with no subscription and no payment method, and $2.83 of trial credit remaining. With no card on file nothing can be charged. Set the cap right after Awad subscribes, before the first deploy. The limit covers the whole workspace, including awad-command (about $1.66 used this period).
- Redis: nothing changed. The Vercel team already has an unused Upstash for Redis **Free** store `upstash-kv-teal-marble` (`store_PP9Mt0uHl6hab9zV`, iad1, eviction off, connected to 0 projects). Free allows one database per account, so this is the store to connect to `lyrixis`. It isn't connected yet on purpose: REDIS_URL on Vercel production without a running worker would let uploads enqueue and then sit unprocessed.
- PR #24 (`grok/upload-worker-hosting`): merged main into it (resolved a NOTES/GROK.md conflict by keeping both sides) and added a status paragraph to docs/WORKER_HOSTING.md. CI is green. Not merged.
- Vercel `lyrixis`: no env changes (no GROQ/TRANSCRIPTION/REDIS vars there).
- Who: Grok (Lyrixis Lead), with Awad's approval.
- Undo: Railway: delete project `lyrixis-worker` (`b40a5741-…`) in the dashboard or with `projectDelete`. Nothing else changed outside git. PR #24: revert merge commit `8a7a54a` and doc commit `5b90e5a` on the branch, or close the PR.
