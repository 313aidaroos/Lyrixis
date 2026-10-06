# Lyrixis upload worker: hosting

> **2026-10-05 ~9:10 PM CT (Grok): Option B is live — this worker is now optional.** Awad chose to run the pipeline inside Vercel: `POST /api/tracks` (upload finalize) and `POST /api/tracks/:id/retry` call `processTrack` via Next `after()` with `maxDuration = 300` (Hobby + Fluid compute). ffmpeg is the bundled `ffmpeg-static` binary; audio goes to OpenAI `whisper-1` as 16 kHz mono MP3 64k. No Redis and no Railway are needed, and uploads are rate-limited by a DB row count. Everything below still works as **Option A**: set `PROCESSING_MODE=queue` and `REDIS_URL` on Vercel, and deploy this worker.

> **2026-10-05 ~8:45 PM CT update (Grok): transcription is OpenAI, not Groq.** Groq didn't work for Awad; he supplied an OpenAI key. Use `TRANSCRIPTION_API_KEY=<OpenAI key>`, leave `TRANSCRIPTION_API_BASE_URL` unset (defaults to `https://api.openai.com/v1`), `TRANSCRIPTION_MODEL=whisper-1`, `TRANSCRIPTION_CENTS_PER_MINUTE=0.6`. `whisper-1` is the only OpenAI model that returns word + segment timestamps (`gpt-4o-transcribe` / `gpt-4o-mini-transcribe` don't), so it's required for synced lyrics. OpenAI's 25 MB per-request limit means the 16 kHz mono WAV must stay ≤ ~13 min; `MAX_DURATION_SECONDS` now defaults to 720 in code. Groq mentions below are historical.

Written 2026-10-04 (CT) by Grok (Lyrixis Lead). Every paid or account step waits for Awad's approval.

**Status 2026-10-05 8:30 PM CT (Awad approved Railway + Upstash Free + Groq at 8:00 PM CT):** Railway project `lyrixis-worker` (`b40a5741-8d83-40e1-bb43-2dd464866304`), env `production` (`61c39fc8-2c24-415e-87bf-f347e832c43a`), service `worker` (`653f58ed-e1fd-4596-81f0-aa3ca8e22dce`) exist with **no source connected and no deployment**. Service settings mirror `railway.json` (Dockerfile path, watch patterns, restart ON_FAILURE ×10, 1 replica) plus a 1 vCPU / 1 GB limit, because Railway's API now rejects `railwayConfigFile` (Config as Code is deprecated). Supabase + non-secret worker vars are set; `REDIS_URL` and `TRANSCRIPTION_API_KEY` are not. The Railway workspace is still on a trial with no subscription, so the $20 hard usage limit can't be set yet ("Usage limits require an active subscription"). Redis: the team already has an unused **Upstash for Redis Free** store `upstash-kv-teal-marble` (`store_PP9Mt0uHl6hab9zV`, iad1, eviction off) on Vercel. The Free plan allows one database per account, so use that store (connect it to `lyrixis`). Don't create a new one.

## Why uploads don't process today

`POST` upload → `services/tracks.ts` stores the file in Supabase Storage, then `enqueueTrackProcessing()` (`lib/queue.ts`) adds a BullMQ job to the **`track-processing`** queue (job name `process`, jobId `track-<trackId>`, 3 attempts, exponential backoff 8 s). A separate long-running process (`workers/index.ts`) must consume that queue. Today:

- `REDIS_URL` is not set on Vercel, so uploads fail at the upload rate limit / enqueue step, and `lib/rate-limit.ts` falls back to per-instance in-memory Maps for the Cixy, waitlist and catalog limits.
- No worker is running anywhere. It can't run on Vercel: it's a blocking consumer that needs ffmpeg and runs for minutes per track.
- `TRANSCRIPTION_API_KEY` is not set, so even a running worker would fail at the `transcribe` step.

## What the worker needs

| Need | Detail (from code) |
| --- | --- |
| Entrypoint | `workers/index.ts` → `processTrack()` in `workers/pipeline.ts`. Build: `npm run worker:build` (esbuild → `dist/worker.mjs`), run: `npm run worker:start`. |
| Queue | `track-processing`, concurrency 2 (`WORKER_CONCURRENCY`). |
| Steps | validate (magic bytes, `music-metadata` duration ≤ `MAX_DURATION_SECONDS`) → store → normalize (ffmpeg → 16 kHz mono PCM WAV, uploaded back to storage) → transcribe → language → align (optional) → costs → complete. |
| Audio tools | **ffmpeg** on PATH (installed in `Dockerfile.worker`). |
| Transcription | `TRANSCRIPTION_PROVIDER=whisper_v3` (the only adapter). Any OpenAI-compatible `/audio/transcriptions` API that returns `verbose_json` with word + segment timestamps. Defaults: base `https://api.openai.com/v1`, model `whisper-1`. Groq works via `TRANSCRIPTION_API_BASE_URL=https://api.groq.com/openai/v1`. Language ID reuses the transcription result (no extra call); alignment reuses Whisper word timings. |
| Memory | Each job holds the original upload (≤ `MAX_UPLOAD_MB`, default 100 MB) plus the WAV (~1.9 MB per audio minute) and a copy of it for the HTTP upload. Rough peak: ~300 MB per 100 MB job, so ~0.7 GB with 2 concurrent worst-case jobs; idle ~120–180 MB. Cap at **1 GB**. |
| CPU | ffmpeg resampling, a few seconds per track. **1 vCPU** is plenty; idle is near 0. |
| Disk | Temp files in `os.tmpdir()`, deleted after each job. No volume. |
| Network | Outbound only (Redis, Supabase, transcription API). No public port. |

### Known gotchas

1. **`npm run worker` (tsx) crashes at startup** on Node 20 and 22 with `ERR_PACKAGE_PATH_NOT_EXPORTED` for `file-type` (an ESM-only dependency of `music-metadata`, loaded through CJS). Use `npm run worker:build && npm run worker:start` (an ESM bundle). `Dockerfile.worker` does this.
2. **25 MB transcription file limit.** OpenAI and Groq (free tier) reject files over 25 MB. The normalized WAV is ~1.92 MB/min, so audio over ~13 min fails at `transcribe`. Default `MAX_DURATION_SECONDS=900` (15 min) is above that, so **set `MAX_DURATION_SECONDS=720`** on both Vercel and the worker until the pipeline sends FLAC/MP3 instead of WAV (a separate code change).
3. **Upstash command metering.** An idle BullMQ worker keeps polling Redis: by default a `BZPOPMIN` every 5 s plus a job fetch, and a stalled-job check every 30 s. That's roughly 37K commands/day, or ~1.1M/month, which is over Upstash's free 500K/month. Set `WORKER_DRAIN_DELAY_SEC=60` and `WORKER_STALLED_INTERVAL_MS=300000` (~3K commands/day, ~95K/month). New jobs still start right away because `Queue.add` wakes the blocking pop.

## Recommended stack (cheapest that's still reliable)

| Piece | Choice | Why |
| --- | --- | --- |
| Redis | **Upstash for Redis via Vercel Marketplace** (`upstash/upstash-kv`), Free plan, region `us-east-1` (Vercel functions run in `iad1`) | Free 256 MB + 500K commands/month. Billing goes through Vercel. TLS `rediss://` URL works with ioredis/BullMQ as-is. |
| Worker host | **Railway** (Docker service from this repo, `railway.json` → `Dockerfile.worker`) | Awad already runs the `awad-command` worker on Railway. Per-second billing, so an idle worker costs about $1–2/month of usage. |
| Transcription | **Groq `whisper-large-v3`** through the existing `whisper_v3` adapter (OpenAI `whisper-1` is the fallback) | Same API shape. It's the actual Whisper v3 model, $0.111/audio-hour vs OpenAI's $0.36/hour, and Groq's free tier covers launch volume (28.8K audio-sec/day). |

## Environment variables

### Worker (Railway service)

```
NEXT_PUBLIC_SUPABASE_URL=https://mkuvgkjakxkytscfvnkf.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<same as Vercel>
STORAGE_BUCKET=lyrixis-audio-private
REDIS_URL=rediss://default:<password>@<host>.upstash.io:6379
TRANSCRIPTION_PROVIDER=whisper_v3
TRANSCRIPTION_API_KEY=<OpenAI key>
TRANSCRIPTION_MODEL=whisper-1
TRANSCRIPTION_CENTS_PER_MINUTE=0.6
LANGUAGE_PROVIDER=whisper
MAX_UPLOAD_MB=100
MAX_DURATION_SECONDS=720
WORKER_CONCURRENCY=2
WORKER_DRAIN_DELAY_SEC=60
WORKER_STALLED_INTERVAL_MS=300000
```

(`ALIGNMENT_PROVIDER` stays unset, which keeps the transcription word timings. `LANGUAGE_API_KEY` is optional and falls back to `TRANSCRIPTION_API_KEY`.)

For OpenAI instead of Groq: drop `TRANSCRIPTION_API_BASE_URL`, set `TRANSCRIPTION_MODEL=whisper-1`, `TRANSCRIPTION_CENTS_PER_MINUTE=0.6`. (`gpt-4o-transcribe` / `gpt-4o-mini-transcribe` don't return word timestamps, so don't use them with this adapter.)

### Vercel (`lyrixis`, Production)

```
REDIS_URL=<same rediss:// URL as the worker>
MAX_DURATION_SECONDS=720
```

The Upstash Marketplace integration injects its own variables (`KV_URL`, `KV_REST_API_URL`, `KV_REST_API_TOKEN`, … and `REDIS_URL` on recent installs). The code reads only `REDIS_URL`. If the integration doesn't create it, add `REDIS_URL` with the `rediss://` value of `KV_URL`. The Vercel app doesn't need `TRANSCRIPTION_*`.

## Deploy steps (after Awad approves)

1. **Upstash** (Awad / Developer Bot hub): Vercel dashboard → Storage / Marketplace → Upstash for Redis → Free plan → region us-east-1 → connect to project `lyrixis` (Production). Confirm `REDIS_URL` (or copy from `KV_URL`). Turn eviction off (Upstash default).
2. **OpenAI** (done 2026-10-05): Awad supplied an OpenAI API key (replaces the Groq plan).
3. **Railway** (Awad / hub): in the existing Railway workspace, New Service → GitHub repo `313aidaroos/Lyrixis`, branch `main`. Railway reads `railway.json` and builds `Dockerfile.worker`. Set the worker env vars above. Resource limit 1 vCPU / 1 GB. No public domain. The service only redeploys when `watchPatterns` paths change, so UI-only commits don't rebuild it.
4. Redeploy Vercel production so `REDIS_URL` takes effect.
5. **Smoke test:** Railway logs show `[worker] listening on queue "track-processing"`. Upload a short MP3 on lyrixis.vercel.app. In Supabase `processing_jobs`, each step for the track should go `succeeded`, and the track should end `completed` or `manual_review`.

Other hosts work with the same Dockerfile (Fly.io machine, Render background worker with a Docker runtime, any VPS with `docker run --env-file`). Render's native Node runtime has no ffmpeg, so use Docker there.

## Undo

- Railway: delete or stop the worker service. Jobs then sit in Redis; nothing is lost.
- Vercel: remove `REDIS_URL` and redeploy. Uploads go back to failing with "REDIS_URL is required", and rate limits fall back to memory.
- Upstash: uninstall the Marketplace integration / delete the database.
- Code: revert this PR (adds `Dockerfile.worker`, `.dockerignore`, `railway.json`, `worker:build`/`worker:start` scripts, opt-in `WORKER_*` env knobs in `workers/index.ts`, this doc, `.env.example` lines).
