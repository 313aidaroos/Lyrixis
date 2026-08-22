# LYRIXIS

Pay-per-song music intelligence platform.
Apixis Dev LLC (Illinois) · Lyrixis@Apixis.dev

**Principle:** One engine. Any catalog size. Pay per song.

---

## Files in this repo

| File | What it is |
|---|---|
| `index.html` | The live marketing site. Static, no backend, deployable right now. |
| `LYRIXIS_DEVELOPER_BRIEF.md` | Build spec for the developer and Cursor. Stack, pipeline, API, security, MVP scope. |
| `LYRIXIS_ARCHITECTURE_REVIEW.md` | Strategy + full data model + roadmap. Read after the brief. |
| `schema.sql` | PostgreSQL / Supabase migration. Run as `0001_init.sql`. |
| `.env.example` | Environment variables. Copy to `.env.local` and fill in. Never commit `.env.local`. |

---

## Launch the site today (10 minutes, no developer needed)

1. Buy the domain (Namecheap or similar).
2. Go to **netlify.com** → sign up → "Add new site" → "Deploy manually".
3. Drag `index.html` into the upload box.
4. Site Settings → Domain management → add your domain, follow the DNS steps.

Done. The site works with no backend. Every button opens an email to Lyrixis@Apixis.dev.

---

## Developer: start here

1. Read `LYRIXIS_DEVELOPER_BRIEF.md` **in full** before writing code.
2. Read `LYRIXIS_ARCHITECTURE_REVIEW.md` sections 5, 6, 7 (data model, processing, API).
3. Create the Supabase project. Run `schema.sql` as the first migration.
4. Apply the corrections in Review §5 — the `recordings`, `releases`, `release_tracks`,
   `metadata_claims` and `validation_results` tables replace a track-only model.
5. Scaffold Next.js + TypeScript + Tailwind.
6. Build **only** the MVP list in Brief §8. Nothing from the deferred list.

**Cursor kickoff prompt is in Brief §11.** Paste it as the first message.

---

## Non-negotiables

- Pricing is calculated **server-side**, read from the `pricing_tiers` table. Never hardcoded, never trusted from the frontend.
- Uploaded audio is **private**. Private bucket, signed expiring URLs, never public.
- Every upload requires `rights_confirmed = true`. Reject the request without it.
- AI-generated metadata **never** overwrites label-provided metadata. Stored separately, compared, conflicts reported.
- Corrections create a new version. Never destructively update a transcription.
- No button that does nothing. If a feature isn't finished, hide it or label it "Coming soon".
- Before any feature is called done: `npm run lint && npm run typecheck && npm run build` all clean.

---

## Definition of "MVP complete"

A person can sign up, upload one song, watch it process, see synced lyrics, fix a wrong
line, pay $2.99, and download SRT + LRC + JSON. That's it. Ship that, then talk to
customers before building anything else.
