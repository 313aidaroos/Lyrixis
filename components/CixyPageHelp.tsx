"use client";

// 2026-10-05 Grok: per-page "Need help?" from Cixy, ported from Socixis CixyPageHelp (PR #76).
// Small real Cixy photo (bottom-left, so it never covers the ◈ chat launcher on the right) that opens
// step-by-step directions for the page you're on. "Ask Cixy" opens the existing Cixy chat.
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { CIXY_ASK_EVENT, CIXY_AVATAR_SRC, helpForPath, type CixyAskDetail } from "@/lib/cixy-page-help";
import { PLAN_FAQ } from "@/lib/ixis-pricing";

export function CixyHelpAvatar({ size = 36 }: { size?: number }) {
  return (
    // Shared family photo, never an SVG.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={CIXY_AVATAR_SRC}
      alt="Cixy"
      width={size}
      height={size}
      decoding="async"
      className="flex-none rounded-full border border-line object-cover shadow-lg shadow-violet/20"
      style={{ width: size, height: size }}
    />
  );
}

export function CixyPageHelp() {
  const pathname = usePathname() || "/";
  const { route, entry } = helpForPath(pathname);
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");

  useEffect(() => {
    setOpen(false);
    setNote("");
  }, [route]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  function ask(question = "") {
    const detail: CixyAskDetail = { question: question.trim(), handled: false };
    window.dispatchEvent(new CustomEvent(CIXY_ASK_EVENT, { detail }));
    if (detail.handled) {
      setOpen(false);
      return;
    }
    // No floating chat on this page (/cixy has the full chat; sign-in pages have their own Cixy card).
    const target =
      document.querySelector<HTMLElement>("#ask-cixy") ??
      document.querySelector<HTMLInputElement>("main input[placeholder^='Ask Cixy']");
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      if (target instanceof HTMLInputElement) {
        if (question) {
          // React-controlled input: use the native setter + an input event so the chat state updates.
          Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(target, question);
          target.dispatchEvent(new Event("input", { bubbles: true }));
        }
        target.focus();
      }
      setOpen(false);
      return;
    }
    setNote("Open the Cixy page to chat.");
    window.location.href = "/cixy";
  }

  return (
    <div className="fixed bottom-6 left-4 z-40 flex max-w-[calc(100vw-6.5rem)] flex-col items-start gap-3" data-help-route={route}>
      {open && (
        <section
          id="cixy-page-help"
          aria-labelledby="cixy-page-help-title"
          className="glass max-h-[70vh] w-[min(380px,calc(100vw-2rem))] overflow-y-auto rounded-2xl p-5"
        >
          <div className="flex items-start gap-3">
            <CixyHelpAvatar size={48} />
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[11px] uppercase tracking-widest text-ink-3">Cixy · How this page works</p>
              <h2 id="cixy-page-help-title" className="mt-1 font-display text-lg font-bold leading-tight">
                {entry.title}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1 text-ink-2 transition hover:bg-white/10 hover:text-ink"
              aria-label="Close help"
            >
              ✕
            </button>
          </div>
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-ink-2 marker:text-cyan">
            {entry.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          {entry.tips.length > 0 && (
            <ul className="mt-4 space-y-1 border-t border-line pt-3 text-xs text-ink-3">
              {entry.tips.map((tip) => (
                <li key={tip}>
                  <span className="grad-text">◈</span> {tip}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 space-y-2 border-t border-line pt-3">
            <p className="font-mono text-[11px] uppercase tracking-widest text-ink-3">FAQ</p>
            {PLAN_FAQ.map((item) => (
              <details key={item.q} className="text-sm">
                <summary className="cursor-pointer text-ink">{item.q}</summary>
                <p className="mt-1 text-xs leading-relaxed text-ink-3">{item.a}</p>
              </details>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {entry.suggestions.map((question) => (
              <button
                key={question}
                type="button"
                onClick={() => ask(question)}
                className="rounded-lg border border-line bg-white/[0.03] px-2.5 py-1 text-left text-xs text-ink-2 transition hover:border-violet hover:text-ink"
              >
                {question}
              </button>
            ))}
          </div>
          <button type="button" className="btn-primary mt-4 w-full px-4 py-2 text-sm" onClick={() => ask()}>
            Ask Cixy <span className="arrow">→</span>
          </button>
          {note && <p className="mt-2 text-xs text-ink-3">{note}</p>}
        </section>
      )}
      <button
        type="button"
        aria-expanded={open}
        aria-controls="cixy-page-help"
        onClick={() => setOpen((value) => !value)}
        className="glass flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-4 text-sm text-ink-2 transition hover:text-ink"
      >
        <CixyHelpAvatar size={36} />
        <span>{open ? "Hide help" : "Need help?"}</span>
      </button>
    </div>
  );
}
