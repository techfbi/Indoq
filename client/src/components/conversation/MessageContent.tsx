"use client";

import React, { useMemo } from "react";
import type { Citation } from "@/types/conversation";
import { parseContentSegments } from "@/lib/diagram";
import {
  DiagramPlaceholder,
  MermaidDiagram,
} from "@/components/diagrams/MermaidDiagram";
import { CitationBadge } from "./CitationBadge";

interface TextWithCitationsProps {
  content: string;
  citations: Citation[];
  onSelectCitation?: (citation: Citation) => void;
}

/*
  Replaces [Doc N] tags in a text segment with interactive
  CitationBadge components. Moved here from ChatMessage so both
  saved messages and the live streaming message share it.
*/
const TextWithCitations = ({
  content,
  citations,
  onSelectCitation,
}: TextWithCitationsProps) => {
  if (!onSelectCitation || citations.length === 0) {
    return <p className="whitespace-pre-wrap leading-relaxed">{content}</p>;
  }

  // Split by [Doc N] tokens, keeping the matched delimiters
  const parts = content.split(/(\[Doc\s*\d+\])/gi);

  return (
    <div className="whitespace-pre-wrap leading-relaxed">
      {parts.map((part, i) => {
        const match = part.match(/\[Doc\s*(\d+)\]/i);
        if (match) {
          const docNum = parseInt(match[1], 10);
          const citation = citations[docNum - 1];
          if (citation) {
            return (
              <CitationBadge
                key={i}
                citation={citation}
                index={docNum - 1}
                onClick={onSelectCitation}
              />
            );
          }
        }
        return <span key={i}>{part}</span>;
      })}
    </div>
  );
};

interface MessageContentProps {
  content: string;
  citations?: Citation[];
  onSelectCitation?: (citation: Citation) => void;
  isStreaming?: boolean;
}

/*
  Renders assistant content as an ordered list of text and diagram
  segments. A diagram still streaming in shows a placeholder. Once
  streaming ends, an unclosed diagram (for example a response cut
  off by the token limit) is still attempted, and falls back to
  showing its source if mermaid cannot parse it.
*/
export const MessageContent = ({
  content,
  citations = [],
  onSelectCitation,
  isStreaming = false,
}: MessageContentProps) => {
  const segments = useMemo(() => parseContentSegments(content), [content]);

  return (
    <div className="space-y-3">
      {segments.map((segment, i) => {
        if (segment.type === "text") {
          return (
            <TextWithCitations
              key={i}
              content={segment.content}
              citations={citations}
              onSelectCitation={onSelectCitation}
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
