"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { CixyChat } from "@/components/CixyChat";

export function CixyWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // The /cixy page is the full-size Cixy; do not show a second launcher there.
  if (pathname === "/cixy") return null;

  return (
    <>
      {open && (
        <div
          role="dialog"
          aria-label="Cixy — Lyrixis native AI"
          className="fixed bottom-24 right-4 z-50 flex h-[560px] w-[min(400px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#0a0a12]/95 shadow-2xl shadow-violet/30 backdrop-blur-xl"
        >
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div>
              <p className="font-display text-sm font-semibold tracking-wide">
                <span className="grad-text">◈</span> Cixy
              </p>
              <p className="text-[11px] text-ink-3">Lyrixis native AI · A Apixis Company</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <Link href="/cixy" className="text-ink-2 hover:text-white" onClick={() => setOpen(false)}>
                Open full
              </Link>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md px-2 py-1 text-ink-2 hover:bg-white/10 hover:text-white"
                aria-label="Close Cixy"
              >
                ✕
              </button>
            </div>
          </div>
          <CixyChat />
        </div>
      )}
      <button
        type="button"
        data-cixy-launcher
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={open ? "Close Cixy" : "Open Cixy, Lyrixis native AI"}
        className="btn-primary btn-pulse fixed bottom-6 right-4 z-50 h-14 w-14 rounded-full p-0 text-xl"
      >
        ◈
      </button>
    </>
  );
}
