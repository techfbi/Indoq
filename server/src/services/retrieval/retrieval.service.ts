import OpenAI from "openai";
import { env } from "../../config/env.js";
import { vectorSearch } from "./vectorSearch.js";
import { fullTextSearch } from "./fullTextSearch.js";
import { reciprocalRankFusion } from "./hybridFusion.js";
import { LIMITS } from "../../config/limits.js";
import { documentRepo } from "../../repositories/document.repo.js";
import { logger } from "../../utils/logger.js";
import type { FusedChunk } from "./hybridFusion.js";

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

/*
  Embeds the user query using the same model used to embed
  document chunks. Must use identical model and dimensions
  or the cosine similarity comparison is meaningless.
*/
const embedQuery = async (query: string): Promise<number[]> => {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: query,
    dimensions: 1536,
  });

  const embedding = response.data[0]?.embedding;
  if (!embedding) throw new Error("Query embedding returned no data");

  return embedding;
};

/*
  Runs vector search and full text search in parallel then
  merges results using Reciprocal Rank Fusion.
  Returns the top CONTEXT_TOP_K chunks sorted by RRF score.
  Retrieval is insufficient when nothing was found, or when there is
  no keyword match and the best cosine similarity is below
  MIN_RELEVANCE_SCORE. RRF scores only rank results, they say
  nothing about how relevant a result is.
*/
export const retrieve = async (
  query: string,
  workspaceId: string,
  documentId?: string
): Promise<{ chunks: FusedChunk[]; insufficient: boolean }> => {
  const startMs = Date.now();

  const queryEmbedding = await embedQuery(query);

  /*
    Run both retrieval methods in parallel.
    If FTS fails (e.g. query contains no indexable tokens)
    we fall back to vector results only rather than failing
    the entire retrieval.
  */
  const [[vectorResults, ftsResults], readyIds] = await Promise.all([
    Promise.allSettled([
      vectorSearch(queryEmbedding, workspaceId, documentId),
      fullTextSearch(query, workspaceId, documentId),
    ]),
    documentRepo.findReadyIds(workspaceId),
  ]);

  /*
    Chunks are saved before a document is finished, so leave out any
    that belong to a document still processing or stopped part way.
  */
  const onlyReady = <T extends { document_id: string }>(chunks: T[]): T[] =>
    chunks.filter((c) => readyIds.has(c.document_id));

  const vector =
    vectorResults.status === "fulfilled" ? onlyReady(vectorResults.value) : [];
  const fts =
    ftsResults.status === "fulfilled" ? onlyReady(ftsResults.value) : [];

  if (vectorResults.status === "rejected") {
    logger.error("Vector search failed", {
      error: (vectorResults.reason as Error).message,
    });
  }

  if (ftsResults.status === "rejected") {
    logger.warn("Full text search failed, using vector only", {
      error: (ftsResults.reason as Error).message,
    });
  }

  const fused = reciprocalRankFusion(vector, fts, LIMITS.CONTEXT_TOP_K);

  const retrievalMs = Date.now() - startMs;

  logger.info("Retrieval complete", {
    workspaceId,
    documentId,
    vectorCount: vector.length,
    ftsCount: fts.length,
    fusedCount: fused.length,
    topSimilarity: vector[0]?.score ?? 0,
    retrievalMs,
  });

  const topSimilarity = vector[0]?.score ?? 0;
  const insufficient =
    fused.length === 0 ||
    (fts.length === 0 && topSimilarity < LIMITS.MIN_RELEVANCE_SCORE);

  return { chunks: fused, insufficient };
};