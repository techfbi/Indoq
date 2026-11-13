"use client";

import React, { useState, useRef, useEffect } from "react";

interface ChatInputProps {
  onSend: (text: string) => void;
  isStreaming: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export const ChatInput = ({
  onSend,
  isStreaming,
  disabled = false,
  placeholder = "Ask a question about your workspace documents...",
}: ChatInputProps) => {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /*
    Auto adjust textarea height to fit content without scrollbars
  */
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed || isStreaming || disabled) return;
    onSend(trimmed);
    setValue("");

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  return (
    <div className="relative border border-border rounded-lg bg-surface focus-within:border-border-strong transition-colors">
      <textarea
        ref={textareaRef}
        rows={1}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled || isStreaming}
        className="w-full resize-none bg-transparent px-4 py-3 pr-12 text-sm text-text-primary placeholder:text-text-disabled focus:outline-none leading-relaxed max-h-44"
      />

      <div className="absolute right-2 bottom-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!value.trim() || isStreaming || disabled}
          aria-label="Send message"
          className="w-8 h-8 rounded-md bg-accent text-white flex items-center justify-center hover:bg-accent-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          {isStreaming ? (
            <span
              className="w-2.5 h-2.5 rounded-xs bg-white"
              aria-hidden="true"
            />
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
        </button>
      </div>
    </div>
  );
};
