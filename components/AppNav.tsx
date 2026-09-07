"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
    <header className="border-b border-line/80 bg-[#0c0a14]/90">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/dashboard" className="font-display text-lg font-semibold tracking-wide">
          LYRIXIS
        </Link>
        <nav className="flex items-center gap-6">
          <Link href="/dashboard" className={linkClass("/dashboard")}>
            Dashboard
          </Link>
          <Link href="/upload" className={linkClass("/upload")}>
            Upload
          </Link>
          <a href="/" className="text-sm text-ink-2 hover:text-ink">
            Marketing
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
