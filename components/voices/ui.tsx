"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { lists, postAction } from "./client";

export type Field =
  | { name: string; label: string; type: "text" | "textarea" | "number" | "email"; placeholder?: string; required?: boolean; dir?: "auto"; defaultValue?: string | number }
  | { name: string; label: string; type: "checkbox"; defaultChecked?: boolean }
  | { name: string; label: string; type: "select"; options: { value: string; label: string }[]; defaultValue?: string }
  | { name: string; label: string; type: "multi"; options: { value: string; label: string }[]; defaultValue?: string[] }
  | { name: string; label: string; type: "file"; accept?: string };

/** Generic form → /api/voices/actions/<action>. Multipart when it has a file field. */
export function ActionForm({ action, fields, extra = {}, submit, nest, onDone, compact }: { action: string; fields: Field[]; extra?: Record<string, unknown>; submit: string; nest?: string; onDone?: (data: unknown) => void; compact?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setMsg(null);
    const fd = new FormData(e.currentTarget);
    const hasFile = fields.some((f) => f.type === "file");
    const values: Record<string, unknown> = {};
    for (const f of fields) {
      if (f.type === "checkbox") values[f.name] = fd.get(f.name) === "on";
      else if (f.type === "multi") values[f.name] = fd.getAll(f.name).map(String);
      else if (f.type === "number") values[f.name] = fd.get(f.name) === "" ? null : Number(fd.get(f.name));
      else if (f.type !== "file") values[f.name] = String(fd.get(f.name) ?? "");
    }
    let body: Record<string, unknown> | FormData;
    if (hasFile) {
      body = new FormData();
      for (const [k, v] of Object.entries({ ...extra, ...values })) (body as FormData).append(k, String(v));
      for (const f of fields) if (f.type === "file") { const file = fd.get(f.name); if (file instanceof File && file.size) (body as FormData).append(f.name, file); }
    } else body = nest ? { ...extra, [nest]: values } : { ...extra, ...values };
    const r = await postAction(action, body);
    setBusy(false);
    if (r.ok) { setMsg({ ok: true, text: "Done." }); onDone?.(r.data); router.refresh(); }
    else setMsg({ ok: false, text: r.message });
  }
  return (
    <form onSubmit={onSubmit} className={compact ? "flex flex-wrap items-end gap-2" : "space-y-3"}>
      {fields.map((f) => <FieldInput key={f.name} f={f} />)}
      <div className="flex items-center gap-3">
        <button disabled={busy} className="btn-primary px-4 py-2 text-sm disabled:opacity-60">{busy ? "Working…" : submit}</button>
        {msg && <span role="status" className={`text-sm ${msg.ok ? "text-cyan" : "text-red-300"}`}>{msg.text}</span>}
      </div>
    </form>
  );
}

const inputCls = "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-ink placeholder:text-ink-3 focus:border-cyan/60 focus:outline-none";

function FieldInput({ f }: { f: Field }) {
  if (f.type === "checkbox") return <label className="flex items-center gap-2 text-sm text-ink-2"><input type="checkbox" name={f.name} defaultChecked={f.defaultChecked} className="accent-cyan-400" /> {f.label}</label>;
  if (f.type === "multi") return (
    <fieldset className="text-sm"><legend className="mb-1 text-ink-3">{f.label}</legend>
      <div className="flex flex-wrap gap-2">{f.options.map((o) => <label key={o.value} className="flex items-center gap-1 rounded-full border border-white/10 px-2.5 py-1 text-ink-2"><input type="checkbox" name={f.name} value={o.value} defaultChecked={f.defaultValue?.includes(o.value)} className="accent-cyan-400" />{o.label}</label>)}</div>
    </fieldset>
  );
  return (
    <label className="block text-sm"><span className="mb-1 block text-ink-3">{f.label}</span>
      {f.type === "select" ? <select name={f.name} defaultValue={f.defaultValue} className={inputCls}>{f.options.map((o) => <option key={o.value} value={o.value} className="bg-[#0b0a24]">{o.label}</option>)}</select>
        : f.type === "textarea" ? <textarea name={f.name} required={f.required} placeholder={f.placeholder} dir={f.dir} defaultValue={f.defaultValue} rows={4} className={inputCls} />
        : f.type === "file" ? <input type="file" name={f.name} accept={f.accept ?? "audio/*"} required className="text-sm text-ink-2" />
        : <input type={f.type} name={f.name} required={f.required} placeholder={f.placeholder} dir={f.dir} defaultValue={f.defaultValue} className={inputCls} />}
    </label>
  );
}

export function ActionButton({ action, body, label, confirm: confirmText, variant = "secondary" }: { action: string; body: Record<string, unknown>; label: string; confirm?: string; variant?: "primary" | "secondary" }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);
  return (
    <span className="inline-flex items-center gap-2">
      <button disabled={busy} className={`${variant === "primary" ? "btn-primary" : "btn-secondary"} px-3 py-1.5 text-xs disabled:opacity-60`} onClick={async () => {
        if (confirmText && !window.confirm(confirmText)) return;
        setBusy(true); setErr(null); const r = await postAction(action, body); setBusy(false);
        if (r.ok) router.refresh(); else setErr(r.message);
      }}>{busy ? "…" : label}</button>
      {err && <span role="alert" className="text-xs text-red-300">{err}</span>}
    </span>
  );
}

export function SaveCompare({ slug }: { slug: string }) {
  const [s, setS] = useState({ saved: false, compare: false });
  useEffect(() => {
    const sync = () => setS({ saved: lists.saved().includes(slug), compare: lists.compare().includes(slug) });
    sync(); window.addEventListener("lyxv-lists", sync); return () => window.removeEventListener("lyxv-lists", sync);
  }, [slug]);
  return (
    <span className="flex gap-2 text-xs">
      <button type="button" onClick={() => lists.toggleSaved(slug)} aria-pressed={s.saved} className="rounded-full border border-white/10 px-2.5 py-1 text-ink-2 hover:text-ink">{s.saved ? "★ Saved" : "☆ Save"}</button>
      <button type="button" onClick={() => lists.toggleCompare(slug)} aria-pressed={s.compare} className="rounded-full border border-white/10 px-2.5 py-1 text-ink-2 hover:text-ink">{s.compare ? "✓ Comparing" : "+ Compare"}</button>
    </span>
  );
}

export function TrackRecent({ slug }: { slug: string }) {
  useEffect(() => { lists.pushRecent(slug); }, [slug]);
  return null;
}
