// In-memory VoicesRepo: used by tests and by the DEMO preview (never in production).
import { randomUUID, createHmac } from "node:crypto";
import { ConflictError, matches, type Filter, type TableMap, type TableName, type VoicesRepo } from "./repo";
import { assertBalanced, type LedgerTx } from "./ledger";

const UNIQUE: Partial<Record<TableName, string[][]>> = {
  users: [["email"]],
  voice_creators: [["user_id"], ["handle"]],
  voices: [["slug"]],
  voice_permission_versions: [["voice_id", "version"]],
  voice_purchases: [["idempotency_key"], ["wallet_reservation_id"]],
  voice_approval_requests: [["purchase_id"]],
  voice_jobs: [["purchase_id"]],
  voice_ledger_accounts: [["code"]],
  voice_ledger_transactions: [["idempotency_key"]],
  voice_workspace_members: [["workspace_id", "user_id"]],
  voice_api_keys: [["key_hash"]],
  voice_idempotency: [["workspace_id", "route", "key"]],
  voice_workspaces: [["socixis_org_id"]],
  voice_pronunciations: [["workspace_id", "term", "language"]],
  voice_invites: [["email"]],
};
const NO_ID: TableName[] = ["voice_permission_versions", "voice_pricing_configs", "voice_workspace_members", "voice_idempotency", "voice_invites", "voice_packages"];
const FROZEN_PURCHASE = ["terms_snapshot", "terms_hash", "terms_version", "price_ixis", "voice_id", "workspace_id", "buyer_user_id", "creator_id"];

export class MemoryRepo implements VoicesRepo {
  readonly kind = "memory" as const;
  private tables = new Map<TableName, Record<string, unknown>[]>();
  private objects = new Map<string, { body: Uint8Array; mime: string }>();
  private seq = 0;
  constructor(private signer: (bucket: string, path: string, ttl: number) => string = defaultSigner) {}

  private t<N extends TableName>(name: N): TableMap[N][] {
    if (!this.tables.has(name)) this.tables.set(name, []);
    return this.tables.get(name) as unknown as TableMap[N][];
  }

  async insert<N extends TableName>(table: N, row: Partial<TableMap[N]>): Promise<TableMap[N]> {
    const now = new Date().toISOString();
    const full = { ...row } as Record<string, unknown>;
    if (!NO_ID.includes(table) && full.id === undefined) full.id = table === "voice_ledger_entries" || table === "voice_audit_events" ? ++this.seq : randomUUID();
    if (full.created_at === undefined) full.created_at = now;
    if (table === "voice_purchases" || table === "voice_jobs" || table === "voice_custom_requests") full.updated_at = full.updated_at ?? now;
    for (const cols of UNIQUE[table] ?? []) {
      if (cols.some((c) => full[c] === undefined || full[c] === null)) continue;
      if (this.t(table).some((r) => cols.every((c) => (r as unknown as Record<string, unknown>)[c] === full[c]))) {
        throw new ConflictError(`${table}: duplicate ${cols.join(",")}`);
      }
    }
    this.t(table).push(structuredClone(full) as unknown as TableMap[N]);
    return structuredClone(full) as unknown as TableMap[N];
  }

  async update<N extends TableName>(table: N, match: Filter<TableMap[N]>, patch: Partial<TableMap[N]>): Promise<TableMap[N][]> {
    if (table === "voice_ledger_entries" || table === "voice_ledger_transactions" || table === "voice_audit_events") throw new Error(`${table} is append-only`);
    const out: TableMap[N][] = [];
    for (const r of this.t(table)) {
      if (!matches(r, match)) continue;
      if (table === "voice_purchases") {
        for (const k of FROZEN_PURCHASE) {
          const pk = (patch as Record<string, unknown>)[k];
          if (pk !== undefined && JSON.stringify(pk) !== JSON.stringify((r as unknown as Record<string, unknown>)[k])) throw new Error("voice_purchases: terms, price and parties are immutable");
        }
      }
      Object.assign(r as object, structuredClone(patch));
      if ("updated_at" in (r as object)) (r as unknown as Record<string, unknown>).updated_at = new Date().toISOString();
      out.push(structuredClone(r));
    }
    return out;
  }

  async find<N extends TableName>(table: N, match?: Filter<TableMap[N]>, opts?: { order?: keyof TableMap[N] & string; desc?: boolean; limit?: number }): Promise<TableMap[N][]> {
    let rows = this.t(table).filter((r) => matches(r, match));
    if (opts?.order) {
      const k = opts.order;
      rows = [...rows].sort((a, b) => ((a[k] as never) < (b[k] as never) ? -1 : (a[k] as never) > (b[k] as never) ? 1 : 0) * (opts.desc ? -1 : 1));
    }
    if (opts?.limit) rows = rows.slice(0, opts.limit);
    return structuredClone(rows);
  }

  async one<N extends TableName>(table: N, match: Filter<TableMap[N]>): Promise<TableMap[N] | null> {
    return (await this.find(table, match, { limit: 1 }))[0] ?? null;
  }

  async postLedger(tx: LedgerTx): Promise<{ transactionId: string; duplicate: boolean }> {
    assertBalanced(tx);
    const existing = await this.one("voice_ledger_transactions", { idempotency_key: tx.key });
    if (existing) return { transactionId: existing.id, duplicate: true };
    const row = await this.insert("voice_ledger_transactions", { idempotency_key: tx.key, kind: tx.kind, purchase_id: tx.purchase_id, memo: tx.memo, actor_user_id: null });
    for (const e of tx.entries) {
      let acct = await this.one("voice_ledger_accounts", { code: e.account });
      if (!acct) acct = await this.insert("voice_ledger_accounts", { code: e.account, kind: e.kind, owner_creator_id: e.creator_id ?? null, owner_workspace_id: e.workspace_id ?? null, bucket: e.bucket ?? null });
      await this.insert("voice_ledger_entries", { transaction_id: row.id, account_id: acct.id, amount_ixis: e.amount, line: e.line });
    }
    return { transactionId: row.id, duplicate: false };
  }

  async takeAllowance(workspaceId: string, units: number): Promise<boolean> {
    const ws = this.t("voice_workspaces").find((w) => w.id === workspaceId);
    if (!ws || units <= 0 || ws.allowance_voiceovers < units) return false;
    ws.allowance_voiceovers -= units;
    return true;
  }
  async restoreAllowance(workspaceId: string, units: number): Promise<void> {
    const ws = this.t("voice_workspaces").find((w) => w.id === workspaceId);
    if (ws && units > 0) ws.allowance_voiceovers += units;
  }
  async leaseJob(jobId: string, leaseMs: number): Promise<boolean> {
    const j = this.t("voice_jobs").find((r) => r.id === jobId);
    if (!j || j.attempts >= j.max_attempts) return false;
    const expired = j.status === "running" && j.lease_until !== null && Date.parse(j.lease_until) < Date.now();
    if (j.status !== "queued" && !expired) return false;
    j.status = "running"; j.attempts += 1; j.lease_until = new Date(Date.now() + leaseMs).toISOString();
    return true;
  }

  async putObject(bucket: string, path: string, body: Uint8Array, mime: string) { this.objects.set(`${bucket}/${path}`, { body, mime }); }
  async getObject(bucket: string, path: string) { return this.objects.get(`${bucket}/${path}`) ?? null; }
  async deleteObject(bucket: string, path: string) { this.objects.delete(`${bucket}/${path}`); }
  async signedUrl(bucket: string, path: string, ttl: number) { return this.signer(bucket, path, ttl); }
}

function defaultSigner(bucket: string, path: string, ttl: number): string {
  const exp = Math.floor(Date.now() / 1000) + ttl;
  const sig = createHmac("sha256", "memory-test").update(`${bucket}/${path}:${exp}`).digest("base64url");
  return `/api/voices/files?b=${encodeURIComponent(bucket)}&p=${encodeURIComponent(path)}&e=${exp}&s=${sig}`;
}
