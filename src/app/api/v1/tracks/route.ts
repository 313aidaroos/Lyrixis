import { NextRequest, NextResponse } from "next/server";
import { createTrack, validateUpload } from "@/services/tracks";
import { AccountType } from "@/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const audio = form.get("audio");
    const rightsConfirmed = form.get("rights_confirmed") === "true";

    if (!audio || !(audio instanceof File)) {
      return NextResponse.json({ error: "audio file is required" }, { status: 400 });
    }

    const buffer = Buffer.from(await audio.arrayBuffer());
    validateUpload(buffer, audio.type || "application/octet-stream", audio.name);

    let ddexXml: string | undefined;
    const ddexFile = form.get("ddex_xml");
    if (ddexFile instanceof File) {
      ddexXml = await ddexFile.text();
    }

    const accountType = (form.get("account_type") as AccountType) || "individual";

    const result = await createTrack({
      audioBuffer: buffer,
      filename: audio.name,
      mimeType: audio.type || "application/octet-stream",
      title: (form.get("title") as string) || undefined,
      artist: (form.get("artist") as string) || undefined,
      accountType,
      rightsConfirmed,
      notifyEmail: (form.get("notify_email") as string) || undefined,
      ddexXml,
    });

    return NextResponse.json({
      track_id: result.publicId,
      public_id: result.publicId,
      status: result.status,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function GET() {
  const { listTracks } = await import("@/services/tracks");
  const tracks = listTracks();
  return NextResponse.json({ tracks });
}
