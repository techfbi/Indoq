"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { DocumentStatus } from "@/types/document";
import { EASE_OUT } from "@/lib/motion";

/*
  Share of the pipeline finished at each stage. These are stage marks,
  not measured time, since stages take different lengths.
*/
const PROGRESS: Partial<Record<DocumentStatus, number>> = {
  QUEUED: 6,
  PROCESSING: 15,
  EXTRACTING: 30,
  CHUNKING: 50,
  EMBEDDING: 72,
  INDEXING: 90,
};

interface DocumentProgressProps {
  status: DocumentStatus;
}

// Slim bar under a document that fills as ingestion moves along
export const DocumentProgress = ({ status }: DocumentProgressProps) => {
  const value = PROGRESS[status];

  return (
    <AnimatePresence initial={false}>
      {value !== undefined && (
        <motion.div
          role="progressbar"
          aria-label="Processing document"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={100}
          exit={{ opacity: 0, transition: { duration: 0.4 } }}
          className="absolute inset-x-0 bottom-0 h-0.5 bg-border overflow-hidden"
        >
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: value / 100 }}
            transition={{ duration: 0.7, ease: EASE_OUT }}
            className="h-full origin-left bg-accent"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
