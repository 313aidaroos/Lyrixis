"use client";
export type ActionResult<T = unknown> = { ok: true; data: T } | { ok: false; error: string; message: string; status: number };

export async function postAction<T = unknown>(name: string, body: Record<string, unknown> | FormData): Promise<ActionResult<T>> {
  const isForm = body instanceof FormData;
  const res = await fetch(`/api/voices/actions/${name}`, { method: "POST", headers: isForm ? undefined : { "content-type": "application/json" }, body: isForm ? body : JSON.stringify(body) });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: j.error ?? "error", message: j.message ?? "Something went wrong.", status: res.status };
  return { ok: true, data: j as T };
}

export function newIdempotencyKey(prefix = "ui") {
  const a = new Uint8Array(12); crypto.getRandomValues(a);
  return `${prefix}-${Array.from(a, (b) => b.toString(16).padStart(2, "0")).join("")}`;
}

const SAVED = "lyxv_saved"; const RECENT = "lyxv_recent"; const COMPARE = "lyxv_compare";
function read(k: string): string[] { try { return JSON.parse(localStorage.getItem(k) ?? "[]"); } catch { return []; } }
function write(k: string, v: string[]) { localStorage.setItem(k, JSON.stringify(v)); window.dispatchEvent(new Event("lyxv-lists")); }
export const lists = {
  saved: () => read(SAVED), recent: () => read(RECENT), compare: () => read(COMPARE),
  toggleSaved: (slug: string) => { const s = read(SAVED); write(SAVED, s.includes(slug) ? s.filter((x) => x !== slug) : [slug, ...s].slice(0, 50)); },
  toggleCompare: (slug: string) => { const s = read(COMPARE); write(COMPARE, s.includes(slug) ? s.filter((x) => x !== slug) : [...s, slug].slice(-4)); },
  pushRecent: (slug: string) => { const s = read(RECENT).filter((x) => x !== slug); write(RECENT, [slug, ...s].slice(0, 12)); },
};
