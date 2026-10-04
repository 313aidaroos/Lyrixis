import { createHash } from "node:crypto";
import type { TermsSnapshot } from "./types";

/** NFC-normalize so the same Arabic text always hashes the same (composed vs decomposed forms). */
export function normalizeScript(body: string): string {
  return body.normalize("NFC").replace(/\r\n/g, "\n").trim();
}

export function sha256(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

export function scriptHash(body: string): string {
  return sha256(normalizeScript(body));
}

/** Canonical JSON (sorted keys) so the snapshot hash is stable. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj).sort().filter((k) => obj[k] !== undefined).map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`).join(",")}}`;
}

export function termsHash(snapshot: TermsSnapshot): string {
  return sha256(canonicalJson(snapshot));
}

/** Plain-language receipt lines. Draft wording — requires legal review. */
export function licenseSummary(s: TermsSnapshot): string[] {
  return [
    `Voice: ${s.voice.display_name} by ${s.creator.display_name} (permissions v${s.voice.permission_version}).`,
    `Use: ${s.declared_use}${s.publication ? ", published" : ", not for publication"}; channels: ${s.channels.join(", ") || "none declared"}.`,
    `Territory: ${s.territory}. Term: ${s.term_months} month(s). Non-exclusive.`,
    `Price: ${s.price.ixis.toLocaleString("en-US")} Ixis (≈ $${s.price.usd_equivalent.toFixed(2)}) for up to ${s.price.billed_seconds}s, paid by ${s.price.funding}${s.price.illustrative ? " — illustrative price" : ""}.`,
    `Creator compensation: rule v${s.creator_compensation.comp_rule_version} (${s.creator_compensation.creator_share_bps / 100}% of the licensing amount after the ${s.creator_compensation.apixis_fee_bps / 100}% Apixis fee and provider cost).`,
    `No resale of the voice itself, no training on this audio, no impersonation or political use.`,
    `Terms ${s.license_terms_version} — draft, requires legal review.`,
  ];
}
