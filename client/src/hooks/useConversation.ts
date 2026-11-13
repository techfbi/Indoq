import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Conversation, Message } from "@/types/conversation";

export const getConversationsQueryKey = (workspaceId: string) =>
  ["conversations", workspaceId] as const;

export const getConversationMessagesQueryKey = (conversationId: string) =>
  ["conversation-messages", conversationId] as const;

/*
  Fetches all conversations belonging to a specific workspace
*/
export const useConversations = (workspaceId: string) => {
  return useQuery({
    queryKey: getConversationsQueryKey(workspaceId),
    queryFn: async (): Promise<Conversation[]> => {
      if (!workspaceId) return [];
      const res = await api.conversations.list(workspaceId);
      return res.conversations;
    },
    enabled: Boolean(workspaceId),
  });
};

/*
  Fetches single conversation details by ID
*/
export const useConversation = (conversationId: string | null) => {
  return useQuery({
    queryKey: ["conversation", conversationId],
    queryFn: async (): Promise<Conversation | null> => {
      if (!conversationId || conversationId === "new") return null;
      const res = await api.conversations.get(conversationId);
      return res.conversation;
    },
    enabled: Boolean(conversationId) && conversationId !== "new",
  });
};

/*
  Fetches historical messages for a conversation
*/
export const useConversationMessages = (conversationId: string | null) => {
  return useQuery({
    queryKey: getConversationMessagesQueryKey(conversationId ?? ""),
    queryFn: async (): Promise<Message[]> => {
      if (!conversationId || conversationId === "new") return [];
      const res = await api.conversations.getMessages(conversationId);
      return res.messages;
    },
    enabled: Boolean(conversationId) && conversationId !== "new",
  });
};

/*
  Deletes a conversation and invalidates the workspace conversation list
*/
export const useDeleteConversation = (workspaceId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: string): Promise<void> => {
      await api.conversations.delete(conversationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: getConversationsQueryKey(workspaceId),
      });
    },
    onError: (error: Error) => {
      console.error("Conversation deletion failed:", error.message);
    },
  });
};

