import { supabaseAdmin, createUserClient } from "../config/supabase.js";
import { NotFoundError } from "../utils/errors.js";
import type { Database, DocumentStatus } from "../types/database.js";
import { workspaceRepo } from "./workspace.repo.js";

type DocumentRow = Database["public"]["Tables"]["documents"]["Row"];
type DocumentInsert = Database["public"]["Tables"]["documents"]["Insert"];
type DocumentUpdate = Database["public"]["Tables"]["documents"]["Update"];

export const documentRepo = {
  findAllByWorkspace: async (
    workspaceId: string,
    accessToken: string
  ): Promise<DocumentRow[]> => {
    const client = createUserClient(accessToken);

    const { data, error } = await client
      .from("documents")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data ?? [];
  },

  findById: async (
    documentId: string,
    workspaceId: string,
    accessToken: string
  ): Promise<DocumentRow> => {
    const client = createUserClient(accessToken);

    const { data, error } = await client
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .eq("workspace_id", workspaceId)
      .single();

    if (error || !data) throw new NotFoundError("Document");
    return data;
  },

  create: async (payload: DocumentInsert): Promise<DocumentRow> => {
    const { data, error } = await supabaseAdmin
      .from("documents")
      .insert(payload)
      .select("*")
      .single();

    if (error) throw error;
    if (!data) throw new Error("Document creation returned no data");

    return data;
  },

  /*
    Storage paths and sizes for every document in a workspace.
    Uses supabaseAdmin so quota checks and file cleanup see all rows.
    Callers must verify workspace ownership first.
  */
  findFilesByWorkspace: async (
    workspaceId: string
  ): Promise<Pick<DocumentRow, "id" | "storage_path" | "file_size">[]> => {
    const { data, error } = await supabaseAdmin
      .from("documents")
      .select("id, storage_path, file_size")
      .eq("workspace_id", workspaceId);

    if (error) throw error;
    return data ?? [];
  },

  /*
    Looks a document up without RLS, for a repeated upload request.
    Callers must verify workspace ownership first.
  */
  findAny: async (documentId: string): Promise<DocumentRow | null> => {
    const { data, error } = await supabaseAdmin
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  // Null means the document no longer exists
  findStatus: async (documentId: string): Promise<DocumentStatus | null> => {
    const { data, error } = await supabaseAdmin
      .from("documents")
      .select("status")
      .eq("id", documentId)
      .maybeSingle();

    if (error) throw error;
    return data?.status ?? null;
  },

  // Documents that finished processing and may be searched
  findReadyIds: async (workspaceId: string): Promise<Set<string>> => {
    const { data, error } = await supabaseAdmin
      .from("documents")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("status", "READY");

    if (error) throw error;
    return new Set(data.map((d) => d.id));
  },

  /*
    Moves a stopped document back to QUEUED, but only if nothing changed
    since it was read. When two retries arrive together exactly one
    gets the row back, the other gets null.
  */
  claimForRetry: async (document: DocumentRow): Promise<DocumentRow | null> => {
    const update: DocumentUpdate = {
      status: "QUEUED",
      processing_error: null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from("documents")
      .update(update)
      .eq("id", document.id)
      .eq("status", document.status)
      .eq("updated_at", document.updated_at)
      .select("*")
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  // Returns false when the document no longer exists
  updateStatus: async (
    documentId: string,
    status: DocumentStatus,
    processingError?: string
  ): Promise<boolean> => {
    const update: DocumentUpdate = {
      status,
      processing_error: processingError ?? null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from("documents")
      .update(update)
      .eq("id", documentId)
      .select("id");

    if (error) throw error;
    return data.length > 0;
  },

  updatePageCount: async (
    documentId: string,
    pageCount: number
  ): Promise<void> => {
    const { error } = await supabaseAdmin
      .from("documents")
      .update({
        page_count: pageCount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", documentId);

    if (error) throw error;
  },

  // Verifies ownership and returns where the file is stored
  findStoragePath: async (
  documentId: string,
  workspaceId: string,
  userId: string
): Promise<string> => {
  /*
    First verify the workspace belongs to this user.
    workspaceRepo.verifyOwnership throws ForbiddenError if not.
  */
  await workspaceRepo.verifyOwnership(workspaceId, userId);

  /*
    Fetch the document to confirm it exists in this workspace
    and to get the storage_path for file cleanup after deletion.
  */
  const { data: existing, error: findError } = await supabaseAdmin
    .from("documents")
    .select("storage_path")
    .eq("id", documentId)
    .eq("workspace_id", workspaceId)
    .single();

  if (findError || !existing) throw new NotFoundError("Document");

  return existing.storage_path;
},

  // Chunks go with the row through the foreign key cascade
  delete: async (documentId: string): Promise<void> => {
    const { error } = await supabaseAdmin
      .from("documents")
      .delete()
      .eq("id", documentId);

    if (error) throw error;
  },
};