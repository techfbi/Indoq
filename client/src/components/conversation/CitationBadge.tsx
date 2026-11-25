import React from "react";
import type { Citation } from "@/types/conversation";

interface CitationBadgeProps {
  citation: Citation;
  onClick: (citation: Citation) => void;
}

/*
  Clickable citation badge displaying the source reference.
  Clicking opens the Source Inspector panel to view the underlying chunk.
*/
export const CitationBadge = ({
  citation,
  onClick,
}: CitationBadgeProps) => {
  const label = `[Doc ${citation.index}]`;

  return (
    <button
      type="button"
      onClick={() => onClick(citation)}
      title={`${citation.document_title}${citation.page_number ? ` (Page ${citation.page_number})` : ""}`}
      className="inline-flex items-center gap-1 mx-1 px-1.5 py-0.5 rounded font-mono text-xs font-medium text-accent bg-accent-muted hover:bg-surface-raised border border-border transition-all duration-150 hover:-translate-y-px active:scale-95 align-baseline"
    >
      <span className="truncate max-w-35">{label}</span>
      {citation.page_number !== null && (
        <span className="text-[10px] text-text-secondary">
          p.{citation.page_number}
        </span>
      )}
    </button>
  );
};
