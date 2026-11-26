import { describe, expect, it } from "vitest";
import {
  cleanMermaidCode,
  containsDiagram,
  getDiagramType,
  parseContentSegments,
} from "../src/lib/diagram";

describe("parseContentSegments", () => {
  it("returns plain text as one segment", () => {
    expect(parseContentSegments("Just words.")).toEqual([
      { type: "text", content: "Just words." },
    ]);
  });

  it("splits text, diagram and text in order", () => {
    const segments = parseContentSegments(
      "Before.\n```mermaid\nflowchart TD\nA-->B\n```\nAfter."
    );
    expect(segments.map((s) => s.type)).toEqual(["text", "mermaid", "text"]);
    expect(segments[1]).toMatchObject({ complete: true });
  });

  it("marks a diagram whose closing fence has not streamed yet as incomplete", () => {
    const segments = parseContentSegments("Hi\n```mermaid\nflowchart TD\nA-->");
    expect(segments.at(-1)).toMatchObject({ type: "mermaid", complete: false });
  });

  it("handles two diagrams in one answer", () => {
    const text = "```mermaid\nflowchart TD\nA-->B\n```\n```mermaid\nflowchart TD\nC-->D\n```";
    expect(parseContentSegments(text).filter((s) => s.type === "mermaid")).toHaveLength(2);
  });
});

describe("containsDiagram", () => {
  it("detects a mermaid fence in any letter case", () => {
    expect(containsDiagram("```Mermaid\nx")).toBe(true);
    expect(containsDiagram("plain text")).toBe(false);
  });
});

describe("cleanMermaidCode", () => {
  it("removes citations that would break node syntax", () => {
    expect(cleanMermaidCode('flowchart TD\nA["Start"] [Doc 1]')).not.toContain("Doc");
  });

  it("keeps the meaning of a greater than sign in a flowchart label", () => {
    const cleaned = cleanMermaidCode('flowchart TD\nA["Pages > 800?"] --> B["Reject"]');
    expect(cleaned).toContain("#gt;");
    expect(cleaned).not.toContain("> 800");
  });

  it("does not touch the arrows of other diagram types", () => {
    const code = "classDiagram\nAnimal <|-- Dog";
    expect(cleanMermaidCode(code)).toBe(code);
  });
});

describe("getDiagramType", () => {
  it("reads the diagram keyword", () => {
    expect(getDiagramType("flowchart TD\nA-->B")).toBe("flowchart");
    expect(getDiagramType("sequenceDiagram\nA->>B: hi")).toBe("sequenceDiagram");
  });
});
