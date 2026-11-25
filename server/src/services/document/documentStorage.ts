import { supabaseAdmin } from "../../config/supabase.js";
import { logger } from "../../utils/logger.js";

const BUCKET = "documents";

// Long enough to open the file, short enough that a leaked link goes stale
const SIGNED_URL_SECONDS = 60;

/*
  Removes files from Storage. Throws on failure, and callers remove
  files before database records, so a failed delete can simply be
  repeated and never leaves a file that nothing points to.
  Paths that are already gone are not an error.
*/
export const removeFiles = async (paths: string[]): Promise<void> => {
  if (paths.length === 0) return;

  const { error } = await supabaseAdmin.storage.from(BUCKET).remove(paths);
  if (error) throw error;
};

// For tidying up after another error, which must stay the one reported
export const tryRemoveFiles = async (paths: string[]): Promise<void> => {
  try {
    await removeFiles(paths);
  } catch (err) {
    logger.warn("Storage file removal failed", {
      paths,
      error: err instanceof Error ? err.message : String(err),
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
