"use client";

import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import type { Mermaid } from "mermaid";
import { brand } from "@/config/brand";
import { useResolvedTheme } from "@/hooks/useResolvedTheme";
import {
  buildSvgFilename,
  cleanMermaidCode,
  downloadSvg,
  getDiagramLabel,
  getDiagramType,
} from "@/lib/diagram";
import {
  getDiagramBackground,
  getMermaidThemeVariables,
} from "./mermaidTheme";

/*
  Mermaid is large, so it is loaded on demand the first time a
  diagram appears instead of shipping in the main bundle. The
  promise is shared so every diagram on the page reuses one load.
  On failure the cache is cleared so the next diagram can retry.
*/
let mermaidPromise: Promise<Mermaid> | null = null;

const loadMermaid = (): Promise<Mermaid> => {
  if (!mermaidPromise) {
    mermaidPromise = import("mermaid")
      .then((mod) => mod.default)
      .catch((err) => {
        mermaidPromise = null;
        throw err;
      });
  }
  return mermaidPromise;
};

/*
  Render result is stored with the key it was produced for.
  If the key no longer matches the current code and theme, the
  diagram is treated as rendering. This avoids calling setState
  synchronously inside the effect just to reset the status.
*/
type RenderResult =
  | { key: string; status: "ready"; svg: string }
  | { key: string; status: "error" };

interface DiagramFrameProps {
  label: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

// Shared bordered frame with a header row, used by every diagram state
const DiagramFrame = ({ label, actions, children }: DiagramFrameProps) => (
  <figure className="my-1 w-full rounded-lg border border-border bg-surface overflow-hidden">
    <figcaption className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border bg-surface-raised">
      <span className="text-[11px] font-medium uppercase tracking-wider text-text-secondary">
        {label}
      </span>
      {actions && <div className="flex items-center gap-1">{actions}</div>}
    </figcaption>
    {children}
  </figure>
);

interface ActionButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  pressed?: boolean;
}

const ActionButton = ({ onClick, children, pressed }: ActionButtonProps) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={pressed}
    className="px-2 py-1 rounded text-[11px] font-medium text-text-secondary hover:text-text-primary hover:bg-surface border border-transparent hover:border-border transition-colors"
  >
    {children}
  </button>
);

/*
  Shown while a diagram is still streaming in. Static text only,
  no spinner, per the motion rules in the devlog.
*/
export const DiagramPlaceholder = () => (
  <DiagramFrame label="Diagram">
    <div className="px-4 py-8 text-center text-xs text-text-secondary">
      Drawing diagram as the response arrives
    </div>
  </DiagramFrame>
);

interface MermaidDiagramProps {
  code: string;
}

export const MermaidDiagram = ({ code }: MermaidDiagramProps) => {
  const theme = useResolvedTheme();
  const reactId = useId();
  const renderCount = useRef(0);

  const [result, setResult] = useState<RenderResult | null>(null);
  const [showCode, setShowCode] = useState(false);

  const cleanCode = useMemo(() => cleanMermaidCode(code), [code]);
  const diagramType = useMemo(() => getDiagramType(cleanCode), [cleanCode]);
  const label = getDiagramLabel(diagramType);

  /*
    useId output contains characters that are invalid in CSS
    selectors, and mermaid uses the id inside selectors.
    Strip everything that is not alphanumeric.
  */
  const baseId = `mermaid${reactId.replace(/[^a-zA-Z0-9]/g, "")}`;
  const renderKey = `${theme}:${cleanCode}`;

  useEffect(() => {
    let cancelled = false;

    /*
      Every render gets a fresh id. Reusing the id of an SVG that is
      already in the DOM can make mermaid measure the wrong element
      when the theme changes and the diagram is drawn again.
    */
    renderCount.current += 1;
    const renderId = `${baseId}r${renderCount.current}`;

    const render = async () => {
      try {
        const mermaid = await loadMermaid();
        const fontFamily = getComputedStyle(document.body).fontFamily;

        mermaid.initialize({
          startOnLoad: false,
          // strict sanitizes labels and disables click handlers in model output
          securityLevel: "strict",
          // pure SVG text instead of HTML labels so exported files open anywhere
          htmlLabels: false,
          // we show our own error state instead of mermaid's bomb graphic
          suppressErrorRendering: true,
          theme: "base",
          themeVariables: getMermaidThemeVariables(theme, fontFamily),
        });

        const { svg } = await mermaid.render(renderId, cleanCode);
        if (!cancelled) setResult({ key: renderKey, status: "ready", svg });
      } catch {
        // mermaid can leave its temporary container behind after a parse error
        document.getElementById(`d${renderId}`)?.remove();
        if (!cancelled) setResult({ key: renderKey, status: "error" });
      }
    };

    render();

    return () => {
      cancelled = true;
    };
  }, [baseId, cleanCode, theme, renderKey]);

  const current = result?.key === renderKey ? result : null;
  const svg = current?.status === "ready" ? current.svg : null;
  const hasError = current?.status === "error";

  const handleExport = () => {
    if (!svg) return;
    downloadSvg(
      svg,
      buildSvgFilename(brand.name, diagramType),
      getDiagramBackground(theme)
    );
  };

  const codeView = (
    <pre className="px-4 py-3 overflow-x-auto font-mono text-xs leading-relaxed text-text-primary whitespace-pre">
      {cleanCode}
    </pre>
  );

  if (hasError) {
    return (
      <DiagramFrame label={label}>
        <p className="px-4 pt-3 text-xs text-text-secondary">
          This diagram could not be drawn. The source is shown below.
        </p>
        {codeView}
      </DiagramFrame>
    );
  }

  return (
    <DiagramFrame
      label={label}
      actions={
        svg && (
          <>
            <ActionButton
              onClick={() => setShowCode((v) => !v)}
              pressed={showCode}
            >
              {showCode ? "Diagram" : "Code"}
            </ActionButton>
            <ActionButton onClick={handleExport}>Export SVG</ActionButton>
          </>
        )
      }
    >
      {showCode ? (
        codeView
      ) : svg ? (
        <div
          role="img"
          aria-label={`${label} generated from your documents`}
          className="flex justify-center px-4 py-4 overflow-x-auto [&_svg]:h-auto [&_svg]:max-w-full"
          // safe because mermaid runs with securityLevel strict and sanitizes output
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : (
        <div className="px-4 py-8 text-center text-xs text-text-secondary">
          Rendering diagram
        </div>
      )}
    </DiagramFrame>
  );
};
