import { requireUser } from "@/lib/auth";
import { jsonError } from "@/lib/errors";
import { HttpError } from "@/lib/errors";
import { createAndEnqueueTrack, listTracks } from "@/services/tracks";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET() {
  try {
    const user = await requireUser();
    const tracks = await listTracks(user);
    return Response.json({ tracks });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
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
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() ?? null;

    const result = await createAndEnqueueTrack({
      user,
      filename: file.name || "audio",
      mimeType: file.type || "application/octet-stream",
      bytes,
      title: typeof titleValue === "string" ? titleValue : null,
      artist: typeof artistValue === "string" ? artistValue : null,
      rightsConfirmed,
      ip,
    });

    return Response.json({ track_id: result.publicId, status: result.status }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
