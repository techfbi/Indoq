import { beforeEach, describe, expect, it, vi } from "vitest";

type Lookup = {
  data: { id: string; title: string }[] | null;
  error: { message: string } | null;
};

// The mapper only needs a document title lookup, so the database is faked
const lookup = vi.hoisted(() => ({ result: null as unknown as Lookup }));

vi.mock("../src/config/supabase.js", () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({ in: () => ({ eq: () => Promise.resolve(lookup.result) }) }),
    }),
  },
}));

import { mapCitations } from "../src/services/rag/citationMapper.js";
import type { CitationReference } from "../src/services/rag/contextBuilder.js";

const ref = (index: number, document_id: string): CitationReference => ({
  index,
  document_id,
  chunk_id: `chunk-${index}`,
  chunk_excerpt: `excerpt ${index}`,
  page_number: null,
  section_title: `Section ${index}`,
});

const map = [ref(1, "d1"), ref(2, "d1"), ref(3, "d2")];

describe("mapCitations", () => {
  beforeEach(() => {
    lookup.result = {
      data: [{ id: "d1", title: "CV.pdf" }, { id: "d2", title: "Notes.md" }],
      error: null,
    };
  });

  it("returns nothing when the answer cites no document", async () => {
    expect(await mapCitations("No citations here.", map, "w1")).toEqual([]);
  });

  it("maps each cited number to its own chunk", async () => {
    const result = await mapCitations("Education [Doc 2] and notes [Doc 3].", map, "w1");
    expect(result.map((c) => [c.index, c.document_title, c.chunk_excerpt])).toEqual([
      [2, "CV.pdf", "excerpt 2"],
      [3, "Notes.md", "excerpt 3"],
    ]);
  });

  it("accepts the full width bracket and spaced variants models produce", async () => {
    const result = await mapCitations("A 【Doc 1】 and B [Doc  3] and C [doc 2].", map, "w1");
    expect(result.map((c) => c.index).sort()).toEqual([1, 2, 3]);
  });

  it("counts a number cited twice once", async () => {
    expect(await mapCitations("[Doc 1] again [Doc 1]", map, "w1")).toHaveLength(1);
  });

  it("ignores numbers that were never offered to the model", async () => {
    expect(await mapCitations("Made up [Doc 9]", map, "w1")).toEqual([]);
  });

  it("returns nothing instead of failing when the title lookup errors", async () => {
    lookup.result = { data: null, error: { message: "down" } };
    expect(await mapCitations("[Doc 1]", map, "w1")).toEqual([]);
  });

  it("falls back to a placeholder title for a missing document", async () => {
    lookup.result = { data: [], error: null };
    const [citation] = await mapCitations("[Doc 1]", map, "w1");
    expect(citation?.document_title).toBe("Unknown document");
  });
});
