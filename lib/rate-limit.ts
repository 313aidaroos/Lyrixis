import IORedis from "ioredis";
import { getRedisUrl } from "@/lib/env";

let redis: IORedis | null = null;

function getRedis(): IORedis {
  if (!redis) {
    redis = new IORedis(getRedisUrl(), { maxRetriesPerRequest: 3 });
  }
  return redis;
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
