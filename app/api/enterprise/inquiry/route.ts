import { z } from "zod";
import { jsonError, HttpError } from "@/lib/errors";
import { assertRateLimit } from "@/lib/rate-limit";
import { inquirySchema } from "@/lib/enterprise-access";
import { createEnterpriseInquiry } from "@/services/enterprise";

export const runtime = "nodejs";

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

const bodySchema = z.object({
  companyName: z.string(),
  contactName: z.string(),
  workEmail: z.string(),
  phone: z.string().optional().nullable(),
  songsPerMonth: z.string(),
  teamSeats: z.union([z.string(), z.number()]),
  message: z.string(),
});

export async function POST(request: Request) {
  try {
    await assertRateLimit("enterprise-inquiry", clientIp(request), 5, 10 * 60);
    const json: unknown = await request.json().catch(() => null);
    const raw = bodySchema.safeParse(json);
    if (!raw.success) throw new HttpError(400, "invalid_body", "Check the form and try again.");
    const parsed = inquirySchema.safeParse({
      ...raw.data,
      phone: raw.data.phone ?? "",
    });
    if (!parsed.success) {
      throw new HttpError(400, "invalid_body", parsed.error.issues[0]?.message ?? "Check the form and try again.");
    }
    const saved = await createEnterpriseInquiry(parsed.data);
    return Response.json({ id: saved.id, emailed: saved.emailed });
  } catch (error) {
    return jsonError(error);
  }
}
