import { supabaseAdmin } from "../config/supabase.js";
import type { Chunk } from "../services/ingestion/chunker.js";
import { DocumentDeletedError } from "../services/ingestion/ingestionErrors.js";
import type { Database } from "../types/database.js";
import { logger } from "../utils/logger.js";

type ChunkRow = Database["public"]["Tables"]["document_chunks"]["Row"];
type ChunkInsert = Database["public"]["Tables"]["document_chunks"]["Insert"];

export type PendingChunk = Omit<ChunkRow, "id" | "embedding" | "created_at">;

const PENDING_COLUMNS =
  "document_id, workspace_id, chunk_index, content, page_number, section_title, token_count, metadata";

// Keeps each request well under payload limits
const WRITE_BATCH_SIZE = 50;

// Supabase returns at most 1000 rows per request by default
const READ_PAGE_SIZE = 1000;

// Short waits between save attempts, so paid embeddings are not lost to a blip
const SAVE_RETRY_DELAYS_MS = [1000, 3000];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/*
  Upsert on document and index, so repeating it never duplicates.
  Columns left out of the rows keep the value already stored.
*/
const upsertRows = async (rows: ChunkInsert[]): Promise<void> => {
  for (let i = 0; i < rows.length; i += WRITE_BATCH_SIZE) {
    const batch = rows.slice(i, i + WRITE_BATCH_SIZE);

    for (let attempt = 0; ; attempt++) {
      const { error } = await supabaseAdmin
        .from("document_chunks")
        .upsert(batch, { onConflict: "document_id,chunk_index" });

      if (!error) break;

      // Foreign key violation, the document no longer exists
      if (error.code === "23503") throw new DocumentDeletedError();

      const delay = SAVE_RETRY_DELAYS_MS[attempt];
      if (delay === undefined) throw error;

      logger.warn("Chunk save failed, trying again", {
        attempt,
        error: error.message,
      });
      await sleep(delay);
    }
  }
};

const findStored = async (
  documentId: string
): Promise<Pick<ChunkRow, "chunk_index" | "content">[]> => {
  const stored: Pick<ChunkRow, "chunk_index" | "content">[] = [];

  for (let from = 0; ; from += READ_PAGE_SIZE) {
    const { data, error } = await supabaseAdmin
      .from("document_chunks")
      .select("chunk_index, content")
      .eq("document_id", documentId)
      .order("chunk_index")
      .range(from, from + READ_PAGE_SIZE - 1);

    if (error) throw error;
    stored.push(...data);
    if (data.length < READ_PAGE_SIZE) return stored;
  }
};

/*
  Chunks double as the ingestion checkpoint. They are saved without
  embeddings before anything is paid for, then embeddings are filled
  in batch by batch. A chunk with no embedding is work still to do.
*/
export const chunkRepo = {
  /*
    True when every chunk was saved by an earlier attempt, so the file
    does not need to be downloaded, read and split again.
  */
  hasCheckpoint: async (documentId: string): Promise<boolean> => {
    const { data, count, error } = await supabaseAdmin
      .from("document_chunks")
      .select("metadata", { count: "exact" })
      .eq("document_id", documentId)
      .limit(1);

    if (error) throw error;
    const total = data[0]?.metadata["total"];
    return typeof total === "number" && count === total;
  },

  /*
    Saves the chunks. Embeddings from an earlier attempt are kept when
    the text is identical. Leftover rows that no longer match are
    removed first so their old embeddings are never reused.
  */
  saveCheckpoint: async (
    documentId: string,
    workspaceId: string,
    chunks: Chunk[]
  ): Promise<void> => {
    const stored = await findStored(documentId);
    const stale = stored
      .filter((row) => chunks[row.chunk_index]?.content !== row.content)
      .map((row) => row.chunk_index);

    for (let i = 0; i < stale.length; i += WRITE_BATCH_SIZE) {
      const { error } = await supabaseAdmin
        .from("document_chunks")
        .delete()
        .eq("document_id", documentId)
        .in("chunk_index", stale.slice(i, i + WRITE_BATCH_SIZE));

      if (error) throw error;
    }

    // No embedding column here, which is what preserves paid embeddings
    await upsertRows(
      chunks.map((chunk) => ({
        document_id: documentId,
        workspace_id: workspaceId,
        chunk_index: chunk.chunkIndex,
        content: chunk.content,
        page_number: chunk.pageNumber,
        section_title: chunk.sectionTitle,
        token_count: chunk.tokenCount,
        metadata: { total: chunks.length },
      }))
    );
  },

  // Next chunks that still need an embedding, in document order
  findPending: async (
    documentId: string,
    limit: number
  ): Promise<PendingChunk[]> => {
    const { data, error } = await supabaseAdmin
      .from("document_chunks")
      .select(PENDING_COLUMNS)
      .eq("document_id", documentId)
      .is("embedding", null)
      .order("chunk_index")
      .limit(limit);

    if (error) throw error;
    return data;
  },

  // Stores embeddings as soon as they are paid for
  saveEmbeddings: async (
    chunks: PendingChunk[],
    embeddings: number[][]
  ): Promise<void> =>
    upsertRows(
      chunks.map((chunk, i) => ({ ...chunk, embedding: embeddings[i]! }))
    ),
};
