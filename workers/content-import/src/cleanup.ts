import { createCasualOSClient } from "./casualos";
import type { WorkerDeps } from "./deps";
import { writeImportStatus } from "./importStatus";
import {
  FINISHED_JOB_RETENTION_MS,
  deleteFinishedJobs,
  finishIfComplete,
  getJob,
  jobProgress,
  jobsPastExpiry,
  requeueExpiredLeases,
  setJobStatus,
  stalledJobs,
} from "./jobs";
import type { Env } from "./platform";
import { startLinks } from "./queue";
import { decryptSessionKey } from "./sessionKeys";
import {
  failQueuedLookups,
  finishListingIfComplete,
  listingsStartedBefore,
} from "./siteJobs";

/**
 * How long a website lookup may keep listing pages. It normally takes
 * minutes; one still listing after this has lookups nothing is running.
 */
export const LISTING_LIFETIME_MS = 24 * 60 * 60 * 1000;

/** Sends an import's links new messages; a refused send is tried at the next run. */
async function restart(env: Env, jobId: string, links: number): Promise<void> {
  try {
    await startLinks(env, jobId, links);
  } catch (error) {
    console.warn(`Couldn't restart import ${jobId}:`, error);
  }
}

/**
 * Ends an import if cleanup just settled its last link, writing the summary
 * to the library as the consumer would have.
 */
async function finishIfLast(
  env: Env,
  deps: WorkerDeps,
  jobId: string,
  now: number
): Promise<void> {
  const job = await getJob(env.DB, jobId);
  if (!job?.session_key_enc || !(await finishIfComplete(env.DB, jobId, now))) {
    return;
  }
  try {
    const sessionKey = await decryptSessionKey(
      job.session_key_enc,
      env.SESSION_KEY_SECRET
    );
    await writeImportStatus(
      createCasualOSClient(env, sessionKey, deps.fetch).store,
      await jobProgress(env.DB, (await getJob(env.DB, jobId))!),
      now
    );
  } catch (error) {
    console.warn("Couldn't record a finished import's status:", error);
  }
}

/**
 * The scheduled tidy-up (a Cron Trigger):
 * - links whose consumer died mid-way get back in line once their lease ends
 *   (or fail, once that has used all their tries), and an import whose
 *   messages were lost (the queue refused a send, say) gets new ones;
 * - imports past their lifetime end, erasing the session key they held,
 *   including ones paused and never resumed. A website lookup waiting for
 *   the owner to pick pages never expires;
 * - a website lookup still listing pages after {@link LISTING_LIFETIME_MS}
 *   gives up on the lookups left and offers the pages it found, so it
 *   can't hold the library's one import slot forever;
 * - finished imports' rows are deleted after a while. The library keeps its
 *   own record of the import in `importStatus`.
 */
export async function runCleanup(env: Env, deps: WorkerDeps): Promise<void> {
  const now = deps.now();

  // Each link that was running had a message that would have carried its
  // import on; it died with the consumer, so it's replaced.
  const { requeued, failed } = await requeueExpiredLeases(env.DB, now);
  const restarted = new Set<string>();
  const links = new Map<string, number>();
  for (const { job_id } of requeued) {
    links.set(job_id, (links.get(job_id) ?? 0) + 1);
  }
  for (const [jobId, count] of links) {
    if ((await getJob(env.DB, jobId))?.status === "running") {
      await restart(env, jobId, count);
      restarted.add(jobId);
    }
  }
  for (const jobId of new Set(failed.map((link) => link.job_id))) {
    if (!links.has(jobId)) {
      await finishIfLast(env, deps, jobId, now);
    }
  }
  for (const job of await stalledJobs(env.DB, now)) {
    if (!restarted.has(job.id)) {
      await restart(env, job.id, job.queued);
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
        createCasualOSClient(env, sessionKey, deps.fetch).store,
        await jobProgress(env.DB, expired),
        now
      );
    } catch (error) {
      console.warn("Couldn't record an expired import's status:", error);
    }
  }

  for (const job of await listingsStartedBefore(
    env.DB,
    now - LISTING_LIFETIME_MS
  )) {
    await failQueuedLookups(env.DB, job.id, "timed_out");
    await finishListingIfComplete(env.DB, job.id, now);
  }

  await deleteFinishedJobs(env.DB, now - FINISHED_JOB_RETENTION_MS);
}
