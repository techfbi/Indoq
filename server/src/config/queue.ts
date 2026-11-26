import { Queue } from "bullmq";
import { getRedis } from "./redis.js";
import { logger } from "../utils/logger.js";

// BullMQ Queue is the producer side, it adds jobs to Redis. The worker consumes them
export const QUEUE_NAMES = {
  DOCUMENT_INGESTION: "document-ingestion",
} as const;

export interface IngestionJobData {
  documentId: string;
  workspaceId: string;
  userId: string;
  storagePath: string;
  mimeType: string;
}

let ingestionQueue: Queue<IngestionJobData> | null = null;

export const getIngestionQueue = (): Queue<IngestionJobData> => {
  if (ingestionQueue) return ingestionQueue;

  ingestionQueue = new Queue<IngestionJobData>(QUEUE_NAMES.DOCUMENT_INGESTION, {
    connection: getRedis(),
    defaultJobOptions: {
      attempts: 3, // with exponential backoff means if a document fails, it waits 5s, then 10s, then 20s before marking it failed
      backoff: {
        type: "exponential",
        delay: 5000,
      },
      removeOnComplete: true, // nothing needs a finished job, so leave nothing behind in Redis
      removeOnFail: { age: 7 * 24 * 60 * 60, count: 200 }, // kept a week for debugging, retry removes it sooner
    },
  });

  /*
    Prevent unhandled EventEmitter error events from crashing the Node process
    when Redis is temporarily unreachable.
  */
  ingestionQueue.on("error", (err) => {
    logger.error("BullMQ ingestion queue connection error", {
      error: err.message,
    });
  });

  return ingestionQueue;
};
