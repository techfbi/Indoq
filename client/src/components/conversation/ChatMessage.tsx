"use client";

import React, { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { Message, Citation } from "@/types/conversation";
import { containsDiagram } from "@/lib/diagram";
import { MessageContent } from "./MessageContent";

interface ChatMessageProps {
  message: Message;
  onSelectCitation: (citation: Citation) => void;
  index?: number;
}

export const ChatMessage = ({
  message,
  onSelectCitation,
  index = 0,
}: ChatMessageProps) => {
  const isUser = message.role === "user";
  const shouldReduceMotion = useReducedMotion();

  // Bubbles shrink to their text, diagrams need the full width to draw into
  const hasDiagram = !isUser && containsDiagram(message.content);

  const formattedTime = useMemo(() => {
    try {
      const d = new Date(message.created_at);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  }, [message.created_at]);

  return (
    <motion.div
      initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: shouldReduceMotion ? 0 : 0.2,
        delay: shouldReduceMotion ? 0 : Math.min(index * 0.15, 0.6),
        ease: "easeOut",
      }}
      className={`flex flex-col py-3 ${
        isUser ? "items-end" : "items-start"
      }`}
    >
      <div className="flex items-center gap-2 mb-1 px-1">
        <span className="text-xs font-medium text-text-secondary">
          {isUser ? "You" : "Within"}
        </span>
        {formattedTime && (
          <span className="text-[10px] text-text-disabled">
            {formattedTime}
          </span>
        )}
      </div>

      <div
        className={`max-w-2xl rounded-lg p-4 text-sm text-text-primary border border-border ${
          isUser ? "bg-surface-raised" : "bg-surface"
        } ${hasDiagram ? "w-full" : ""}`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
        ) : (
          <div>
            <MessageContent
              content={message.content}
              citations={message.citations ?? []}
              onSelectCitation={onSelectCitation}
            />

            {/* Citations Footer Strip */}
            {message.citations && message.citations.length > 0 && (
              <div className="mt-4 pt-3 border-t border-border">
                <p className="text-[11px] font-medium uppercase tracking-wider text-text-secondary mb-2">
                  Sources Referenced ({message.citations.length})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {message.citations.map((c) => (
                    <button
                      key={c.index}
                      type="button"
                      onClick={() => onSelectCitation(c)}
                      className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs border border-border bg-surface-raised hover:text-accent transition-colors text-left"
                    >
                      <span className="font-mono text-[10px] text-accent">
                        [Doc {c.index}]
                      </span>
                      <span className="font-medium truncate max-w-40">
                        {c.document_title}
                      </span>
                      {c.page_number !== null && (
                        <span className="text-[10px] text-text-disabled">
                          p.{c.page_number}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};
