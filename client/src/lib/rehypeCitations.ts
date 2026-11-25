import type { Element, ElementContent, Root, Text } from "hast";

/*
  Turns [Doc N] markers in rendered markdown into <cite> elements
  that carry the number, so the renderer can swap in a badge.
  Also accepts 【Doc N】 with full width brackets, which gpt oss models
  emit in short answers. Keep in sync with the server pattern in
  services/rag/citationMapper.ts.
*/
const CITATION = /[[【]Doc\s*(\d+)[\]】]/gi;

// Markers inside code are literal text, and badges cannot nest in links
const SKIPPED_TAGS = new Set(["code", "pre", "a"]);

const splitText = (node: Text): ElementContent[] => {
  const parts: ElementContent[] = [];
  let cursor = 0;

  for (const match of node.value.matchAll(CITATION)) {
    if (match.index > cursor) {
      parts.push({ type: "text", value: node.value.slice(cursor, match.index) });
    }
    parts.push({
      type: "element",
      tagName: "cite",
      properties: { dataDoc: match[1] },
      children: [{ type: "text", value: `[Doc ${match[1]}]` }],
    });
    cursor = match.index + match[0].length;
  }

  if (cursor === 0) return [node];
  if (cursor < node.value.length) {
    parts.push({ type: "text", value: node.value.slice(cursor) });
  }
  return parts;
};

const transform = (parent: Root | Element): void => {
  const children = parent.children as ElementContent[];

  parent.children = children.flatMap((child) => {
    if (child.type === "text") return splitText(child);
    if (child.type === "element" && !SKIPPED_TAGS.has(child.tagName)) {
      transform(child);
    }
    return [child];
  });
};

export const rehypeCitations = () => (tree: Root) => transform(tree);
