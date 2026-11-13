import { useState, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { streamQuery } from "@/lib/api";
import {
  getConversationsQueryKey,
  getConversationMessagesQueryKey,
} from "./useConversation";
import type { Citation, Message } from "@/types/conversation";

interface SendQueryOptions {
  workspaceId: string;
  question: string;
  conversationId?: string | null;
  documentId?: string;
  onConversationCreated?: (newConversationId: string) => void;
}

/*
  Manages the lifecycle of an SSE streaming AI response,
  accumulating incoming tokens and syncing messages with TanStack Query.
*/
export const useStreamingQuery = () => {
  const queryClient = useQueryClient();
  const [isStreaming, setIsStreaming] = useState(false);
  const [pendingUserQuestion, setPendingUserQuestion] = useState<string | null>(
    null
  );
  const [streamingMessage, setStreamingMessage] = useState("");
  const [streamingCitations, setStreamingCitations] = useState<Citation[]>([]);
  const [streamingError, setStreamingError] = useState<string | null>(null);

  /*
    Keep ref to accumulated message text so callbacks always read the latest tokens
  */
  const accumulatedRef = useRef("");

  const resetStreamingState = useCallback(() => {
    setIsStreaming(false);
    setPendingUserQuestion(null);
    setStreamingMessage("");
    setStreamingCitations([]);
    setStreamingError(null);
    accumulatedRef.current = "";
  }, []);

  const sendQuery = useCallback(
    async ({
      workspaceId,
      question,
      conversationId,
      documentId,
      onConversationCreated,
    }: SendQueryOptions) => {
      const trimmedQuestion = question.trim();
      if (!trimmedQuestion || isStreaming) return;

      setIsStreaming(true);
      setStreamingMessage("");
      setStreamingCitations([]);
      setStreamingError(null);
      accumulatedRef.current = "";

      const resolvedConversationId =
        conversationId && conversationId !== "new" ? conversationId : undefined;

      const userTimestamp = new Date().toISOString();

      /*
        If continuing an existing conversation, optimistically insert the user message.
        If starting a new conversation, hold the question in local state until the ID arrives.
      */
      if (resolvedConversationId) {
        const queryKey = getConversationMessagesQueryKey(resolvedConversationId);
        const optimisticUserMessage: Message = {
          id: `temp_user_${Date.now()}`,
          conversation_id: resolvedConversationId,
          role: "user",
          content: trimmedQuestion,
          citations: [],
          created_at: userTimestamp,
        };

        queryClient.setQueryData<Message[]>(queryKey, (old) => {
          return old ? [...old, optimisticUserMessage] : [optimisticUserMessage];
        });
      } else {
        setPendingUserQuestion(trimmedQuestion);
      }

      try {
        await streamQuery(
          workspaceId,
          {
            question: trimmedQuestion,
            conversationId: resolvedConversationId,
            documentId,
          },
          (token: string) => {
            accumulatedRef.current += token;
            setStreamingMessage((prev) => prev + token);
          },
          (finalConversationId: string, citations: Citation[]) => {
            setIsStreaming(false);
            setPendingUserQuestion(null);
            setStreamingCitations(citations);

            const finalId = finalConversationId || resolvedConversationId;
            if (finalId) {
              const queryKey = getConversationMessagesQueryKey(finalId);

              const completedAssistantMessage: Message = {
                id: `temp_assistant_${Date.now()}`,
                conversation_id: finalId,
                role: "assistant",
                content: accumulatedRef.current,
                citations,
                created_at: new Date().toISOString(),
              };

              queryClient.setQueryData<Message[]>(queryKey, (old) => {
                if (!old || old.length === 0) {
                  const initialUserMessage: Message = {
                    id: `temp_user_${Date.now()}`,
                    conversation_id: finalId,
                    role: "user",
                    content: trimmedQuestion,
                    citations: [],
                    created_at: userTimestamp,
                  };
                  return [initialUserMessage, completedAssistantMessage];
                }
                return [...old, completedAssistantMessage];
              });

              /*
                Invalidate messages to sync with authoritative server state
              */
              queryClient.invalidateQueries({ queryKey });

              /*
                Invalidate workspace conversations so automatic titling reflects immediately
              */
              queryClient.invalidateQueries({
                queryKey: getConversationsQueryKey(workspaceId),
              });

              /*
                If this query created a new conversation, notify caller to update URL
              */
              if (!resolvedConversationId && onConversationCreated) {
                onConversationCreated(finalId);
              }
            }
          },
          (errorMessage: string) => {
            setIsStreaming(false);
            setPendingUserQuestion(null);
            setStreamingError(errorMessage);
          }
        );
      } catch (err) {
        setIsStreaming(false);
        setPendingUserQuestion(null);
        const msg = err instanceof Error ? err.message : "Query failed";
        setStreamingError(msg);
      }
    },
    [isStreaming, queryClient]
  );

  return {
    isStreaming,
    pendingUserQuestion,
    streamingMessage,
    streamingCitations,
    streamingError,
    sendQuery,
    resetStreamingState,
  };
};
