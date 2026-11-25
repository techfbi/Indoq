"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspaces } from "@/hooks/useWorkspaces";
import { useUIStore } from "@/store/ui.store";
import { riseItem, staggerParent } from "@/lib/motion";
import WorkspaceCard from "@/components/workspace/WorkspaceCard";

const DashboardPage = () => {
  const setCreateModalOpen = useUIStore((s) => s.setCreateWorkspaceModalOpen);
  const { data: workspaces, isLoading, isError } = useWorkspaces();
  const { user } = useAuth();

  const fullName = user?.user_metadata?.["full_name"] as string | undefined;
  const firstName = fullName?.trim().split(/\s+/)[0];

  return (
    <motion.div
      variants={staggerParent}
      initial="hidden"
      animate="visible"
      className="max-w-5xl mx-auto px-6 py-12 sm:py-20"
    >
      <motion.h1
        variants={riseItem}
        className="font-display font-extrabold text-3xl sm:text-5xl tracking-tight text-text-primary"
      >
        {firstName ? `Welcome back, ${firstName}` : "Welcome back"}
      </motion.h1>
      <motion.p variants={riseItem} className="mt-3 text-sm text-text-secondary">
        Pick a workspace to keep going, or start a new one.
      </motion.p>

      {isError && (
        <p role="alert" className="mt-8 text-sm text-danger">
          Could not load your workspaces. Please refresh to try again.
        </p>
      )}

      {isLoading ? (
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-34 rounded-lg border border-border bg-surface-raised animate-pulse"
            />
          ))}
        </div>
      ) : (
        <motion.div
          variants={staggerParent}
          initial="hidden"
          animate="visible"
          className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          <AnimatePresence mode="popLayout">
            {workspaces?.map((workspace) => (
              <WorkspaceCard key={workspace.id} workspace={workspace} />
            ))}
          </AnimatePresence>

          <motion.button
            layout
            type="button"
            variants={riseItem}
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setCreateModalOpen(true)}
            className="group min-h-34 rounded-lg border border-dashed border-border-strong text-sm text-text-secondary hover:text-accent hover:border-accent transition-colors flex flex-col items-center justify-center gap-2"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="transition-transform duration-300 group-hover:rotate-90"
            >
              <path d="M5 12h14M12 5v14" />
            </svg>
            New workspace
          </motion.button>
        </motion.div>
      )}
    </motion.div>
  );
};

export default DashboardPage;
