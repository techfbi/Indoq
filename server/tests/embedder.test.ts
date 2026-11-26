import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/*
  The embedder pays per request, so what matters is which failures are
  retried. The OpenAI SDK is replaced by a fake that counts calls.
*/
const fake = vi.hoisted(() => {
  class FakeApiError extends Error {
    status?: number;
    code?: string;
    constructor(status: number, code?: string) {
      super(`api error ${status}`);
      this.status = status;
      this.code = code;
    }
  }
  return { FakeApiError, create: vi.fn() };
});

vi.mock("openai", () => {
  class FakeOpenAI {
    static APIError = fake.FakeApiError;
    embeddings = { create: fake.create };
  }
  return { default: FakeOpenAI };
});

import { embedBatch } from "../src/services/ingestion/embedder.js";
import { EmbeddingRejectedError } from "../src/services/ingestion/ingestionErrors.js";

const reply = (n: number) => ({
  data: Array.from({ length: n }, (_, i) => ({ index: n - 1 - i, embedding: [n - 1 - i] })),
});

describe("embedBatch", () => {
  beforeEach(() => {
    fake.create.mockReset();
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it("returns embeddings in input order even if the API reorders them", async () => {
    fake.create.mockResolvedValue(reply(3));
    expect(await embedBatch(["a", "b", "c"])).toEqual([[0], [1], [2]]);
  });

  it("retries a rate limit and then succeeds", async () => {
    fake.create
      .mockRejectedValueOnce(new fake.FakeApiError(429))
      .mockResolvedValueOnce(reply(1));

    const pending = embedBatch(["a"]);
    await vi.runAllTimersAsync();

    expect(await pending).toEqual([[0]]);
    expect(fake.create).toHaveBeenCalledTimes(2);
  });

  it("stops retrying after the limit and raises the last error", async () => {
    fake.create.mockRejectedValue(new fake.FakeApiError(503));

    const pending = embedBatch(["a"]);
    const settled = expect(pending).rejects.toThrow("api error 503");
    await vi.runAllTimersAsync();
    await settled;

    expect(fake.create).toHaveBeenCalledTimes(4);
  });

  it("never retries an auth failure", async () => {
    fake.create.mockRejectedValue(new fake.FakeApiError(401));
    await expect(embedBatch(["a"])).rejects.toBeInstanceOf(EmbeddingRejectedError);
    expect(fake.create).toHaveBeenCalledTimes(1);
  });

  it("never retries when the account is out of credit", async () => {
    fake.create.mockRejectedValue(new fake.FakeApiError(429, "insufficient_quota"));
    await expect(embedBatch(["a"])).rejects.toBeInstanceOf(EmbeddingRejectedError);
    expect(fake.create).toHaveBeenCalledTimes(1);
  });

  it("never retries a bad request, which may already have been charged", async () => {
    fake.create.mockRejectedValue(new fake.FakeApiError(400));
    await expect(embedBatch(["a"])).rejects.toThrow("api error 400");
    expect(fake.create).toHaveBeenCalledTimes(1);
  });

  it("rejects a response with the wrong number of embeddings", async () => {
    fake.create.mockResolvedValue(reply(1));
    await expect(embedBatch(["a", "b"])).rejects.toThrow("did not match");
  });
});
