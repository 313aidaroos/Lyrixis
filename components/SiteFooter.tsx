import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-line bg-white/60">
      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-12 sm:grid-cols-3">
        <div>
          <p className="font-display text-sm tracking-[0.22em]">LYRIXIS</p>
          <p className="mt-3 max-w-xs text-sm text-ink-3">
            The intelligence layer for music catalogs. Built with care for music.
          </p>
        </div>
        <div className="flex flex-col gap-2 text-sm text-ink-2">
          <Link href="/catalog">Catalog</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/vision">Vision</Link>
          <Link href="/cixy">◈ Cixy</Link>
          <Link href="/waitlist">Waitlist</Link>
          <Link href="/updates">Updates</Link>
        </div>
        <div className="flex flex-col gap-2 text-sm text-ink-2">
          <a href="mailto:Lyrixis@Apixis.dev">Lyrixis@Apixis.dev</a>
          <a href="mailto:Lyrixis@Apixis.dev?subject=Terms%20request">Terms</a>
          <a href="mailto:Lyrixis@Apixis.dev?subject=Privacy%20request">Privacy</a>
          <a href="mailto:Lyrixis@Apixis.dev?subject=DMCA%20notice">Copyright / DMCA</a>
        </div>
      </div>
    </footer>
  );
}
