import { requireUser } from "@/lib/auth";
import { jsonError, HttpError } from "@/lib/errors";
import { writeAudit } from "@/lib/audit";
import { exportStoragePath, uploadPrivateObject } from "@/lib/storage";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadCurrentLyrics } from "@/services/corrections";
import { buildExport } from "@/services/exports";
import { getOwnedTrack, toSummary } from "@/services/tracks";
import type { ExportFormat } from "@/types";

export const runtime = "nodejs";

const FORMATS = new Set<ExportFormat>(["txt", "srt", "lrc", "json"]);

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const formatParam = new URL(request.url).searchParams.get("format") ?? "";
    if (!FORMATS.has(formatParam as ExportFormat)) {
      throw new HttpError(400, "invalid_format", "format must be txt, srt, lrc, or json.");
    }
    const format = formatParam as ExportFormat;
    const track = await getOwnedTrack(user, id);
    if (!track.paid) {
      throw new HttpError(402, "payment_required", "Pay to unlock full exports.");
    }
    const lyrics = await loadCurrentLyrics(track.id);
    if (!lyrics) {
      throw new HttpError(409, "no_transcription", "No transcription is available to export.");
    }

    const summary = toSummary(track);
    const file = buildExport(format, {
      publicId: track.public_id,
      title: track.title,
      artist: track.artist,
      durationSeconds: summary.durationSeconds,
      language: track.language,
      dialect: track.dialect,
      confidenceBand: summary.confidenceBand,
      transcriptionConfidence: summary.transcriptionConfidence,
      lines: lyrics.lines,
    });

    const storagePath = exportStoragePath(user.id, track.id, format);
    const body = Buffer.from(file.body, "utf8");
    await uploadPrivateObject({
      path: storagePath,
      body,
      contentType: file.contentType,
    });

    const admin = createAdminClient();
    await admin.from("exports").insert({
      track_id: track.id,
      format,
      storage_path: storagePath,
      bytes: body.length,
    });

    await writeAudit({
      actorUserId: user.id,
      action: "export",
      entityType: "track",
      entityId: track.id,
      metadata: { format },
    });

    return new Response(file.body, {
      headers: {
        "Content-Type": file.contentType,
        "Content-Disposition": `attachment; filename="${file.filename}"`,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
