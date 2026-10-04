import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteNav } from "@/components/SiteNav";
import { SubNav } from "@/components/voices/server";
import { demoPersona, getActor, getVoices, inviteOnly, voicesOpen } from "@/lib/voices/context";
import { LEGAL_REVIEW_NOTE } from "@/lib/voices/config";

export const dynamic = "force-dynamic";
export const metadata = { title: "Lyrixis Voices — license Arabic & bilingual voices", description: "Consented, dialect-reviewed Arabic and bilingual voices, licensed per use with Apixis Wallet Ixis." };

export default async function VoicesLayout({ children }: { children: React.ReactNode }) {
  if (!voicesOpen()) return (
    <div><SiteNav /><main className="mx-auto max-w-3xl px-6 py-24 text-center"><p className="font-mono text-xs uppercase tracking-[0.28em] text-cyan">Lyrixis Voices</p><h1 className="mt-3 font-display text-4xl font-extrabold">Opening soon</h1><p className="mt-4 text-ink-2">Licensed Arabic and bilingual voices from consenting creators. Join the waitlist to hear when invites open.</p><Link href="/waitlist" className="btn-primary mt-8 inline-block px-5 py-2.5">Join the waitlist</Link></main><SiteFooter /></div>
  );
  const [svc, actor, persona] = await Promise.all([getVoices(), getActor(), demoPersona()]);
  const access = await svc.hasAccess(actor);
  const creator = actor ? await svc.myCreator(actor) : null;
  return (
    <div>
      <SiteNav />
      {persona && (
        <div className="border-b border-amber-300/20 bg-amber-300/10 text-amber-100">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-6 py-2 text-xs">
            <span><strong>Demo mode.</strong> Sample data, fictional voices, demo Ixis (no real money), synthetic tone audio. Nothing here is a real person or a real purchase.</span>
            <form action="/api/voices/demo-persona" method="post" className="flex items-center gap-2">
              <label htmlFor="as">View as</label>
              <select id="as" name="as" defaultValue={persona} className="rounded border border-amber-200/30 bg-transparent px-2 py-0.5"><option value="customer" className="bg-[#0b0a24]">Customer (business)</option><option value="creator" className="bg-[#0b0a24]">Creator</option><option value="admin" className="bg-[#0b0a24]">Admin</option></select>
              <button className="rounded border border-amber-200/40 px-2 py-0.5 hover:bg-amber-200/10">Switch</button>
            </form>
          </div>
        </div>
      )}
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <Link href="/voices" className="font-display text-xl font-extrabold">Lyrixis <span className="grad-text">Voices</span></Link>
          {access && <SubNav isAdmin={svc.isAdmin(actor)} isCreator={!!creator} />}
        </div>
        {access ? children : (
          <section className="card mx-auto max-w-2xl p-8 text-center">
            <h1 className="font-display text-3xl font-extrabold">Invite-only for now</h1>
            <p className="mt-3 text-ink-2">Lyrixis Voices is open to invited businesses and creators while we finish verification and legal review.{!actor && " If you have an invite, sign in with your Apixis ID."}</p>
            <div className="mt-6 flex justify-center gap-3">{!actor && <Link href="/login?next=/voices" className="btn-primary px-5 py-2.5">Sign in</Link>}<Link href="/waitlist" className="btn-secondary px-5 py-2.5">Request an invite</Link></div>
          </section>
        )}
        {inviteOnly() && access && <p className="mt-10 text-center text-xs text-ink-3">Invite-only preview. License and creator terms: {LEGAL_REVIEW_NOTE}</p>}
      </main>
      <SiteFooter />
    </div>
  );
}
