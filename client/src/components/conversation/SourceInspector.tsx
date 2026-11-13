"use client";

import React, { useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import type { Citation } from "@/types/conversation";

interface SourceInspectorProps {
  citation: Citation | null;
  onClose: () => void;
}

/*
  Drawer panel that displays the exact document chunk excerpt,
  source document title, and page number for verified grounding.
*/
export const SourceInspector = ({
  citation,
  onClose,
}: SourceInspectorProps) => {
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (citation) window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [citation, onClose]);

  return (
    <AnimatePresence>
      {citation && (
        <>
          {/* Backdrop on small viewports */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/30 z-40 lg:hidden"
            aria-hidden="true"
          />

          {/* Sliding Panel */}
          <motion.aside
            initial={{ x: shouldReduceMotion ? 0 : "100%" }}
            animate={{ x: 0 }}
            exit={{ x: shouldReduceMotion ? 0 : "100%" }}
            transition={{
              duration: shouldReduceMotion ? 0 : 0.24,
              ease: "easeOut",
            }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-surface border-l border-border z-50 flex flex-col"
            aria-label="Source Inspector"
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="font-display font-bold text-base text-text-primary">
                  Source Inspector
                </h3>
                <p className="text-xs text-text-secondary mt-0.5">
                  Verified chunk excerpt from your knowledge base
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-7 h-7 flex items-center justify-center rounded-md text-text-disabled hover:text-text-primary hover:bg-surface-raised transition-colors"
                aria-label="Close inspector"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Source Details */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-text-secondary">
                  Document
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-5 h-5 rounded border border-border flex items-center justify-center text-text-secondary bg-surface-raised shrink-0">
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-text-primary truncate">
                    {citation.document_title}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-text-secondary">
                    Page
                  </p>
                  <p className="text-sm font-medium text-text-primary mt-1">
                    {citation.page_number !== null
                      ? `Page ${citation.page_number}`
                      : "Unpaged"}
                  </p>
                </div>

                {citation.section_title && (
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wider text-text-secondary">
                      Section
                    </p>
                    <p className="text-sm font-medium text-text-primary mt-1 truncate">
                      {citation.section_title}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-text-secondary mb-1.5">
                  Grounding Chunk Excerpt
                </p>
                <div className="p-4 rounded-lg border border-border bg-surface-raised font-mono text-xs leading-relaxed text-text-primary whitespace-pre-wrap select-text">
                  {citation.chunk_excerpt}
                </div>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};
