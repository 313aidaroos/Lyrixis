import Link from "next/link";

export function CatalogNav() {
  return (
    <header className="border-b border-line/80 bg-[#0c0a14]/90">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="font-display text-lg font-semibold tracking-wide">
          LYRIXIS
        </Link>
        <nav className="flex items-center gap-6">
          <Link href="/" className="text-sm text-ink">
            Catalog
          </Link>
          <Link href="/add" className="text-sm text-ink-2 hover:text-ink">
            Add
          </Link>
          <Link href="/enterprise" className="text-sm text-ink-2 hover:text-ink">
            Enterprise
          </Link>
          <Link href="/login" className="text-sm text-ink-2 hover:text-ink">
            Sign in
          </Link>
        </nav>
      </div>
    </header>
  );
}
