// Payment port. Live = the shared Apixis Wallet client (lib/apixis-wallet.ts, unchanged).
// Demo = in-memory "demo Ixis" for previews/tests: never real money, labeled everywhere.
import * as wallet from "@/lib/apixis-wallet";

export type Hold = { reservationId: string; ixis: number };
export type HoldResult = { ok: true; hold: Hold } | { ok: false; insufficient: true; needed: number };

export interface WalletPort {
  readonly isDemo: boolean;
  /** Canonical Wallet price for a product key (public quote). */
  price(productKey: string): Promise<number>;
  /** quote → reserve. Idempotent on idempotencyKey (≤ 80 chars). */
  hold(owner: string, productKey: string, idempotencyKey: string): Promise<HoldResult>;
  capture(reservationId: string): Promise<{ receiptId: string }>;
  release(reservationId: string): Promise<void>;
  status(reservationId: string): Promise<"held" | "expired" | "captured" | "released" | "unknown">;
  /**
   * Full redeem for instant, short actions (paid auditions): reserve → provision → capture,
   * release on failure. Delegates to the shared SDK's redeem() in live mode.
   */
  redeem<T>(owner: string, productKey: string, idempotencyKey: string, provision: () => Promise<T>): Promise<{ ok: true; receiptId: string; result: T } | { ok: false; insufficient: true; needed: number }>;
}

export function liveWallet(): WalletPort {
  return {
    isDemo: false,
    async price(productKey) { return (await wallet.quote(productKey)).xp; },
    async hold(owner, productKey, idempotencyKey) {
      try {
        const r = await wallet.reserve(owner, productKey, idempotencyKey);
        return { ok: true, hold: { reservationId: r.reservationId, ixis: r.ixis } };
      } catch (e) {
        if (e instanceof wallet.WalletError && e.insufficient) {
          const q = await wallet.quote(productKey).catch(() => null);
          return { ok: false, insufficient: true, needed: q?.xp ?? 0 };
        }
        throw e;
      }
    },
    async capture(id) {
      try {
        const c = await wallet.capture(id);
        return { receiptId: c.receiptId };
      } catch (e) {
        // A lost response on a capture that DID go through: reconcile instead of failing.
        if (e instanceof wallet.WalletError && e.code === "already_captured") {
          const s = await wallet.reservationStatus(id);
          return { receiptId: s.receiptId ?? "" };
        }
        throw e;
      }
    },
    async release(id) {
      try { await wallet.release(id); } catch (e) {
        if (e instanceof wallet.WalletError && e.code === "already_released") return;
        throw e;
      }
    },
    async status(id) {
      try { return (await wallet.reservationStatus(id)).status; } catch { return "unknown"; }
    },
    async redeem(owner, productKey, idempotencyKey, provision) {
      const r = await wallet.redeem({ owner, productKey, idempotencyKey, provision: async () => provision() });
      if (!r.ok) return { ok: false, insufficient: true, needed: r.needed };
      return { ok: true, receiptId: r.receiptId, result: r.result };
    },
  };
}

/** Demo prices mirror the illustrative Voices price list; the real Wallet catalog is the authority. */
export const DEMO_PRICES: Record<string, number> = {
  "lyrixis.voice.generate.60s": 500, "lyrixis.voice.generate.90s": 750, "lyrixis.voice.generate.120s": 1000,
  "lyrixis.voice.generate.150s": 1250, "lyrixis.voice.generate.180s": 1500, "lyrixis.voice.generate.210s": 1750,
  "lyrixis.voice.generate.240s": 2000, "lyrixis.voice.generate.270s": 2250, "lyrixis.voice.generate.300s": 2500,
  "lyrixis.voice.audition": 25, "lyrixis.voice.solo.monthly": 2500, "lyrixis.voice.label.monthly": 15000,
  "lyrixis.voice.overage.solo": 400, "lyrixis.voice.overage.label": 300,
};

export class DemoWallet implements WalletPort {
  readonly isDemo = true;
  balances = new Map<string, number>();
  holds = new Map<string, { owner: string; ixis: number; status: "held" | "captured" | "released"; key: string; receiptId?: string }>();
  captureCalls = 0;
  /** test hooks */
  failNextCapture = 0;
  constructor(private startBalance = 5000, private prices: Record<string, number> = DEMO_PRICES) {}
  private bal(owner: string) { if (!this.balances.has(owner)) this.balances.set(owner, this.startBalance); return this.balances.get(owner)!; }
  async price(productKey: string) { const p = this.prices[productKey]; if (p === undefined) throw new Error(`Unknown product ${productKey}`); return p; }
  async hold(owner: string, productKey: string, idempotencyKey: string): Promise<HoldResult> {
    if (idempotencyKey.length > 80) throw new Error("idempotency key over 80 chars");
    for (const [id, h] of this.holds) if (h.key === idempotencyKey && h.status !== "released") return { ok: true, hold: { reservationId: id, ixis: h.ixis } };
    const ixis = await this.price(productKey);
    if (this.bal(owner) < ixis) return { ok: false, insufficient: true, needed: ixis };
    this.balances.set(owner, this.bal(owner) - ixis);
    const id = `demo_res_${this.holds.size + 1}_${idempotencyKey.slice(-6)}`;
    this.holds.set(id, { owner, ixis, status: "held", key: idempotencyKey });
    return { ok: true, hold: { reservationId: id, ixis } };
  }
  async capture(id: string) {
    this.captureCalls += 1;
    const h = this.holds.get(id);
    if (!h) throw new Error("unknown reservation");
    if (this.failNextCapture > 0) { this.failNextCapture -= 1; throw new Error("demo capture failure"); }
    if (h.status === "released") throw Object.assign(new Error("already_released"), { code: "already_released" });
    if (h.status === "held") { h.status = "captured"; h.receiptId = `demo_rcpt_${id}`; }
    return { receiptId: h.receiptId! };
  }
  async release(id: string) {
    const h = this.holds.get(id);
    if (!h || h.status !== "held") return;
    h.status = "released";
    this.balances.set(h.owner, this.bal(h.owner) + h.ixis);
  }
  async status(id: string) { return this.holds.get(id)?.status ?? "unknown"; }
  async redeem<T>(owner: string, productKey: string, idempotencyKey: string, provision: () => Promise<T>) {
    const r = await this.hold(owner, productKey, idempotencyKey);
    if (!r.ok) return r;
    let result: T;
    try { result = await provision(); } catch (e) { await this.release(r.hold.reservationId); throw e; }
    const c = await this.capture(r.hold.reservationId);
    return { ok: true as const, receiptId: c.receiptId, result };
  }
  balance(owner: string) { return this.bal(owner); }
}
