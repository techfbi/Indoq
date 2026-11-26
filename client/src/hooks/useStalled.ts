import { useEffect, useState } from "react";
import type { Document } from "@/types/document";

// Every stage reports in far sooner than this when processing is healthy
const STALLED_AFTER_MS = 5 * 60 * 1000;

/*
  True when a document is still in progress but has not moved for a
  while, for example because the server restarted at the wrong moment.
*/
export const useStalled = (document: Document): boolean => {
  const [stalledSince, setStalledSince] = useState<string | null>(null);
  const isActive = document.status !== "READY" && document.status !== "FAILED";

  useEffect(() => {
    if (!isActive) return;
    const age = Date.now() - new Date(document.updated_at).getTime();
    const timer = window.setTimeout(
      () => setStalledSince(document.updated_at),
      Math.max(0, STALLED_AFTER_MS - age)
    );
    return () => window.clearTimeout(timer);
  }, [isActive, document.updated_at]);

  return isActive && stalledSince === document.updated_at;
};
