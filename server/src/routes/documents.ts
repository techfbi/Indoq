import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { rateLimit } from "../middleware/rateLimit.js";
import { uploadMiddleware } from "../middleware/upload.js";
import { documentController } from "../controllers/document.controller.js";
import {
  documentParamsSchema,
  uploadDocumentBodySchema,
  workspaceOnlyParamSchema,
} from "../validators/document.schema.js";

const router = Router({ mergeParams: true });

/*
  mergeParams: true is required here because this router is mounted
  under /api/workspaces/:workspaceId — without mergeParams the
  child router cannot see the workspaceId param from the parent.
*/

router.use(requireAuth);

router.get(
  "/",
  validate({ params: workspaceOnlyParamSchema }),
  documentController.getAll
);

router.post(
  "/",
  rateLimit("upload"),
  validate({ params: workspaceOnlyParamSchema }),
  uploadMiddleware,
  validate({ body: uploadDocumentBodySchema }),
  documentController.upload
);

router.get(
  "/:documentId",
  validate({ params: documentParamsSchema }),
  documentController.getById
);

router.get(
  "/:documentId/file",
  validate({ params: documentParamsSchema }),
  documentController.getFileUrl
);

router.post(
  "/:documentId/retry",
  rateLimit("retry"),
  validate({ params: documentParamsSchema }),
  documentController.retry
);

router.delete(
  "/:documentId",
  validate({ params: documentParamsSchema }),
  documentController.delete
);

export default router;