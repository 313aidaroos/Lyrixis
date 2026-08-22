import Link from "next/link";

export function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-line/50 bg-bg/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2 font-display text-lg font-bold">
          <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden>
            <rect width="32" height="32" rx="8" fill="#07060B" />
            <path d="M12 7v13.5" stroke="#A855F7" strokeWidth="3" strokeLinecap="round" />
            <path d="M12 20.5h9" stroke="#22D3EE" strokeWidth="3" strokeLinecap="round" />
            <circle cx="9.5" cy="21.5" r="3.5" fill="#E040A0" />
          </svg>
          Lyrixis
        </Link>
        <nav className="flex items-center gap-6 text-sm text-ink-2">
          <Link href="/upload" className="hover:text-ink">
            Upload
          </Link>
          <Link href="/dashboard" className="hover:text-ink">
            Dashboard
          </Link>
          <Link href="/upload" className="btn-primary !px-4 !py-2 text-sm">
            Process a song
          </Link>
        </nav>
      </div>
    </header>
  );
}
