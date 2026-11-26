import { UnrecoverableError } from "bullmq";

/*
  Trying again cannot help, for example too many pages. BullMQ skips
  its remaining attempts. The message is shown to the user and starts
  with "This document", which the client uses to hide the retry icon.
*/
export class PermanentIngestionError extends UnrecoverableError {}

/*
  The embedding service refused the request, for example a bad key or
  no credit. Automatic attempts would fail the same way, so the user
  retries once it is fixed.
*/
export class EmbeddingRejectedError extends UnrecoverableError {}

// The document was deleted while it was being processed
export class DocumentDeletedError extends Error {}
