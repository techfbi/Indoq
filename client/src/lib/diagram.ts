/*
  Diagram detection and export helpers.
  The server instructs the model to wrap every diagram in a fenced
  mermaid code block. These helpers split a response into ordered
  text and diagram segments, clean diagram source, and export the
  rendered SVG as a standalone file.
*/

export type ContentSegment =
  | { type: "text"; content: string }
  | { type: "mermaid"; code: string; complete: boolean };

/*
  Opening fence: three backticks, optional spaces, the word mermaid,
  then a newline or the end of the string (the fence may be the last
  thing streamed so far). Case insensitive because models vary.
*/
const OPEN_FENCE = /```[ \t]*mermaid[ \t]*(?:\r?\n|$)/gi;
const CLOSE_FENCE = "```";

/*
  Pushes a text segment, trimming blank lines that sit directly
  against a diagram so the layout does not get large empty gaps.
*/
const pushText = (
  segments: ContentSegment[],
  text: string,
  trimStart: boolean,
  trimEnd: boolean
) => {
  let value = text;
  if (trimStart) value = value.replace(/^[\r\n]+/, "");
  if (trimEnd) value = value.replace(/[\r\n\s]+$/, "");
  if (value.trim() === "") return;
  segments.push({ type: "text", content: value });
};

/*
  Splits message content into ordered text and mermaid segments.
  A diagram whose closing fence has not arrived yet is returned
  with complete set to false so the UI can show a placeholder
  while the response is still streaming.
*/
export const parseContentSegments = (content: string): ContentSegment[] => {
  const segments: ContentSegment[] = [];
  let cursor = 0;
  let previousWasDiagram = false;

  OPEN_FENCE.lastIndex = 0;
  let match = OPEN_FENCE.exec(content);

  while (match) {
    // Text that came before this diagram
    pushText(
      segments,
      content.slice(cursor, match.index),
      previousWasDiagram,
      true
    );

    const bodyStart = match.index + match[0].length;
    const closeIndex = content.indexOf(CLOSE_FENCE, bodyStart);

    if (closeIndex === -1) {
      // Closing fence not streamed yet, everything after is diagram source
      segments.push({
        type: "mermaid",
        code: content.slice(bodyStart),
        complete: false,
      });
      return segments;
    }

    segments.push({
      type: "mermaid",
      code: content.slice(bodyStart, closeIndex),
      complete: true,
    });

    cursor = closeIndex + CLOSE_FENCE.length;
    previousWasDiagram = true;
    OPEN_FENCE.lastIndex = cursor;
    match = OPEN_FENCE.exec(content);
  }

  // Trailing text after the last diagram, or the whole message if none
  pushText(segments, content.slice(cursor), previousWasDiagram, false);

  return segments;
};

/*
  Quick check used for layout decisions, such as widening the
  chat bubble so a diagram has room. Does not parse anything.
*/
export const containsDiagram = (content: string): boolean =>
  /```[ \t]*mermaid/i.test(content);

/*
  Removes [Doc N] citation markers from diagram source.
  Square brackets are node shape syntax in mermaid, so a stray
  citation inside a label would break parsing. Citations belong
  in the surrounding prose, never inside the diagram.
*/
export const cleanMermaidCode = (code: string): string => {
  const withoutCitations = code
    .replace(/[ \t]*[[【]Doc\s*\d+[\]】]/gi, "")
    .trim();

  return escapeFlowchartLabels(withoutCitations);
};

/*
  With htmlLabels off, mermaid silently drops a bare < or > inside
  label text, so "Document > 800 pages?" rendered as
  "Document 800 pages?", which changes the meaning. Mermaid entity
  codes #lt; and #gt; render the real characters.

  Only applied to flowcharts, where it was observed. Other diagram
  types use < and | as syntax (classDiagram <|-- arrows, erDiagram
  ||--o{ relationships), so a blanket replace could break them.
  Covers quoted labels "..." and edge labels |...|.
*/
const escapeLabelText = (text: string): string =>
  text.replace(/</g, "#lt;").replace(/>/g, "#gt;");

const escapeFlowchartLabels = (code: string): string => {
  const type = getDiagramType(code);
  if (type !== "flowchart" && type !== "graph") return code;

  return code
    .replace(/"([^"\n]*)"/g, (_, inner: string) => `"${escapeLabelText(inner)}"`)
    .replace(
      /\|([^|\n]*)\|/g,
      (_, inner: string) => `|${escapeLabelText(inner)}|`
    );
};

/*
  Reads the diagram keyword from the first meaningful line.
  Skips mermaid comments (%%) and front matter delimiters.
*/
export const getDiagramType = (code: string): string => {
  const firstLine = code
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(
      (line) => line !== "" && !line.startsWith("%%") && !line.startsWith("---")
    );

  const keyword = firstLine?.match(/^([A-Za-z][\w]*)/)?.[1];
  return keyword ?? "diagram";
};

const DIAGRAM_LABELS: Record<string, string> = {
  flowchart: "Flowchart",
  graph: "Flowchart",
  sequenceDiagram: "Sequence diagram",
  classDiagram: "Class diagram",
  stateDiagram: "State diagram",
  erDiagram: "Entity relationship diagram",
  mindmap: "Mind map",
  timeline: "Timeline",
  gantt: "Gantt chart",
  pie: "Pie chart",
  journey: "User journey",
  quadrantChart: "Quadrant chart",
};

// Human readable label for the diagram header
export const getDiagramLabel = (type: string): string =>
  DIAGRAM_LABELS[type] ?? "Diagram";

/*
  Builds a download filename from the brand name, the diagram type,
  and the current date and time, so repeated exports do not collide.
*/
export const buildSvgFilename = (brandName: string, type: string): string => {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(
    now.getDate()
  )}-${pad(now.getHours())}${pad(now.getMinutes())}`;

  const slug = brandName.toLowerCase().replace(/[^a-z0-9]+/g, "");
  return `${slug}-${type.toLowerCase()}-${stamp}.svg`;
};

/*
  Prepares the rendered SVG to stand on its own outside the app.
  Mermaid sizes the SVG at width 100% with a max width style so it
  fits the chat bubble. A standalone file needs explicit pixel
  dimensions from the viewBox and a solid background, otherwise
  light text from dark mode would be invisible on a white viewer.
*/
const toStandaloneSvg = (svg: string, background: string): string => {
  const parsed = new DOMParser().parseFromString(svg, "image/svg+xml");
  const root = parsed.documentElement;

  // A parser error means the SVG string was malformed, export it untouched
  if (root.nodeName !== "svg") return svg;

  const viewBox = root.getAttribute("viewBox")?.split(/[\s,]+/).map(Number);
  if (viewBox && viewBox.length === 4 && viewBox.every(Number.isFinite)) {
    root.setAttribute("width", String(Math.ceil(viewBox[2])));
    root.setAttribute("height", String(Math.ceil(viewBox[3])));
  }

  root.style.removeProperty("max-width");
  root.style.backgroundColor = background;
  root.setAttribute("xmlns", "http://www.w3.org/2000/svg");

  const serialized = new XMLSerializer().serializeToString(root);
  return `<?xml version="1.0" encoding="UTF-8"?>\n${serialized}`;
};

/*
  Triggers a browser download of the diagram as an .svg file.
  The object URL is revoked on the next tick once the click
  has been handed to the browser.
*/
export const downloadSvg = (
  svg: string,
  filename: string,
  background: string
): void => {
  const blob = new Blob([toStandaloneSvg(svg, background)], {
    type: "image/svg+xml;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 0);
};
