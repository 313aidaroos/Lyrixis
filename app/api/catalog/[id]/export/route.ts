import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { jsonError, HttpError } from "@/lib/errors";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCatalogRecording } from "@/services/catalog";

export const runtime = "nodejs";

/**
 * What a 300-Ixis unlock actually delivers: the recording's metadata + lyrics as a file.
 * Gate = track_unlocks row for THIS user (cache of the Wallet entitlement). No row → 402.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const format = new URL(request.url).searchParams.get("format") ?? "txt";
    if (!["txt", "json", "lrc"].includes(format)) {
      throw new HttpError(400, "invalid_format", "format must be txt, json, or lrc.");
    }

    const admin = createAdminClient();
    const { data: unlock } = await admin
      .from("track_unlocks")
      .select("receipt_id")
      .eq("user_id", user.id)
      .eq("recording_public_id", id)
      .maybeSingle();
    if (!unlock) {
      return NextResponse.json(
        { error: "not_unlocked", message: "Unlock this track (300 Ixis) to download exports." },
        { status: 402 }
      );
    }

    const rec = await getCatalogRecording(id);
    if (!rec) throw new HttpError(404, "track_not_found", "Track not found");

    const base = `${rec.artist ?? "Unknown"} - ${rec.title}`.replace(/[^\w\s.-]/g, "").trim();
    if (format === "json") {
      return new NextResponse(JSON.stringify(rec, null, 2), {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="${base}.json"`,
        },
      });
    }
    const lines = rec.lyrics?.fullText ? rec.lyrics.fullText.split(/\r?\n/) : [];
    const header = [
      `Title: ${rec.title}`,
      `Artist: ${rec.artist ?? ""}`,
      rec.album ? `Album: ${rec.album}` : null,
      rec.isrc ? `ISRC: ${rec.isrc}` : null,
      rec.iswc ? `ISWC: ${rec.iswc}` : null,
      rec.writers.length ? `Writers: ${rec.writers.join(", ")}` : null,
      rec.lyrics ? `Lyrics license: ${rec.lyrics.license}` : null,
      `Exported from Lyrixis · receipt ${unlock.receipt_id ?? "n/a"}`,
      "",
    ].filter((l): l is string => l !== null);
    const body =
      format === "lrc"
        ? [`[ti:${rec.title}]`, `[ar:${rec.artist ?? ""}]`, rec.album ? `[al:${rec.album}]` : "", "", ...lines.map((l) => `[00:00.00]${l}`)].filter(Boolean).join("\n")
        : [...header, ...lines].join("\n");
    return new NextResponse(body, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${base}.${format}"`,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
