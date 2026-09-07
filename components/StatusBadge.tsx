import type { ConfidenceBand, TrackStatus } from "@/types";

const STATUS_LABEL: Record<TrackStatus, string> = {
  uploaded: "Uploaded",
  queued: "Queued",
  processing: "Processing",
  transcribing: "Transcribing",
  aligning: "Aligning",
  analyzing: "Analyzing",
  completed: "Completed",
  failed: "Failed",
  manual_review: "Needs review",
};

export function StatusBadge({ status }: { status: TrackStatus }) {
  const tone =
    status === "completed"
      ? "text-emerald-300"
      : status === "failed"
        ? "text-rose-300"
        : status === "manual_review"
          ? "text-amber-300"
          : "text-cyan-300";
  return <span className={`font-mono text-xs uppercase tracking-wide ${tone}`}>{STATUS_LABEL[status]}</span>;
}

export function ConfidenceBadge({ band }: { band: ConfidenceBand | null }) {
  if (!band) return null;
  const cls = band === "high" ? "band-high" : band === "medium" ? "band-medium" : "band-review";
  const label = band === "high" ? "High" : band === "medium" ? "Medium" : "Review";
  return <span className={cls}>{label}</span>;
}
