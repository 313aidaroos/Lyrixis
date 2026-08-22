# LYRIXIS — Developer & Cursor Brief

**Product:** pay-per-song music intelligence platform.
**Owner:** Apixis Dev LLC (Illinois). Contact: Lyrixis@Apixis.dev
**Principle:** One engine. Any catalog size. Pay per song.

This document is the source of truth for the build. `schema.sql` is the database
migration. `index.html` is the live marketing site (already deployable, no backend).

---

## 0. What is already done

| Asset | State |
|---|---|
| Marketing site (`index.html`) | Done. Static, deployable today. No fake product buttons. |
| Database schema (`schema.sql`) | Done. Run as migration `0001_init.sql`. |
| Pricing model | Defined, stored in `pricing_tiers`, editable from admin. Never hardcode. |
| Backend | Not started. This document specifies it. |

The site deliberately contains **no upload button that pretends to work.** All CTAs
route to email until the real pipeline exists. Do not add a fake upload flow.

---

## 1. Stack

- **Next.js 14+ (App Router) + TypeScript + Tailwind** — web app and REST API
- **Supabase** — Postgres, Auth (email/password + Google), private Storage buckets
- **Stripe** — single-track checkout, balance top-ups, invoices later
- **Redis + BullMQ** — job queue
- **A long-running worker process** (Railway / Fly.io / Render) — **not** Vercel serverless.
  Audio processing exceeds serverless limits. Vercel hosts the web app only.

```
/app            routes + pages
/components     UI
/lib            utils, supabase client, auth helpers
/services       business logic (pricing, billing, exports, tracks)
/providers      swappable AI provider adapters
/workers        BullMQ processors (separate deployable)
/app/api        REST endpoints
/types          shared TS types
/database       migrations + seeds
```

---

## 2. Provider abstraction — do this before anything else

Never call a model vendor directly from a route or worker. Every AI dependency goes
behind an interface so the vendor can be swapped without touching the app.

```ts
// /providers/types.ts
export interface TranscriptionProvider {
  name: string;
  transcribe(input: { audioPath: string; languageHint?: string }): Promise<{
    text: string;
    lines: { text: string; startMs: number; endMs: number; confidence: number }[];
    words: { text: string; startMs: number; endMs: number; confidence: number; lineIndex: number }[];
    language: string;
    languageConfidence: number;
    costCents: number;   // REQUIRED. Real cost from provider usage. Never estimated.
  }>;
}

export interface AlignmentProvider  { align(...): Promise<WordTiming[]> }
export interface LanguageProvider   { detect(...): Promise<{ language: string; dialect?: string; confidence: number; dialectConfidence?: number }> }
export interface TranslationProvider{ translate(...): Promise<{ lines: string[]; costCents: number }> }
export interface AudioAnalysisProvider { analyze(...): Promise<{ sections: Section[]; vocalRegions: Region[] }> }
```

Selected via env: `TRANSCRIPTION_PROVIDER=whisper_v3`, etc. A registry in
`/providers/index.ts` maps the env string to the implementation.

**Every provider method must return `costCents` derived from actual usage.**
Unit economics are worthless if costs are guessed.

---

## 3. Processing pipeline

Upload returns immediately with a `track_id`. Everything else is queued.

```
1  validate      MIME + magic bytes + size cap + duration cap
2  store         private bucket, sha256 recorded, signed URLs only
3  normalize     ffmpeg → 16kHz mono wav for the model
4  separate      (optional) vocal isolation — improves music transcription a lot
5  transcribe    TranscriptionProvider
6  language      LanguageProvider (language + dialect + confidences)
7  align         forced alignment → word-level timestamps
8  sections      AudioAnalysisProvider → intro/verse/chorus/…
9  explicit      wordlist + classifier → clean | explicit | possibly_explicit
10 confidence    per-word, per-line, per-track roll-up
11 exports       generate txt/json/csv/srt/lrc/vtt/ttml, store in bucket
12 costs         write track_costs from real provider usage
13 complete      status='completed', fire webhook, realtime notify frontend
```

Each step is a row in `processing_jobs`. Steps are individually retryable.
Any step failing 3× → `status='failed'` with a readable `error_message`.
Low overall confidence → `status='manual_review'`, not `failed`.

Concurrency: cap worker concurrency by provider rate limit, not by CPU. A 10,000-track
batch must not exhaust the API quota of a paying enterprise customer running alongside it.

---

## 4. Pricing — server-side only

**The frontend never calculates a price that is charged.** The calculator on the
marketing page is an estimate and is labelled as such.

```ts
// /services/pricing.ts
async function quote(userId: string, songCount: number) {
  const org = await getOrg(userId);
  if (org?.custom_rate_cents) return org.custom_rate_cents * songCount;
  const tier = await db.pricing_tiers.findActive(songCount); // from DB, not code
  return tier.rate_cents * songCount;
}
```

Tier is determined by **the size of the job being submitted**, not lifetime volume,
unless an org agreement says otherwise. Decide this explicitly and document it —
it materially changes revenue and customers will ask.

Payment paths:
- **Single track:** upload → process → preview (first 30s of lyrics, watermarked) → pay $2.99 → unlock full result + exports.
- **Balance:** top up $10/$25/$50/$100/$500/$1,000 → processing decrements `balance_cents`.
- **Enterprise:** invoiced. `custom_rate_cents` on the organization.

Stripe webhooks must verify signatures. Never mark `tracks.paid = true` from a client call.

---

## 5. API contract

Auth: `Authorization: Bearer lyx_live_…`. Key is sha256-hashed in `api_keys.key_hash`.
Full key returned **once** at creation and never retrievable again.

| Method | Path | Notes |
|---|---|---|
| POST | `/v1/tracks` | multipart audio + metadata + `rights_confirmed=true` → `{track_id, status}` |
| POST | `/v1/tracks/batch` | array of upload URLs or multipart set → `{batch_id, total}` |
| GET | `/v1/tracks/{id}` | full intelligence package |
| GET | `/v1/tracks/{id}/exports?format=ttml` | signed download URL |
| POST | `/v1/translations` | `{track_id, target_language}` → queued job |
| GET | `/v1/usage` | volume, spend, current tier |
| POST | `/v1/webhooks` | register signed callback |

`rights_confirmed` is **required** on every upload. Reject the request without it.
Store the timestamp. This is the legal record.

Rate limit per API key. Log every call to `api_usage`.

---

## 6. Results page requirements

- Header: artwork, title, artist, duration, language + dialect, status, overall confidence.
- Tabs: Lyrics · Synced · Translation · Structure · Metadata · Exports.
- Synced view: real audio player, word highlights as it plays, click a word to seek.
- Every line editable inline. Autosave on blur.
- **Corrections create a new `transcriptions` row (version + 1) and flip `is_current`.**
  Never destructively update. Corrected versions are the most valuable asset the
  company accumulates.
- Low-confidence lines (< 0.80) visually flagged.

---

## 7. Security checklist

- Private storage buckets. Signed, short-lived URLs. Audio is never publicly reachable.
- RLS on every user-facing table (see `schema.sql`). Workers use the service role.
- MIME + magic-byte validation, file size cap, duration cap.
- API keys hashed, never logged.
- Stripe + inbound webhook signature verification.
- Rate limiting on upload and API.
- `audit_logs` row for: login, upload, correction, export, payment, key create/revoke, pricing change, deletion.
- Secure deletion workflow: purge audio + derived files + storage objects, retain the audit row.

---

## 8. MVP scope — ship this, nothing more

1. Auth (email/password + Google)
2. Single upload with rights confirmation
3. Private storage
4. Transcription + language ID
5. Synced lyric view with word timing
6. Inline correction with versioning
7. Exports: TXT, SRT, LRC, JSON
8. Stripe single-track payment ($2.99)
9. Dashboard: track list + status
10. Job queue + worker

**Deferred until a customer asks and pays:** public API, batch upload, admin dashboard
(use the Supabase table editor), organizations, translation, transliteration, human
verification, TTML/VTT/CSV, credits/balance.

Build the *schema* for all of it now — it's already in `schema.sql`. Build the
*features* only when someone pays for them.

---

## 9. Definition of done, per feature

```
npm run lint && npm run typecheck && npm run build   # all clean
```
- No `any` left in touched files.
- No mock data behind a shipped endpoint.
- No button that does nothing. If it isn't finished, hide it or label it "Coming soon".
- `.env.example` updated. No secrets committed.
- Migration written and applied.
- README updated with setup steps.

---

## 10. Environment

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

REDIS_URL=

TRANSCRIPTION_PROVIDER=whisper_v3
TRANSCRIPTION_API_KEY=
ALIGNMENT_PROVIDER=
TRANSLATION_PROVIDER=
AUDIO_ANALYSIS_PROVIDER=

STORAGE_BUCKET=lyrixis-audio-private
MAX_UPLOAD_MB=100
MAX_DURATION_SECONDS=900
APP_URL=https://lyrixis.com
```

---

## 11. Cursor kickoff prompt

> Read `LYRIXIS_DEVELOPER_BRIEF.md` and `schema.sql` in full before writing any code.
>
> First, inspect the existing repository and report back: framework and version, existing
> routes, components, database tables, auth setup, and styling approach. Do not modify
> anything yet. Do not replace working code.
>
> Then produce a written implementation plan for **section 8 (MVP) only**, ordered by
> dependency, with a TODO list I can approve. Flag anything in the brief that conflicts
> with what's already in the repo.
>
> Once I approve the plan, implement one item at a time. After each item run lint,
> typecheck and build, and fix all errors before moving on. Do not scaffold features
> from the deferred list. Do not create placeholder UI that appears functional.

---

## 12. The commercial risk, stated plainly

Before publishing the volume rates as contractual, process 20 real songs end to end
and read `track_costs`. If true cost per song lands near $0.30, the $0.40 and $0.20
tiers are loss-making on exactly the volume enterprise buyers purchase. The site
labels these rates as introductory for that reason. **Confirm real unit cost before
signing anything above 1,000 tracks.**

Second: synced lyric delivery into streaming platforms runs through existing
licensing relationships. A label will ask whether platforms accept Lyrixis output.
Until that answer is yes, sell **catalog enrichment and internal search/QA**, which
needs no third-party acceptance.
