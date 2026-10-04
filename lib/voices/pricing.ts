import type { PricingConfigRow, PackageRow } from "./types";
import { WALLET_PRODUCTS, IXIS_PER_USD } from "./config";

/** Rough speaking rate used to bill before audio exists. Arabic ≈ 12 chars/s, English ≈ 15 chars/s. */
export function estimateSeconds(script: string): number {
  const text = script.normalize("NFC").trim();
  if (!text) return 0;
  const arabic = (text.match(/[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/g) ?? []).length;
  const letters = text.replace(/\s+/g, " ").length;
  const arShare = letters ? arabic / letters : 0;
  const cps = 12 * arShare + 15 * (1 - arShare);
  return Math.max(1, Math.ceil(letters / cps));
}

export function billedSeconds(seconds: number, cfg: PricingConfigRow): number {
  if (seconds <= cfg.payg_base_seconds) return cfg.payg_base_seconds;
  const extra = Math.ceil((seconds - cfg.payg_base_seconds) / cfg.payg_step_seconds);
  return cfg.payg_base_seconds + extra * cfg.payg_step_seconds;
}

/** Solo PAYG: base price up to base seconds, plus step price per started extra step. */
export function paygPriceIxis(seconds: number, cfg: PricingConfigRow): number {
  if (seconds > cfg.payg_max_seconds) throw new RangeError(`too_long: max ${cfg.payg_max_seconds}s per voiceover`);
  if (seconds <= cfg.payg_base_seconds) return cfg.payg_base_ixis;
  const extra = Math.ceil((seconds - cfg.payg_base_seconds) / cfg.payg_step_seconds);
  return cfg.payg_base_ixis + extra * cfg.payg_step_ixis;
}

/** Wallet product for a billed duration. Tier keys have fixed Wallet prices (500 + 250/30s). */
export function walletProductFor(billed: number): string {
  const tier = WALLET_PRODUCTS.generateTiers.find((t) => t.seconds >= billed);
  if (!tier) throw new RangeError("too_long");
  return tier.key;
}

/** Allowance units: one voiceover = up to 60s; each further started 60s is another unit. */
export function allowanceUnits(seconds: number): number {
  return Math.max(1, Math.ceil(seconds / 60));
}

/** Ixis value recognized per allowance unit (for the ledger), floor of price / allowance. */
export function allowanceUnitValue(pkg: PackageRow): number {
  return Math.floor(pkg.monthly_price_ixis / pkg.voiceovers_per_month);
}

export function ixisToUsd(ixis: number): number {
  return Math.round((ixis / IXIS_PER_USD) * 100) / 100;
}

export function usdMicrosToIxisCeil(micros: number): number {
  return Math.ceil((micros / 1_000_000) * IXIS_PER_USD);
}

export function formatIxis(n: number): string {
  return `${n.toLocaleString("en-US")} Ixis`;
}
