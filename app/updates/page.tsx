import { SiteFooter } from "@/components/SiteFooter";
import { SiteNav } from "@/components/SiteNav";

export default function UpdatesPage() {
  return (
    <div>
      <SiteNav />
      <main className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="font-display text-4xl font-bold">Updates</h1>
        <p className="mt-3 text-ink-2">A public changelog will live here. For now, the catalog is the news.</p>
        <article className="card mt-8">
          <p className="text-xs text-ink-3">Now</p>
          <h2 className="mt-2 font-display text-xl">Public catalog + waitlist</h2>
          <p className="mt-2 text-ink-2">
            Search, licensed-safe ingest, and early access are live. Commercial lyrics still require a
            rights path.
          </p>
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
