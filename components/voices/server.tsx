import Link from "next/link";
import { DIALECTS, USES, dialectLabel } from "@/lib/voices/config";
import { SaveCompare } from "./ui";

export type CatalogEntry = Awaited<ReturnType<import("@/lib/voices/service").VoicesService["catalog"]>>[number];

export function Pill({ children, tone = "plain" }: { children: React.ReactNode; tone?: "plain" | "cyan" | "amber" | "green" }) {
  const c = { plain: "border-white/10 text-ink-2", cyan: "border-cyan/40 text-cyan", amber: "border-amber-300/40 text-amber-200", green: "border-emerald-300/40 text-emerald-200" }[tone];
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] ${c}`}>{children}</span>;
}

export function VerificationBadge({ status }: { status: string | null }) {
  if (!status) return <Pill>Not verified</Pill>;
  return <Pill tone="green">{status === "provider_verified" ? "Voice verified" : "Verified by Lyrixis review"}</Pill>;
}

export function VoiceCard({ e }: { e: CatalogEntry }) {
  const v = e.voice;
  return (
    <article className="card flex flex-col gap-3 p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-display text-lg font-bold leading-tight"><Link href={`/voices/${v.slug}`} className="hover:text-cyan">{v.display_name}</Link></h3>
          {v.display_name_ar && <p dir="rtl" lang="ar" className="text-sm text-ink-2">{v.display_name_ar}</p>}
        </div>
        {v.is_demo && <Pill tone="amber">Demo</Pill>}
      </div>
      <p dir="auto" className="text-sm text-ink-2">{v.description}</p>
      <div className="flex flex-wrap gap-1.5">
        {v.dialects.map((d) => <Pill key={d} tone="cyan">{dialectLabel(d)}</Pill>)}
        {v.tones.map((t) => <Pill key={t}>{t}</Pill>)}
      </div>
      <div className="flex flex-wrap gap-1.5"><VerificationBadge status={v.earned_verification} />{v.licensing_mode === "approval_required" && <Pill tone="amber">Creator approves scripts</Pill>}{!e.permissions.publication && <Pill>Internal use only</Pill>}</div>
      <div className="mt-auto flex items-center justify-between pt-2">
        <span className="text-sm"><span className="font-bold text-ink">from {e.fromIxis.toLocaleString()} Ixis</span><span className="text-ink-3"> / 60s{e.illustrative ? "*" : ""}</span></span>
        <SaveCompare slug={v.slug} />
      </div>
    </article>
  );
}

export function Filters({ q }: { q: Record<string, string | undefined> }) {
  const sel = "rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm";
  return (
    <form className="card grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-6" role="search">
      <input name="q" defaultValue={q.q} dir="auto" placeholder="Search voices / ابحث" aria-label="Search" className={`${sel} lg:col-span-2`} />
      <select name="language" defaultValue={q.language ?? ""} aria-label="Language" className={sel}><option value="" className="bg-[#0b0a24]">Any language</option><option value="ar" className="bg-[#0b0a24]">Arabic</option><option value="en" className="bg-[#0b0a24]">English</option></select>
      <select name="dialect" defaultValue={q.dialect ?? ""} aria-label="Dialect" className={sel}><option value="" className="bg-[#0b0a24]">Any dialect</option>{DIALECTS.map((d) => <option key={d.id} value={d.id} className="bg-[#0b0a24]">{d.label}</option>)}</select>
      <select name="use" defaultValue={q.use ?? ""} aria-label="Use" className={sel}><option value="" className="bg-[#0b0a24]">Any use</option>{USES.map((u) => <option key={u.id} value={u.id} className="bg-[#0b0a24]">{u.label}</option>)}</select>
      <button className="btn-primary px-4 py-2 text-sm">Filter</button>
    </form>
  );
}

export function SubNav({ isAdmin, isCreator }: { isAdmin: boolean; isCreator: boolean }) {
  const l = "rounded-full px-3 py-1 text-sm text-ink-2 hover:bg-white/5 hover:text-ink";
  return (
    <nav aria-label="Voices" className="flex flex-wrap gap-1">
      <Link className={l} href="/voices">Marketplace</Link>
      <Link className={l} href="/voices/compare">Compare</Link>
      <Link className={l} href="/voices/saved">Saved</Link>
      <Link className={l} href="/voices/workspace">Workspace</Link>
      <Link className={l} href="/voices/creator">{isCreator ? "Creator dashboard" : "Become a creator"}</Link>
      {isAdmin && <Link className={l} href="/voices/admin">Admin</Link>}
    </nav>
  );
}
