# Wiring Cixy voice recommendations (not wired yet — by design)

Awad: Cixy **may recommend** voices; **do not edit Cixy prompt files** (`lib/cixy-prompt.ts`). So Lyrixis Voices ships
a read-only endpoint and this note; whoever owns Cixy wires it.

## Endpoint
`GET /api/voices/recommend?text=&language=ar&dialect=ar-gulf-sa&use=ads&tone=warm&limit=5`
→ `{ voices: [{ slug, name, name_ar, dialects, tones, uses, from_ixis, is_demo, url, score }], note }`.
Read-only, no auth needed, no PII, no provider refs, only `active` voices. Returns 404 when Voices is closed
(production without `VOICES_LIVE=true`). Server-side callers can use `getVoices().recommend({...})` directly.

## Suggested wiring (for the Cixy owner)
1. Add a tool `recommend_voices({ text?, language?, dialect?, use?, tone? })` in the Cixy tool layer
   (`app/api/cixy/route.ts`) that calls `svc.recommend(...)`. Only when `voicesOpen()`.
2. Cixy shows at most 3 results as links to `/voices/<slug>` and says pricing is "from N Ixis".
3. Cixy must **never** license, generate, or spend Ixis — the user does that on the voice page (declared use,
   terms, receipt). Cixy's own native voice is not a marketplace voice.
4. `recommend()` already returns only voices whose creator turned on **"Allow Lyrixis assistants (Cixy) to
   recommend this voice"** (`assistant_use`, default off).
