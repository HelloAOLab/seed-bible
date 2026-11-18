import type { ContentRecordStore } from "../../../packages/seed-bible/seed-bible/managers/customContent/publish";
import {
  CONTENT_IMPORT_STATUS_ADDRESS,
  CONTENT_IMPORT_STATUS_MARKER,
} from "../../../packages/seed-bible/seed-bible/managers/customContent/schema";
import type { ImportProgress } from "../../../packages/seed-bible/seed-bible/managers/customContent/importApi";

/**
 * Records how the library's latest import went, in the library itself. This
 * outlives the worker's own rows, which are deleted a while after an import
 * ends. Best effort: an import that worked isn't failed over its summary.
 */
export async function writeImportStatus(
  store: ContentRecordStore,
  progress: ImportProgress,
  now: number
): Promise<void> {
  const result = await store.recordData(
    progress.contentRecordName,
    CONTENT_IMPORT_STATUS_ADDRESS,
    {
      jobId: progress.id,
      status: progress.status,
      total: progress.total,
      done: progress.done,
      failed: progress.failed,
      skipped: progress.skipped,
      updatedAt: now,
    },
    CONTENT_IMPORT_STATUS_MARKER
  );
  if (!result.success) {
    console.warn("Couldn't record the import's status:", result.errorCode);
  }
}
