import {
  IntelligencePackage,
  LyricLine,
  TrackMetadata,
  TrackSection,
} from "@/types";
import { formatLrcTime, formatSrtTime } from "@/lib/utils";

export function generateSrt(lines: LyricLine[]): string {
  return lines
    .map((line, i) => {
      return `${i + 1}\n${formatSrtTime(line.startMs)} --> ${formatSrtTime(line.endMs)}\n${line.text}\n`;
    })
    .join("\n");
}

export function generateLrc(
  lines: LyricLine[],
  meta: { title: string; artist: string }
): string {
  const header = [
    `[ti:${meta.title}]`,
    `[ar:${meta.artist}]`,
    `[by:Lyrixis]`,
  ].join("\n");
  const body = lines
    .map((line) => `${formatLrcTime(line.startMs)}${line.text}`)
    .join("\n");
  return `${header}\n${body}\n`;
}

export function generateTxt(lines: LyricLine[]): string {
  return lines.map((l) => l.text).join("\n");
}

export function generateJson(pkg: IntelligencePackage): string {
  return JSON.stringify(pkg, null, 2);
}

export function generateMeadXml(pkg: IntelligencePackage): string {
  const lines = pkg.lyrics
    .map(
      (l) =>
        `      <LyricLine startMs="${l.startMs}" endMs="${l.endMs}" confidence="${l.confidence.toFixed(2)}">${escapeXml(l.text)}</LyricLine>`
    )
    .join("\n");

  const sections = pkg.structure
    .map(
      (s) =>
        `      <Section label="${escapeXml(s.label)}" startMs="${s.startMs}" endMs="${s.endMs}"/>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<MediaEnrichment xmlns="http://ddex.net/xml/me/1.0">
  <SoundRecording>
    <ResourceId>
      <ISRC>${escapeXml(pkg.metadata.isrc || "")}</ISRC>
    </ResourceId>
    <DisplayTitle>${escapeXml(pkg.title)}</DisplayTitle>
    <DisplayArtistName>${escapeXml(pkg.artist)}</DisplayArtistName>
    <DurationSeconds>${pkg.durationSeconds}</DurationSeconds>
    <Language>${escapeXml(pkg.language)}</Language>
    <Lyrics confidenceBand="${pkg.confidenceBand}">
${lines}
    </Lyrics>
    <Structure>
${sections}
    </Structure>
    <ExplicitStatus>${pkg.explicit}</ExplicitStatus>
    <VerificationLevel>${pkg.verification}</VerificationLevel>
  </SoundRecording>
</MediaEnrichment>`;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function inferStructure(
  lines: LyricLine[],
  durationMs: number
): TrackSection[] {
  if (lines.length === 0) {
    return [
      {
        label: "intro",
        startMs: 0,
        endMs: Math.min(15000, durationMs),
        confidence: 0.6,
      },
    ];
  }

  const third = Math.floor(lines.length / 3);
  const sections: TrackSection[] = [
    {
      label: "verse",
      startMs: lines[0].startMs,
      endMs: lines[Math.max(0, third - 1)]?.endMs ?? lines[0].endMs,
      confidence: 0.7,
    },
  ];

  if (lines.length > 2) {
    sections.push({
      label: "chorus",
      startMs: lines[third]?.startMs ?? 0,
      endMs: lines[Math.min(lines.length - 1, third * 2)]?.endMs ?? durationMs,
      confidence: 0.65,
    });
  }

  if (lines.length > third * 2) {
    sections.push({
      label: "outro",
      startMs: lines[third * 2]?.startMs ?? 0,
      endMs: lines[lines.length - 1].endMs,
      confidence: 0.6,
    });
  }

  return sections;
}

export function detectExplicit(text: string): {
  status: "clean" | "explicit" | "possibly_explicit" | "unknown";
  confidence: number;
} {
  const explicitWords = [
    "fuck",
    "shit",
    "bitch",
    "ass",
    "damn",
    "hell",
    "nigga",
    "cunt",
  ];
  const lower = text.toLowerCase();
  const hits = explicitWords.filter((w) => lower.includes(w));
  if (hits.length >= 2) return { status: "explicit", confidence: 0.9 };
  if (hits.length === 1) return { status: "possibly_explicit", confidence: 0.75 };
  return { status: "clean", confidence: 0.85 };
}
