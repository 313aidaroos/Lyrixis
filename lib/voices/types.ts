// Lyrixis Voices — row types (snake_case, identical to database/migrations/0006_lyrixis_voices.sql).

export type VoiceStatus = "draft" | "verification_pending" | "review_pending" | "active" | "paused" | "suspended" | "retired";
export type VerificationStatus = "unverified" | "pending" | "provider_verified" | "manual_verified" | "rejected";
export type LicensingMode = "instant" | "approval_required";
export type PurchaseStatus =
  | "pending_approval" | "approved" | "rejected" | "awaiting_payment" | "payment_held"
  | "fulfilled" | "failed_released" | "refunded" | "cancelled";
export type Funding = "wallet" | "allowance" | "credit" | "demo";
export type JobStatus = "queued" | "running" | "succeeded" | "failed" | "blocked" | "cancelled";

export interface UserRow { id: string; email: string; full_name: string | null; role?: string }

export interface CreatorRow {
  id: string; user_id: string; handle: string; display_name: string; display_name_ar: string | null;
  bio: string | null; bio_ar: string | null; adult_attested_at: string | null;
  identity_check_status: "not_started" | "pending" | "verified" | "failed";
  payout_status: "blocked_no_payout_rail" | "onboarding" | "ready" | "suspended";
  wallet_owner: string | null; status: "active" | "suspended" | "deleted"; hire_enabled: boolean; is_demo: boolean; created_at: string;
}

export interface VoiceRow {
  id: string; slug: string; creator_id: string; display_name: string; display_name_ar: string | null;
  description: string | null; description_ar: string | null; languages: string[]; dialects: string[];
  tones: string[]; use_categories: string[]; status: VoiceStatus; status_reason: string | null;
  verification_status: VerificationStatus; dialect_review_status: "pending" | "approved" | "changes_requested";
  licensing_mode: LicensingMode; current_permission_version: number; model_version: string | null;
  provider: string | null; provider_voice_ref: string | null; is_demo: boolean;
  submitted_at: string | null; approved_at: string | null; created_at: string;
}

export interface PermissionRow {
  voice_id: string; version: number; sample_playback: boolean; auditions: boolean; paid_generation: boolean;
  publication: boolean; custom_recordings: boolean; assistant_use: boolean; training_use: boolean;
  allowed_uses: string[]; blocked_uses: string[]; allowed_channels: string[]; allowed_territories: string[];
  max_term_months: number; exclusivity_available: boolean; created_at: string;
}

export interface PricingConfigRow {
  version: number; payg_base_ixis: number; payg_base_seconds: number; payg_step_ixis: number;
  payg_step_seconds: number; payg_max_seconds: number; audition_max_seconds: number; free_auditions_per_day: number;
  audition_ixis: number; custom_min_ixis: number; custom_included_revisions: number; illustrative: boolean; active: boolean; notes: string | null; created_at: string;
}

export interface PackageRow {
  id: string; name: string; monthly_price_ixis: number; voiceovers_per_month: number; overage_ixis: number;
  seats: number; brand_voice: boolean; wallet_product_key: string | null; wallet_overage_product_key: string | null;
  illustrative: boolean; active: boolean; pricing_version: number;
}

export interface CompRuleRow {
  id: string; applies_to: "generation" | "custom_recording"; version: number; creator_share_bps: number; apixis_fee_bps: number; earnings_hold_days: number;
  share_base: "licensing_minus_fee_minus_provider_cost"; notes: string | null; effective_from: string;
}

export interface SampleRow {
  id: string; voice_id: string; title: string; language: string; dialect: string | null; transcript: string | null;
  storage_bucket: string; storage_path: string; mime_type: string; bytes: number;
  creator_approved: boolean; admin_approved: boolean; is_demo: boolean; created_at: string;
}

export interface TrainingUploadRow {
  id: string; voice_id: string; creator_id: string; storage_bucket: "voices-training-private"; storage_path: string;
  mime_type: string; bytes: number; duration_seconds: number | null; validation_status: "pending" | "passed" | "failed";
  validation_notes: string | null; delete_after: string | null; deleted_at: string | null; created_at: string;
}

export interface ConsentRow {
  id: string; creator_id: string; voice_id: string | null;
  kind: "cloning" | "creator_terms" | "marketplace_listing" | "adult_attestation";
  terms_version: string; text_hash: string; accepted_at: string; ip_hash: string | null; revoked_at: string | null; revoke_reason: string | null;
}

export interface VerificationRow { id: string; voice_id: string; method: "provider" | "manual"; status: "pending" | "passed" | "failed"; provider: string | null; reviewer_user_id: string | null; notes: string | null; created_at: string }
export interface ReviewRow { id: string; voice_id: string; kind: "listing" | "dialect" | "sample" | "report"; decision: "approved" | "changes_requested" | "rejected" | "suspended" | "reinstated"; reviewer_user_id: string | null; native_speaker_of: string | null; notes: string | null; created_at: string }

export interface WorkspaceRow {
  id: string; name: string; brand_name: string | null; owner_user_id: string; preferred_voice_id: string | null;
  package_id: string | null; allowance_voiceovers: number; allowance_period_end: string | null; seats_limit: number;
  credit_ixis: number; monthly_spend_cap_ixis: number | null; socixis_org_id: string | null; is_demo: boolean; created_at: string;
}
export interface MemberRow { workspace_id: string; user_id: string; role: "owner" | "admin" | "editor" | "viewer"; created_at: string }
export interface ProjectRow { id: string; workspace_id: string; name: string; created_by: string | null; created_at: string }
export interface ScriptRow { id: string; workspace_id: string; project_id: string | null; body: string; script_hash: string; language: string | null; created_by: string | null; delete_after: string | null; created_at: string }
export interface PronunciationRow { id: string; workspace_id: string; term: string; say_as: string; language: string; created_at: string }

export interface PurchaseRow {
  id: string; workspace_id: string; buyer_user_id: string; voice_id: string; creator_id: string; script_id: string | null;
  kind: "generation" | "custom_recording"; status: PurchaseStatus; funding: Funding; billed_seconds: number | null;
  allowance_units: number; price_ixis: number; wallet_product_key: string | null; wallet_reservation_id: string | null;
  wallet_receipt_id: string | null; idempotency_key: string; terms_version: string; terms_hash: string;
  terms_snapshot: TermsSnapshot; is_demo: boolean; created_at: string; updated_at: string;
}

export interface ApprovalRow { id: string; purchase_id: string; voice_id: string; creator_id: string; script_excerpt: string; declared_use: string; status: "pending" | "approved" | "rejected" | "expired"; decided_at: string | null; decision_note: string | null; created_at: string }

export interface JobRow {
  id: string; purchase_id: string; workspace_id: string; status: JobStatus; attempts: number; max_attempts: number;
  timeout_ms: number; lease_until: string | null; provider: string; is_demo: boolean; output_bucket: string | null;
  output_path: string | null; output_mime: string | null; output_seconds: number | null; chars_billed: number | null;
  provider_cost_usd_micros: number; error_code: string | null; error_message: string | null; created_at: string; updated_at: string;
}

export interface AuditionRow { id: string; voice_id: string; user_id: string | null; workspace_id: string | null; chars: number; provider: string; is_demo: boolean; provider_cost_usd_micros: number; charged_ixis: number; wallet_receipt_id: string | null; created_at: string }
export interface InviteRow { email: string; role: "customer" | "creator" | "both"; invited_by: string | null; note: string | null; created_at: string; revoked_at: string | null }

export interface CustomRequestRow {
  id: string; workspace_id: string; voice_id: string; creator_id: string; brief: string; declared_use: string;
  status: "requested" | "quoted" | "accepted_held" | "delivered" | "revision_requested" | "accepted" | "declined" | "cancelled";
  quote_ixis: number | null; purchase_id: string | null; revisions_used: number; max_revisions: number;
  delivery_path: string | null; manual_process: boolean; created_at: string; updated_at: string;
}

export interface LedgerAccountRow { id: string; code: string; kind: "asset" | "liability" | "revenue" | "expense" | "contra_revenue"; owner_creator_id: string | null; owner_workspace_id: string | null; bucket: "pending" | "available" | "paid" | null; created_at: string }
export interface LedgerTxRow { id: string; idempotency_key: string; kind: LedgerTxKind; purchase_id: string | null; memo: string | null; actor_user_id: string | null; created_at: string }
export interface LedgerEntryRow { id: number; transaction_id: string; account_id: string; amount_ixis: number; line: LedgerLine; created_at: string }
export type LedgerTxKind = "purchase_capture" | "allowance_spend" | "allowance_restore" | "allowance_topup" | "earnings_release" | "refund" | "adjustment" | "provider_cost" | "payout";
export type LedgerLine = "customer_payment" | "tax" | "licensing_amount" | "creator_share" | "provider_cost" | "platform_fee" | "processing_fee" | "refund" | "adjustment";

export interface ApiKeyRow { id: string; workspace_id: string; label: string; key_prefix: string; key_hash: string; scopes: string[]; partner: string; last_used_at: string | null; revoked_at: string | null; created_by: string | null; created_at: string }
export interface IdempotencyRow { key: string; workspace_id: string; route: string; request_hash: string; response: unknown; status_code: number; created_at: string }
export interface ReportRow { id: string; voice_id: string; reporter_user_id: string | null; reason: "impersonation" | "no_consent" | "misuse" | "quality" | "other"; details: string | null; status: "open" | "actioned" | "dismissed"; created_at: string }
export interface AuditRow { id?: number; actor_user_id: string | null; actor_kind: "user" | "admin" | "system" | "api_key"; category: "consent" | "permission" | "payment" | "admin" | "job" | "security" | "data"; action: string; entity_type: string | null; entity_id: string | null; metadata: Record<string, string | number | boolean | null> | null; created_at?: string }

/** Frozen at purchase time. Never recomputed from current settings. */
export interface TermsSnapshot {
  snapshot_version: "voices-terms-snapshot/1";
  license_terms_version: string;
  consent_version: string | null;
  requires_legal_review: true;
  customer: { workspace_id: string; buyer_user_id: string; brand_name: string | null };
  creator: { creator_id: string; display_name: string };
  voice: { voice_id: string; slug: string; display_name: string; model_version: string | null; permission_version: number };
  script_hash: string | null;
  script_chars: number;
  declared_use: string;
  channels: string[];
  publication: boolean;
  term_months: number;
  territory: string;
  exclusivity: "non_exclusive";
  price: { ixis: number; usd_equivalent: number; funding: Funding; billed_seconds: number; allowance_units: number; pricing_version: number; illustrative: boolean };
  creator_compensation: { comp_rule_version: number; creator_share_bps: number; apixis_fee_bps: number; share_base: string; earnings_hold_days: number };
  is_demo: boolean;
  created_at: string;
}
