# Setup & deploy

## Env vars (see `.env.example`; no secrets in git)
| Var | Where | Purpose |
| --- | --- | --- |
| `VOICES_DATA_MODE` | local/preview | `demo` (default off-production) or `live`. Production is always live. |
| `VOICES_LIVE` | production | `true` opens /voices in production. Leave unset until the launch checklist is done. |
| `VOICES_INVITE_ONLY` | all | default on; `false` opens to every signed-in user. |
| `VOICES_SIGNING_SECRET` | production | 32+ chars; HMAC for file links (required in production). |
| `ELEVENLABS_API_KEY` | live | enables the ElevenLabs adapter. Unset = live voices can't generate (no fallback). |
| `ELEVENLABS_MODEL_ID` | live | default `eleven_multilingual_v2`. |
| `ELEVENLABS_USD_PER_1K_CHARS` | live | provider cost used in the creator-share base (default 0.10). |
| `ELEVENLABS_API_BASE` | optional | default `https://api.elevenlabs.io`. |
| `CRON_SECRET` | live | protects `/api/voices/jobs/run`. |
| `AWAD_COMMAND_METRICS_KEY` | optional | bearer for `/api/v1/voices/metrics`. |
| `NEXT_PUBLIC_VOICES_NAV` | production | `true` shows the "Voices" link in SiteNav (previews show it automatically). |

Wallet (`WALLET_API_KEY`, `APIXIS_WALLET_API_URL`) and Supabase vars are the existing ones.

## Database
Migration `database/migrations/0006_lyrixis_voices.sql` (rollback in `rollback/`). **Not applied anywhere.**
Local test: `PGHOST=/tmp PGPORT=54329 PGUSER=postgres scripts/voices-db-test.sh` (throwaway local Postgres + a
Supabase shim; refuses Supabase hosts). Apply to production only with Awad's go-ahead (Supabase SQL editor or
`supabase db push`), then verify buckets are private.

## Wallet SKUs (Wallet lead must register)
`lyrixis.voice.generate.{60,90,120,150,180,210,240,270,300}s` (500, 750 … 2,500 Ixis), `lyrixis.voice.audition`
(25), and later `lyrixis.voice.solo.monthly`, `lyrixis.voice.label.monthly`, `lyrixis.voice.overage.solo|label`,
`lyrixis.voice.custom`. The service refuses to charge if the Wallet price ≠ the frozen quote.

## Worker
Add a cron (Vercel Cron, every minute) → `GET /api/voices/jobs/run` with `Authorization: Bearer $CRON_SECRET`.
Not added to `vercel.json` in this PR to avoid touching production config. UI purchases run inline; partner
(Socixis) generations are queued and need the cron.

## Checks
`npm run typecheck && npx vitest run && npm run build`, plus the DB script above.
