import { PricingCalculator } from "@/components/PricingCalculator";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteNav } from "@/components/SiteNav";

export const dynamic = "force-dynamic";

export default function PricingPage() {
  return (
    <div>
      <SiteNav />
      <main className="mx-auto max-w-6xl px-6 py-16">
        <div className="text-center">
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-cyan">Volume Economics</p>
          <h1 className="mt-3 font-display text-4xl font-extrabold sm:text-5xl">
            Pay for what you <span className="grad-text">process.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-ink-2">
            No seat tiers, no arbitrary lock-in. Volume discounts apply automatically as your ingest scale increases.
          </p>
        </div>

        <div className="mt-12">
          <PricingCalculator />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
