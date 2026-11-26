"use client";

import React, { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { SPRING } from "@/lib/motion";

interface ChatInputProps {
  onSend: (text: string) => void;
  isStreaming: boolean;
  disabled?: boolean;
}

// Rotating examples that show what the workspace can answer
const PROMPTS = [
  "Ask anything about your documents",
  "Try: summarize the main points",
  "Try: draw a flowchart of this process",
  "Try: what does it say about deadlines?",
];
const PROMPT_MS = 4000;

export const ChatInput = ({
  onSend,
  isStreaming,
  disabled = false,
}: ChatInputProps) => {
  const [value, setValue] = useState("");
  const [promptIndex, setPromptIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const shouldReduceMotion = useReducedMotion();

  const canSend = value.trim().length > 0 && !isStreaming && !disabled;

  // Auto adjust textarea height to fit content without scrollbars
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }, [value]);

  // Only rotate while the hint is visible
  useEffect(() => {
    if (value || isStreaming || shouldReduceMotion) return;
    const timer = window.setInterval(
      () => setPromptIndex((i) => (i + 1) % PROMPTS.length),
      PROMPT_MS
    );
    return () => window.clearInterval(timer);
  }, [value, isStreaming, shouldReduceMotion]);

  const handleSubmit = () => {
    if (!canSend) return;
    onSend(value.trim());
    setValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter that confirms an input method candidate must not send
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="relative border border-border rounded-lg bg-surface transition-[border-color,box-shadow] duration-200 focus-within:border-accent focus-within:ring-4 focus-within:ring-accent/10">
      {!value && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-4 right-14 top-3 h-6 overflow-hidden text-sm leading-relaxed text-text-disabled"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={promptIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="block truncate"
            >
              {PROMPTS[promptIndex]}
            </motion.span>
          </AnimatePresence>
        </div>
      )}

      <textarea
        ref={textareaRef}
        rows={1}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        aria-label="Ask a question about your documents"
        disabled={disabled}
        className="block w-full resize-none bg-transparent px-4 py-3 pr-14 text-sm text-text-primary focus:outline-none focus-visible:outline-none leading-relaxed max-h-44"
      />

      <motion.button
        type="button"
        onClick={handleSubmit}
        disabled={!canSend}
        aria-label={isStreaming ? "Waiting for the answer" : "Send message"}
        animate={{ scale: canSend ? 1 : 0.92, opacity: canSend ? 1 : 0.35 }}
        whileTap={canSend ? { scale: 0.88 } : undefined}
        transition={SPRING}
        className="absolute right-2 bottom-2 w-8 h-8 rounded-md bg-accent text-white flex items-center justify-center hover:bg-accent-hover disabled:cursor-not-allowed transition-colors overflow-hidden"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={isStreaming ? "busy" : "send"}
            initial={{ y: 14, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -14, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex items-center justify-center"
          >
            {isStreaming ? (
              <span className="w-2.5 h-2.5 rounded-xs bg-white" aria-hidden="true" />
            ) : (
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.25"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="12" y1="19" x2="12" y2="5" />
                <polyline points="5 12 12 5 19 12" />
              </svg>
            )}
          </motion.span>
        </AnimatePresence>
      </motion.button>
    </div>
  );
};
