import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { jsonError, HttpError } from "@/lib/errors";
import { applyCorrections } from "@/services/corrections";

export const runtime = "nodejs";

const bodySchema = z.object({
  lines: z
    .array(
      z.object({
        lineIndex: z.number().int().nonnegative(),
        text: z.string().min(1).max(2000),
      })
    )
    .min(1)
    .max(500),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const json: unknown = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      throw new HttpError(400, "invalid_body", parsed.error.issues[0]?.message ?? "Invalid correction payload.");
    }
    const result = await applyCorrections({
      user,
      publicId: id,
      edits: parsed.data.lines,
    });
    return Response.json({ version: result.version });
  } catch (error) {
    return jsonError(error);
  }
}
