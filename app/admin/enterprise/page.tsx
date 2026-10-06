import { requireUser } from "@/lib/auth";
import { isEnterpriseAdminEmail } from "@/lib/enterprise-access";
import { listEnterpriseInquiries } from "@/services/enterprise";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteNav } from "@/components/SiteNav";
import { approveInquiryAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminEnterprisePage() {
  const user = await requireUser();
  if (!isEnterpriseAdminEmail(user.email)) {
    return (
      <div>
        <SiteNav />
        <main className="mx-auto max-w-xl px-6 py-24 text-center">
          <h1 className="font-display text-3xl font-bold">Page not found</h1>
          <p className="mt-3 text-ink-2">This page is only for the Lyrixis owner.</p>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const inquiries = await listEnterpriseInquiries();

  return (
    <div>
      <SiteNav />
      <main className="mx-auto max-w-5xl px-6 py-16">
        <p className="font-mono text-xs uppercase tracking-[0.28em] text-cyan">Owner</p>
        <h1 className="mt-3 font-display text-4xl font-bold sm:font-marquee sm:text-5xl">Enterprise requests</h1>
        <p className="mt-4 max-w-2xl text-ink-2">
          Mark a company as Enterprise when you approve it. The contact becomes the owner if that email already has an
          account. Otherwise they get an invite and join when they sign in with that email.
        </p>
        {inquiries.length === 0 ? (
          <p className="card mt-10 text-ink-2">No requests yet. If the table is missing, apply database/migrations/20261006_enterprise_accounts.sql first.</p>
        ) : (
          <div className="mt-10 space-y-4">
            {inquiries.map((row) => (
              <article key={row.id} className="card">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-xl font-bold">{row.companyName}</h2>
                    <p className="mt-1 text-sm text-ink-2">
                      {row.contactName} · {row.workEmail}
                      {row.phone ? ` · ${row.phone}` : ""}
                    </p>
                  </div>
                  <p className="font-mono text-[11px] uppercase tracking-widest text-cyan">{row.status}</p>
                </div>
                <p className="mt-3 text-sm text-ink-2">
                  About {row.songsPerMonth} songs a month · {row.teamSeats} seats
                </p>
                <p className="mt-2 text-sm text-ink-3">{row.message}</p>
                {row.status === "new" && (
                  <form action={approveInquiryAction} className="mt-4">
                    <input type="hidden" name="inquiryId" value={row.id} />
                    <button type="submit" className="btn-primary px-4 py-2 text-sm">
                      Mark as Enterprise
                    </button>
                  </form>
                )}
              </article>
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
