"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useDeleteWorkspace } from "@/hooks/useWorkspaces";
import { useWorkspaceStore } from "@/store/workspace.store";
import { EASE_OUT, SPRING, riseItem } from "@/lib/motion";
import type { Workspace } from "@/types/workspace";

interface WorkspaceCardProps {
  workspace: Workspace;
}

const CONFIRM_MS = 4000;

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const WorkspaceCard = ({ workspace }: WorkspaceCardProps) => {
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const setActiveWorkspaceId = useWorkspaceStore((s) => s.setActiveWorkspaceId);
  const {
    mutate: deleteWorkspace,
    isPending: isDeleting,
    isError,
  } = useDeleteWorkspace();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const timerRef = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  // First click asks, second click within a few seconds deletes
  const handleDelete = () => {
    window.clearTimeout(timerRef.current);

    if (!confirmDelete) {
      setConfirmDelete(true);
      timerRef.current = window.setTimeout(
        () => setConfirmDelete(false),
        CONFIRM_MS
      );
      return;
    }

    setConfirmDelete(false);
    deleteWorkspace(workspace.id, {
      onSuccess: () => {
        if (activeWorkspaceId === workspace.id) setActiveWorkspaceId(null);
      },
    });
  };

  return (
    <motion.div
      layout
      variants={riseItem}
      exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.18, ease: EASE_OUT } }}
      whileHover={{ y: -3 }}
      transition={SPRING}
      className="group relative"
    >
      <Link
        href={`/workspace/${workspace.id}`}
        onClick={() => setActiveWorkspaceId(workspace.id)}
        className="block h-full bg-surface border border-border rounded-lg p-5 hover:border-accent/40 transition-colors"
      >
        <h3 className="text-sm font-semibold text-text-primary truncate pr-20">
          {workspace.name}
        </h3>
        <p className="text-xs text-text-secondary mt-1 line-clamp-2 min-h-8">
          {workspace.description}
        </p>
        <p className="mt-4 flex items-center justify-between text-xs text-text-disabled">
          <span>Updated {formatDate(workspace.updated_at)}</span>
          <span
            aria-hidden="true"
            className="text-accent opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200"
          >
            Open
          </span>
        </p>
        {isError && (
          <p role="alert" className="mt-2 text-xs text-danger">
            Could not delete this workspace. Please try again.
          </p>
        )}
      </Link>

      {/* Sits beside the link, not inside it, so it works by keyboard */}
      <button
        type="button"
        onClick={handleDelete}
        disabled={isDeleting}
        aria-label={
          confirmDelete
            ? `Confirm deleting ${workspace.name} and all its documents`
            : `Delete ${workspace.name}`
        }
        className={`absolute top-4 right-4 text-xs px-2 py-1 rounded transition-all ${
          confirmDelete
            ? "bg-danger text-white"
            : "text-text-disabled hover:text-danger lg:opacity-0 lg:group-hover:opacity-100 focus-visible:opacity-100"
        } disabled:opacity-50`}
      >
        {isDeleting ? "Deleting" : confirmDelete ? "Delete all?" : "Delete"}
      </button>
    </motion.div>
  );
};

export default WorkspaceCard;
