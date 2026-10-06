"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { CixyChat } from "@/components/CixyChat";
import { CIXY_ASK_EVENT, type CixyAskDetail } from "@/lib/cixy-page-help";

export function CixyWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [seed, setSeed] = useState<{ text: string; n: number }>({ text: "", n: 0 });
  const hidden =
    pathname === "/cixy" || pathname === "/login" || pathname === "/signup" || pathname === "/set-password";

  // 2026-10-05 Grok: the per-page Cixy help ("Need help?") opens this chat with its question filled in.
  useEffect(() => {
    if (hidden) return;
    const onAsk = (event: Event) => {
      const detail = (event as CustomEvent<CixyAskDetail>).detail;
      if (detail) detail.handled = true;
      setSeed((current) => ({ text: detail?.question ?? "", n: current.n + 1 }));
      setOpen(true);
    };
    window.addEventListener(CIXY_ASK_EVENT, onAsk);
    return () => window.removeEventListener(CIXY_ASK_EVENT, onAsk);
  }, [hidden]);

  // The /cixy page is the full-size Cixy; do not show a second launcher there.
  if (pathname === "/cixy") return null;
  // 2026-09-28 Grok Developer Bot: sign-in pages have their own "Ask Cixy" card; one Cixy per screen.
  if (pathname === "/login" || pathname === "/signup" || pathname === "/set-password") return null;

  return (
    <>
      {open && (
        <div
          role="dialog"
          aria-label="Cixy — Lyrixis native AI"
          className="fixed bottom-24 right-4 z-50 flex h-[580px] w-[min(440px,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl border border-line bg-[#09081e]/95 shadow-2xl shadow-violet/30 backdrop-blur-2xl"
        >
          <div className="flex items-center justify-between border-b border-line px-5 py-3.5 bg-black/40">
            <div>
              <p className="font-display text-sm font-semibold tracking-wide flex items-center gap-2">
                <span className="grad-text text-base">◈</span> Cixy
              </p>
              <p className="text-[11px] text-ink-3">Lyrixis native AI · A Apixis Company</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <Link href="/cixy" className="text-ink-2 hover:text-cyan transition" onClick={() => setOpen(false)}>
                Open full ↗
              </Link>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1 text-ink-2 hover:bg-white/10 hover:text-ink transition"
                aria-label="Close Cixy"
              >
                ✕
              </button>
            </div>
          </div>
          <CixyChat key={seed.n} initialInput={seed.text} />
        </div>
      )}

      {/* Floating launcher with tooltip */}
      <div className="fixed bottom-6 right-5 z-50 flex items-center gap-3">
        {hovered && !open && (
          <div className="glass pointer-events-none rounded-xl px-3.5 py-1.5 font-mono text-xs text-ink-2 shadow-lg animate-in fade-in slide-in-from-right-2">
            Ask Cixy about this catalog
          </div>
        )}
        <button
          type="button"
          data-cixy-launcher
          onClick={() => setOpen((value) => !value)}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          aria-expanded={open}
          aria-label={open ? "Close Cixy" : "Ask Cixy about this catalog"}
          className="btn-primary btn-pulse flex h-14 w-14 items-center justify-center rounded-full p-0 text-xl font-bold transition-transform hover:scale-105 active:scale-95"
        >
          <span className="text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.7)]">◈</span>
        </button>
      </div>
    </>
  );
}
