export interface Citation {
  // The N in [Doc N]. Only cited sources are kept, so this is not the array position
  index: number;
  document_id: string;
  document_title: string;
  page_number: number | null;
  section_title: string | null;
  chunk_excerpt: string;
}

export interface QueryMetadata {
  retrieval_ms?: number;
  generation_ms?: number;
  chunks_used?: number;
  model?: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  citations: Citation[];
  query_metadata?: QueryMetadata;
  created_at: string;
}

export interface Conversation {
  id: string;
  workspace_id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

export type QueryStreamEvent =
  | { type: "token"; token: string }
  | { type: "done"; conversationId: string; citations: Citation[] }
  | { type: "error"; message: string };

