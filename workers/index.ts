import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { Worker } from "bullmq";
import { TRACK_QUEUE_NAME, getWorkerConnection } from "@/lib/queue";
import { processTrack } from "@/workers/pipeline";

function loadEnvFile(): void {
  const files = [".env.local", ".env"];
  for (const file of files) {
    const full = resolve(process.cwd(), file);
    if (!existsSync(full)) continue;
    const text = readFileSync(full, "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  }
}

loadEnvFile();

const worker = new Worker(
  TRACK_QUEUE_NAME,
  async (job) => {
    const trackId = (job.data as { trackId?: string }).trackId;
    if (!trackId) {
      throw new Error("Job is missing trackId.");
    }
    console.log(`[worker] processing ${trackId} (job ${job.id})`);
    await processTrack(trackId);
    console.log(`[worker] completed ${trackId}`);
  },
  {
    connection: getWorkerConnection(),
    concurrency: 2,
  }
);

worker.on("failed", (job, error) => {
  console.error(`[worker] job ${job?.id} failed:`, error.message);
});

console.log(`[worker] listening on queue "${TRACK_QUEUE_NAME}"`);

async function shutdown(signal: string): Promise<void> {
  console.log(`[worker] ${signal} received, closing`);
  await worker.close();
  process.exit(0);
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});
process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});
