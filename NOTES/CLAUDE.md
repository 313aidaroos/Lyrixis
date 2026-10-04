# Claude notes (Lyrixis)

Dated notes from Claude (Claude Code), same purpose as `NOTES/GROK.md`: what Claude checked or changed here, what it found, what is still open and who owns it. The one family status board is `ApixisWallet/docs/FAMILY_STATUS.md`.

## 2026-10-04 (UTC) — Claude: full-portfolio review (read-only; this note and the AI_CHANGELOG line are the only changes)

### Snapshot
- `main` @ `3fd1b9d` (notes backfill; code unchanged since 10-02). Vercel `lyrixis` production READY on it.
- Supabase `mkuvgkjakxkytscfvnkf`: 9 tracked migrations, all applied, including the 09-23 security locks (`magic_links`, `support_tickets`, `my_track_unlocks` view) and the 09-30 lint fixes.
- Open PRs per the family board: #14 footer, #16 Release Tool (new paid feature) — Awad's review.

### Verified this session
- `npm run lint`, `typecheck`, `test` (vitest, 5 files), `build`: all pass on Node 22.
- SDK copies identical to canonical (wallet, login, redirect, world agent/provision). `lib/apixis-world.ts` one revision behind Apixis.dev like every site.
- Advisors: RLS-no-policy INFO ×8 (`magic_links`, `track_unlocks`, `pricing_tiers`, … — service-role tables, intended); `current_app_user_id()` and `current_org_ids()` are SECURITY DEFINER and executable by anon + authenticated (RLS helpers; revoke from anon unless a policy needs it); leaked-password WARN.
- The BullMQ worker is a separate process and is not deployed anywhere Claude can see.

### Done (live)
Public catalog (search, metadata, lyrics, `/add` + bulk CSV), login (Apixis ID, magic link, password, reset), upload → process → 30 s preview → unlock via the Wallet (`lyrixis.track.unlock`, 300 Ixis) → versioned corrections → TXT/SRT/LRC/JSON exports, server-side pricing tiers, enterprise page + waitlist, Cixy, support intake, world agent, CI.

### Open — needs Awad
- `REDIS_URL`, `TRANSCRIPTION_API_KEY` (+ provider / base URL / model) and a HOST for `npm run worker` (Railway, Fly or Render) with ffmpeg installed. Until then upload → transcript does nothing.
- PRs #14 and #16.
- `LYRIXIS_SKUS.md` proposes four more SKUs (starter / pro / enterprise monthly, custom export) that are not in the Wallet catalog — decide; only `lyrixis.track.unlock` exists.
- README mentions Google sign-in as a provider — is it configured in Supabase Auth?

### Open — Claude can do on your go
- `app/companies/page.tsx` links Ominix to `nexxis-tau.vercel.app` (retired host).
- Revoke anon EXECUTE on the two helper functions above after checking the policies.
- WORKBOARD still carries "in review … 200 in-world Ixis" lines (archive per D15, or clear them).
