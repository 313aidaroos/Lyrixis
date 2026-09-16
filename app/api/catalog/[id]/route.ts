import { HttpError, jsonError } from "@/lib/errors";
import { getCatalogRecording } from "@/services/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const recording = await getCatalogRecording(id);
    if (!recording) {
      throw new HttpError(404, "not_found", "Recording not in the catalog.");
    }
    return Response.json({ recording });
  } catch (error) {
    return jsonError(error);
  }
}
