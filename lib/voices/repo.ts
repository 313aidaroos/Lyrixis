// Storage port for Lyrixis Voices. Two implementations: MemoryRepo (tests + demo preview) and
// SupabaseRepo (live; service role, after service-level authorization checks).
import type * as T from "./types";
import type { LedgerTx } from "./ledger";

export interface TableMap {
  users: T.UserRow;
  voice_creators: T.CreatorRow;
  voices: T.VoiceRow;
  voice_permission_versions: T.PermissionRow;
  voice_pricing_configs: T.PricingConfigRow;
  voice_packages: T.PackageRow;
  voice_comp_rules: T.CompRuleRow;
  voice_samples: T.SampleRow;
  voice_training_uploads: T.TrainingUploadRow;
  voice_consents: T.ConsentRow;
  voice_verifications: T.VerificationRow;
  voice_reviews: T.ReviewRow;
  voice_workspaces: T.WorkspaceRow;
  voice_workspace_members: T.MemberRow;
  voice_projects: T.ProjectRow;
  voice_scripts: T.ScriptRow;
  voice_pronunciations: T.PronunciationRow;
  voice_purchases: T.PurchaseRow;
  voice_approval_requests: T.ApprovalRow;
  voice_jobs: T.JobRow;
  voice_auditions: T.AuditionRow;
  voice_custom_requests: T.CustomRequestRow;
  voice_ledger_accounts: T.LedgerAccountRow;
  voice_ledger_transactions: T.LedgerTxRow;
  voice_ledger_entries: T.LedgerEntryRow;
  voice_api_keys: T.ApiKeyRow;
  voice_idempotency: T.IdempotencyRow;
  voice_reports: T.ReportRow;
  voice_audit_events: T.AuditRow;
  voice_invites: T.InviteRow;
}
export type TableName = keyof TableMap;
export type Filter<R> = Partial<{ [K in keyof R]: R[K] | { in: R[K][] } | { gte: R[K] } | { lte: R[K] } }>;

export class ConflictError extends Error { constructor(message: string) { super(message); this.name = "ConflictError"; } }

export interface VoicesRepo {
  readonly kind: "memory" | "supabase";
  insert<N extends TableName>(table: N, row: Partial<TableMap[N]>): Promise<TableMap[N]>;
  update<N extends TableName>(table: N, match: Filter<TableMap[N]>, patch: Partial<TableMap[N]>): Promise<TableMap[N][]>;
  find<N extends TableName>(table: N, match?: Filter<TableMap[N]>, opts?: { order?: keyof TableMap[N] & string; desc?: boolean; limit?: number }): Promise<TableMap[N][]>;
  one<N extends TableName>(table: N, match: Filter<TableMap[N]>): Promise<TableMap[N] | null>;
  /** Atomic, idempotent on tx.key. Returns duplicate=true when the key already existed. */
  postLedger(tx: LedgerTx): Promise<{ transactionId: string; duplicate: boolean }>;
  takeAllowance(workspaceId: string, units: number): Promise<boolean>;
  restoreAllowance(workspaceId: string, units: number): Promise<void>;
  leaseJob(jobId: string, leaseMs: number): Promise<boolean>;
  putObject(bucket: string, path: string, body: Uint8Array, mime: string): Promise<void>;
  getObject(bucket: string, path: string): Promise<{ body: Uint8Array; mime: string } | null>;
  signedUrl(bucket: string, path: string, ttlSeconds: number): Promise<string>;
  deleteObject(bucket: string, path: string): Promise<void>;
}

export function matches<R>(row: R, match: Filter<R> | undefined): boolean {
  if (!match) return true;
  for (const [k, cond] of Object.entries(match) as [keyof R, unknown][]) {
    const v = row[k];
    if (cond && typeof cond === "object" && !Array.isArray(cond)) {
      const c = cond as { in?: unknown[]; gte?: unknown; lte?: unknown };
      if (c.in && !c.in.includes(v)) return false;
      if (c.gte !== undefined && !((v as never) >= (c.gte as never))) return false;
      if (c.lte !== undefined && !((v as never) <= (c.lte as never))) return false;
    } else if (v !== cond) return false;
  }
  return true;
}
