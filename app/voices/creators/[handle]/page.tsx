import Link from "next/link";
import { notFound } from "next/navigation";
import { Pill } from "@/components/voices/server";
import { getVoices, voicesOpen } from "@/lib/voices/context";
import { VoicesError } from "@/lib/voices/errors";
import { dialectLabel } from "@/lib/voices/config";

export default async function Storefront({ params }: { params: Promise<{ handle: string }> }) {
  if (!voicesOpen()) return null; // Voices closed: the layout shows "Opening soon"; skip DB reads.
  const { handle } = await params;
  const svc = await getVoices();
  let d;
  try { d = await svc.storefront(handle); } catch (e) { if (e instanceof VoicesError && e.status === 404) notFound(); throw e; }
  return (
    <div className="space-y-6">
      <header><div className="flex gap-2">{d.creator.is_demo && <Pill tone="amber">Demo creator · fictional</Pill>}{d.creator.hire_enabled && <Pill tone="cyan">Available for custom recordings</Pill>}</div>
        <h1 className="mt-3 font-display text-4xl font-extrabold">{d.creator.display_name}</h1>
        {d.creator.display_name_ar && <p dir="rtl" lang="ar" className="text-xl text-ink-2">{d.creator.display_name_ar}</p>}
        {d.creator.bio && <p dir="auto" className="mt-3 max-w-2xl text-ink-2">{d.creator.bio}</p>}</header>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{d.voices.map((v) => (
        <Link key={v.id} href={`/voices/${v.slug}`} className="card block p-5 hover:border-cyan/40"><h2 className="font-display font-bold">{v.display_name}</h2><p className="mt-2 flex flex-wrap gap-1">{v.dialects.map((x) => <Pill key={x} tone="cyan">{dialectLabel(x)}</Pill>)}</p></Link>))}</div>
    </div>
  );
}
