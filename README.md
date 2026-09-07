# Lyrixis

Pay-per-song music intelligence. Apixis Dev LLC · Lyrixis@Apixis.dev

This repository contains the static marketing site and the MVP web app + worker from [LYRIXIS_DEVELOPER_BRIEF.md](./LYRIXIS_DEVELOPER_BRIEF.md) §8.

## What ships in the MVP

A person can sign up, upload one song (with rights confirmation), watch it process, preview the first 30 seconds of synced lyrics, pay $2.99, correct a line (versioned), and download TXT / SRT / LRC / JSON.

Deferred (schema only): public API keys UI, batch upload, org admin, translation, TTML/VTT/CSV, balance top-ups.

## Architecture

| Piece | Where it runs |
|---|---|
| Marketing (`public/index.html`) | Static, rewritten to `/` |
| Next.js App Router | Vercel (or `npm run dev`) — auth, dashboard, upload, Stripe, APIs |
| BullMQ worker (`npm run worker`) | **Separate long-running process** (Railway / Fly / Render / local). Not Vercel serverless. |
| Postgres + Auth + private Storage | Supabase |
| Queue | Redis |
| Transcription | Env-selected provider (`TRANSCRIPTION_PROVIDER=whisper_v3`) |

Pricing is read from `pricing_tiers` on the server. The frontend never calculates a charged price. Single-track jobs use job size = 1 (the $2.99 tier unless an org `custom_rate_cents` is set).

## Local setup

### 1. Install

```bash
npm install
cp .env.example .env.local
```

Copy the same values into `.env` for the worker, or keep using `.env.local` (the worker loads both).

Install **ffmpeg** on the machine that runs the worker (`ffmpeg -version`).

### 2. Supabase

1. Create a project.
2. Run `database/migrations/0001_init.sql` in the SQL editor (creates tables, seeds `pricing_tiers`, RLS, auth → `public.users` trigger, private bucket `lyrixis-audio-private`). Then run `database/migrations/0002_enterprise_leads_source.sql` (adds `enterprise_leads.source` for the marketing waitlist).
3. Auth → enable Email and Google. Add redirect URL `{APP_URL}/auth/callback`.
4. Copy project URL, anon key, and **service role** key into `.env.local`.
5. Confirm Storage bucket `lyrixis-audio-private` is **private**.

### 3. Redis

Run Redis locally (`redis-server` or Docker) and set `REDIS_URL=redis://127.0.0.1:6379`.

### 4. Stripe

1. Use test keys (`sk_test_…`).
2. `STRIPE_PRICE_SINGLE_TRACK` is the TEST Price ID for **Lyrixis Single Track Unlock** (`prod_VDM9sVq3P1cxel`, $2.99). Checkout uses this Price; the server still quotes `pricing_tiers` and refuses to start Checkout if Stripe's amount does not match the DB.
3. `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
4. Put the webhook signing secret in `STRIPE_WEBHOOK_SECRET`. Never commit `STRIPE_SECRET_KEY` or the webhook secret.
5. Never mark a track paid from the client. Unlock happens only in the verified webhook.
6. Swap `STRIPE_PRICE_SINGLE_TRACK` to the live Price ID before production. Balance top-ups are deferred.

### 5. Transcription provider

Set a real key. There is no mock path.

```bash
TRANSCRIPTION_PROVIDER=whisper_v3
TRANSCRIPTION_API_KEY=sk-...
# Optional Groq-compatible:
# TRANSCRIPTION_API_BASE_URL=https://api.groq.com/openai/v1
# TRANSCRIPTION_MODEL=whisper-large-v3
LANGUAGE_PROVIDER=whisper
```

`costCents` is computed from the **actual audio duration sent to the vendor** × `TRANSCRIPTION_CENTS_PER_MINUTE` (OpenAI Whisper published rate is $0.006/min = 0.6 cents/minute). Override the rate env if you use another vendor.

If `TRANSCRIPTION_API_KEY` is missing, the job fails with a clear error.

### 6. Run

Two processes:

```bash
npm run dev          # http://localhost:3000  (marketing at /, app at /login)
npm run worker       # BullMQ consumer
```

Then: Sign in → Upload → wait for status → preview → Pay → exports.

## Marketing waitlist

The enterprise / early-access form on `public/index.html` posts JSON to `POST /api/waitlist`. The route validates that **work email is required**, rate-limits lightly by IP, and inserts a row into `enterprise_leads` with the service role (`source = waitlist`). Secrets stay on the server; the static page only calls `/api/waitlist`.

Hero **Request early access**, **Start a catalog pilot**, **Talk to Lyrixis**, and footer **Enterprise sales** jump to that form. Other `mailto:` links (direct line, API access, legal) are unchanged.

Query new leads in Supabase:

```sql
select id, name, company, work_email, track_count, use_case, source, created_at
from enterprise_leads
order by created_at desc;
```

### Quality checks

```bash
npm run lint && npm run typecheck && npm run build
```

## Production credentials still required

Nothing in this repo talks to live vendors without keys. Before a paying-customer deploy you need:

| Secret / service | Used for |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Auth, DB, Storage |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser + SSR auth |
| `SUPABASE_SERVICE_ROLE_KEY` | Worker + privileged API (never expose to the browser) |
| `STRIPE_SECRET_KEY` | Checkout Sessions (never commit) |
| `STRIPE_WEBHOOK_SECRET` | Signed webhook verification (never commit) |
| `STRIPE_PRICE_SINGLE_TRACK` | Catalog Price ID for single-track unlock |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Optional Stripe.js; hosted Checkout does not require it |
| `REDIS_URL` | Queue + upload rate limit |
| `TRANSCRIPTION_API_KEY` | Whisper (or OpenAI-compatible) transcription |
| Worker host with **ffmpeg** | Audio normalize to 16 kHz mono WAV |
| `APP_URL` | Stripe success/cancel + OAuth redirects |

Google OAuth also needs the client ID/secret configured **inside the Supabase dashboard**, not in this repo.

Deploy the Next.js app to Vercel. Deploy `npm run worker` on a VM/container platform. Do not run the audio pipeline on Vercel Functions.

## Docs

| File | Purpose |
|---|---|
| `LYRIXIS_DEVELOPER_BRIEF.md` | Build spec (source of truth) |
| `LYRIXIS_ARCHITECTURE_REVIEW.md` | Strategy; do not expand MVP past brief §8 |
| `schema.sql` | Original schema; applied as `database/migrations/0001_init.sql` |
| `database/migrations/0002_enterprise_leads_source.sql` | Additive `enterprise_leads.source` for waitlist |
| `public/index.html` | Marketing site (Cursor-built look preserved) |
