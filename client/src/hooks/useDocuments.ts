import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Document } from "@/types/document";

export const getDocumentsQueryKey = (workspaceId: string) =>
  ["documents", workspaceId] as const;

export const useDocuments = (workspaceId: string) => {
  return useQuery({
    queryKey: getDocumentsQueryKey(workspaceId),
    queryFn: async () => {
      if (!workspaceId) return [];
      const data = await api.documents.list(workspaceId);
      return data.documents;
    },
    enabled: Boolean(workspaceId),
  });
};

export const useUploadDocument = (workspaceId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      file,
      title,
      documentId,
    }: {
      file: File;
      title?: string;
      documentId: string;
    }): Promise<{ document: Document }> => {
      const formData = new FormData();
      // Same id on every attempt, so a repeat is never stored twice
      formData.append("documentId", documentId);
      formData.append("file", file);
      if (title?.trim()) {
        formData.append("title", title.trim());
      }
      return api.documents.upload(workspaceId, formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: getDocumentsQueryKey(workspaceId),
      });
    },
    onError: (error: Error) => {
      console.error("Document upload failed:", error.message);
    },
  });
};

/*
  Continues a document that stopped part way. The reply replaces the
  row straight away, then live updates take over.
*/
export const useRetryDocument = (workspaceId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (documentId: string): Promise<Document> => {
      const { document } = await api.documents.retry(workspaceId, documentId);
      return document;
    },
    onSuccess: (document) => {
      queryClient.setQueryData<Document[]>(
        getDocumentsQueryKey(workspaceId),
        (old) => old?.map((d) => (d.id === document.id ? document : d))
      );
    },
    onError: (error: Error) => {
      console.error("Document retry failed:", error.message);
    },
  });
};

export const useDeleteDocument = (workspaceId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (documentId: string): Promise<void> => {
      await api.documents.delete(workspaceId, documentId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: getDocumentsQueryKey(workspaceId),
      });
    },
    onError: (error: Error) => {
      console.error("Document deletion failed:", error.message);
    },
  });
};

