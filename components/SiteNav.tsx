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
      ? "text-white"
      : "text-ink-2 hover:text-white";

  async function signOut() {
    try {
      const supabase = createBrowserSupabaseClient();
      await supabase.auth.signOut();
    } finally {
      window.location.href = "/";
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#05050a]/75 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
        <Link href="/" className="flex items-center gap-3">
          <img
            src="/lyrixis-mark.png"
            alt=""
            className="h-10 w-10 rounded-xl object-cover ring-1 ring-white/10"
          />
          <span className="font-display text-sm font-semibold tracking-[0.22em]">LYRIXIS</span>
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
          {email ? (
            <>
              <Link href="/dashboard" className={on("/dashboard")}>
                Dashboard
              </Link>
              <button type="button" onClick={() => void signOut()} className="text-ink-2 hover:text-white">
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
          className="rounded-lg border border-white/15 px-3 py-1 text-sm md:hidden"
          aria-label="Menu"
          onClick={() => setOpen((value) => !value)}
        >
          Menu
        </button>
      </div>
      {open && (
        <div className="flex flex-col gap-3 border-t border-white/10 px-6 py-4 text-sm md:hidden">
          <Link href="/catalog">Catalog</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/vision">Vision</Link>
          <Link href="/waitlist">Waitlist</Link>
          <Link href="/login">Sign in</Link>
        </div>
      )}
    </header>
  );
}
