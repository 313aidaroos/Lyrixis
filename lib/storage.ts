import { createAdminClient } from "@/lib/supabase/admin";
import { getStorageBucket } from "@/lib/env";

const SIGNED_URL_SECONDS = 90;

export function originalAudioPath(userId: string, trackId: string, extension: string): string {
  return `${userId}/${trackId}/original.${extension}`;
}

export function normalizedAudioPath(userId: string, trackId: string): string {
  return `${userId}/${trackId}/normalized.mp3`;
}

export function exportStoragePath(
  userId: string,
  trackId: string,
  format: string
): string {
  return `${userId}/${trackId}/exports/lyrics.${format}`;
}

export async function uploadPrivateObject(input: {
  path: string;
  body: Buffer;
  contentType: string;
}): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.storage.from(getStorageBucket()).upload(input.path, input.body, {
    contentType: input.contentType,
    upsert: true,
  });
  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }
}

export async function downloadPrivateObject(path: string): Promise<Buffer> {
  const admin = createAdminClient();
  const { data, error } = await admin.storage.from(getStorageBucket()).download(path);
  if (error || !data) {
    throw new Error(`Storage download failed: ${error?.message ?? "empty object"}`);
  }
  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function signedDownloadUrl(path: string): Promise<string> {
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(getStorageBucket())
    .createSignedUrl(path, SIGNED_URL_SECONDS);
  if (error || !data?.signedUrl) {
    throw new Error(`Could not create signed URL: ${error?.message ?? "unknown error"}`);
  }
  return data.signedUrl;
}

export async function removePrivateObjects(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  const admin = createAdminClient();
  const { error } = await admin.storage.from(getStorageBucket()).remove(paths);
  if (error) {
    throw new Error(`Storage delete failed: ${error.message}`);
  }
}

/**
 * Direct-to-Storage upload (2026-10-05, Grok). Vercel functions reject request bodies over
 * 4.5 MB (413 FUNCTION_PAYLOAD_TOO_LARGE), so the browser uploads the audio straight to the
 * private bucket with a one-time signed upload token, then POSTs only metadata to /api/tracks.
 * The token is minted with the service role for ONE exact path and expires after 2 hours.
 * The bucket's own file_size_limit (100 MB) still applies to the upload.
 */
export async function createSignedUploadTarget(path: string): Promise<{
  bucket: string;
  path: string;
  token: string;
  signedUrl: string;
}> {
  const admin = createAdminClient();
  const bucket = getStorageBucket();
  const { data, error } = await admin.storage.from(bucket).createSignedUploadUrl(path);
  if (error || !data?.token) {
    throw new Error(`Could not create signed upload URL: ${error?.message ?? "no token returned"}`);
  }
  return { bucket, path: data.path, token: data.token, signedUrl: data.signedUrl };
}

/**
 * Read only the first `maxBytes` of a private object (for magic-byte checks and tags) and
 * learn its total size, without pulling a 100 MB file into the function.
 * Returns null when the object does not exist.
 */
export async function readPrivateObjectHead(
  path: string,
  maxBytes = 1024 * 1024
): Promise<{ head: Buffer; size: number | null; contentType: string | null } | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(getStorageBucket())
    .createSignedUrl(path, SIGNED_URL_SECONDS);
  if (error || !data?.signedUrl) {
    const message = error?.message ?? "";
    if (/not.?found|does not exist|404/i.test(message)) return null;
    throw new Error(`Could not read uploaded object: ${message || "unknown error"}`);
  }

  const response = await fetch(data.signedUrl, {
    headers: { Range: `bytes=0-${maxBytes - 1}` },
    cache: "no-store",
  });
  if (response.status === 404 || response.status === 400) return null;
  if (!response.ok) {
    throw new Error(`Could not read uploaded object (HTTP ${response.status}).`);
  }

  // Total size: "Content-Range: bytes 0-1048575/12345678" on a 206, Content-Length on a 200.
  let size: number | null = null;
  const range = response.headers.get("content-range");
  const total = range ? /\/(\d+)\s*$/.exec(range)?.[1] : undefined;
  if (total) size = Number(total);
  else if (response.status === 200) {
    const length = Number(response.headers.get("content-length") ?? "");
    if (Number.isFinite(length) && length > 0) size = length;
  }

  const chunks: Buffer[] = [];
  let received = 0;
  const reader = response.body?.getReader();
  if (reader) {
    while (received < maxBytes) {
      const { done, value } = await reader.read();
      if (done || !value) break;
      chunks.push(Buffer.from(value));
      received += value.length;
    }
    await reader.cancel().catch(() => undefined);
  }
  const head = Buffer.concat(chunks).subarray(0, maxBytes);
  return { head, size, contentType: response.headers.get("content-type") };
}
