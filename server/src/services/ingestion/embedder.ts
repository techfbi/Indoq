import OpenAI from "openai";
import { env } from "../../config/env.js";
import { logger } from "../../utils/logger.js";
import { EmbeddingRejectedError } from "./ingestionErrors.js";

/*
  The SDK would also retry timeouts, where the first request may have
  been charged already. Only clear rejections are retried, below.
*/
const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY, maxRetries: 0 });

const MAX_RETRIES = 3;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/*
  Embeds one batch with OpenAI text-embedding-3-small. Rate limits and
  server errors are not charged, so those are retried with backoff.
  Returns embeddings in the same order as the input.
*/
export const embedBatch = async (
  texts: string[],
  attempt = 0
): Promise<number[][]> => {
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: texts,
      dimensions: 1536,
    });

    if (response.data.length !== texts.length) {
      throw new Error("Embedding response did not match the request");
    }

    return response.data
      .sort((a, b) => a.index - b.index)
      .map((item) => item.embedding);
  } catch (err: unknown) {
    if (!(err instanceof OpenAI.APIError)) throw err;

    const outOfCredit = err.code === "insufficient_quota";
    if (outOfCredit || err.status === 401 || err.status === 403) {
      throw new EmbeddingRejectedError(err.message);
    }

    const canRetry = err.status === 429 || (err.status ?? 0) >= 500;
    if (!canRetry || attempt >= MAX_RETRIES) throw err;

    const delayMs = 2 ** attempt * 2000;
    logger.warn("OpenAI embedding rate limited, retrying", { attempt, delayMs });
    await sleep(delayMs);
    return embedBatch(texts, attempt + 1);
  }
};
