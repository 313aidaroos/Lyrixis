import { Queue } from "bullmq";
import { getRedisUrl } from "@/lib/env";

export const TRACK_QUEUE_NAME = "track-processing";

let queue: Queue | null = null;

function redisConnection() {
  return { url: getRedisUrl() };
}

export function getTrackQueue(): Queue {
  if (!queue) {
    queue = new Queue(TRACK_QUEUE_NAME, { connection: redisConnection() });
  }
  return queue;
}

export async function enqueueTrackProcessing(trackId: string): Promise<string> {
  const job = await getTrackQueue().add(
    "process",
    { trackId },
    {
      jobId: `track-${trackId}`,
      attempts: 3,
      backoff: { type: "exponential", delay: 8_000 },
      removeOnComplete: 1_000,
      removeOnFail: 5_000,
    }
  );
  return job.id ?? trackId;
}

export type RedisConnectionOptions = ReturnType<typeof redisConnection>;

export function getWorkerConnection(): RedisConnectionOptions {
  return redisConnection();
}
