import { getIngestionQueue, type IngestionJobData } from "../../config/queue.js";
import { logger } from "../../utils/logger.js";

/*
  Redis commands wait forever while Redis is unreachable, which would
  leave the HTTP request hanging, so producer calls get a limit.
*/
const QUEUE_TIMEOUT_MS = 10_000;

const withTimeout = async <T>(work: Promise<T>): Promise<T> => {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error("The job queue did not respond")),
      QUEUE_TIMEOUT_MS
    );
  });

  try {
    return await Promise.race([work, timeout]);
  } finally {
    clearTimeout(timer);
  }
};

const FINISHED_STATES = new Set(["completed", "failed", "unknown"]);

// True while a job for this document is running or waiting to run
export const hasLiveJob = async (documentId: string): Promise<boolean> =>
  withTimeout(
    (async () => {
      const job = await getIngestionQueue().getJob(documentId);
      return job ? !FINISHED_STATES.has(await job.getState()) : false;
    })()
  );

/*
  Adds the ingestion job. The job id is the document id, so adding a
  document that is already queued does nothing. A finished job with
  that id would also block the add, so it is removed first.
*/
export const enqueueIngestion = async (
  data: IngestionJobData,
  options: { replaceWaiting?: boolean } = {}
): Promise<void> => {
  await withTimeout(
    (async () => {
      const queue = getIngestionQueue();
      const previous = await queue.getJob(data.documentId);

      if (previous) {
        const state = await previous.getState();
        // A job nobody picked up for too long is replaced by a fresh one
        const replace = options.replaceWaiting && state !== "active";

        if (FINISHED_STATES.has(state) || replace) {
          await previous.remove();
        }
      }

      await queue.add(data.documentId, data, { jobId: data.documentId });
    })()
  );
};

/*
  Removes a document's job from Redis when the document is deleted.
  A running job is locked and cannot be removed. It notices the missing
  document before its next paid step and stops by itself.
*/
export const cancelIngestion = async (documentId: string): Promise<void> => {
  try {
    await withTimeout(
      (async () => {
        const job = await getIngestionQueue().getJob(documentId);
        await job?.remove();
      })()
    );
  } catch (err) {
    logger.info("Ingestion job not removed, worker will stop it", {
      documentId,
      reason: err instanceof Error ? err.message : String(err),
    });
  }
};
