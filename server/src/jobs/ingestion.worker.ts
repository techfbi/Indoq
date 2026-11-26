import { Worker, type Job } from "bullmq";
import mammoth from "mammoth";
import {
  QUEUE_NAMES,
  getIngestionQueue,
  type IngestionJobData,
} from "../config/queue.js";
import { getRedis } from "../config/redis.js";
import { supabaseAdmin } from "../config/supabase.js";
import { LIMITS } from "../config/limits.js";
import { chunkRepo } from "../repositories/chunk.repo.js";
import { documentRepo } from "../repositories/document.repo.js";
import { chunkDocument } from "../services/ingestion/chunker.js";
import { embedBatch } from "../services/ingestion/embedder.js";
import {
  DocumentDeletedError,
  PermanentIngestionError,
} from "../services/ingestion/ingestionErrors.js";
import {
  extractPdfText,
  getPdfPageCount,
} from "../services/ingestion/pdfExtractor.js";
import type { DocumentStatus } from "../types/database.js";
import { logger } from "../utils/logger.js";

/*
  At most 2 documents are processed at once on this server instance.
  Raise this only if memory allows, parsing and embedding are both
  memory intensive.
*/
const CONCURRENCY = 2;

// How each stage reads in the message shown when processing stops
const STAGE_LABELS: Partial<Record<DocumentStatus, string>> = {
  EXTRACTING: "reading the file",
  CHUNKING: "splitting the text",
  EMBEDDING: "building the search index",
  INDEXING: "finishing the search index",
};

export interface ExtractedDocument {
  text: string;
  pageCount: number;
}

// DOCX, TXT and MD have no page count, so estimate 250 words per page
const withEstimatedPages = (text: string): ExtractedDocument => ({
  text,
  pageCount: Math.ceil(text.split(/\s+/).length / 250),
});

const extractText = async (
  buffer: Buffer,
  mimeType: string
): Promise<ExtractedDocument> => {
  if (mimeType === "application/pdf") return extractPdfText(buffer);

  if (
    mimeType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return withEstimatedPages(result.value);
  }

  if (mimeType === "text/plain" || mimeType === "text/markdown") {
    return withEstimatedPages(buffer.toString("utf8"));
  }

  throw new PermanentIngestionError("This document type is not supported.");
};

/*
  Downloads the document file from Supabase Storage using a
  short lived signed URL generated server side.
  The file is never publicly accessible.
*/
const downloadFile = async (storagePath: string): Promise<Buffer> => {
  const { data, error } = await supabaseAdmin.storage
    .from("documents")
    .createSignedUrl(storagePath, 60);

  if (error || !data?.signedUrl) {
    throw new Error(`Failed to generate signed URL: ${error?.message}`);
  }

  const response = await fetch(data.signedUrl);
  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.statusText}`);
  }

  return Buffer.from(await response.arrayBuffer());
};

/*
  PDFs sometimes contain null characters or broken Unicode pairs.
  Postgres cannot store either and rejects the whole save with
  "unsupported Unicode escape sequence", so remove them up front.
*/
const UNSTORABLE_CHARS =
  /\u0000|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;

const stripUnstorableChars = (text: string): string =>
  text.replace(UNSTORABLE_CHARS, "");

const assertPageLimit = (pageCount: number): void => {
  if (pageCount > LIMITS.MAX_PAGES_PER_DOCUMENT) {
    throw new PermanentIngestionError(
      `This document has ${pageCount} pages. The limit is ${LIMITS.MAX_PAGES_PER_DOCUMENT} pages. Consider splitting it into sections.`
    );
  }
};

// Moves to the next stage, and stops if the document was deleted meanwhile
const enterStage = async (
  documentId: string,
  status: DocumentStatus
): Promise<void> => {
  const stillExists = await documentRepo.updateStatus(documentId, status);
  if (!stillExists) throw new DocumentDeletedError();
};

/*
  Reads and splits the file, then saves every chunk. Nothing here is
  paid for. Skipped when an earlier attempt already got this far.
*/
const prepareChunks = async ({
  documentId,
  workspaceId,
  storagePath,
  mimeType,
}: IngestionJobData): Promise<void> => {
  await enterStage(documentId, "EXTRACTING");
  const buffer = await downloadFile(storagePath);

  // PDFs have a cheap page count, so check before extracting all the text
  if (mimeType === "application/pdf") {
    assertPageLimit(await getPdfPageCount(buffer));
  }

  const extracted = await extractText(buffer, mimeType);
  assertPageLimit(extracted.pageCount);
  await documentRepo.updatePageCount(documentId, extracted.pageCount);

  await enterStage(documentId, "CHUNKING");
  const chunks = chunkDocument(stripUnstorableChars(extracted.text));

  if (chunks.length === 0) {
    throw new PermanentIngestionError(
      "This document has no readable text. It may be a scanned image."
    );
  }

  await chunkRepo.saveCheckpoint(documentId, workspaceId, chunks);
  logger.info("Chunks saved", { documentId, chunkCount: chunks.length });
};

/*
  Embeds only the chunks that have no embedding yet and saves each
  batch before paying for the next, so a retry never pays again for
  work that was already saved.
*/
const embedPendingChunks = async (documentId: string): Promise<void> => {
  let embedded = 0;

  for (;;) {
    // Also the deletion check, right before each paid call
    await enterStage(documentId, "EMBEDDING");

    const pending = await chunkRepo.findPending(
      documentId,
      LIMITS.EMBEDDING_BATCH_SIZE
    );
    if (pending.length === 0) break;

    // Saved batches leave the pending list, so this can only mean a bug
    if (embedded >= LIMITS.MAX_CHUNKS_PER_DOCUMENT) {
      throw new PermanentIngestionError(
        "This document could not be indexed. Please contact support."
      );
    }

    const embeddings = await embedBatch(pending.map((c) => c.content));
    await chunkRepo.saveEmbeddings(pending, embeddings);
    embedded += pending.length;

    logger.info("Embedding batch saved", { documentId, embedded });
  }
};

/*
  Processes a single ingestion job, continuing from the checkpoint an
  earlier attempt left behind. Updates document status at each stage
  so Supabase Realtime can push live progress to the client.
*/
const processJob = async (job: Job<IngestionJobData>): Promise<void> => {
  const { documentId } = job.data;

  try {
    const status = await documentRepo.findStatus(documentId);
    if (status === null) throw new DocumentDeletedError();
    if (status === "READY") return;

    logger.info("Ingestion job started", { documentId });
    await enterStage(documentId, "PROCESSING");

    if (await chunkRepo.hasCheckpoint(documentId)) {
      logger.info("Continuing from saved chunks", { documentId });
    } else {
      await prepareChunks(job.data);
    }

    await embedPendingChunks(documentId);
    await enterStage(documentId, "INDEXING");
    await enterStage(documentId, "READY");

    logger.info("Ingestion job complete", { documentId });
  } catch (err) {
    if (err instanceof DocumentDeletedError) {
      logger.info("Document deleted, ingestion stopped", { documentId });
      return;
    }
    throw err;
  }
};

/*
  Marks the document FAILED once BullMQ has given up on the job. Doing
  it here rather than inside the job means the job is already out of
  the way when the user clicks retry, and it also covers jobs that
  stalled because the server stopped.
*/
const handleFailed = async (
  job: Job<IngestionJobData> | undefined,
  err: Error
): Promise<void> => {
  if (!job) return;
  const { documentId } = job.data;

  logger.error("Ingestion attempt failed", {
    documentId,
    attempt: job.attemptsMade,
    error: err.message,
  });

  try {
    if (!(await job.isFailed())) return;

    const status = await documentRepo.findStatus(documentId);
    if (status === null || status === "READY") return;

    const label = STAGE_LABELS[status] ?? "starting";
    await documentRepo.updateStatus(
      documentId,
      "FAILED",
      err instanceof PermanentIngestionError
        ? err.message
        : `Processing stopped while ${label}. Retry to continue from there.`
    );
  } catch (error) {
    logger.error("Could not mark document as failed", {
      documentId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

// How often the watchdog checks, and how long jobs may wait with nobody working
const WATCHDOG_INTERVAL_MS = 30_000;
const IDLE_WITH_WAITING_JOBS_MS = 60_000;

const createWorker = (onStart: () => void, onEnd: () => void) => {
  const worker = new Worker<IngestionJobData>(
    QUEUE_NAMES.DOCUMENT_INGESTION,
    async (job) => {
      onStart();
      try {
        await processJob(job);
      } finally {
        onEnd();
      }
    },
    {
      connection: getRedis(),
      concurrency: CONCURRENCY,
    }
  );

  worker.on("failed", (job, err) => void handleFailed(job, err));

  worker.on("error", (err) => {
    logger.error("Ingestion worker connection error", {
      error: err.message,
    });
  });

  return worker;
};

/*
  Creates and starts the BullMQ worker.
  Called once at server startup.

  A worker can stop receiving jobs without any error, for example when
  the connection to a hosted Redis is dropped silently while it waits.
  Jobs then sit as QUEUED forever. The watchdog notices waiting jobs
  while nothing is being processed, and replaces the worker.
*/
export const startIngestionWorker = () => {
  let running = 0;
  let lastActivity = Date.now();

  const touch = () => {
    lastActivity = Date.now();
  };
  const onStart = () => {
    running++;
    touch();
  };
  const onEnd = () => {
    running--;
    touch();
  };

  let worker = createWorker(onStart, onEnd);

  const watchdog = setInterval(async () => {
    try {
      const waiting = await getIngestionQueue().getWaitingCount();
      const idleFor = Date.now() - lastActivity;

      if (waiting === 0 || running > 0 || idleFor < IDLE_WITH_WAITING_JOBS_MS) {
        return;
      }

      logger.warn("Jobs are waiting but the worker is idle, restarting it", {
        waiting,
        idleSeconds: Math.round(idleFor / 1000),
      });

      const stuckWorker = worker;
      worker = createWorker(onStart, onEnd);
      touch();
      await stuckWorker.close(true).catch(() => undefined);
    } catch (err) {
      logger.warn("Worker watchdog check failed", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }, WATCHDOG_INTERVAL_MS);
  watchdog.unref();

  logger.info("Ingestion worker started", { concurrency: CONCURRENCY });

  return worker;
};
