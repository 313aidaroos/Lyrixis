// Expiring HMAC-signed URLs for files served by /api/voices/files (demo mode storage).
// Live mode uses Supabase Storage signed URLs instead.
import { createHmac, timingSafeEqual } from "node:crypto";

function secret(): string {
  const s = process.env.VOICES_SIGNING_SECRET;
  if (s && s.length >= 32) return s;
  if (process.env.VERCEL_ENV === "production") throw new Error("VOICES_SIGNING_SECRET (32+ chars) is required in production");
  return "lyrixis-voices-demo-signing-secret-not-for-production";
}

export function signFileUrl(bucket: string, path: string, ttlSeconds: number, now = Date.now()): string {
  const exp = Math.floor(now / 1000) + ttlSeconds;
  const sig = createHmac("sha256", secret()).update(`${bucket}/${path}:${exp}`).digest("base64url");
  return `/api/voices/files?b=${encodeURIComponent(bucket)}&p=${encodeURIComponent(path)}&e=${exp}&s=${sig}`;
}

export function verifyFileUrl(bucket: string, path: string, exp: string, sig: string, now = Date.now()): boolean {
  const e = Number(exp);
  if (!Number.isFinite(e) || e < Math.floor(now / 1000)) return false;
  const want = createHmac("sha256", secret()).update(`${bucket}/${path}:${e}`).digest();
  const got = Buffer.from(sig, "base64url");
  return got.length === want.length && timingSafeEqual(got, want);
}
