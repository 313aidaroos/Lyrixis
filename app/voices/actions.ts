"use server";
// Server Action entry for the /voices UI. Same dispatcher as /api/voices/actions/[action], but it runs in
// the page function — in demo mode that keeps the in-memory demo state on one instance per visit.
import { headers } from "next/headers";
import { createHash } from "node:crypto";
import { getActor, getVoices, voicesOpen } from "@/lib/voices/context";
import { runAction, toErrorJson, type Body, type Upload } from "@/lib/voices/http";

export type ActionOut = { ok: true; data: unknown } | { ok: false; error: string; message: string; status: number };

export async function voicesAction(name: string, input: Body | FormData): Promise<ActionOut> {
  if (!voicesOpen()) return { ok: false, error: "not_found", message: "Not found", status: 404 };
  try {
    let body: Body;
    if (input instanceof FormData) {
      body = {};
      for (const [k, v] of input.entries()) body[k] = typeof v === "string" ? v : ({ mime: v.type, name: v.name, body: new Uint8Array(await v.arrayBuffer()) } satisfies Upload);
    } else body = input;
    const h = await headers();
    const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || "local";
    const [svc, actor] = await Promise.all([getVoices(), getActor()]);
    const data = await runAction({ svc, actor, ip: createHash("sha256").update(`lyxv-ip:${ip}`).digest("hex").slice(0, 32) }, name, body);
    return { ok: true, data: JSON.parse(JSON.stringify(data ?? { ok: true })) };
  } catch (e) {
    const { status, body } = toErrorJson(e);
    return { ok: false, error: String(body.error), message: String(body.message), status };
  }
}
