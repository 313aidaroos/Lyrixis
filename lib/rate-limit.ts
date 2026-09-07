import IORedis from "ioredis";
import { getRedisUrl } from "@/lib/env";
import { HttpError } from "@/lib/errors";

let redis: IORedis | null = null;

const WAITLIST_WINDOW_SEC = 10 * 60;
const WAITLIST_MAX = 8;
const waitlistHits = new Map<string, { count: number; resetAt: number }>();

function getRedis(): IORedis {
  if (!redis) {
    redis = new IORedis(getRedisUrl(), { maxRetriesPerRequest: 3 });
  }
  return redis;
}

function throwWaitlistLimited(): never {
  throw new HttpError(429, "rate_limited", "Too many requests. Try again in a few minutes.");
}

function assertMemoryWaitlistLimit(ip: string): void {
  const now = Date.now();
  const current = waitlistHits.get(ip);
  if (!current || current.resetAt <= now) {
    waitlistHits.set(ip, { count: 1, resetAt: now + WAITLIST_WINDOW_SEC * 1000 });
    return;
  }
  current.count += 1;
  if (current.count > WAITLIST_MAX) throwWaitlistLimited();
}

export async function assertUploadRateLimit(userId: string): Promise<void> {
  const key = `rl:upload:${userId}`;
  const count = await getRedis().incr(key);
  if (count === 1) {
    await getRedis().expire(key, 60 * 60);
  }
  if (count > 20) {
    const error = new Error("Upload rate limit reached. Try again in an hour.");
    (error as Error & { status?: number }).status = 429;
    throw error;
  }
}

/** Light public limiter. Uses Redis when REDIS_URL is set; otherwise per-instance memory. */
export async function assertWaitlistRateLimit(ip: string): Promise<void> {
  const identity = ip || "unknown";
  if (!process.env.REDIS_URL) {
    assertMemoryWaitlistLimit(identity);
    return;
  }
  try {
    const key = `rl:waitlist:${identity}`;
    const count = await getRedis().incr(key);
    if (count === 1) {
      await getRedis().expire(key, WAITLIST_WINDOW_SEC);
    }
    if (count > WAITLIST_MAX) throwWaitlistLimited();
  } catch (error) {
    if (error instanceof HttpError) throw error;
    assertMemoryWaitlistLimit(identity);
  }
}
