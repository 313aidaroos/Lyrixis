// Double-entry earnings ledger (Ixis). Debits > 0, credits < 0; every transaction sums to 0.
// Lines kept separate on purpose: customer payment, tax, licensing amount, creator share,
// provider cost, platform fee, processing fee, refunds, adjustments. Gross is not profit.
import type { LedgerLine, LedgerTxKind, LedgerAccountRow } from "./types";

export interface Posting {
  account: string;
  kind: LedgerAccountRow["kind"];
  amount: number;
  line: LedgerLine;
  creator_id?: string;
  workspace_id?: string;
  bucket?: "pending" | "available" | "paid";
}
export interface LedgerTx { key: string; kind: LedgerTxKind; purchase_id: string | null; memo: string; entries: Posting[] }

export const ACCOUNTS = {
  walletClearing: "wallet_clearing",                 // asset: Ixis captured by the Apixis Wallet for Lyrixis
  apixisFee: "apixis_platform_fee_payable",          // liability: 5% Apixis fee (FEE_BPS=500), settled Wallet-side
  providerPayable: "provider_cost_payable",          // liability: what we owe the voice provider
  lyrixisRevenue: "lyrixis_voice_revenue",           // revenue: Lyrixis margin (not profit; costs live elsewhere)
  refunds: "lyrixis_voice_refunds",                  // contra-revenue
  promoExpense: "lyrixis_promo_allowance_expense",   // expense: admin-granted (manual/demo) allowance
  creator: (id: string, bucket: "pending" | "available" | "paid") => `creator:${id}:${bucket}`,
  allowance: (ws: string) => `workspace:${ws}:allowance_deferred`,
  customerCredit: (ws: string) => `workspace:${ws}:credit`,
} as const;

export interface Split { gross: number; tax: number; processingFee: number; apixisFee: number; providerCost: number; net: number; creatorShare: number; lyrixisMargin: number }

/**
 * Split a licensing amount under a snapshotted comp rule:
 * creator = floor((amount − apixisFee − providerCost) × share), Lyrixis keeps the rest.
 * Tax is not computed yet (blocker: needs tax decision) and processing is charged when the
 * customer buys Ixis on the Wallet, so both are 0 here but kept as explicit lines.
 */
export function splitAmount(amount: number, rule: { creator_share_bps: number; apixis_fee_bps: number }, providerCost: number): Split {
  if (!Number.isInteger(amount) || amount < 0) throw new RangeError("amount must be a non-negative integer");
  const apixisFee = Math.floor((amount * rule.apixis_fee_bps) / 10_000);
  const provider = Math.min(Math.max(0, Math.ceil(providerCost)), amount - apixisFee);
  const net = amount - apixisFee - provider;
  const creatorShare = Math.floor((net * rule.creator_share_bps) / 10_000);
  return { gross: amount, tax: 0, processingFee: 0, apixisFee, providerCost: provider, net, creatorShare, lyrixisMargin: net - creatorShare };
}

function credits(split: Split, creatorId: string): Posting[] {
  const out: Posting[] = [];
  if (split.apixisFee) out.push({ account: ACCOUNTS.apixisFee, kind: "liability", amount: -split.apixisFee, line: "platform_fee" });
  if (split.providerCost) out.push({ account: ACCOUNTS.providerPayable, kind: "liability", amount: -split.providerCost, line: "provider_cost" });
  if (split.creatorShare) out.push({ account: ACCOUNTS.creator(creatorId, "pending"), kind: "liability", amount: -split.creatorShare, line: "creator_share", creator_id: creatorId, bucket: "pending" });
  if (split.lyrixisMargin) out.push({ account: ACCOUNTS.lyrixisRevenue, kind: "revenue", amount: -split.lyrixisMargin, line: "licensing_amount" });
  return out;
}

/** Wallet capture. Idempotent on the reservation id — a duplicate callback posts nothing. */
export function captureTx(p: { purchaseId: string; reservationId: string; creatorId: string; split: Split }): LedgerTx {
  return {
    key: `capture:${p.reservationId}`, kind: "purchase_capture", purchase_id: p.purchaseId, memo: "Wallet capture",
    entries: [{ account: ACCOUNTS.walletClearing, kind: "asset", amount: p.split.gross, line: "customer_payment" }, ...credits(p.split, p.creatorId)],
  };
}

/** Allowance voiceover consumed on a fulfilled job: deferred allowance value is recognized. */
export function allowanceSpendTx(p: { purchaseId: string; workspaceId: string; creatorId: string; split: Split }): LedgerTx {
  return {
    key: `allowance_spend:${p.purchaseId}`, kind: "allowance_spend", purchase_id: p.purchaseId, memo: "Allowance voiceover recognized",
    entries: [{ account: ACCOUNTS.allowance(p.workspaceId), kind: "liability", amount: p.split.gross, line: "customer_payment", workspace_id: p.workspaceId }, ...credits(p.split, p.creatorId)],
  };
}

/** Allowance granted (Wallet subscription when live; admin/manual or demo grant until then). */
export function allowanceTopupTx(p: { key: string; workspaceId: string; valueIxis: number; source: "wallet" | "admin_grant" }): LedgerTx {
  return {
    key: p.key, kind: "allowance_topup", purchase_id: null, memo: `Allowance top-up (${p.source})`,
    entries: [
      { account: p.source === "wallet" ? ACCOUNTS.walletClearing : ACCOUNTS.promoExpense, kind: p.source === "wallet" ? "asset" : "expense", amount: p.valueIxis, line: p.source === "wallet" ? "customer_payment" : "adjustment" },
      { account: ACCOUNTS.allowance(p.workspaceId), kind: "liability", amount: -p.valueIxis, line: p.source === "wallet" ? "customer_payment" : "adjustment", workspace_id: p.workspaceId },
    ],
  };
}

/** Move matured creator earnings pending → available after the hold window. */
export function releaseTx(p: { key: string; creatorId: string; amount: number }): LedgerTx {
  return {
    key: p.key, kind: "earnings_release", purchase_id: null, memo: "Hold window passed",
    entries: [
      { account: ACCOUNTS.creator(p.creatorId, "pending"), kind: "liability", amount: p.amount, line: "creator_share", creator_id: p.creatorId, bucket: "pending" },
      { account: ACCOUNTS.creator(p.creatorId, "available"), kind: "liability", amount: -p.amount, line: "creator_share", creator_id: p.creatorId, bucket: "available" },
    ],
  };
}

/**
 * Refund of a fulfilled purchase: reverse every credit line of the original split and give the
 * customer Lyrixis credit (Wallet has no post-capture refund API yet — blocker). The creator's
 * share is clawed back from the bucket it currently sits in (pending first, then available).
 */
export function refundTx(p: { purchaseId: string; workspaceId: string; creatorId: string; split: Split; creatorPending: number; toAllowance: boolean }): LedgerTx {
  const fromPending = Math.min(p.split.creatorShare, Math.max(0, p.creatorPending));
  const fromAvailable = p.split.creatorShare - fromPending;
  const entries: Posting[] = [];
  if (p.split.apixisFee) entries.push({ account: ACCOUNTS.apixisFee, kind: "liability", amount: p.split.apixisFee, line: "platform_fee" });
  if (p.split.providerCost) entries.push({ account: ACCOUNTS.refunds, kind: "contra_revenue", amount: p.split.providerCost, line: "provider_cost" });
  if (fromPending) entries.push({ account: ACCOUNTS.creator(p.creatorId, "pending"), kind: "liability", amount: fromPending, line: "refund", creator_id: p.creatorId, bucket: "pending" });
  if (fromAvailable) entries.push({ account: ACCOUNTS.creator(p.creatorId, "available"), kind: "liability", amount: fromAvailable, line: "adjustment", creator_id: p.creatorId, bucket: "available" });
  if (p.split.lyrixisMargin) entries.push({ account: ACCOUNTS.refunds, kind: "contra_revenue", amount: p.split.lyrixisMargin, line: "refund" });
  entries.push(p.toAllowance
    ? { account: ACCOUNTS.allowance(p.workspaceId), kind: "liability", amount: -p.split.gross, line: "refund", workspace_id: p.workspaceId }
    : { account: ACCOUNTS.customerCredit(p.workspaceId), kind: "liability", amount: -p.split.gross, line: "refund", workspace_id: p.workspaceId });
  return { key: `refund:${p.purchaseId}`, kind: "refund", purchase_id: p.purchaseId, memo: "Refund as Lyrixis credit (Wallet refund API pending)", entries };
}

export function assertBalanced(tx: LedgerTx): void {
  const sum = tx.entries.reduce((s, e) => s + e.amount, 0);
  if (sum !== 0) throw new Error(`ledger tx ${tx.key} unbalanced by ${sum}`);
  if (tx.entries.some((e) => !Number.isInteger(e.amount) || e.amount === 0)) throw new Error(`ledger tx ${tx.key} has a zero/non-integer line`);
}

/** Liability balances are credit-normal: show them positive. */
export function creditNormal(balance: number): number {
  return balance === 0 ? 0 : -balance;
}
