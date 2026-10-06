import { PLAN_FAQ } from "@/lib/ixis-pricing";

export function PlanFaq({ title = "Questions" }: { title?: string }) {
  return (
    <div className="grid gap-4">
      <p className="font-mono text-xs uppercase tracking-[0.22em] text-gold">FAQ</p>
      <h2 className="font-display text-3xl font-bold">{title}</h2>
      {PLAN_FAQ.map((item) => (
        <details key={item.q} className="card group">
          <summary className="cursor-pointer list-none font-display text-lg font-semibold">{item.q}</summary>
          <p className="mt-3 text-ink-2">{item.a}</p>
        </details>
      ))}
    </div>
  );
}
