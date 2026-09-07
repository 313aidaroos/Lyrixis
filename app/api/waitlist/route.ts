import { z } from "zod";
import { jsonError, HttpError } from "@/lib/errors";
import { assertWaitlistRateLimit } from "@/lib/rate-limit";
import { createWaitlistLead } from "@/services/leads";

export const runtime = "nodejs";

const optionalText = (max: number) =>
  z
    .union([z.string(), z.null(), z.undefined()])
    .transform((value) => {
      if (typeof value !== "string") return null;
      const trimmed = value.trim();
      if (!trimmed) return null;
      return trimmed.slice(0, max);
    });

const bodySchema = z.object({
  name: optionalText(200),
  company: optionalText(200),
  email: optionalText(320),
  work_email: optionalText(320),
  tracks: optionalText(80),
  track_count: optionalText(80),
  use_case: optionalText(300),
  integration: optionalText(120),
  message: optionalText(4000),
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

export async function POST(request: Request) {
  try {
    await assertWaitlistRateLimit(clientIp(request));

    let json: unknown;
    try {
      json = await request.json();
    } catch {
      throw new HttpError(400, "invalid_json", "Request body must be JSON.");
    }

    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      throw new HttpError(400, "invalid_body", "Could not read the form fields.");
    }

    const workEmail = (parsed.data.work_email ?? parsed.data.email ?? "").toLowerCase();
    if (!workEmail) {
      throw new HttpError(400, "email_required", "Work email is required.");
    }
    if (!EMAIL_RE.test(workEmail)) {
      throw new HttpError(400, "invalid_email", "Enter a valid work email.");
    }

    await createWaitlistLead({
      name: parsed.data.name,
      company: parsed.data.company,
      workEmail,
      trackCount: parsed.data.track_count ?? parsed.data.tracks,
      useCase: parsed.data.use_case,
      integration: parsed.data.integration,
      message: parsed.data.message,
    });

    return Response.json({ ok: true }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
