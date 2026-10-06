# Socixis ↔ Lyrixis Voices — partner API (Lyrixis side)

Scope (Awad, 2026-10-04): **Lyrixis builds the API and contract only.** Nothing in the Socixis repo was changed.
Base: `https://<lyrixis-host>/api/v1/voices` · version header in responses: `api_version: 2026-10-01`.

## Auth & tenancy
- `Authorization: Bearer lyxv_socixi_…` — created by a workspace owner/admin in **/voices/workspace → API keys**.
  Shown once; stored as a SHA-256 hash (`voice_api_keys`). Revocation: set `revoked_at` (admin).
- One key = one Lyrixis workspace (one Socixis org). If the workspace has `socixis_org_id`, every call must send
  `X-Socixis-Org: <that id>` or gets `403 org_mismatch`.
- Calls act as the user who created the key: Wallet charges go to that user's Apixis Wallet; invite-only applies.
- Scopes: `voices:read`, `voices:audition`, `projects:write`, `generations:write`, `generations:read`, `receipts:read`.

## Endpoints
| Method & path | Scope | Notes |
| --- | --- | --- |
| `GET /voices?q=&language=&dialect=&use=&tone=` | voices:read | Discovery. No provider refs, no PII. |
| `GET /voices/{slug}` | voices:read | Preview: permissions, approved samples (signed URLs, 5 min). |
| `POST /auditions` `{voice_id, text}` | voices:audition | ≤15s; 5 free/business/day then 25 Ixis. |
| `POST /projects` `{name}` | projects:write | 201. |
| `POST /eligibility` `{voice_id, request}` | voices:read | `{eligible, price_ixis, billed_seconds, approval_required, …}` or `{eligible:false, reason}`. |
| `POST /generations` `{voice_id, request, funding?}` + `Idempotency-Key` | generations:write | 202, queued. |
| `GET /generations/{id}` | generations:read | `{status, job_status, error}` — poll. |
| `GET /generations/{id}/output` | generations:read | `{url, expires_in: 300}` once `fulfilled`. |
| `GET /receipts/{id}` | receipts:read | Frozen terms snapshot, hash, summary, legal note. |

`request` = `{script, declared_use, channels[], publication, territory, term_months, project_id?}`.
`funding` = `"wallet"` (default) or `"allowance"`.

## Idempotency
`POST /generations` requires `Idempotency-Key` (8–64 chars `[A-Za-z0-9_-]`). Stored per workspace in
`voice_idempotency` with a hash of the canonical body: same key + same body → stored response with `replayed: true`;
same key + different body → `409 idempotency_conflict`. The purchase is also idempotent internally, so retries can
never double-charge.

## Status lifecycle
`pending_approval → approved → (pay) → payment_held → fulfilled` or `awaiting_payment → payment_held → fulfilled`;
failures end in `failed_released` (Wallet hold released, never charged). Approval-required voices return
`pending_approval` and Socixis must send the user to the Lyrixis receipt page to pay after approval (no API pay
call yet — deliberate, so the creator gate can't be skipped by a partner).

## Errors
JSON `{error, message}`: 400 `bad_request|idempotency_key_required`, 401 `invalid_key`, 402 `insufficient_ixis`,
403 `insufficient_scope|org_mismatch|invite_only|voice_unavailable|use_blocked…`, 404, 409, 429, 503 `provider_unavailable`.

## Metrics (AWAD COMMAND)
`GET /api/v1/voices/metrics` with `Authorization: Bearer $AWAD_COMMAND_METRICS_KEY` → aggregate counts only
(no scripts, emails, names; demo rows excluded).

## Example client
See [`socixis-client.example.ts`](socixis-client.example.ts). Tests: `lib/voices/__tests__/api.test.ts`.

## Open (Socixis side, not done)
Store the key in Socixis secrets, map Socixis org → `socixis_org_id`, UI for picking voices, polling worker.
