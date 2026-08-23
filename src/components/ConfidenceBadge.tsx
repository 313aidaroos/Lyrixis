import { ConfidenceBand } from "@/types";
import { formatBandLabel } from "@/lib/utils";

export function ConfidenceBadge({ band }: { band: ConfidenceBand }) {
  const cls =
    band === "high"
      ? "band-high"
      : band === "medium"
        ? "band-medium"
        : "band-review";
  return <span className={cls}>{formatBandLabel(band)}</span>;
}
