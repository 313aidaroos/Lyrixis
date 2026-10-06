// 2026-10-05 (Grok): ffmpeg for the in-Vercel pipeline (Option B). Vercel's runtime has no
// ffmpeg, so we ship the static Linux build from `ffmpeg-static` (traced into the function via
// next.config.ts outputFileTracingIncludes). FFMPEG_PATH overrides it (e.g. a worker host with
// a system ffmpeg); "ffmpeg" on PATH is the last resort.
import { execFile } from "child_process";
import { chmod, copyFile, stat } from "fs/promises";
import ffmpegStatic from "ffmpeg-static";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

/** Whisper's per-request upload limit is 25 MB; stay safely under it. */
export const WHISPER_MAX_BYTES = 24 * 1024 * 1024;

/**
 * 16 kHz mono MP3 at 64 kbps (~0.48 MB/min): what Whisper resamples to anyway, so no accuracy
 * loss that matters, and a 12-minute song is ~5.8 MB instead of a ~23 MB WAV.
 */
export function compressArgs(inputPath: string, outputPath: string): string[] {
  return [
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-i",
    inputPath,
    "-vn",
    "-ac",
    "1",
    "-ar",
    "16000",
    "-c:a",
    "libmp3lame",
    "-b:a",
    "64k",
    outputPath,
  ];
}

function staticBinary(): string | null {
  const found = ffmpegStatic as unknown as string | null;
  return typeof found === "string" && found ? found : null;
}

export function ffmpegCandidates(): string[] {
  const list: string[] = [];
  const override = process.env.FFMPEG_PATH?.trim();
  if (override) list.push(override);
  const bundled = staticBinary();
  if (bundled) list.push(bundled);
  list.push("ffmpeg");
  return list;
}

async function exists(path: string): Promise<boolean> {
  if (!path.includes("/")) return true; // bare name: let PATH resolve it
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

/** Run ffmpeg with the first binary that exists. Copies to /tmp + chmod if the bundle lost +x. */
export async function runFfmpeg(args: string[]): Promise<void> {
  let lastError: unknown = null;
  for (const bin of ffmpegCandidates()) {
    if (!(await exists(bin))) continue;
    try {
      await execFileAsync(bin, args, { maxBuffer: 8 * 1024 * 1024 });
      return;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "EACCES" && bin.includes("/")) {
        const copy = "/tmp/lyrixis-ffmpeg";
        await copyFile(bin, copy);
        await chmod(copy, 0o755);
        await execFileAsync(copy, args, { maxBuffer: 8 * 1024 * 1024 });
        return;
      }
      if (code === "ENOENT") {
        lastError = error;
        continue;
      }
      const stderr = (error as { stderr?: string }).stderr?.toString().trim();
      throw new Error(`ffmpeg failed: ${stderr || (error instanceof Error ? error.message : String(error))}`);
    }
  }
  throw new Error(
    `ffmpeg is not available (tried ${ffmpegCandidates().join(", ")}). ${lastError instanceof Error ? lastError.message : ""}`.trim()
  );
}
