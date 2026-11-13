"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useWorkspaces } from "@/hooks/useWorkspaces";
import { useDocuments } from "@/hooks/useDocuments";
import {
  useConversation,
  useConversationMessages,
} from "@/hooks/useConversation";
import { useStreamingQuery } from "@/hooks/useStreamingQuery";
import { useWorkspaceStore } from "@/store/workspace.store";
import { useUIStore } from "@/store/ui.store";
import { ConversationFeed } from "@/components/conversation/ConversationFeed";
import { ChatInput } from "@/components/conversation/ChatInput";
import { SourceInspector } from "@/components/conversation/SourceInspector";
import type { Citation } from "@/types/conversation";

const ConversationPage = () => {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.id as string;
  const conversationId = params.cid as string;

  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(
    null
  );
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>("");

  const { data: workspaces } = useWorkspaces();
  const workspace = workspaces?.find((w) => w.id === workspaceId);

  const { data: documents } = useDocuments(workspaceId);
  const readyDocuments =
    documents?.filter((doc) => doc.status === "READY") ?? [];

  const { data: conversation } = useConversation(conversationId);
  const { data: historicalMessages, isLoading: isMessagesLoading } =
    useConversationMessages(conversationId);

  const setActiveWorkspaceId = useWorkspaceStore((s) => s.setActiveWorkspaceId);
  const setActiveConversationId = useUIStore((s) => s.setActiveConversationId);

  const {
    isStreaming,
    pendingUserQuestion,
    streamingMessage,
    streamingCitations,
    streamingError,
    sendQuery,
  } = useStreamingQuery();

  /*
    Sync stores with active route parameters
  */
  useEffect(() => {
    if (workspaceId) {
      setActiveWorkspaceId(workspaceId);
    }
    if (conversationId && conversationId !== "new") {
      setActiveConversationId(conversationId);
    } else {
      setActiveConversationId(null);
    }
  }, [
    workspaceId,
    conversationId,
    setActiveWorkspaceId,
    setActiveConversationId,
  ]);

  const handleSend = (question: string) => {
    sendQuery({
      workspaceId,
      question,
      conversationId: conversationId === "new" ? undefined : conversationId,
      documentId: selectedDocumentId || undefined,
      onConversationCreated: (newId) => {
        router.replace(`/workspace/${workspaceId}/conversation/${newId}`);
      },
    });
  };

  const pageTitle =
    conversationId === "new"
      ? "New Conversation"
      : conversation?.title || "Conversation";

  return (
    <div className="flex flex-col h-full bg-background relative overflow-hidden">
      {/* Header */}
      <header className="px-6 py-4 border-b border-border bg-surface shrink-0 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href={`/workspace/${workspaceId}`}
            className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary transition-colors shrink-0"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
            <span>Documents</span>
          </Link>

          <span className="text-text-disabled" aria-hidden="true">
            /
          </span>

          <div className="min-w-0">
            <h1 className="font-display font-bold text-base text-text-primary truncate">
              {pageTitle}
            </h1>
            <p className="text-[11px] text-text-secondary truncate">
              {workspace?.name ?? "Workspace"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Optional document scope filter */}
          {readyDocuments.length > 0 && (
            <select
              aria-label="Filter by document"
              value={selectedDocumentId}
              onChange={(e) => setSelectedDocumentId(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-md border border-border bg-surface text-text-secondary hover:text-text-primary focus:outline-none max-w-48 truncate"
            >
              <option value="">All ready documents ({readyDocuments.length})</option>
              {readyDocuments.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.title || doc.original_filename}
                </option>
              ))}
            </select>
          )}

          {conversationId !== "new" && (
            <button
              type="button"
              onClick={() =>
                router.push(`/workspace/${workspaceId}/conversation/new`)
              }
              className="text-xs px-3 py-1.5 rounded-md border border-border text-text-secondary hover:text-text-primary hover:bg-surface-raised transition-colors"
            >
              New chat
            </button>
          )}
        </div>
      </header>

      {/* Messages Feed */}
      <main className="flex-1 overflow-hidden flex flex-col">
        {isMessagesLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-xs text-text-secondary">Loading messages...</p>
          </div>
        ) : (
          <ConversationFeed
            messages={historicalMessages ?? []}
            isStreaming={isStreaming}
            pendingUserQuestion={pendingUserQuestion}
            streamingMessage={streamingMessage}
            streamingCitations={streamingCitations}
            streamingError={streamingError}
            onSelectCitation={(c) => setSelectedCitation(c)}
          />
        )}
      </main>

      {/* Input Bar */}
      <footer className="p-4 border-t border-border bg-surface shrink-0">
        <div className="max-w-4xl mx-auto w-full">
          <ChatInput onSend={handleSend} isStreaming={isStreaming} />
          <p className="text-[10px] text-center text-text-disabled mt-2">
            Answers are grounded in workspace documents. Review citations for
            direct source verification.
          </p>
        </div>
      </footer>

      {/* Source Inspector Panel */}
      <SourceInspector
        citation={selectedCitation}
        onClose={() => setSelectedCitation(null)}
      />
    </div>
  );
};

export default ConversationPage;
