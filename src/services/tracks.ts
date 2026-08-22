import fs from "fs";
import path from "path";
import { createHash } from "crypto";
import { execFile } from "child_process";
import { promisify } from "util";
import { parseBuffer } from "music-metadata";
import { v4 as uuidv4 } from "uuid";
import { getDb, getExportsDir, getUploadsDir } from "@/lib/db";
import { publicIdNode, confidenceToBand } from "@/lib/utils";
import { getTranscriptionProvider } from "@/providers/transcription";
import {
  detectExplicit,
  generateJson,
  generateLrc,
  generateMeadXml,
  generateSrt,
  generateTxt,
  inferStructure,
} from "@/services/exports";
import { parseDdexErn } from "@/services/ddex";
import { sendResultsEmail } from "@/services/email";
import {
  AccountType,
  IntelligencePackage,
  TrackMetadata,
  UploadInput,
} from "@/types";

const execFileAsync = promisify(execFile);

const ALLOWED_MIME = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/flac",
  "audio/mp4",
  "audio/x-m4a",
  "audio/m4a",
  "application/octet-stream",
]);

const MAX_BYTES = (parseInt(process.env.MAX_UPLOAD_MB || "100", 10) || 100) * 1024 * 1024;

export async function createTrack(input: UploadInput) {
  if (!input.rightsConfirmed) {
    throw new Error("rights_confirmed is required");
  }

  const ext = path.extname(input.filename) || ".mp3";
  const id = uuidv4();
  const pubId = publicIdNode();
  const audioPath = path.join(getUploadsDir(), `${id}${ext}`);
  fs.writeFileSync(audioPath, input.audioBuffer);

  const sha256 = createHash("sha256").update(input.audioBuffer).digest("hex");
  let title = input.title || path.basename(input.filename, ext);
  let artist = input.artist || "Unknown Artist";
  let metadata: TrackMetadata = {
    source: input.accountType === "ddex" ? "ddex" : "user",
    ...input.metadata,
  };

  if (input.ddexXml) {
    const ddex = parseDdexErn(input.ddexXml);
    if (ddex.title) title = ddex.title;
    if (ddex.artist) artist = ddex.artist;
    metadata = { ...metadata, ...ddex.metadata };
  }

  try {
    const tags = await parseBuffer(input.audioBuffer, {
      mimeType: input.mimeType,
    });
    if (!input.title && tags.common.title) title = tags.common.title;
    if (!input.artist && tags.common.artist) artist = tags.common.artist;
    if (tags.common.album) metadata.album = tags.common.album;
    if (tags.common.isrc) {
      const isrc = tags.common.isrc;
      metadata.isrc = Array.isArray(isrc) ? isrc[0] : String(isrc);
    }
    if (tags.common.label) {
      const label = tags.common.label;
      metadata.label = Array.isArray(label) ? label[0] : String(label);
    }
  } catch {
    // metadata parsing is best-effort
  }

  const db = getDb();
  db.prepare(
    `INSERT INTO tracks (
      id, public_id, title, artist, original_filename, audio_path, audio_sha256,
      status, account_type, notify_email, rights_confirmed, rights_confirmed_at, metadata_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'queued', ?, ?, 1, datetime('now'), ?)`
  ).run(
    id,
    pubId,
    title,
    artist,
    input.filename,
    audioPath,
    sha256,
    input.accountType,
    input.notifyEmail || null,
    JSON.stringify(metadata)
  );

  queueProcessing(id);
  return { trackId: id, publicId: pubId, status: "queued" as const };
}

function queueProcessing(trackId: string) {
  setImmediate(() => {
    processTrack(trackId).catch((err) => {
      console.error("Processing failed:", err);
      const db = getDb();
      db.prepare(
        `UPDATE tracks SET status = 'failed', error_message = ?, updated_at = datetime('now') WHERE id = ?`
      ).run(err instanceof Error ? err.message : String(err), trackId);
    });
  });
}

export async function processTrack(trackId: string) {
  const db = getDb();
  const track = db
    .prepare(`SELECT * FROM tracks WHERE id = ?`)
    .get(trackId) as Record<string, unknown> | undefined;

  if (!track) throw new Error("Track not found");

  const updateStatus = (status: string) => {
    db.prepare(
      `UPDATE tracks SET status = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(status, trackId);
  };

  updateStatus("processing");

  const audioPath = track.audio_path as string;
  let durationSeconds = 180;

  try {
    const { stdout } = await execFileAsync("ffprobe", [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      audioPath,
    ]);
    durationSeconds = parseFloat(stdout.trim()) || 180;
    db.prepare(`UPDATE tracks SET duration_seconds = ? WHERE id = ?`).run(
      durationSeconds,
      trackId
    );
  } catch {
    // ffprobe optional
  }

  updateStatus("transcribing");
  const provider = getTranscriptionProvider();
  const transcription = await provider.transcribe({
    audioPath,
    durationSeconds,
    title: track.title as string,
    artist: track.artist as string,
  });

  updateStatus("analyzing");
  const explicit = detectExplicit(transcription.text);
  const durationMs = Math.round(durationSeconds * 1000);
  const structure = inferStructure(transcription.lines, durationMs);
  const avgConf =
    transcription.lines.length > 0
      ? transcription.lines.reduce((s, l) => s + l.confidence, 0) /
        transcription.lines.length
      : transcription.languageConfidence;

  const band = confidenceToBand(avgConf);
  const metadata = JSON.parse(
    (track.metadata_json as string) || "{}"
  ) as TrackMetadata;

  const pkg: IntelligencePackage = {
    trackId,
    publicId: track.public_id as string,
    status: band === "review" ? "manual_review" : "completed",
    title: (track.title as string) || "Untitled",
    artist: (track.artist as string) || "Unknown Artist",
    durationSeconds,
    language: transcription.language,
    languageConfidence: transcription.languageConfidence,
    confidenceBand: band,
    explicit: explicit.status,
    verification: "ai_generated",
    lyrics: transcription.lines,
    structure,
    metadata,
    accountType: track.account_type as AccountType,
    notifyEmail: (track.notify_email as string) || undefined,
    createdAt: track.created_at as string,
    completedAt: new Date().toISOString(),
  };

  const exportsDir = path.join(getExportsDir(), trackId);
  fs.mkdirSync(exportsDir, { recursive: true });

  const formats: Record<string, string> = {
    json: generateJson(pkg),
    srt: generateSrt(transcription.lines),
    lrc: generateLrc(transcription.lines, {
      title: pkg.title,
      artist: pkg.artist,
    }),
    txt: generateTxt(transcription.lines),
    mead: generateMeadXml(pkg),
  };

  for (const [format, content] of Object.entries(formats)) {
    const exportPath = path.join(exportsDir, `export.${format}`);
    fs.writeFileSync(exportPath, content);
    db.prepare(
      `INSERT INTO exports (id, track_id, format, storage_path, bytes) VALUES (?, ?, ?, ?, ?)`
    ).run(uuidv4(), trackId, format, exportPath, Buffer.byteLength(content));
  }

  db.prepare(
    `UPDATE tracks SET
      status = ?, language = ?, language_confidence = ?,
      explicit_status = ?, transcription_confidence = ?, confidence_band = ?,
      result_json = ?, completed_at = datetime('now'), updated_at = datetime('now')
     WHERE id = ?`
  ).run(
    pkg.status,
    pkg.language,
    avgConf,
    pkg.explicit,
    avgConf,
    band,
    JSON.stringify(pkg),
    trackId
  );

  if (pkg.notifyEmail) {
    await sendResultsEmail(pkg.notifyEmail, pkg);
  }
}

export function getTrackByPublicId(publicId: string): IntelligencePackage | null {
  const db = getDb();
  const row = db
    .prepare(`SELECT result_json, status FROM tracks WHERE public_id = ?`)
    .get(publicId) as { result_json: string | null; status: string } | undefined;

  if (!row?.result_json) {
    const pending = db
      .prepare(
        `SELECT public_id, status, title, artist, created_at, account_type, notify_email, error_message
         FROM tracks WHERE public_id = ?`
      )
      .get(publicId) as Record<string, unknown> | undefined;

    if (!pending) return null;

    return {
      trackId: "",
      publicId: pending.public_id as string,
      status: pending.status as IntelligencePackage["status"],
      title: (pending.title as string) || "Processing…",
      artist: (pending.artist as string) || "",
      durationSeconds: 0,
      language: "",
      languageConfidence: 0,
      confidenceBand: "review",
      explicit: "unknown",
      verification: "ai_generated",
      lyrics: [],
      structure: [],
      metadata: { source: "user" },
      accountType: pending.account_type as AccountType,
      notifyEmail: pending.notify_email as string | undefined,
      createdAt: pending.created_at as string,
    };
  }

  return JSON.parse(row.result_json) as IntelligencePackage;
}

export function listTracks(limit = 50) {
  const db = getDb();
  return db
    .prepare(
      `SELECT public_id, title, artist, status, account_type, created_at, completed_at
       FROM tracks ORDER BY created_at DESC LIMIT ?`
    )
    .all(limit) as {
    public_id: string;
    title: string;
    artist: string;
    status: string;
    account_type: string;
    created_at: string;
    completed_at: string | null;
  }[];
}

export function getExportPath(
  publicId: string,
  format: string
): { path: string; filename: string } | null {
  const db = getDb();
  const track = db
    .prepare(`SELECT id, title FROM tracks WHERE public_id = ?`)
    .get(publicId) as { id: string; title: string } | undefined;
  if (!track) return null;

  const exp = db
    .prepare(`SELECT storage_path FROM exports WHERE track_id = ? AND format = ?`)
    .get(track.id, format) as { storage_path: string } | undefined;
  if (!exp) return null;

  const safeTitle = (track.title || "track").replace(/[^a-zA-Z0-9-_]/g, "_");
  return {
    path: exp.storage_path,
    filename: `${safeTitle}.${format}`,
  };
}

export function validateUpload(
  buffer: Buffer,
  mimeType: string,
  filename: string
) {
  if (buffer.length > MAX_BYTES) {
    throw new Error(`File exceeds ${MAX_BYTES / 1024 / 1024}MB limit`);
  }
  const ext = path.extname(filename).toLowerCase();
  const allowedExt = [".mp3", ".wav", ".flac", ".m4a", ".xml"];
  if (!allowedExt.includes(ext) && !ALLOWED_MIME.has(mimeType)) {
    throw new Error("Unsupported file type. Use MP3, WAV, FLAC, M4A, or DDEX XML.");
  }
}
