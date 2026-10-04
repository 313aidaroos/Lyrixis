# Admin runbook — /voices/admin

Admins = `users.role = 'admin'` or the owner emails (alaidaroosawad@gmail.com, awad@apixis.dev).

## Invites (launch mode)
Invite-only is on unless `VOICES_INVITE_ONLY=false`. Admin → Invite (email + role). Revoke by setting
`voice_invites.revoked_at`.

## New voice review
1. Creator: profile (18+, terms) → draft (explicit dialect) → public sample → private training audio →
   cloning consent (typed name, hashed IP, versioned text) → **Submit**.
2. Verification: if the provider supports it (ElevenLabs PVC CAPTCHA) the creator uploads the CAPTCHA reading; pass
   → `provider_verified`. Otherwise / on failure → manual queue.
3. **Live only — link the provider voice:** the creator creates the PVC in **their own** ElevenLabs account and
   shares it; paste the voice id in "Link ElevenLabs voice" (checks the Lyrixis key can see it).
4. Manual verification: compare the consent recording/training audio with the sample, check ID if needed, write
   how you verified (required note) → "Mark manually verified".
5. **Dialect review** by a native speaker of that dialect (record whose). Until approved, the badge says pending.
6. Approve the public sample(s), then **Approve listing**. Never approve celebrity/public-figure sound-alikes.

## Reports
Impersonation / no-consent reports: suspend first (stops new use, cancels queued jobs, releases holds), then
investigate. Existing licenses keep their frozen terms; if consent was never valid, refund affected buyers.

## Refunds
Admin → Recent purchases → "Refund as credit". Customer gets Lyrixis credit (Wallet has no refund API); ledger
reverses the creator share (adjustment if already available). Idempotent.

## Plans
Monthly plans aren't sold through the Wallet yet. After a customer pays by another agreed path, grant allowance
(Admin → Grant plan allowance) with the receipt reference in the note.

## Money checks
Admin header shows ledger balance. `GET/POST /api/voices/jobs/run` (CRON_SECRET) runs queued jobs, reconciles
lost captures, releases matured earnings. If "fulfilled without a capture posting" appears: check the Wallet
reservation, then run reconcile.

## Incident: provider down
Jobs retry 3× then release the hold — customers aren't charged. Auditions return 503. No fallback to another
voice or provider (would break consent). Post a status note if prolonged.
