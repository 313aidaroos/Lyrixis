import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteNav } from "@/components/SiteNav";

const TIERS = [
  {
    name: "Artist",
    price: "$2.99",
    note: "per track unlock",
    points: ["One recording", "Synced lyrics preview", "TXT / SRT / LRC / JSON", "Public catalog search"],
  },
  {
    name: "Label",
    price: "Pilot",
    note: "catalog batch",
    points: ["Bulk CSV ingest", "ISRC / ISWC hygiene", "Shared workspace (soon)", "Priority onboarding"],
  },
  {
    name: "Enterprise",
    price: "Custom",
    note: "API + volume",
    points: ["Private API", "Million-track catalogs", "Contracted lyrics licenses", "Dedicated success"],
  },
];

export default function PricingPage() {
  return (
    <div>
      <SiteNav />
      <main className="mx-auto max-w-6xl px-6 py-16">
        <h1 className="font-display text-4xl font-bold">Pricing</h1>
        <p className="mt-3 max-w-2xl text-ink-2">
          Pay per song when you unlock a transcription. Catalog search is free. Enterprise lyrics
          stay on a license path — we do not sell scraped commercial lyrics.
        </p>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {TIERS.map((tier) => (
            <div key={tier.name} className="card glass-lift">
              <p className="text-sm text-ink-3">{tier.name}</p>
              <p className="mt-2 font-display text-3xl">{tier.price}</p>
              <p className="text-sm text-ink-3">{tier.note}</p>
              <ul className="mt-6 space-y-2 text-sm text-ink-2">
                {tier.points.map((point) => (
                  <li key={point}>• {point}</li>
                ))}
              </ul>
              <Link href="/waitlist" className="btn-primary mt-8 w-full">
                Join waitlist
              </Link>
            </div>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
