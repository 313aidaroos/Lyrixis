// Demo/preview only: switch between the fictional customer, creator and admin personas.
import { NextResponse } from "next/server";
import { DEMO_PERSONA_COOKIE, voicesMode } from "@/lib/voices/context";
import { DEMO_PERSONAS } from "@/lib/voices/demo-seed";
import { closed } from "@/lib/voices/route-helpers";

export async function POST(req: Request) {
  if (voicesMode() !== "demo") return closed();
  const form = await req.formData().catch(() => null);
  const as = String(form?.get("as") ?? "customer");
  const back = String(form?.get("back") ?? "/voices");
  const res = NextResponse.redirect(new URL(back.startsWith("/voices") ? back : "/voices", req.url), 303);
  if (as in DEMO_PERSONAS) res.cookies.set(DEMO_PERSONA_COOKIE, as, { path: "/", httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 });
  return res;
}
