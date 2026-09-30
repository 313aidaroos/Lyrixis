"use client";
// AppNav link to the person's own agent in the Apixis world. Says "Your agent is in the Apixis world"
// once Apixis.dev has created it; otherwise the plain "Apixis World" entry. Grok (Lyrixis Lead), 2026-09-29.
import { useEffect, useState } from "react";
import { enterApixisUrl } from "@/lib/apixis-world";
import { fetchWorldAgent } from "@/lib/apixis-world-client";

export function ApixisWorldLink({ className }: { className?: string }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    void fetchWorldAgent().then((v) => { if (!cancelled) setReady(v?.status === "ready"); });
    return () => { cancelled = true; };
  }, []);
  return (
    <a href={enterApixisUrl("lyrixis")} className={className} data-state={ready ? "ready" : "invite"}>
      {ready ? "Your agent is in the Apixis world ↗" : "Apixis World ↗"}
    </a>
  );
}
