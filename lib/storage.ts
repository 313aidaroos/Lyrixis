import { createAdminClient } from "@/lib/supabase/admin";
import { getStorageBucket } from "@/lib/env";

const SIGNED_URL_SECONDS = 90;

export function originalAudioPath(userId: string, trackId: string, extension: string): string {
  return `${userId}/${trackId}/original.${extension}`;
}

export function normalizedAudioPath(userId: string, trackId: string): string {
  return `${userId}/${trackId}/normalized.wav`;
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
