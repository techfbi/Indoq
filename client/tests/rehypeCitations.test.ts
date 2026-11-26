import { describe, expect, it } from "vitest";
import type { Element, Root } from "hast";
import { rehypeCitations } from "../src/lib/rehypeCitations";

const text = (value: string) => ({ type: "text" as const, value });
const el = (tagName: string, ...children: Element["children"]): Element => ({
  type: "element",
  tagName,
  properties: {},
  children,
});

const run = (...children: Root["children"]): Root => {
  const tree: Root = { type: "root", children };
  rehypeCitations()(tree);
  return tree;
};

const cites = (tree: Root) => {
  const found: string[] = [];
  const walk = (nodes: Root["children"]) =>
    nodes.forEach((n) => {
      if (n.type !== "element") return;
      if (n.tagName === "cite") found.push(String(n.properties.dataDoc));
      walk(n.children as Root["children"]);
    });
  walk(tree.children);
  return found;
};

describe("rehypeCitations", () => {
  it("turns each marker into a cite element carrying its number", () => {
    const tree = run(el("p", text("A [Doc 2] and B [Doc 10].")));
    expect(cites(tree)).toEqual(["2", "10"]);
  });

  it("keeps the text around the markers", () => {
    const tree = run(el("p", text("A [Doc 2] end")));
    const p = tree.children[0] as Element;
    expect(p.children.map((c) => (c.type === "text" ? c.value : "cite"))).toEqual([
      "A ",
      "cite",
      " end",
    ]);
  });

  it("accepts the full width bracket variant", () => {
    expect(cites(run(el("p", text("x 【Doc 3】"))))).toEqual(["3"]);
  });

  it("leaves markers inside code and links as plain text", () => {
    const tree = run(
      el("p", el("code", text("[Doc 1]")), el("a", text("[Doc 2]")))
    );
    expect(cites(tree)).toEqual([]);
  });
});
