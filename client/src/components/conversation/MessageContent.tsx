"use client";

import React, { useDeferredValue, useMemo } from "react";
import type { Citation } from "@/types/conversation";
import { parseContentSegments } from "@/lib/diagram";
import {
  DiagramPlaceholder,
  MermaidDiagram,
} from "@/components/diagrams/MermaidDiagram";
import { MarkdownText } from "./MarkdownText";

interface MessageContentProps {
  content: string;
  citations?: Citation[];
  onSelectCitation?: (citation: Citation) => void;
  isStreaming?: boolean;
}

// Stable reference so memoized text does not rerender on every token
const NO_CITATIONS: Citation[] = [];

/*
  Renders assistant content as an ordered list of text and diagram
  segments. A diagram still streaming in shows a placeholder. Once
  streaming ends, an unclosed diagram (for example a response cut
  off by the token limit) is still attempted, and falls back to
  showing its source if mermaid cannot parse it.
*/
export const MessageContent = ({
  content,
  citations = NO_CITATIONS,
  onSelectCitation,
  isStreaming = false,
}: MessageContentProps) => {
  // Lets typing and scrolling stay smooth while tokens pour in
  const deferredContent = useDeferredValue(content);
  const segments = useMemo(
    () => parseContentSegments(deferredContent),
    [deferredContent]
  );

  return (
    <div className="space-y-3">
      {segments.map((segment, i) => {
        if (segment.type === "text") {
          return (
            <MarkdownText
              key={i}
              content={segment.content}
              citations={citations}
              onSelectCitation={onSelectCitation}
              showCaret={isStreaming && i === segments.length - 1}
            />
          );
        }

        if (!segment.complete && isStreaming) {
          return <DiagramPlaceholder key={i} />;
        }

        return <MermaidDiagram key={i} code={segment.code} />;
      })}
    </div>
  );
};
