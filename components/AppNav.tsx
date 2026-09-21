"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { WALLET_BUY_URL } from "@/lib/wallet";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export function AppNav({ email }: { email?: string | null }) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const linkClass = (href: string) =>
    `text-sm ${pathname === href ? "text-ink" : "text-ink-2 hover:text-ink"}`;

  return (
    <header className="border-b border-line/80 bg-white/75 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <img src="/lyrixis-mark.png" alt="" className="h-11 w-11 rounded-xl object-cover ring-1 ring-black/10" />
          <span className="font-display text-lg font-semibold tracking-[0.18em]">LYRIXIS</span>
        </Link>
        <nav className="flex items-center gap-6">
          <Link href="/" className={linkClass("/")}>
            Catalog
          </Link>
          <Link href="/dashboard" className={linkClass("/dashboard")}>
            Dashboard
          </Link>
          <Link href="/upload" className={linkClass("/upload")}>
            Upload
          </Link>
          <a href="/enterprise" className="text-sm text-ink-2 hover:text-ink">
            Enterprise
          </a>
          <a href={WALLET_BUY_URL} className="text-sm text-ink-2 hover:text-ink">
            Buy Ixis
          </a>
          {email && <span className="hidden text-xs text-ink-3 sm:inline">{email}</span>}
          <button type="button" onClick={() => void signOut()} className="text-sm text-ink-2 hover:text-ink">
            Sign out
          </button>
        </nav>
      </div>
    </header>
  );
}
