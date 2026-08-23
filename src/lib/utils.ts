import { ConfidenceBand } from "@/types";

export function confidenceToBand(score: number): ConfidenceBand {
  if (score >= 0.85) return "high";
  if (score >= 0.65) return "medium";
  return "review";
}

export function formatBandLabel(band: ConfidenceBand): string {
  switch (band) {
    case "high":
      return "High confidence";
    case "medium":
      return "Medium confidence";
    case "review":
      return "Needs review";
  }
}

export function formatMs(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  const frac = Math.floor((ms % 1000) / 10);
  return `${min}:${String(sec).padStart(2, "0")}.${String(frac).padStart(2, "0")}`;
}

export function formatSrtTime(ms: number): string {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const f = ms % 1000;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(f).padStart(3, "0")}`;
}

export function formatLrcTime(ms: number): string {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const cs = Math.floor((ms % 1000) / 10);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

import { randomBytes } from "crypto";

export function publicIdNode(): string {
  return "trx_" + randomBytes(8).toString("hex");
}
