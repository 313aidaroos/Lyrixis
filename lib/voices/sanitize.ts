// Log/audit sanitizer: never write scripts, audio, emails, provider refs or keys to logs.
const BLOCKED_KEYS = /^(script|body|text|transcript|email|provider_voice_ref|provider_ref|api_key|key|secret|token|audio|recording|brief)$/i;
const EMAIL = /[^\s@]+@[^\s@]+\.[^\s@]+/g;

export function sanitizeMeta(meta: Record<string, unknown> | undefined): Record<string, string | number | boolean | null> | null {
  if (!meta) return null;
  const out: Record<string, string | number | boolean | null> = {};
  for (const [k, v] of Object.entries(meta)) {
    if (BLOCKED_KEYS.test(k)) { out[k] = "[redacted]"; continue; }
    if (v === null || typeof v === "number" || typeof v === "boolean") out[k] = v;
    else if (typeof v === "string") out[k] = v.replace(EMAIL, "[email]").slice(0, 200);
    else out[k] = "[object]";
  }
  return out;
}

export function safeError(e: unknown): string {
  const m = e instanceof Error ? e.message : String(e);
  return m.replace(EMAIL, "[email]").slice(0, 300);
}
