import { XMLParser } from "fast-xml-parser";
import { TrackMetadata } from "@/types";

export interface DdexParseResult {
  title?: string;
  artist?: string;
  metadata: TrackMetadata;
}

export function parseDdexErn(xml: string): DdexParseResult {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    removeNSPrefix: true,
  });
  const doc = parser.parse(xml);

  const result: DdexParseResult = {
    metadata: { source: "ddex" },
  };

  const findText = (obj: unknown, keys: string[]): string | undefined => {
    if (!obj || typeof obj !== "object") return undefined;
    const record = obj as Record<string, unknown>;
    for (const key of keys) {
      const val = record[key];
      if (typeof val === "string" && val.trim()) return val.trim();
      if (val && typeof val === "object" && "#text" in (val as object)) {
        const t = (val as { "#text": string })["#text"];
        if (t?.trim()) return t.trim();
      }
    }
    for (const v of Object.values(record)) {
      if (typeof v === "object") {
        const found = findText(v, keys);
        if (found) return found;
      }
    }
    return undefined;
  };

  result.title = findText(doc, [
    "ReferenceTitle",
    "TitleText",
    "DisplayTitle",
    "Title",
  ]);
  result.artist = findText(doc, [
    "DisplayArtistName",
    "PartyName",
    "FullName",
    "ArtistName",
  ]);
  result.metadata.isrc = findText(doc, ["ISRC", "ProprietaryId"]);
  result.metadata.upc = findText(doc, ["ICPN", "UPC", "EAN"]);
  result.metadata.label = findText(doc, ["LabelName", "ReleaseLabelReference"]);
  result.metadata.album = findText(doc, ["ReleaseTitle", "AlbumTitle"]);

  return result;
}
