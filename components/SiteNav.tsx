"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export function SiteNav() {
  const pathname = usePathname();
  const [email, setEmail] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    try {
      const supabase = createBrowserSupabaseClient();
      void supabase.auth.getUser().then(({ data }) => {
        if (!cancelled) setEmail(data.user?.email ?? null);
      });
    } catch {
      /* marketing pages still render if auth env is missing */
    }
    return () => {
      cancelled = true;
    };
  }, []);

  const on = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(href))
      ? "text-ink font-medium"
      : "text-ink-2 hover:text-ink";

  async function signOut() {
    try {
      const supabase = createBrowserSupabaseClient();
      await supabase.auth.signOut();
    } finally {
      window.location.href = "/";
    }
  }

  return (
    <header className="sticky top-0 z-40">
      {/* Apixis family strip — top of every page */}
      <div className="border-b border-line/70 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-1.5 text-[11px] tracking-[0.22em] text-ink-3">
          <a href="https://apixis.dev" className="uppercase hover:text-ink">
            <span className="grad-text">◈</span> An Apixis Company
          </a>
          <span className="hidden uppercase sm:inline">Music. Understood.</span>
        </div>
      </div>

      <div className="border-b border-line/70 bg-white/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
          <Link href="/" className="flex items-center gap-3">
            <img src="/lyrixis-mark.png" alt="Lyrixis" className="h-12 w-12 object-contain" />
            <span className="font-display text-sm font-semibold tracking-[0.22em] text-ink">LYRIXIS</span>
          </Link>

          <nav className="hidden items-center gap-6 text-sm md:flex">
            <Link href="/catalog" className={on("/catalog")}>
              Catalog
            </Link>
            <Link href="/pricing" className={on("/pricing")}>
              Pricing
            </Link>
            <Link href="/vision" className={on("/vision")}>
              Vision
            </Link>
            <Link href="/cixy" className={on("/cixy")}>
              <span className="grad-text">◈</span> Cixy
            </Link>
            {email ? (
              <>
                <Link href="/dashboard" className={on("/dashboard")}>
                  Dashboard
                </Link>
                <button type="button" onClick={() => void signOut()} className="text-ink-2 hover:text-ink">
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link href="/waitlist" className={on("/waitlist")}>
                  Waitlist
                </Link>
                <Link href="/login" className={on("/login")}>
                  Sign in
                </Link>
                <Link href="/waitlist" className="btn-primary btn-pulse px-4 py-2 text-sm">
                  Get early access
                </Link>
              </>
            )}
          </nav>

          <button
            type="button"
            className="rounded-lg border border-line px-3 py-1 text-sm md:hidden"
            aria-label="Menu"
            onClick={() => setOpen((value) => !value)}
          >
            Menu
          </button>
        </div>
        {open && (
          <div className="flex flex-col gap-3 border-t border-line px-6 py-4 text-sm md:hidden">
            <Link href="/catalog">Catalog</Link>
            <Link href="/pricing">Pricing</Link>
            <Link href="/vision">Vision</Link>
            <Link href="/cixy">◈ Cixy</Link>
            <Link href="/waitlist">Waitlist</Link>
            <Link href="/login">Sign in</Link>
          </div>
        )}
      </div>
    </header>
  );
}
