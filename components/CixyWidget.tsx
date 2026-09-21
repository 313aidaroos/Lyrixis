"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { CixyChat } from "@/components/CixyChat";
import { CixyCustomizer } from "@/components/CixyCustomizer";

export function CixyWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [panel, setPanel] = useState<"chat" | "look">("chat");

  // The /cixy page is the full-size Cixy; do not show a second launcher there.
  if (pathname === "/cixy") return null;

  return (
    <>
      {open && (
        <div
          role="dialog"
          aria-label="Cixy — Lyrixis native AI"
          className="fixed bottom-24 right-4 z-50 flex h-[580px] w-[min(440px,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl border border-line bg-[#09081e]/95 shadow-2xl shadow-violet/30 backdrop-blur-2xl"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-black/40 px-4 py-3">
            <div>
              <p className="font-display text-sm font-semibold tracking-wide flex items-center gap-2">
                <span className="grad-text text-base">◈</span> Cixy
              </p>
              <p className="text-[11px] text-ink-3">Lyrixis native AI · A Apixis Company</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <button
                type="button"
                onClick={() => setPanel("chat")}
                className={panel === "chat" ? "text-cyan" : "text-ink-2 hover:text-ink"}
                aria-pressed={panel === "chat"}
              >
                Chat
              </button>
              <button
                type="button"
                onClick={() => setPanel("look")}
                className={panel === "look" ? "text-cyan" : "text-ink-2 hover:text-ink"}
                aria-pressed={panel === "look"}
              >
                Look
              </button>
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
          {panel === "look" ? <CixyCustomizer compact /> : <CixyChat />}
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
