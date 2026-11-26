import { describe, expect, it } from "vitest";
import { reciprocalRankFusion } from "../src/services/retrieval/hybridFusion.js";
import type { RetrievedChunk } from "../src/services/retrieval/vectorSearch.js";

const chunk = (id: string): RetrievedChunk =>
  ({ id, content: id }) as unknown as RetrievedChunk;

describe("reciprocalRankFusion", () => {
  it("ranks a chunk found by both searches above one found by one", () => {
    const fused = reciprocalRankFusion([chunk("a"), chunk("b")], [chunk("b"), chunk("c")], 10);
    expect(fused[0]?.id).toBe("b");
    expect(fused[0]?.sources).toEqual(["vector", "fts"]);
  });

  it("limits the result to topK", () => {
    const list = ["a", "b", "c", "d"].map(chunk);
    expect(reciprocalRankFusion(list, [], 2)).toHaveLength(2);
  });

  it("returns an empty list when both searches find nothing", () => {
    expect(reciprocalRankFusion([], [], 5)).toEqual([]);
  });

  it("keeps the order of a single list", () => {
    const fused = reciprocalRankFusion(["a", "b", "c"].map(chunk), [], 5);
    expect(fused.map((c) => c.id)).toEqual(["a", "b", "c"]);
  });
});
