import {
  ACTIVE_IMPORT_STATUSES,
  type ImportItemInput,
  type ImportJobStatus,
  type ImportProgress,
} from "../../../packages/seed-bible/seed-bible/managers/customContent/importApi";
import type { D1Database, D1PreparedStatement } from "./platform";

/** How long a claimed link may run before its slot frees itself. */
export const LEASE_MS = 10 * 60 * 1000;
/** Links one import may have running at once, so a big import can't starve a small one. */
export const MAX_RUNNING_PER_JOB = 3;
/** An import (and the session key it holds) lives at most this long. */
export const JOB_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;
/** Finished imports' rows are deleted this long after they end. */
export const FINISHED_JOB_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

export interface JobRow {
  id: string;
  user_id: string;
  content_record_name: string;
  status: ImportJobStatus;
  session_key_enc: string | null;
  default_author: string | null;
  total: number;
  skipped: number;
  created_at: number;
  updated_at: number;
  expires_at: number;
  finished_at: number | null;
  kind: "links" | "site";
  /** JSON {@link SiteJobDetails}, for a website import. */
  site: string | null;
  capped: number;
}

/** What a website import remembers about its lookup. */
export interface SiteJobDetails {
  site: string;
  /** The search pattern sent to the index, e.g. `gracecommunity.org/sermons/*`. */
  pattern: string;
  include: string[];
  exclude: string[];
  sourceId: string;
  crawls: { id: string; name: string; cdxApi: string }[];
}

export interface ItemRow {
  job_id: string;
  item_id: string;
  url: string;
  input: string;
  state: "candidate" | "queued" | "running" | "done" | "failed";
  lease_until: number | null;
  attempts: number;
  error: string | null;
}

export interface NewImportItem {
  itemId: string;
  input: ImportItemInput;
}

/** Rows per multi-row INSERT, keeping each statement's bound values well under D1's limit. */
const ITEMS_PER_INSERT = 10;
/** Statements per D1 batch. */
const STATEMENTS_PER_BATCH = 50;

/** Whether an error is SQLite refusing a second active import for a library. */
export function isActiveImportConflict(error: unknown): boolean {
  return /UNIQUE constraint failed/i.test(String(error));
}

/**
 * Stores a new import and its links. Throws when the library already has an
 * active import (see {@link isActiveImportConflict}). If storing the links
 * fails partway, the import is removed again so nothing half-made is left.
 */
export async function createJob(
  db: D1Database,
  job: Omit<
    JobRow,
    "status" | "updated_at" | "finished_at" | "kind" | "site" | "capped"
  >,
  items: readonly NewImportItem[]
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO import_jobs
         (id, user_id, content_record_name, status, session_key_enc, default_author,
          total, skipped, created_at, updated_at, expires_at)
       VALUES (?, ?, ?, 'running', ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      job.id,
      job.user_id,
      job.content_record_name,
      job.session_key_enc,
      job.default_author,
      job.total,
      job.skipped,
      job.created_at,
      job.created_at,
      job.expires_at
    )
    .run();

  try {
    const statements: D1PreparedStatement[] = [];
    for (let i = 0; i < items.length; i += ITEMS_PER_INSERT) {
      const chunk = items.slice(i, i + ITEMS_PER_INSERT);
      statements.push(
        db
          .prepare(
            `INSERT INTO import_items (job_id, item_id, url, input, state)
             VALUES ${chunk.map(() => "(?, ?, ?, ?, 'queued')").join(", ")}`
          )
          .bind(
            ...chunk.flatMap((item) => [
              job.id,
              item.itemId,
              item.input.url,
              JSON.stringify(item.input),
            ])
          )
      );
    }
    for (let i = 0; i < statements.length; i += STATEMENTS_PER_BATCH) {
      await db.batch(statements.slice(i, i + STATEMENTS_PER_BATCH));
    }
  } catch (error) {
    await db.batch([
      db.prepare("DELETE FROM import_items WHERE job_id = ?").bind(job.id),
      db.prepare("DELETE FROM import_jobs WHERE id = ?").bind(job.id),
    ]);
    throw error;
  }
}

export function getJob(db: D1Database, id: string): Promise<JobRow | null> {
  return db
    .prepare("SELECT * FROM import_jobs WHERE id = ?")
    .bind(id)
    .first<JobRow>();
}

export function findActiveJob(
  db: D1Database,
  contentRecordName: string
): Promise<JobRow | null> {
  return db
    .prepare(
      `SELECT * FROM import_jobs
       WHERE content_record_name = ?
         AND status IN ('listing', 'awaiting_pick', 'running', 'paused_signin')`
    )
    .bind(contentRecordName)
    .first<JobRow>();
}

export function getItem(
  db: D1Database,
  jobId: string,
  itemId: string
): Promise<ItemRow | null> {
  return db
    .prepare("SELECT * FROM import_items WHERE job_id = ? AND item_id = ?")
    .bind(jobId, itemId)
    .first<ItemRow>();
}

/** Progress is counted from the item rows themselves, so it can't drift from what happened. */
export async function jobProgress(
  db: D1Database,
  job: JobRow
): Promise<ImportProgress> {
  const { results } = await db
    .prepare(
      "SELECT state, COUNT(*) AS count FROM import_items WHERE job_id = ? GROUP BY state"
    )
    .bind(job.id)
    .all<{ state: ItemRow["state"]; count: number }>();
  const count = (state: ItemRow["state"]) =>
    results.find((row) => row.state === state)?.count ?? 0;
  return {
    id: job.id,
    contentRecordName: job.content_record_name,
    kind: job.kind,
    status: job.status,
    total: job.total,
    queued: count("queued"),
    running: count("running"),
    done: count("done"),
    failed: count("failed"),
    skipped: job.skipped,
    createdAt: job.created_at,
    updatedAt: job.updated_at,
  };
}

/**
 * Takes a slot to work on one link: moves it from queued to running with a
 * lease, but only while fewer than {@link MAX_RUNNING_PER_JOB} of the
 * import's links hold an unexpired lease. One statement, so two consumers
 * can't both take the last slot.
 */
export async function claimItem(
  db: D1Database,
  jobId: string,
  itemId: string,
  now: number
): Promise<boolean> {
  const result = await db
    .prepare(
      `UPDATE import_items
       SET state = 'running', lease_until = ?, attempts = attempts + 1
       WHERE job_id = ? AND item_id = ? AND state = 'queued'
         AND (SELECT COUNT(*) FROM import_items
              WHERE job_id = ? AND state = 'running' AND lease_until > ?) < ?`
    )
    .bind(now + LEASE_MS, jobId, itemId, jobId, now, MAX_RUNNING_PER_JOB)
    .run();
  return result.meta.changes === 1;
}

export async function settleItem(
  db: D1Database,
  jobId: string,
  itemId: string,
  outcome: { state: "done" } | { state: "failed"; error: string }
): Promise<void> {
  await db
    .prepare(
      `UPDATE import_items SET state = ?, lease_until = NULL, error = ?
       WHERE job_id = ? AND item_id = ?`
    )
    .bind(
      outcome.state,
      outcome.state === "failed" ? outcome.error : null,
      jobId,
      itemId
    )
    .run();
}

/** Puts a running link back in line, freeing its slot. */
export async function releaseItem(
  db: D1Database,
  jobId: string,
  itemId: string
): Promise<void> {
  await db
    .prepare(
      `UPDATE import_items SET state = 'queued', lease_until = NULL
       WHERE job_id = ? AND item_id = ? AND state = 'running'`
    )
    .bind(jobId, itemId)
    .run();
}

/**
 * Moves an import between statuses, but only from one of `from`, so two
 * callers racing to end it can't both think they did. `clearKey` erases the
 * stored session key in the same statement.
 */
export async function setJobStatus(
  db: D1Database,
  jobId: string,
  from: readonly ImportJobStatus[],
  to: ImportJobStatus,
  now: number,
  options: { clearKey?: boolean; sessionKeyEnc?: string } = {}
): Promise<boolean> {
  const ended = ACTIVE_IMPORT_STATUSES.includes(to) ? null : now;
  const keySql = options.sessionKeyEnc
    ? ", session_key_enc = ?"
    : options.clearKey
      ? ", session_key_enc = NULL"
      : "";
  const result = await db
    .prepare(
      `UPDATE import_jobs SET status = ?, updated_at = ?, finished_at = ?${keySql}
       WHERE id = ? AND status IN (${from.map(() => "?").join(", ")})`
    )
    .bind(
      to,
      now,
      ended,
      ...(options.sessionKeyEnc ? [options.sessionKeyEnc] : []),
      jobId,
      ...from
    )
    .run();
  return result.meta.changes === 1;
}

/**
 * Marks an import done once none of its links are queued or running.
 * Conditional, so of several links finishing at once exactly one caller
 * gets `true` and writes the summary.
 */
export async function finishIfComplete(
  db: D1Database,
  jobId: string,
  now: number
): Promise<boolean> {
  const result = await db
    .prepare(
      `UPDATE import_jobs
       SET status = 'done', session_key_enc = NULL, updated_at = ?, finished_at = ?
       WHERE id = ? AND status = 'running'
         AND NOT EXISTS (SELECT 1 FROM import_items
                         WHERE job_id = ? AND state IN ('queued', 'running'))`
    )
    .bind(now, now, jobId, jobId)
    .run();
  return result.meta.changes === 1;
}

export async function queuedItemIds(
  db: D1Database,
  jobId: string
): Promise<string[]> {
  const { results } = await db
    .prepare(
      "SELECT item_id FROM import_items WHERE job_id = ? AND state = 'queued'"
    )
    .bind(jobId)
    .all<{ item_id: string }>();
  return results.map((row) => row.item_id);
}

/** Puts links whose lease ran out (a consumer that died mid-link) back in line. */
export async function requeueExpiredLeases(
  db: D1Database,
  now: number
): Promise<{ job_id: string; item_id: string }[]> {
  const { results } = await db
    .prepare(
      `UPDATE import_items SET state = 'queued', lease_until = NULL
       WHERE state = 'running' AND lease_until <= ?
       RETURNING job_id, item_id`
    )
    .bind(now)
    .all<{ job_id: string; item_id: string }>();
  return results;
}

export async function jobsPastExpiry(
  db: D1Database,
  now: number
): Promise<JobRow[]> {
  const { results } = await db
    .prepare(
      `SELECT * FROM import_jobs
       WHERE status IN ('listing', 'awaiting_pick', 'running', 'paused_signin')
         AND expires_at <= ?`
    )
    .bind(now)
    .all<JobRow>();
  return results;
}

export async function deleteFinishedJobs(
  db: D1Database,
  finishedBefore: number
): Promise<void> {
  await db.batch([
    db
      .prepare(
        `DELETE FROM import_items WHERE job_id IN
           (SELECT id FROM import_jobs WHERE finished_at IS NOT NULL AND finished_at <= ?)`
      )
      .bind(finishedBefore),
    db
      .prepare(
        `DELETE FROM site_lookups WHERE job_id IN
           (SELECT id FROM import_jobs WHERE finished_at IS NOT NULL AND finished_at <= ?)`
      )
      .bind(finishedBefore),
    db
      .prepare(
        "DELETE FROM import_jobs WHERE finished_at IS NOT NULL AND finished_at <= ?"
      )
      .bind(finishedBefore),
  ]);
}
