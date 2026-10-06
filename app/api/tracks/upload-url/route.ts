import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { HttpError, jsonError } from "@/lib/errors";
import { prepareDirectUpload } from "@/services/tracks";

export const runtime = "nodejs";

const bodySchema = z.object({
  filename: z.string().min(1).max(255),
  mime_type: z.string().max(100).optional().default(""),
  size: z.number().int().positive(),
  rights_confirmed: z.boolean(),
});

/**
 * POST /api/tracks/upload-url — step 1 of an upload (2026-10-05, Grok).
 * Body (JSON, metadata only): { filename, mime_type, size, rights_confirmed }.
 * Returns a one-time signed upload URL for the private bucket. The browser PUTs the file there
 * directly (Vercel caps function request bodies at 4.5 MB), then calls POST /api/tracks with
 * { upload_id, path, ... } to create and queue the track.
 */
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      throw new HttpError(400, "invalid_body", "filename, size and rights_confirmed are required.");
    }
    const target = await prepareDirectUpload({
      user,
      filename: parsed.data.filename,
      mimeType: parsed.data.mime_type,
      size: parsed.data.size,
      rightsConfirmed: parsed.data.rights_confirmed,
    });
    return Response.json(
      {
        upload_id: target.uploadId,
        bucket: target.bucket,
        path: target.path,
        token: target.token,
        signed_url: target.signedUrl,
        max_bytes: target.maxBytes,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return jsonError(error);
  }
}
