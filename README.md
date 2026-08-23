# Lyrixis

Music metadata, lyrics, and catalog intelligence at scale.

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) → **Upload** → drop a song → get synced lyrics and exports back.

### Optional: real transcription

Set `OPENAI_API_KEY` or `TRANSCRIPTION_API_KEY` in `.env.local` for Whisper-powered transcription. Without it, demo lyrics are generated from track metadata.

### Optional: email results

```bash
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SUPPORT_EMAIL=Lyrixis@Apixis.dev
APP_URL=http://localhost:3000
```

## Docs

| File | Purpose |
|---|---|
| `LYRIXIS_DEVELOPER_BRIEF.md` | Full build spec |
| `LYRIXIS_ARCHITECTURE_REVIEW.md` | Strategy + data model |
| `schema.sql` | PostgreSQL migration for Supabase |
| `public/index-marketing.html` | Static marketing site |
