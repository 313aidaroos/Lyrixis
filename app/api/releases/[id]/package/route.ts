import { requireUser } from "@/lib/auth";
import { jsonError, HttpError } from "@/lib/errors";
import {
  getOwnedTrackById,
  getRelease,
  hasHumanVerification,
  humanVerificationAt,
  markReleaseDelivered,
  normalizedMetadataView,
} from "@/services/releases";
import { loadCurrentLyrics } from "@/services/corrections";
import { generateLrc, generateSrt, generateTxt } from "@/services/exports";
import {
  buildMetadataJson,
  buildReadmeText,
  buildSplitSheetText,
  createZip,
  type PackageSplit,
} from "@/lib/release-package";
import type { LyricLine } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const textEncoder = new TextEncoder();

function slugify(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return slug || "release";
}

/**
 * Download the release package as a zip. Only for paid releases owned by the
 * signer, and only when the lyrics carry a human_verified record (the trust
 * anchor — enforced here, not just in the UI).
 *
 * Package contents:
 *   lyrics.txt / lyrics.lrc / lyrics.srt (via services/exports.ts)
 *   metadata.json, split-sheet.txt, README.txt
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const release = await getRelease(user, id);

    if (release.status !== "paid" && release.status !== "delivered") {
      throw new HttpError(402, "not_paid", "Pay for this release before downloading the package.");
    }
    const trackId = release.track_ids[0];
    if (!trackId) {
      throw new HttpError(409, "no_track", "This release has no track attached.");
    }
    const track = await getOwnedTrackById(user, trackId);

    if (!(await hasHumanVerification(track.id))) {
      throw new HttpError(409, "lyrics_not_verified", "Lyrics must be explicitly verified before download.");
    }
    const verifiedAt = await humanVerificationAt(track.id);

    const lyrics = await loadCurrentLyrics(track.id);
    const lines: LyricLine[] = lyrics?.lines ?? [];
    if (lines.length === 0) {
      throw new HttpError(409, "no_transcription", "No transcribed lyrics to package yet.");
    }

    const metadata = normalizedMetadataView(release);
    const splits = (release.splits ?? []) as PackageSplit[];
    const generatedAt = new Date().toISOString();
    const title = metadata.title;
    const artist = metadata.primaryArtist || track.artist;

    const missingCodes = [
      metadata.isrc ? null : "isrc",
      metadata.iswc ? null : "iswc",
      metadata.upc ? null : "upc",
    ].filter((code): code is string => code !== null);

    const zip = createZip([
      { name: "lyrics.txt", data: textEncoder.encode(generateTxt(lines)) },
      {
        name: "lyrics.lrc",
        data: textEncoder.encode(generateLrc(lines, { title, artist })),
      },
      { name: "lyrics.srt", data: textEncoder.encode(generateSrt(lines)) },
      {
        name: "metadata.json",
        data: textEncoder.encode(
          buildMetadataJson(
            { ...metadata, verifiedAt, generatedAt },
            splits
          )
        ),
      },
      {
        name: "split-sheet.txt",
        data: textEncoder.encode(
          buildSplitSheetText({ title, primaryArtist: metadata.primaryArtist, splits, generatedAt })
        ),
      },
      {
        name: "README.txt",
        data: textEncoder.encode(
          buildReadmeText({ title, primaryArtist: metadata.primaryArtist, missingCodes, generatedAt })
        ),
      },
    ]);

    await markReleaseDelivered({ user, releaseId: release.id });

    const filename = `lyrixis-release-${slugify(title)}.zip`;
    return new Response(new Blob([zip as unknown as BlobPart], { type: "application/zip" }), {
      headers: {
        "content-type": "application/zip",
        "content-disposition": `attachment; filename="${filename}"`,
        "content-length": String(zip.length),
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
