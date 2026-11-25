"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import type { Document } from "@/types/document";
import { EASE_OUT, SPRING, riseItem } from "@/lib/motion";
import { DocumentProgress } from "./DocumentProgress";
import { DocumentStatusBadge } from "./DocumentStatusBadge";
import { useDeleteDocument, useRetryDocument } from "@/hooks/useDocuments";
import { useStalled } from "@/hooks/useStalled";
import { api } from "@/lib/api";

interface DocumentItemProps {
  document: Document;
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const formatDate = (isoString: string): string => {
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "";
  }
};

export const DocumentItem = ({ document }: DocumentItemProps) => {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const deleteMutation = useDeleteDocument(document.workspace_id);
  const retryMutation = useRetryDocument(document.workspace_id);
  const isStalled = useStalled(document);

  /*
    Errors that start with "This document" are about the file itself,
    such as too many pages, so trying again cannot help. Keep in sync
    with PermanentIngestionError on the server.
  */
  const isPermanent =
    document.processing_error?.startsWith("This document") ?? false;
  const canRetry = (document.status === "FAILED" && !isPermanent) || isStalled;

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setActionError(null);
    deleteMutation.mutate(document.id, {
      onError: (error) => {
        setConfirmDelete(false);
        setActionError(`Could not delete this document. ${error.message}`);
      },
    });
  };

  const handleRetry = () => {
    setActionError(null);
    retryMutation.mutate(document.id, {
      onError: (error) =>
        setActionError(`Could not retry this document. ${error.message}`),
    });
  };

  /*
    Opens the original file in a new tab. The tab is opened before the
    request because browsers block popups that open after a wait.
  */
  const handleOpen = async () => {
    setActionError(null);
    const tab = window.open("", "_blank");
    try {
      const { url } = await api.documents.getFileUrl(
        document.workspace_id,
        document.id
      );
      if (tab) {
        tab.opener = null;
        tab.location.href = url;
      } else {
        window.location.href = url;
      }
    } catch (error) {
      tab?.close();
      const message = error instanceof Error ? error.message : "";
      setActionError(`Could not open this document. ${message}`);
    }
  };

  return (
    <motion.div
      layout
      variants={riseItem}
      initial="hidden"
      animate="visible"
      exit={{ opacity: 0, x: -24, transition: { duration: 0.2, ease: EASE_OUT } }}
      transition={SPRING}
      className="relative overflow-hidden flex items-center justify-between p-4 rounded-lg border border-border bg-surface hover:border-border-strong transition-colors"
    >
      <div className="flex items-start gap-3 min-w-0">
        <div className="w-9 h-9 rounded-md border border-border flex items-center justify-center text-text-secondary bg-surface-raised shrink-0 mt-0.5">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-medium text-text-primary truncate">
              {document.title || document.original_filename}
            </h4>
            <DocumentStatusBadge
              status={document.status}
              errorMessage={document.processing_error}
            />
          </div>

          <div className="flex items-center gap-3 mt-1 text-xs text-text-secondary">
            <span>{formatFileSize(document.file_size)}</span>
            {document.page_count !== null && document.page_count !== undefined && (
              <>
                <span aria-hidden="true">•</span>
                <span>{document.page_count} pages</span>
              </>
            )}
            <span aria-hidden="true">•</span>
            <span>{formatDate(document.created_at)}</span>
          </div>

          {document.processing_error && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
              {document.processing_error}
            </p>
          )}

          {isStalled && (
            <p className="mt-1 text-xs text-text-secondary">
              This is taking longer than usual. Retry to continue from where it
              stopped.
            </p>
          )}

          {actionError && (
            <p role="alert" className="mt-1 text-xs text-danger">
              {actionError}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 ml-4 shrink-0">
        {confirmDelete ? (
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="px-2.5 py-1 text-xs rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors"
            >
              {deleteMutation.isPending ? "Deleting..." : "Confirm"}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="px-2.5 py-1 text-xs rounded-md border border-border text-text-secondary hover:text-text-primary transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <>
            {canRetry && (
              <button
                onClick={handleRetry}
                disabled={retryMutation.isPending}
                title="Retry from where it stopped"
                aria-label="Retry from where it stopped"
                className="group/retry w-7 h-7 flex items-center justify-center rounded-md text-accent hover:bg-accent-muted active:scale-90 transition-all disabled:opacity-60"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  className={
                    retryMutation.isPending
                      ? "animate-spin"
                      : "transition-transform duration-300 group-hover/retry:rotate-90"
                  }
                >
                  <path d="M21 12a9 9 0 1 1-2.64-6.36" />
                  <path d="M21 3v6h-6" />
                </svg>
              </button>
            )}
            <button
              onClick={handleOpen}
              title="Open original file"
              aria-label="Open original file"
              className="w-7 h-7 flex items-center justify-center rounded-md text-text-disabled hover:text-text-primary hover:bg-surface-raised transition-colors"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M15 3h6v6" />
                <path d="M10 14L21 3" />
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              </svg>
            </button>
          <button
            onClick={handleDelete}
            title="Delete document"
            aria-label="Delete document"
            className="w-7 h-7 flex items-center justify-center rounded-md text-text-disabled hover:text-red-600 hover:bg-surface-raised transition-colors"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6" />
              <path d="M14 11v6" />
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            </svg>
          </button>
          </>
        )}
      </div>

      <DocumentProgress status={document.status} />
    </motion.div>
  );
};

