import type { CSSProperties } from "react";
import { CIXY_MOODS, type CixyMoodId } from "@/lib/cixy-customizer";

/** Signature sprite sheet only. Wardrobe layers are not drawn here. */
export function CixySignature({ mood, className = "" }: { mood: CixyMoodId; className?: string }) {
  const frame = CIXY_MOODS.find((item) => item.id === mood) ?? CIXY_MOODS[0];

  return (
    <div
      role="img"
      aria-label={`Cixy ${frame.label.toLowerCase()}`}
      className={`cixy-signature is-live ${className}`}
      style={{ "--cixy-frame": `${frame.frame * 25}%` } as CSSProperties}
    />
  );
}
