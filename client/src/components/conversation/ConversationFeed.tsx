"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Message, Citation } from "@/types/conversation";
import { containsDiagram } from "@/lib/diagram";
import { EASE_OUT, SPRING, riseItem, staggerParent } from "@/lib/motion";
import { ChatMessage } from "./ChatMessage";
import { MessageContent } from "./MessageContent";
import { ThinkingIndicator } from "./ThinkingIndicator";

interface ConversationFeedProps {
  messages: Message[];
  isStreaming: boolean;
  pendingUserQuestion: string | null;
  streamingMessage: string;
  streamingCitations: Citation[];
  streamingError: string | null;
  onSelectCitation: (citation: Citation) => void;
  onSuggestion: (question: string) => void;
}

const SUGGESTIONS = [
  "Summarize my documents",
  "What are the key points?",
  "Draw a flowchart of the main process",
  "List any dates and deadlines",
];

// Distance from the bottom that still counts as following the answer
const FOLLOW_THRESHOLD_PX = 120;

export const ConversationFeed = ({
  messages,
  isStreaming,
  pendingUserQuestion,
  streamingMessage,
  streamingError,
  onSelectCitation,
  onSuggestion,
}: ConversationFeedProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const followRef = useRef(true);
  const [showJump, setShowJump] = useState(false);

  const scrollToBottom = useCallback((behavior: ScrollBehavior) => {
    const el = scrollRef.current;
    el?.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  /*
    Scrolling up to read stops the view from being pulled back down
    by new tokens. Returning near the bottom resumes following.
  */
  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    followRef.current = distance < FOLLOW_THRESHOLD_PX;
    setShowJump(!followRef.current);
  };

  // A new question always brings the view back to the bottom
  useEffect(() => {
    if (!isStreaming) return;
    followRef.current = true;
    scrollToBottom("smooth");
  }, [isStreaming, scrollToBottom]);

  // Instant while streaming, overlapping smooth scrolls would lag behind
  useEffect(() => {
    if (followRef.current) scrollToBottom("auto");
  }, [messages, pendingUserQuestion, streamingMessage, scrollToBottom]);

  const isEmpty =
    messages.length === 0 &&
    !isStreaming &&
    !pendingUserQuestion &&
    !streamingMessage &&
    !streamingError;

  if (isEmpty) {
    return (
      <motion.div
        variants={staggerParent}
        initial="hidden"
        animate="visible"
        className="flex flex-col items-center justify-center min-h-full p-8 text-center overflow-y-auto"
      >
        <motion.h2
          variants={riseItem}
          className="font-display font-extrabold text-3xl sm:text-4xl tracking-tight text-text-primary"
        >
          What do you want to know?
        </motion.h2>
        <motion.p
          variants={riseItem}
          className="text-sm text-text-secondary mt-3 max-w-sm"
        >
          Answers come from the documents in this workspace, with sources you
          can check.
        </motion.p>
        <motion.div
          variants={staggerParent}
          className="mt-8 flex flex-wrap justify-center gap-2 max-w-xl"
        >
          {SUGGESTIONS.map((suggestion) => (
            <motion.button
              key={suggestion}
              type="button"
              variants={riseItem}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onSuggestion(suggestion)}
              className="px-3.5 py-2 rounded-lg border border-border bg-surface text-xs text-text-secondary hover:text-text-primary hover:border-border-strong transition-colors"
            >
              {suggestion}
            </motion.button>
          ))}
        </motion.div>
      </motion.div>
    );
  }

  return (
    <div className="relative flex-1 min-h-0">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto"
      >
        <div className="px-4 py-6 space-y-2 max-w-4xl mx-auto w-full">
          {/*
            Keyed by position. Messages only ever append, and ids change
            from temporary to saved, which would replay every entrance.
          */}
          {messages.map((message, idx) => (
            <ChatMessage
              key={idx}
              index={idx}
              message={message}
              onSelectCitation={onSelectCitation}
            />
          ))}

          {/* Pending user question when starting a brand new conversation */}
          {pendingUserQuestion && (
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={SPRING}
              className="flex flex-col items-end py-3"
            >
              <div className="flex items-center gap-2 mb-1 px-1">
                <span className="text-xs font-medium text-text-secondary">
                  You
                </span>
              </div>
              <div className="max-w-2xl rounded-lg p-4 text-sm text-text-primary border border-border bg-surface-raised">
                <p className="whitespace-pre-wrap leading-relaxed">
                  {pendingUserQuestion}
                </p>
              </div>
            </motion.div>
          )}

          {/* Active streaming message */}
          {isStreaming && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: EASE_OUT, delay: 0.1 }}
              className="flex flex-col items-start py-3"
            >
              <div className="flex items-center gap-2 mb-1 px-1">
                <span className="text-xs font-medium text-text-secondary">
                  Indoq
                </span>
              </div>

              <div
                className={`max-w-2xl rounded-lg p-4 text-sm text-text-primary border bg-surface border-border ${
                  containsDiagram(streamingMessage) ? "w-full" : ""
                }`}
              >
                {streamingMessage ? (
                  <MessageContent content={streamingMessage} isStreaming />
                ) : (
                  <ThinkingIndicator />
                )}
              </div>
            </motion.div>
          )}

          {/* Stream Error Alert */}
          {streamingError && (
            <motion.div
              role="alert"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-lg border border-border bg-surface text-danger text-xs"
            >
              <p className="font-medium">Query Error</p>
              <p className="mt-0.5 text-text-secondary">{streamingError}</p>
            </motion.div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showJump && (
          <motion.button
            type="button"
            initial={{ opacity: 0, y: 8, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 8, x: "-50%" }}
            transition={{ duration: 0.18 }}
            onClick={() => scrollToBottom("smooth")}
            className="absolute bottom-4 left-1/2 px-3 py-1.5 rounded-lg border border-border bg-surface text-xs text-text-secondary hover:text-text-primary hover:border-border-strong transition-colors"
          >
            Jump to latest
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};
