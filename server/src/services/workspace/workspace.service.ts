import { workspaceRepo } from "../../repositories/workspace.repo.js";
import { documentRepo } from "../../repositories/document.repo.js";
import { removeFiles } from "../document/documentStorage.js";
import type { CreateWorkspaceInput, UpdateWorkspaceInput } from "../../validators/workspace.schema.js";

// As the app grows, business logic accumulates here, workspace usage limits, storage quota checks before creation, cascade cleanup logic. 
// Controllers don't know about the database; services do. Right now it's a thin wrapper, intentionally

export const workspaceService = {
  getAll: (userId: string, accessToken: string) =>
    workspaceRepo.findAllByUser(accessToken),

  getById: (workspaceId: string, userId: string, accessToken: string) =>
    workspaceRepo.findById(workspaceId, accessToken),

  create: (userId: string, input: CreateWorkspaceInput) =>
    workspaceRepo.create(userId, input),

  update: (workspaceId: string, userId: string, input: UpdateWorkspaceInput) =>
    workspaceRepo.update(workspaceId, userId, input),

  /*
    Deleting the row cascades to documents, chunks and conversations,
    but not to Storage. Paths are read first because the cascade
    removes the only record of them.
  */
  delete: async (workspaceId: string, userId: string): Promise<void> => {
    await workspaceRepo.verifyOwnership(workspaceId, userId);
    const files = await documentRepo.findFilesByWorkspace(workspaceId);

    await workspaceRepo.delete(workspaceId, userId);
    await removeFiles(files.map((f) => f.storage_path));
  },
};