import { createCasualOSClient } from "./casualos";
import type { WorkerDeps } from "./deps";
import { writeImportStatus } from "./importStatus";
import {
  FINISHED_JOB_RETENTION_MS,
  deleteFinishedJobs,
  getJob,
  jobProgress,
  jobsPastExpiry,
  requeueExpiredLeases,
  setJobStatus,
} from "./jobs";
import type { Env } from "./platform";
import { decryptSessionKey } from "./sessionKeys";

/**
 * The scheduled tidy-up (a Cron Trigger):
 * - links whose consumer died mid-way get back in line once their lease ends;
 * - imports past their lifetime end, erasing the session key they held,
 *   including ones paused and never resumed;
 * - finished imports' rows are deleted after a while. The library keeps its
 *   own record of the import in `importStatus`.
 */
export async function runCleanup(env: Env, deps: WorkerDeps): Promise<void> {
  const now = deps.now();

  const requeued = await requeueExpiredLeases(env.DB, now);
  const running = new Map<string, boolean>();
  for (const { job_id, item_id } of requeued) {
    if (!running.has(job_id)) {
      running.set(job_id, (await getJob(env.DB, job_id))?.status === "running");
    }
    if (running.get(job_id)) {
      await env.IMPORT_QUEUE.send({ jobId: job_id, itemId: item_id });
    }
  }

  for (const job of await jobsPastExpiry(env.DB, now)) {
    if (
      !(await setJobStatus(env.DB, job.id, [job.status], "expired", now, {
        clearKey: true,
      }))
    ) {
      continue;
    }
    if (!job.session_key_enc) {
      continue;
    }
    try {
      const sessionKey = await decryptSessionKey(
        job.session_key_enc,
        env.SESSION_KEY_SECRET
      );
      const expired = (await getJob(env.DB, job.id))!;
      await writeImportStatus(
        createCasualOSClient(env.CASUALOS_ENDPOINT, sessionKey, deps.fetch)
          .store,
        await jobProgress(env.DB, expired),
        now
      );
    } catch (error) {
      console.warn("Couldn't record an expired import's status:", error);
    }
  }

  await deleteFinishedJobs(env.DB, now - FINISHED_JOB_RETENTION_MS);
}
