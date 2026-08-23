import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  const track = db
    .prepare(`SELECT audio_path, status FROM tracks WHERE public_id = ?`)
    .get(id) as { audio_path: string; status: string } | undefined;

  if (!track?.audio_path || !fs.existsSync(track.audio_path)) {
    return NextResponse.json({ error: "Audio not found" }, { status: 404 });
  }

  const ext = track.audio_path.split(".").pop()?.toLowerCase();
  const mime =
    ext === "mp3"
      ? "audio/mpeg"
      : ext === "wav"
        ? "audio/wav"
        : ext === "flac"
          ? "audio/flac"
          : "audio/mp4";

  const buffer = fs.readFileSync(track.audio_path);
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": mime,
      "Accept-Ranges": "bytes",
    },
  });
}
