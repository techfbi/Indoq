import { describe, expect, it } from "vitest";
import { chunkDocument } from "../src/services/ingestion/chunker.js";
import { LIMITS } from "../src/config/limits.js";

// Builds a paragraph of n distinct sentences
const sentences = (prefix: string, n: number): string =>
  Array.from({ length: n }, (_, i) => `${prefix} sentence number ${i} says something useful.`).join(" ");

describe("chunkDocument", () => {
  it("returns nothing for empty text", () => {
    expect(chunkDocument("")).toEqual([]);
    expect(chunkDocument("   \n\n  ")).toEqual([]);
  });

  it("keeps short text in a single chunk", () => {
    const chunks = chunkDocument("Hello there. This is a short note.");
    expect(chunks).toHaveLength(1);
    expect(chunks[0]?.content).toBe("Hello there. This is a short note.");
    expect(chunks[0]?.chunkIndex).toBe(0);
  });

  it("labels chunks with the section heading they sit under", () => {
    const chunks = chunkDocument("## Education\nBSc Computer Science.\n## Skills\nTypeScript and Postgres.");
    expect(chunks.map((c) => c.sectionTitle)).toEqual(["Education", "Skills"]);
  });

  it("never carries text across a section boundary", () => {
    const text = `## First\n${sentences("alpha", 80)}\n## Second\n${sentences("beta", 5)}`;
    const second = chunkDocument(text).filter((c) => c.sectionTitle === "Second");
    expect(second.length).toBeGreaterThan(0);
    for (const chunk of second) expect(chunk.content).not.toContain("alpha");
  });

  it("splits long sections and repeats some text between neighbours", () => {
    const chunks = chunkDocument(sentences("long", 200));
    expect(chunks.length).toBeGreaterThan(1);

    const first = chunks[0]!.content;
    const second = chunks[1]!.content;
    const lastSentenceOfFirst = first.split(/(?<=[.])\s+/).at(-1)!;
    expect(second).toContain(lastSentenceOfFirst);
  });

  it("numbers chunks in order from zero", () => {
    const chunks = chunkDocument(sentences("order", 200));
    expect(chunks.map((c) => c.chunkIndex)).toEqual(chunks.map((_, i) => i));
  });

  it("keeps chunks near the token limit", () => {
    const chunks = chunkDocument(sentences("size", 300));
    for (const chunk of chunks) {
      expect(chunk.tokenCount).toBeLessThanOrEqual(LIMITS.CHUNK_SIZE_TOKENS + 40);
    }
  });

  it("stops at the chunk cap", () => {
    const count = LIMITS.MAX_CHUNKS_PER_DOCUMENT + 50;
    const huge = Array.from({ length: count }, (_, i) => `## Part ${i}\nText ${i}.`).join("\n");
    expect(chunkDocument(huge)).toHaveLength(LIMITS.MAX_CHUNKS_PER_DOCUMENT);
  });
});
