// Live VoicesRepo on Supabase (service role, server only). Authorization happens in service.ts
// BEFORE any call here; RLS (0006) is the browser-side backstop.
import type { SupabaseClient } from "@supabase/supabase-js";
import { ConflictError, type Filter, type TableMap, type TableName, type VoicesRepo } from "./repo";
import { assertBalanced, type LedgerTx } from "./ledger";

type Q = {
  eq(c: string, v: unknown): Q; is(c: string, v: null): Q; in(c: string, v: unknown[]): Q; gte(c: string, v: unknown): Q; lte(c: string, v: unknown): Q;
  order(c: string, o: { ascending: boolean }): Q; limit(n: number): Q;
};

function apply<Qx extends Q>(q: Qx, match: Record<string, unknown> | undefined): Qx {
  let out: Q = q;
  for (const [k, cond] of Object.entries(match ?? {})) {
    if (cond === undefined) continue;
    if (cond === null) out = out.is(k, null);
    else if (typeof cond === "object" && !Array.isArray(cond)) {
      const c = cond as { in?: unknown[]; gte?: unknown; lte?: unknown };
      if (c.in) out = out.in(k, c.in);
      if (c.gte !== undefined) out = out.gte(k, c.gte);
      if (c.lte !== undefined) out = out.lte(k, c.lte);
    } else out = out.eq(k, cond);
  }
  return out as Qx;
}

function fail(table: string, error: { code?: string; message: string }): never {
  if (error.code === "23505") throw new ConflictError(`${table}: duplicate`);
  throw new Error(`voices db (${table}): ${error.code ?? ""} ${error.message}`.slice(0, 300));
}

export class SupabaseRepo implements VoicesRepo {
  readonly kind = "supabase" as const;
  constructor(private db: SupabaseClient) {}

  async insert<N extends TableName>(table: N, row: Partial<TableMap[N]>): Promise<TableMap[N]> {
    const { data, error } = await this.db.from(table).insert(row as never).select().single();
    if (error) fail(table, error);
    return data as TableMap[N];
  }
  async update<N extends TableName>(table: N, match: Filter<TableMap[N]>, patch: Partial<TableMap[N]>): Promise<TableMap[N][]> {
    const q = apply(this.db.from(table).update(patch as never) as unknown as Q, match as Record<string, unknown>) as unknown as { select(): Promise<{ data: unknown; error: { code?: string; message: string } | null }> };
    const { data, error } = await q.select();
    if (error) fail(table, error);
    return (data ?? []) as TableMap[N][];
  }
  async find<N extends TableName>(table: N, match?: Filter<TableMap[N]>, opts?: { order?: keyof TableMap[N] & string; desc?: boolean; limit?: number }): Promise<TableMap[N][]> {
    let q = apply(this.db.from(table).select("*") as unknown as Q, match as Record<string, unknown>);
    if (opts?.order) q = q.order(opts.order, { ascending: !opts.desc });
    q = q.limit(opts?.limit ?? 1000);
    const { data, error } = (await (q as unknown as Promise<{ data: unknown; error: { code?: string; message: string } | null }>));
    if (error) fail(table, error);
    return (data ?? []) as TableMap[N][];
  }
  async one<N extends TableName>(table: N, match: Filter<TableMap[N]>): Promise<TableMap[N] | null> {
    return (await this.find(table, match, { limit: 1 }))[0] ?? null;
  }
  async postLedger(tx: LedgerTx) {
    assertBalanced(tx);
    const { data, error } = await this.db.rpc("voice_post_ledger", {
      p_key: tx.key, p_kind: tx.kind, p_purchase: tx.purchase_id, p_memo: tx.memo,
      p_entries: tx.entries.map((e) => ({ account: e.account, kind: e.kind, amount: e.amount, line: e.line, creator_id: e.creator_id ?? "", workspace_id: e.workspace_id ?? "", bucket: e.bucket ?? "" })),
    });
    if (error) fail("voice_post_ledger", error);
    const row = (Array.isArray(data) ? data[0] : data) as { transaction_id: string; duplicate: boolean };
    return { transactionId: row.transaction_id, duplicate: row.duplicate };
  }
  async takeAllowance(workspaceId: string, units: number) {
    const { data, error } = await this.db.rpc("voice_take_allowance", { p_workspace: workspaceId, p_units: units });
    if (error) fail("voice_take_allowance", error);
    return data === true;
  }
  async restoreAllowance(workspaceId: string, units: number) {
    const { error } = await this.db.rpc("voice_restore_allowance", { p_workspace: workspaceId, p_units: units });
    if (error) fail("voice_restore_allowance", error);
  }
  async leaseJob(jobId: string, leaseMs: number) {
    const { data, error } = await this.db.rpc("voice_lease_job", { p_job: jobId, p_lease_ms: leaseMs });
    if (error) fail("voice_lease_job", error);
    return data === true;
  }
  async putObject(bucket: string, path: string, body: Uint8Array, mime: string) {
    const { error } = await this.db.storage.from(bucket).upload(path, body, { contentType: mime, upsert: false });
    if (error) throw new Error(`storage upload failed (${bucket})`);
  }
  async getObject(bucket: string, path: string) {
    const { data, error } = await this.db.storage.from(bucket).download(path);
    if (error || !data) return null;
    return { body: new Uint8Array(await data.arrayBuffer()), mime: data.type || "application/octet-stream" };
  }
  async signedUrl(bucket: string, path: string, ttl: number) {
    const { data, error } = await this.db.storage.from(bucket).createSignedUrl(path, ttl);
    if (error || !data) throw new Error(`signed url failed (${bucket})`);
    return data.signedUrl;
  }
  async deleteObject(bucket: string, path: string) {
    await this.db.storage.from(bucket).remove([path]);
  }
}
