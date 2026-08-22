# LYRIXIS — Architecture Review & Roadmap

Prepared as: senior music-industry product architect / enterprise SaaS strategist.
Companion documents: `LYRIXIS_DEVELOPER_BRIEF.md`, `schema.sql`, `index.html`.

---

# PART I — THE CRITIQUE

## 1. The best idea in your brief is not the one you're leading with

You describe Lyrixis as a lyrics transcription platform that also does metadata work.
That is backwards commercially.

Lyrics transcription is a **contested market with entrenched licensed incumbents**
(Musixmatch, LyricFind) whose moat is publisher relationships, not model quality.
You cannot out-license them from Peoria this year.

Metadata conflict detection is **an unowned problem that every catalog owner has and
almost nobody sells a clean product for.** Jaxsta does credits, DDEX does standards,
distributors do validation-at-ingest — but nobody hands a label a report saying
*"18,492 of your recordings have a stated language that contradicts the audio."*

**Reframe:** Lyrixis is a catalog intelligence and QA company. Lyrics are the highest-value
signal it extracts, not the product itself. This changes who you sell to, shortens the
sales cycle, and sidesteps the licensing gatekeepers entirely.

Keep "Music. Understood." — it survives the reframe. Drop nothing from the site. But
your **first sale** should be a QA finding, not a transcript.

## 2. Recording vs Track — a data-model error that will cost you a customer

Your brief lists "Recordings" and "Tracks" as separate concepts without defining the
difference. In industry terms:

- A **SoundRecording** is the asset. It has an ISRC. It is the thing lyrics belong to.
- A **Release** is a commercial product. It has a UPC.
- A **Track** is a *position of a recording within a release*. It has no independent identity.

One recording appears on the single, the album, the deluxe edition, three compilations,
and six regional variants. That's ten "tracks," one recording.

If you bill per track, you will charge a label ten times to process the same audio.
They will notice on the first invoice, and it will read as either incompetence or
sharp practice. Both are fatal in a first enterprise relationship.

**Fix:** the billable unit is a **unique recording**, deduplicated by ISRC *and* audio
fingerprint. Bill once, attach the result to every release that references it. Make
this an explicit selling point — "we don't charge you twice for the same master" is a
line that lands in a procurement meeting.

## 3. You cannot compute your own Catalog Health metrics without fingerprinting

Your example dashboard includes "12,114 duplicate-recording warnings." There is no way
to produce that number from metadata alone — duplicate recordings routinely have
different titles, different ISRCs (ISRC reissue is common and legal), and different
durations after mastering.

You need an acoustic fingerprint per recording. Chromaprint/AcoustID is the open
option; commercial options exist. This is a **required MVP component** for the QA
product and it is missing from your brief entirely.

It also solves ISRC validation: you correctly noted ISRC isn't reliably unique in bad
datasets. Fingerprint + ISRC together let you detect both collisions (same ISRC,
different audio) and duplicates (different ISRC, same audio). Those two findings alone
are worth a pilot.

## 4. Your DDEX list is half wrong

You listed ERN, MEAD, PIE, RIN, DSR. Ranked by actual relevance to Lyrixis:

| Standard | Verdict |
|---|---|
| **MEAD** (Media Enrichment and Description) | **This is your standard.** MEAD exists to carry exactly what Lyrixis produces — enrichment describing recordings. Design your output object to map cleanly to MEAD. |
| **ERN** (Electronic Release Notification) | Relevant as **ingestion only**. Labels will hand you ERN feeds to import catalog structure. You are not a distributor and will never emit ERN. |
| **PIE** (Party Identification and Enrichment) | Tangential. Matters if you enter contributor/credits data. Phase 3 at the earliest. |
| **RIN** (Recording Information Notification) | **Drop it.** RIN captures studio session data — who played what, in which room, on which take. That information does not exist in the audio file. You cannot generate it. Claiming RIN support would tell a knowledgeable label exec you don't know what RIN is. |
| **DSR** (Digital Sales Reporting) | **Drop it.** Royalty reporting. No relationship to your product. |

Also: DDEX standards require a licence agreement to implement. It is free at the
implementer level but it is a real legal step, and membership costs money at higher
tiers. Budget the time, don't be surprised by it.

**Correct strategy:** build a clean internal enrichment object now, with a documented
field-level mapping to MEAD written down but not implemented. When a customer asks for
MEAD, it's a two-week adapter, not a rewrite.

## 5. Displayed confidence scores are a credibility landmine

ASR models emit log-probabilities. Those are **not calibrated accuracy estimates.**
Whisper will report high confidence on a fluent, wrong transcription of a mumbled ad-lib
— this is its single most characteristic failure mode.

If your UI shows "98.2%" and a label's QA person measures 84% word accuracy on the same
file, you have not lost an argument about a number. You have established that Lyrixis
numbers cannot be trusted, and that impression does not reverse.

**Fix, before any pilot:**
1. Hand-label 200 lines across genres, languages and production styles.
2. Measure actual word error rate against model confidence.
3. Fit a calibration curve. Display *calibrated* confidence only.
4. If you can't calibrate yet, display a band — High / Medium / Review — not a decimal.

Bands are honest, defensible, and no less useful. Decimals are a promise you cannot
currently keep.

## 6. Per-track pricing against per-minute cost is a margin trap

Your cost scales with audio duration. Your price does not.

A 3-minute pop single and a 14-minute live jam cost you ~5x apart and bill identically.
Catalogs that skew long — classical, jazz, live recordings, DJ mixes, spoken word,
devotional and religious recordings, anything from a jam-band or prog label — will
systematically lose money at $0.40 and catastrophically at $0.20.

**Fix:**
- Track `cost_per_minute` as the real internal unit. Always.
- Keep flat per-track pricing publicly — it's a genuine differentiator and easy to buy.
- Add a **duration ceiling** to the standard rate (e.g. 8 minutes), with overage above it.
  Put it in the terms, not the headline.
- Before any enterprise quote, sample the catalog's duration distribution. A one-line
  SQL query on their manifest protects you from a bad contract.

## 7. Reprocessing will quietly destroy your margin

Models improve. Labels will absolutely ask you to re-run a catalog on the better model.
If reprocessing is free, you have signed an open-ended compute liability against a
one-time payment.

**Fix:** reprocessing is a new billable event, at a discounted rate. Say so in the terms
from day one. Retroactively introducing a charge is far worse than pricing it upfront.

## 8. Human verification is priced below cost by an order of magnitude

Verifying and time-correcting one song's lyrics takes a competent human 15–30 minutes,
more for an unfamiliar dialect. That is $10–30 of labour at any defensible rate.

A $9.99 add-on is underwater before overhead. Price human verification at **$25–49 per
track minimum**, or don't offer it. This is a premium service for high-value releases,
not a checkbox.

## 9. "LYRIXIS VERIFIED" as a public badge — don't

Three problems:
- **Legal:** any badge on a music asset gets read as a rights claim, no matter what your
  disclaimer says. Your own brief correctly worries about this. The worry is the answer.
- **Commercial:** nobody licenses a trust badge from an unknown vendor. Trust badges are
  a late-stage asset, earned after you're infrastructure.
- **Operational:** the moment it's public, every incorrect verification is a reputational
  event you must handle.

**Keep the verification *levels* as an internal data field** — they're genuinely useful
for QA workflow and for telling a customer the provenance of a line. Kill the public
badge. Revisit in three years if you've earned it.

## 10. Explicit content: never assert "clean"

If Lyrixis marks a track clean and a DSP later flags it, the label ate a takedown and a
retailer complaint because of your output. Even with disclaimers, that's the end of the
relationship.

**Fix the language, everywhere, permanently:**
- ✅ "No flagged terms detected"
- ✅ "Flagged terms present — 3 lines"
- ✅ "Uncertain — review recommended"
- ❌ "Clean"

This costs you nothing and removes a real liability. Change it on the site too.

## 11. The 1M-track enterprise deal is not your first customer

A $200k contract with a major means: procurement, an MSA, a vendor security assessment,
almost certainly a SOC 2 Type II requirement, insurance certificates, and a 6–18 month
cycle. Majors do not send master recordings to a vendor without this. It is not
negotiable and it is not skippable by knowing someone.

SOC 2 is roughly $20–40k and several months of process. You will need it eventually.
You do not need it to start — you need to sell to people who don't require it.

**Realistic first-customer profile, ranked:**
1. **MENA labels and aggregators** — Arabic dialect depth is a real, unserved need, budgets are
   reachable, procurement is lighter, and you have genuine domain credibility here.
2. **Independent distributors** (mid-size, serving thousands of indie artists) — they have
   catalog QA pain, no in-house data team, and buy on a demo.
3. **Sync licensing agencies** — they need searchable lyrics to place songs. Small catalogs,
   high value per track, fast decisions.
4. **Music data / metadata companies** — they'd buy your API as a component.
5. Majors. Later. After the above are references.

## 12. Security review will be the gate, not accuracy

Related to the above and worth separating: the first hard question from any serious
catalog owner is *"where does our unreleased audio go, who can access it, and how is it
deleted?"* Not *"what's your WER?"*

**Pilot workaround that unblocks you today:** run the pilot on **already-released** catalog.
No unreleased masters, no confidentiality crisis, no security review needed to start. You
get the same accuracy evidence. Offer this explicitly — it makes yes easy.

## 13. What's missing from your MVP that matters most

You listed sixteen MVP items and left out the one thing you cannot sell without:

**A measurement harness.** You need to be able to say, with numbers, *"on your 100 tracks
we achieved X% word accuracy, Y% of lines within 200ms of true timing, and found Z
metadata conflicts."*

That requires: ground-truth import, WER calculation, timing-offset measurement, and a
comparison report. Nothing in your brief builds this. It should be **MVP item one**,
because it is the deliverable of every pilot you sell.

## 14. Where you're right, and should not be talked out of it

- **Single price list regardless of customer type.** Correct, differentiated, and it removes
  an entire class of sales friction. Hold this line.
- **Authoritative vs inferred metadata, stored separately, never overwritten.** This is the
  architecturally sophisticated core of the product. Most competitors get it wrong.
- **Corrections versioned and preserved.** Correct. It compounds into your only real
  proprietary asset.
- **Provider abstraction.** Correct, and cheap to do now, expensive to retrofit.
- **Backend-calculated pricing, configurable tiers.** Correct.
- **Refusing to design for scraping DSPs.** Correct, and it's what makes you sellable at all.
- **Not claiming full DDEX today.** Correct and unusually honest for a founder deck.

---

# PART II — THE DELIVERABLES

## 1. Refined product architecture

```
                    INGEST
   browser · bulk · CSV manifest · ERN feed · API · bucket
                       ↓
              NORMALIZATION LAYER
   every path produces the same internal object: Recording + MetadataClaims
                       ↓
         ┌─────────────┴─────────────┐
    AUDIO PATH                  METADATA PATH
  fingerprint                 claim ingestion
  transcribe                  identifier validation
  align                       duplicate detection
  language/dialect            conflict detection
  structure                   completeness scoring
  term flagging                     │
         └─────────────┬─────────────┘
                       ↓
              RECONCILIATION ENGINE
   compares inferred vs authoritative → ValidationResults
                       ↓
              ENRICHMENT OBJECT
      (internal; documented mapping to MEAD)
                       ↓
                    DELIVER
   dashboard · exports · API · webhooks · (later) MEAD/SFTP
```

The reconciliation engine is the product. Everything left of it is inputs; everything
right of it is packaging.

**Note the metadata path requires no audio and no AI spend.** It runs on a CSV. That is
your free lead magnet — see §15.

## 2. MVP feature list

Ship in this order. Nothing else.

1. **Measurement harness** — ground-truth import, WER, timing offset, comparison report
2. Auth (email/password + Google)
3. Recording model with ISRC + fingerprint dedup
4. Single + bulk upload with rights attestation
5. Private storage, signed URLs
6. Transcription + forced alignment + language ID
7. **Calibrated** confidence, displayed as bands until calibration data exists
8. Synced lyric view, word highlighting, inline correction, versioned
9. Metadata claim ingestion (CSV) + conflict detection + completeness scoring
10. Catalog Health report (real computed metrics, exportable PDF/CSV)
11. Exports: TXT, SRT, LRC, JSON
12. Stripe: single-track $2.99 + invoice for pilots
13. Dashboard: tracks, status, health summary
14. Job queue + worker + retry
15. Audit log

## 3. Phase 2

Translation · transliteration · TTML + VTT + CSV · public REST API + key management ·
batch API · webhooks · organizations and permissions · balance/credits · admin dashboard ·
priority queue · duplicate resolution workflow · provider A/B comparison · reprocessing
flow · dialect model specialization (Arabic first)

## 4. Enterprise roadmap

**Phase 3 (first enterprise customer):** ERN ingestion · MEAD export adapter · SFTP and
cloud-bucket delivery · SLA and status page · SSO · data retention controls · secure
deletion workflow · per-org custom rates and invoicing

**Phase 4 (scale):** SOC 2 Type II · PIE / contributor data · human verification
operations · custom distributor formats · regional processing for data residency ·
white-label reporting

## 5. Data model

`schema.sql` already covers the transactional core. Required changes from this review:

```sql
-- recordings are the billable unit, not tracks
create table recordings (
  id uuid primary key,
  organization_id uuid,
  isrc text,
  audio_fingerprint text,          -- chromaprint
  duration_seconds numeric,
  canonical_title text,
  created_at timestamptz
);
create index on recordings (isrc);
create index on recordings (audio_fingerprint);

create table releases (
  id uuid primary key, upc text, title text, release_date date, label text
);

create table release_tracks (          -- position of a recording in a release
  release_id uuid, recording_id uuid, disc int, position int,
  primary key (release_id, recording_id, disc, position)
);

-- THE CORE TABLE. Every fact about a recording is a claim with a source.
create table metadata_claims (
  id uuid primary key,
  recording_id uuid not null,
  field text not null,               -- language | explicit | title | artist | isrc …
  value jsonb not null,
  source text not null,              -- label | distributor | authorized_db | user_edit | lyrixis_ai
  is_authoritative boolean not null,
  confidence numeric(5,4),           -- null for authoritative
  provider text,
  observed_at timestamptz not null default now()
);
create index on metadata_claims (recording_id, field);

-- conflicts are derived, stored, and are the deliverable
create table validation_results (
  id uuid primary key,
  recording_id uuid not null,
  rule_key text not null,            -- see §9
  severity text not null,            -- info | warning | error
  detail jsonb,
  status text not null default 'open', -- open | acknowledged | resolved | dismissed
  detected_at timestamptz default now()
);

create table catalogs (
  id uuid primary key, organization_id uuid, name text, created_at timestamptz
);
```

**Rule: AI writes only rows where `is_authoritative = false`. There is no code path that
lets an inferred claim overwrite an authoritative one.** Enforce with a DB constraint,
not a convention.

## 6. Processing architecture

Event-driven, each step an independent job with its own retry policy:

```
recording.created → fingerprint → dedup.check
   ↳ if duplicate: link, skip processing, DO NOT BILL
   ↳ if new: normalize → (separate) → transcribe → align → language
             → structure → term-flag → cost.record
metadata.claim.ingested → validate.identifiers → detect.conflicts
both complete → reconcile → validation_results → exports → notify
```

- Concurrency capped per provider rate limit, not per CPU
- Enterprise batches run on a separate queue so they can't starve single-track customers
- Failure ≠ dead end: low confidence routes to `manual_review`, not `failed`
- Idempotency key on every job; a replayed webhook must never double-bill

## 7. API architecture

Your endpoint list is sound. Add and enforce:

- `Idempotency-Key` header **required** on all POSTs. Store 24h. Return the original response on replay.
- Cursor pagination, never offset — catalogs are too large
- `X-RateLimit-*` headers, 429 with `Retry-After`
- Webhook signing: HMAC-SHA256 over timestamp + body, 5-minute tolerance window
- Exponential backoff retry, 24h, then dead-letter with dashboard visibility
- Version in path (`/v1/`); deprecation gets 12 months' notice in writing
- Structured errors: `{error: {code, message, param, doc_url}}` — machine-readable `code` is the contract
- Long operations return `202` + job resource. Never block.

Add `GET /v1/catalogs/{id}/validations` — the QA endpoint, which is the one enterprise
customers will actually integrate against.

## 8. DDEX readiness strategy

1. **Now:** internal enrichment object designed field-by-field to be MEAD-mappable. Write
   the mapping table into the repo as documentation. Implement nothing.
2. **First enterprise conversation:** ask which DDEX profiles and versions they actually
   use. The answer is often narrower than the standard, and sometimes "none, send us CSV."
3. **First customer who needs it:** build the ERN *ingestion* parser. Read-only.
4. **When paid for:** MEAD export adapter.
5. Never build RIN or DSR.
6. Register as a DDEX implementer before claiming any support publicly.

## 9. Catalog QA rule set

Every rule: `key`, `severity`, `detection query`, `plain-English explanation`, `suggested fix`.
The explanation is what makes the report sellable — a label doesn't want a rule code.

**Identifiers:** malformed ISRC (format/country/registrant), missing ISRC, ISRC collision
(same ISRC, different fingerprint), invalid UPC/EAN checksum, ISRC on multiple recordings

**Duplicates:** identical fingerprint across different ISRCs, near-identical fingerprint
(remaster/edit candidate), duplicate title+artist+duration

**Conflicts:** stated language ≠ detected language, stated explicit ≠ detected terms,
duration mismatch vs audio, artist name variants across releases, title inconsistency

**Completeness:** missing lyrics, missing writers, missing publisher, missing release date,
missing label, missing artwork reference, missing territory data

**Quality:** transcription below threshold, timing gaps or overlaps, sections undetected,
unresolved multi-language track

**Operational:** failed processing, failed export, stale enrichment vs newer model

`catalog_health` is a materialized view refreshed on job completion — computed, never
hand-entered, never estimated.

## 10. Rights and verification architecture

- **Attestation** captured per upload: user, timestamp, IP, exact wording version, scope.
  Immutable. This is your legal record and it must survive a subpoena.
- **Verification levels as internal data only:** `ai_generated → ai_checked → user_approved →
  rights_holder_approved → human_verified → catalog_validated`. No public badge.
- **Explicit disclaimer in product and terms:** verification attests that data passed defined
  technical checks. It attests nothing about ownership, authorship, or royalty entitlement.
- **Takedown workflow:** intake form, 24h acknowledgement, suspension of the disputed
  recording, counter-notice path, full audit trail.
- **Secure deletion:** purge audio, derived files, exports, storage objects. Retain the audit
  row and the attestation. Configurable retention per organization.
- **Lyrics are a separate copyright from the master.** Owning a recording does not grant
  rights in the underlying composition. Your attestation wording must cover both, and this
  needs an actual attorney, not a placeholder. It is the single largest unpriced legal risk
  in the business.

## 11. Billing architecture

- Billable unit = **unique recording**, not track, not release, not file
- Deduplicated recordings are linked, not re-billed — and say so on the invoice
- Server-side quote only. Tier from `pricing_tiers`. Org `custom_rate_cents` overrides
- Duration ceiling on the standard rate, overage above it
- Reprocessing = new billable event at a discounted rate, disclosed upfront
- Per-recording cost row written from **real provider usage**, never estimated
- Refunds tracked and subtracted from revenue in margin reporting
- Margin views: by customer, by volume tier, by provider, by language, by duration band
- **Alert when any tier's realized gross margin drops below 40%** — this is the number that
  tells you a price is wrong before a contract does

## 12. Recommended integrations

**First:** Chromaprint/AcoustID (fingerprint) · Stripe · Supabase · a transcription
provider with a second one wired for comparison

**Second:** MusicBrainz (identifier cross-reference, open) · ISRC registrant validation ·
Cloud bucket delivery (S3/GCS) · Slack or email alerting for enterprise job status

**Later:** distributor APIs (the ones your actual customers use — ask, don't guess) ·
DDEX ERN parsing · SFTP · SSO/SAML

**Never:** anything that ingests from a DSP without authorization.

## 13. Admin requirements

Read-only first, editable second. For MVP, the Supabase table editor is genuinely enough
— do not spend two weeks building an admin UI for one user.

When you do build it: pricing tiers and feature prices (editable, versioned, audited) ·
per-org custom rates · promotional credits · usage caps · job requeue and dead-letter
inspection · unit economics dashboard · enterprise pipeline · provider cost comparison ·
model calibration status.

Every pricing change writes an audit row with actor and previous value. No exceptions.

## 14. Security requirements

Private buckets · signed short-lived URLs · RLS on all user-facing tables · service-role
workers only · MIME + magic byte + size + duration validation · API keys hashed, prefix
shown, full key once · Stripe and inbound webhook signature verification · rate limiting ·
encrypted secrets, none in the repo · audit logging on every significant event ·
secure deletion · dependency scanning · per-org data isolation verified by test, not assumed

**Write a one-page security overview now.** It will be requested in your first serious
conversation, and having it ready signals seriousness disproportionately to its cost.

## 15. Implementation priorities

**Week 1 — the thing that requires no engineering**
Build the **free Catalog Health Report** as a service you deliver manually. A prospect
sends a CSV export of their catalog. You run identifier validation, duplicate detection
and completeness scoring — this is SQL and a script, not AI, and costs approximately
nothing. You return a PDF of real findings.

This is a genuine gift, it demonstrates competence, it requires no audio and therefore no
security review, and it produces the exact evidence that justifies buying transcription.
It is the best sales instrument in this entire document and you can run it before the
product exists.

**Weeks 2–4:** measurement harness · recordings model + fingerprint dedup · upload +
attestation + storage · transcription + alignment + language

**Weeks 5–8:** synced view + corrections + versioning · metadata claims + conflict
detection · Catalog Health computed in-product · exports · Stripe · dashboard

**Then, and only then:** whatever the first paying customer asked for during the pilot.

## 16. Do NOT build yet

RIN · DSR · public LYRIXIS VERIFIED badge · human verification operations · SFTP ·
DDEX ERN or MEAD implementation · organizations permission matrix · admin UI · credits
and balance · translation and transliteration · TTML/VTT/CSV exports · audio stems ·
priority queue · SSO · white-label · mobile app · anything described in your brief as
"eventually"

Schema for these is already in place. Features wait for a name on an invoice.

---

# PART III — THE PILOT OFFER

This is what you actually sell. Everything above exists to support it.

> **100-track catalog pilot. Free.**
> Send 100 already-released recordings and their current metadata.
> In ten business days you receive: measured word accuracy, measured sync accuracy,
> a full metadata conflict report, duplicate and identifier findings, and a per-track
> cost and processing time breakdown.
> No unreleased masters. No commitment. Keep the output either way.

Cost to you at ~$0.31/track: about $31 plus your time.

Restraints that matter: use **already-released** content (removes the security gate),
**measure before claiming** (never quote accuracy you haven't computed on their files),
and lead the report with the metadata conflicts — the finding they didn't expect is what
gets you the second meeting.

---

# CLOSING NOTE

The architecture in this document is sound and the reframe in §1 is, I think, the most
commercially valuable thing in it.

But this is now the fourth complete Lyrixis artifact and no catalog owner has seen any of
them. The Catalog Health Report in §15 exists precisely so that the next step requires no
build at all — one email, one CSV, one script.

The constraint on this business has never been the architecture.
