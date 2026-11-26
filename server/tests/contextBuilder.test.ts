import { describe, expect, it } from "vitest";
import { buildContext } from "../src/services/rag/contextBuilder.js";
import type { FusedChunk } from "../src/services/retrieval/hybridFusion.js";

const fused = (id: string, content: string, section: string | null = null): FusedChunk =>
  ({
    id,
    document_id: `doc-${id}`,
    content,
    page_number: null,
    section_title: section,
    rrfScore: 1,
    sources: ["vector"],
  }) as unknown as FusedChunk;

describe("buildContext", () => {
  it("numbers chunks from 1 and maps each number to its own chunk", () => {
    const { citationMap, contextSection } = buildContext(
      [fused("a", "Education text", "Education"), fused("b", "Skills text", "Skills")],
      false
    );
    expect(citationMap.map((c) => [c.index, c.chunk_id])).toEqual([[1, "a"], [2, "b"]]);
    expect(contextSection).toContain("[Doc 1]");
    expect(contextSection).toContain("[Doc 2]");
  });

  it("gives the inspector the whole chunk, not a cut excerpt", () => {
    const long = "word ".repeat(400).trim();
    const { citationMap } = buildContext([fused("a", long)], false);
    expect(citationMap[0]?.chunk_excerpt).toBe(long);
  });

  it("only offers diagrams when there is relevant context", () => {
    expect(buildContext([fused("a", "x")], false).systemPrompt).toContain("DIAGRAMS");
    expect(buildContext([], true).systemPrompt).not.toContain("DIAGRAMS");
  });

  it("tells the model not to answer when nothing relevant was found", () => {
    const { systemPrompt, contextSection } = buildContext([], true);
    expect(systemPrompt).toContain("did not find relevant information");
    expect(contextSection).toBe("");
  });

  it("drops the lowest ranked chunks when over the token budget", () => {
    const big = "x".repeat(20_000);
    const { citationMap } = buildContext([fused("a", big), fused("b", big), fused("c", big)], false);
    expect(citationMap.length).toBeLessThan(3);
    expect(citationMap[0]?.chunk_id).toBe("a");
  });
});
