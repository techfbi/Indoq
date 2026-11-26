import { describe, expect, it } from "vitest";
import { stripUnstorableChars } from "../src/services/ingestion/sanitizeText.js";

describe("stripUnstorableChars", () => {
  it("removes null characters", () => {
    expect(stripUnstorableChars("a\u0000b")).toBe("ab");
  });

  it("removes lone surrogates", () => {
    expect(stripUnstorableChars("x\uD800y")).toBe("xy");
    expect(stripUnstorableChars("x\uDC00y")).toBe("xy");
  });

  it("keeps valid emoji pairs and normal text", () => {
    expect(stripUnstorableChars("hi 😀 café")).toBe("hi 😀 café");
  });
});
