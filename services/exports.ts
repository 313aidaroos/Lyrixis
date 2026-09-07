import type { ExportFormat, JsonExportPayload, LyricLine } from "@/types";
import { formatLrcTime, formatSrtTime } from "@/lib/utils";

export function generateTxt(lines: LyricLine[]): string {
  return lines.map((line) => line.text).join("\n") + "\n";
}

export function generateSrt(lines: LyricLine[]): string {
  return lines
    .map((line, index) => {
      return `${index + 1}\n${formatSrtTime(line.startMs)} --> ${formatSrtTime(line.endMs)}\n${line.text}\n`;
    })
    .join("\n");
}

export function generateLrc(
  lines: LyricLine[],
  meta: { title: string | null; artist: string | null }
): string {
  const header = [
    `[ti:${meta.title ?? ""}]`,
    `[ar:${meta.artist ?? ""}]`,
    `[by:Lyrixis]`,
  ].join("\n");
  const body = lines.map((line) => `${formatLrcTime(line.startMs)}${line.text}`).join("\n");
  return `${header}\n${body}\n`;
}

export function generateJson(payload: JsonExportPayload): string {
  return `${JSON.stringify(payload, null, 2)}\n`;
}

export function buildExport(
  format: ExportFormat,
  payload: JsonExportPayload
): { body: string; contentType: string; filename: string } {
  const slug = payload.publicId;
  switch (format) {
    case "txt":
      return {
        body: generateTxt(payload.lines),
        contentType: "text/plain; charset=utf-8",
        filename: `${slug}.txt`,
      };
    case "srt":
      return {
        body: generateSrt(payload.lines),
        contentType: "application/x-subrip; charset=utf-8",
        filename: `${slug}.srt`,
      };
    case "lrc":
      return {
        body: generateLrc(payload.lines, { title: payload.title, artist: payload.artist }),
        contentType: "text/plain; charset=utf-8",
        filename: `${slug}.lrc`,
      };
    case "json":
      return {
        body: generateJson(payload),
        contentType: "application/json; charset=utf-8",
        filename: `${slug}.json`,
      };
    default: {
      const exhaustive: never = format;
      throw new Error(`Unsupported export format: ${String(exhaustive)}`);
    }
  }
}
