import { supabaseAdmin } from "../../config/supabase.js";
import { logger } from "../../utils/logger.js";

const BUCKET = "documents";

// Long enough to open the file, short enough that a leaked link goes stale
const SIGNED_URL_SECONDS = 60;

/*
  Removes files from Storage. Failures are logged, not thrown, because
  callers have already removed the database record and an orphaned
  file does no functional harm.
*/
export const removeFiles = async (paths: string[]): Promise<void> => {
  if (paths.length === 0) return;

  const { error } = await supabaseAdmin.storage.from(BUCKET).remove(paths);

  if (error) {
    logger.warn("Storage file removal failed", {
      paths,
      error: error.message,
    });
  }
};

/*
  Short lived link to the original file. Passing downloadName makes
  the browser save the file instead of showing it.
*/
export const createFileUrl = async (
  path: string,
  downloadName?: string
): Promise<string> => {
  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET)
    .createSignedUrl(
      path,
      SIGNED_URL_SECONDS,
      downloadName ? { download: downloadName } : undefined
    );

  if (error) throw error;
  return data.signedUrl;
};
