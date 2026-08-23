import { NextRequest, NextResponse } from "next/server";
import { getTrackByPublicId } from "@/services/tracks";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const track = getTrackByPublicId(id);

  if (!track) {
    return NextResponse.json({ error: "Track not found" }, { status: 404 });
  }

  return NextResponse.json({
    track_id: track.publicId,
    status: track.status,
    title: track.title,
    artist: track.artist,
    language: track.language,
    dialect: track.dialect,
    dialect_confidence: track.dialectConfidence,
    transcription_confidence: track.confidenceBand,
    explicit: track.explicit !== "clean",
    lyrics: track.lyrics,
    structure: track.structure,
    metadata: track.metadata,
    verification: track.verification,
    duration_seconds: track.durationSeconds,
    completed_at: track.completedAt,
  });
}
