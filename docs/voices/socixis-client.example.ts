// Example Socixis-side client for Lyrixis Voices (reference only; not imported anywhere).
type Req = { script: string; declared_use: string; channels: string[]; publication: boolean; territory: string; term_months: number };

export function lyrixisVoices(base: string, key: string, org: string) {
  const h = (extra: Record<string, string> = {}) => ({ authorization: `Bearer ${key}`, "x-socixis-org": org, "content-type": "application/json", ...extra });
  const call = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
    const r = await fetch(`${base}/api/v1/voices${path}`, init);
    const j = await r.json();
    if (!r.ok) throw Object.assign(new Error(j.message ?? j.error), { status: r.status, code: j.error });
    return j as T;
  };
  return {
    voices: (q: Record<string, string> = {}) => call(`/voices?${new URLSearchParams(q)}`, { headers: h() }),
    eligibility: (voice_id: string, request: Req) => call(`/eligibility`, { method: "POST", headers: h(), body: JSON.stringify({ voice_id, request }) }),
    /** Use a stable key per Socixis job so retries never double-charge. */
    generate: (voice_id: string, request: Req, idempotencyKey: string) =>
      call<{ generation_id: string; status: string }>(`/generations`, { method: "POST", headers: h({ "idempotency-key": idempotencyKey }), body: JSON.stringify({ voice_id, request }) }),
    status: (id: string) => call<{ status: string; job_status: string | null }>(`/generations/${id}`, { headers: h() }),
    output: (id: string) => call<{ url: string }>(`/generations/${id}/output`, { headers: h() }),
    receipt: (id: string) => call(`/receipts/${id}`, { headers: h() }),
  };
}
