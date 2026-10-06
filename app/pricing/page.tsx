import { EnterpriseInquiryForm } from "@/components/EnterpriseInquiryForm";
import { PlanFaq } from "@/components/PlanFaq";
import { PricingPlans } from "@/components/PricingPlans";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteNav } from "@/components/SiteNav";
import { ALL_ACCESS_MONTHLY_USD, PAYMENT_CHOICE, TRACK_UNLOCK_IXIS } from "@/lib/ixis-pricing";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Pricing — Lyrixis",
  description: `Lyrixis All-Access is $${ALL_ACCESS_MONTHLY_USD} a month, or $3 per song (${TRACK_UNLOCK_IXIS} Ixis). Labels and companies use Contact sales. Pay by card or with Ixis.`,
};

export default function PricingPage() {
  return (
    <div>
      <SiteNav />
      <main className="mx-auto max-w-6xl px-6 py-16">
        <div className="text-center">
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-cyan">Pricing</p>
          <h1 className="mt-3 font-display text-4xl font-extrabold sm:font-marquee sm:text-5xl">
            A plan, a song, <span className="grad-text">or your company.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-ink-2">{PAYMENT_CHOICE}</p>
        </div>
        <div className="mt-12">
          <PricingPlans />
        </div>
        <div id="contact-sales" className="mt-16 scroll-mt-24">
          <EnterpriseInquiryForm />
        </div>
        <div className="mt-16">
          <PlanFaq />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
