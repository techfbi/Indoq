import { documentRepo } from "../../repositories/document.repo.js";
import { workspaceRepo } from "../../repositories/workspace.repo.js";
import { supabaseAdmin } from "../../config/supabase.js";
import { LIMITS } from "../../config/limits.js";
import { ValidationError } from "../../utils/errors.js";
import {
  createFileUrl,
  removeFiles,
  tryRemoveFiles,
} from "./documentStorage.js";
import {
  cancelIngestion,
  enqueueIngestion,
  hasLiveJob,
} from "../ingestion/ingestionJobs.js";
import { logger } from "../../utils/logger.js";
import type { Database } from "../../types/database.js";
import { v4 as uuidv4 } from "uuid";
import path from "path";

type DocumentRow = Database["public"]["Tables"]["documents"]["Row"];

// Matches the client, which offers retry after the same time
const STUCK_AFTER_MS = 5 * 60 * 1000;

// Postgres unique violation
const UNIQUE_VIOLATION = "23505";

/*
  Starts processing. If the queue cannot be reached the document is
  marked FAILED instead of waiting forever, so the user can retry.
*/
const startIngestion = async (
  document: DocumentRow,
  userId: string,
  replaceWaiting = false
): Promise<DocumentRow> => {
  try {
    await enqueueIngestion(
      {
        documentId: document.id,
        workspaceId: document.workspace_id,
        userId,
        storagePath: document.storage_path,
        mimeType: document.mime_type,
      },
      { replaceWaiting }
    );
    return document;
  } catch (err) {
    logger.error("Could not queue document", {
      documentId: document.id,
      error: err instanceof Error ? err.message : String(err),
    });

    const message = "Processing could not start. Retry to continue.";
    await documentRepo.updateStatus(document.id, "FAILED", message);
    return { ...document, status: "FAILED", processing_error: message };
  }
};

export const documentService = {
  getAll: (workspaceId: string, userId: string, accessToken: string) =>
    documentRepo.findAllByWorkspace(workspaceId, accessToken),

  getById: (documentId: string, workspaceId: string, userId: string, accessToken: string) =>
    documentRepo.findById(documentId, workspaceId, accessToken),

  /*
    Link to the original file. The lookup runs as the user, so RLS
    decides whether they may see it. PDF and TXT open in the browser,
    other formats download under their original name.
  */
  getFileUrl: async (
    documentId: string,
    workspaceId: string,
    accessToken: string
  ): Promise<string> => {
    const document = await documentRepo.findById(
      documentId,
      workspaceId,
      accessToken
    );

    const opensInBrowser = ["application/pdf", "text/plain"].includes(
      document.mime_type
    );

    return createFileUrl(
      document.storage_path,
      opensInBrowser ? undefined : document.original_filename
    );
  },

  upload: async (
    workspaceId: string,
    userId: string,
    file: Express.Multer.File,
    title?: string,
    requestedId?: string
  ): Promise<DocumentRow> => {
    /*
      Verify the workspace exists and belongs to this user
      before doing anything with the file.
    */
    await workspaceRepo.verifyOwnership(workspaceId, userId);

    /*
      The client picks the document id, so sending an upload again
      after a lost response finds the first one instead of storing,
      processing and paying for a second copy.
    */
    const documentId = requestedId ?? uuidv4();
    const earlier = await documentRepo.findAny(documentId);

    if (earlier) {
      if (earlier.workspace_id !== workspaceId) {
        throw new ValidationError("Please choose the file again and retry");
      }
      return earlier.status === "QUEUED"
        ? startIngestion(earlier, userId)
        : earlier;
    }

    /*
      Check the file count and total size limits. Counts every
      document regardless of status, including failed ones, since
      their files still take up storage.
    */
    const existing = await documentRepo.findFilesByWorkspace(workspaceId);

    if (existing.length >= LIMITS.MAX_FILES_PER_WORKSPACE) {
      throw new ValidationError(
        `This workspace has reached the limit of ${LIMITS.MAX_FILES_PER_WORKSPACE} documents`
      );
    }

    const usedBytes = existing.reduce((sum, f) => sum + f.file_size, 0);

    if (usedBytes + file.size > LIMITS.MAX_WORKSPACE_STORAGE_BYTES) {
      const limitMB = LIMITS.MAX_WORKSPACE_STORAGE_BYTES / 1024 / 1024;
      throw new ValidationError(
        `This file would take the workspace over its ${limitMB}MB storage limit`
      );
    }

    const extension = path.extname(file.originalname).toLowerCase();
    const sanitizedFilename = documentId + extension;

    /*
      Storage path structure: userId/workspaceId/documentId/filename
      The RLS policy on storage.objects enforces that the first
      folder segment matches the authenticated user's ID.
    */
    const storagePath = `${userId}/${workspaceId}/${documentId}/${sanitizedFilename}`;

    /*
      Upload the file buffer to Supabase Storage.
      The bucket is private, no public access.
      Content type is set to the validated canonical MIME type,
      not whatever the browser sent.
    */
    const { error: uploadError } = await supabaseAdmin.storage
      .from("documents")
      .upload(storagePath, file.buffer, {
        contentType: file.mimetype,
        // A file here with no record is left from an interrupted attempt
        upsert: true,
      });

    if (uploadError) {
      logger.error("Storage upload failed", {
        documentId,
        workspaceId,
        error: uploadError.message,
      });
      throw uploadError;
    }

    /*
      Create the document record in the database with QUEUED status.
      The ingestion worker will update this as it progresses.
    */
    const document = await documentRepo
      .create({
        id: documentId,
        workspace_id: workspaceId,
        title: title?.trim() || file.originalname,
        original_filename: file.originalname,
        storage_path: storagePath,
        mime_type: file.mimetype,
        file_size: file.size,
        status: "QUEUED",
      })
      .catch(async (err: unknown) => {
        // The same upload arrived twice at once and the other one won
        if ((err as { code?: string }).code === UNIQUE_VIOLATION) {
          const winner = await documentRepo.findAny(documentId);
          if (winner?.workspace_id === workspaceId) return winner;
        }

        // Without a record nothing points at the file, so remove it
        await tryRemoveFiles([storagePath]);
        throw err;
      });

    logger.info("Document uploaded", {
      documentId,
      workspaceId,
      filename: file.originalname,
      size: file.size,
    });

    return startIngestion(document, userId);
  },

  /*
    Continues a document that stopped. The worker picks up from the
    chunks and embeddings already saved. Safe to call repeatedly, a
    document that is finished or already running is returned as is.
  */
  retry: async (
    documentId: string,
    workspaceId: string,
    userId: string,
    accessToken: string
  ): Promise<DocumentRow> => {
    const document = await documentRepo.findById(
      documentId,
      workspaceId,
      accessToken
    );

    if (document.status === "READY") return document;

    /*
      A live job normally means it is already being handled. But if the
      document has not moved for several minutes, the job is stuck, for
      example because the worker stopped. Then retry replaces it.
    */
    const idleMs = Date.now() - new Date(document.updated_at).getTime();
    const stuck = idleMs > STUCK_AFTER_MS;
    if (!stuck && (await hasLiveJob(documentId))) return document;

    const claimed = await documentRepo.claimForRetry(document);
    if (!claimed) {
      return documentRepo.findById(documentId, workspaceId, accessToken);
    }

    return startIngestion(claimed, userId, stuck);
  },

  delete: async (
    documentId: string,
    workspaceId: string,
    userId: string
  ): Promise<void> => {
    const storagePath = await documentRepo.findStoragePath(
      documentId,
      workspaceId,
      userId
    );

    /*
      Job, then file, then record. The record is the only pointer to
      the other two, so it goes last and a failed delete can be
      repeated. Chunks and embeddings cascade with the record.
    */
    await cancelIngestion(documentId);
    await removeFiles([storagePath]);
    await documentRepo.delete(documentId);
  },
};