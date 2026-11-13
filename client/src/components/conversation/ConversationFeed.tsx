"use client";

import React, { useEffect, useRef } from "react";
import type { Message, Citation } from "@/types/conversation";
import { ChatMessage } from "./ChatMessage";

interface ConversationFeedProps {
  messages: Message[];
  isStreaming: boolean;
  pendingUserQuestion: string | null;
  streamingMessage: string;
  streamingCitations: Citation[];
  streamingError: string | null;
  onSelectCitation: (citation: Citation) => void;
}

export const ConversationFeed = ({
  messages,
  isStreaming,
  pendingUserQuestion,
  streamingMessage,
  streamingError,
  onSelectCitation,
}: ConversationFeedProps) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  /*
    Smoothly scroll to the latest response token or message
  */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pendingUserQuestion, streamingMessage]);

  const isEmpty =
    messages.length === 0 &&
    !isStreaming &&
    !pendingUserQuestion &&
    !streamingMessage;

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center my-auto">
        <div className="w-10 h-10 rounded-md border border-border flex items-center justify-center text-text-disabled mb-3 bg-surface-raised">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>
        <h3 className="font-display font-bold text-lg text-text-primary">
          Start a new conversation
        </h3>
        <p className="text-xs text-text-secondary mt-1 max-w-sm">
          Ask questions across all indexed documents in this workspace. Answers
          are strictly grounded with source citations.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-2 max-w-4xl mx-auto w-full">
      {messages.map((message, idx) => (
        <ChatMessage
          key={message.id}
          index={idx}
          message={message}
          onSelectCitation={onSelectCitation}
        />
      ))}

      {/* Pending user question when starting a brand new conversation */}
      {pendingUserQuestion && (
        <div className="flex flex-col items-end py-3">
          <div className="flex items-center gap-2 mb-1 px-1">
            <span className="text-xs font-medium text-text-secondary">You</span>
          </div>
          <div className="max-w-2xl rounded-lg p-4 text-sm text-text-primary border border-border bg-surface-raised">
            <p className="whitespace-pre-wrap leading-relaxed">
              {pendingUserQuestion}
            </p>
          </div>
        </div>
      )}

      {/* Active streaming message */}
      {isStreaming && (
        <div className="flex flex-col items-start py-3">
          <div className="flex items-center gap-2 mb-1 px-1">
            <span className="text-xs font-medium text-text-secondary">
              Within
            </span>
            <span className="text-[10px] text-accent font-medium">
              Responding
            </span>
          </div>

          <div className="max-w-2xl rounded-lg p-4 text-sm text-text-primary border bg-surface border-border leading-relaxed">
            {streamingMessage ? (
              <span className="whitespace-pre-wrap">{streamingMessage}</span>
            ) : (
              <span className="text-text-secondary text-xs">
                Retrieving grounded context from documents...
              </span>
            )}
          </div>
        </div>
      )}

      {/* Stream Error Alert */}
      {streamingError && (
        <div className="p-4 rounded-lg border border-border bg-surface text-danger text-xs">
          <p className="font-medium">Query Error</p>
          <p className="mt-0.5 text-text-secondary">{streamingError}</p>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
};
