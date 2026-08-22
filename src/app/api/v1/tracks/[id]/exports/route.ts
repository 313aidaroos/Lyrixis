import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import { getExportPath } from "@/services/tracks";

export const dynamic = "force-dynamic";

const MIME: Record<string, string> = {
  json: "application/json",
  srt: "text/plain; charset=utf-8",
  lrc: "text/plain; charset=utf-8",
  txt: "text/plain; charset=utf-8",
  mead: "application/xml",
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const format = req.nextUrl.searchParams.get("format") || "json";

  if (!MIME[format]) {
    return NextResponse.json(
      { error: "Unsupported format. Use: json, srt, lrc, txt, mead" },
      { status: 400 }
    );
  }

  const exp = getExportPath(id, format);
  if (!exp) {
    return NextResponse.json(
      { error: "Export not ready yet" },
      { status: 404 }
    );
  }

  const content = fs.readFileSync(exp.path);
  return new NextResponse(content, {
    headers: {
      "Content-Type": MIME[format],
      "Content-Disposition": `attachment; filename="${exp.filename}"`,
    },
  });
}
