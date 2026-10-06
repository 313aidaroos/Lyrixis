import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { jsonError } from "@/lib/errors";
import { HttpError } from "@/lib/errors";
import { createAndEnqueueTrack, finalizeDirectUpload, listTracks } from "@/services/tracks";

export const runtime = "nodejs";
// 300 = Vercel Hobby + Fluid compute max (PROCESSING_MAX_DURATION_SECONDS in lib/processing.ts).
// Finalizing an upload schedules the lyrics pipeline with after(); it runs in this invocation.
export const maxDuration = 300;

export async function GET() {
  try {
    const user = await requireUser();
    const tracks = await listTracks(user);
    return Response.json({ tracks });
  } catch (error) {
    return jsonError(error);
  }
}

const finalizeSchema = z.object({
  upload_id: z.string().min(1),
  path: z.string().min(1).max(512),
  filename: z.string().max(255).optional().default(""),
  title: z.string().max(300).nullish(),
  artist: z.string().max(300).nullish(),
  rights_confirmed: z.boolean(),
});

function clientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() ?? null;
}

/**
 * POST /api/tracks
 * - JSON (the web app, 2026-10-05): metadata only, after the browser uploaded the file
 *   straight to Storage with a token from POST /api/tracks/upload-url.
 *   { upload_id, path, filename, title?, artist?, rights_confirmed: true }
 * - multipart/form-data (legacy / API clients): field `audio`. Only works for files under
 *   Vercel's 4.5 MB request body limit; larger files must use the two-step JSON flow.
 */
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      const parsed = finalizeSchema.safeParse(await request.json().catch(() => null));
      if (!parsed.success) {
        throw new HttpError(400, "invalid_body", "upload_id, path and rights_confirmed are required.");
      }
      const result = await finalizeDirectUpload({
        user,
        uploadId: parsed.data.upload_id,
        path: parsed.data.path,
        filename: parsed.data.filename,
        title: parsed.data.title ?? null,
        artist: parsed.data.artist ?? null,
        rightsConfirmed: parsed.data.rights_confirmed,
        ip: clientIp(request),
      });
      return Response.json({ track_id: result.publicId, status: result.status }, { status: 201 });
    }

    const form = await request.formData();
    const file = form.get("audio");
    if (!(file instanceof File)) {
      throw new HttpError(400, "missing_audio", "multipart field `audio` is required.");
    }

    const rightsRaw = form.get("rights_confirmed");
    const rightsConfirmed = rightsRaw === "true" || rightsRaw === "on" || rightsRaw === "1";
    const titleValue = form.get("title");
    const artistValue = form.get("artist");
    const bytes = Buffer.from(await file.arrayBuffer());

    const result = await createAndEnqueueTrack({
      user,
      filename: file.name || "audio",
      mimeType: file.type || "application/octet-stream",
      bytes,
      title: typeof titleValue === "string" ? titleValue : null,
      artist: typeof artistValue === "string" ? artistValue : null,
      rightsConfirmed,
      ip: clientIp(request),
    });

    return Response.json({ track_id: result.publicId, status: result.status }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
