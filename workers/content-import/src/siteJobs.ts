import { MAX_SITE_PAGES } from "../../../packages/seed-bible/seed-bible/managers/customContent/importApi";
import type { CandidatePage } from "./commonCrawl/cdx";
import type { JobRow, SiteJobDetails } from "./jobs";
import type { D1Database, D1PreparedStatement } from "./platform";

/** D1 queries for website imports (design doc §5.7). */

/** How long a website import may spend listing and waiting for the owner to pick. */
export const SITE_LISTING_LIFETIME_MS = 24 * 60 * 60 * 1000;

const STATEMENTS_PER_BATCH = 50;
const IDS_PER_STATEMENT = 50;

async function runInBatches(
  db: D1Database,
  statements: D1PreparedStatement[]
): Promise<void> {
  for (let i = 0; i < statements.length; i += STATEMENTS_PER_BATCH) {
    await db.batch(statements.slice(i, i + STATEMENTS_PER_BATCH));
  }
}

/** Stores a new website import in `listing`, with a count lookup per crawl. */
export async function createSiteJob(
  db: D1Database,
  job: {
    id: string;
    user_id: string;
    content_record_name: string;
    created_at: number;
    details: SiteJobDetails;
  }
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO import_jobs
         (id, user_id, content_record_name, kind, status, site, total,
          created_at, updated_at, expires_at)
       VALUES (?, ?, ?, 'site', 'listing', ?, 0, ?, ?, ?)`
    )
    .bind(
      job.id,
      job.user_id,
      job.content_record_name,
      JSON.stringify(job.details),
      job.created_at,
      job.created_at,
      job.created_at + SITE_LISTING_LIFETIME_MS
    )
    .run();
  if (job.details.crawls.length > 0) {
    await runInBatches(
      db,
      job.details.crawls.map((crawl) =>
        db
          .prepare(
            "INSERT INTO site_lookups (job_id, crawl_id, page, state) VALUES (?, ?, -1, 'queued')"
          )
          .bind(job.id, crawl.id)
      )
    );
  }
}

export function siteDetails(job: JobRow): SiteJobDetails | null {
  if (job.kind !== "site" || !job.site) {
    return null;
  }
  try {
    return JSON.parse(job.site) as SiteJobDetails;
  } catch {
    return null;
  }
}

export async function lookupState(
  db: D1Database,
  jobId: string,
  crawlId: string,
  page: number
): Promise<string | null> {
  const row = await db
    .prepare(
      "SELECT state FROM site_lookups WHERE job_id = ? AND crawl_id = ? AND page = ?"
    )
    .bind(jobId, crawlId, page)
    .first<{ state: string }>();
  return row?.state ?? null;
}

/**
 * Records a crawl's result page count: one queued lookup per result page,
 * stored in the same batch that marks the count done, so the listing can
 * never look finished in between.
 */
export async function recordPageCount(
  db: D1Database,
  jobId: string,
  crawlId: string,
  pages: number
): Promise<void> {
  await db.batch([
    ...Array.from({ length: pages }, (_, page) =>
      db
        .prepare(
          `INSERT OR IGNORE INTO site_lookups (job_id, crawl_id, page, state)
           VALUES (?, ?, ?, 'queued')`
        )
        .bind(jobId, crawlId, page)
    ),
    db
      .prepare(
        "UPDATE site_lookups SET state = 'done' WHERE job_id = ? AND crawl_id = ? AND page = -1"
      )
      .bind(jobId, crawlId),
  ]);
}

export async function settleLookup(
  db: D1Database,
  jobId: string,
  crawlId: string,
  page: number,
  outcome: { state: "done" } | { state: "failed"; error: string }
): Promise<void> {
  await db
    .prepare(
      `UPDATE site_lookups SET state = ?, error = ?
       WHERE job_id = ? AND crawl_id = ? AND page = ? AND state = 'queued'`
    )
    .bind(
      outcome.state,
      outcome.state === "failed" ? outcome.error : null,
      jobId,
      crawlId,
      page
    )
    .run();
}

/**
 * Adds pages to offer. A page already offered keeps whichever capture is
 * newer; a page with the same content as one already offered is skipped;
 * nothing is added past {@link MAX_SITE_PAGES}. Returns whether that cap
 * was reached.
 */
export async function addCandidates(
  db: D1Database,
  jobId: string,
  candidates: readonly (CandidatePage & { itemId: string })[]
): Promise<boolean> {
  await runInBatches(
    db,
    candidates.map((candidate) =>
      db
        .prepare(
          `INSERT INTO import_items
             (job_id, item_id, url, input, state, captured_at, digest)
           SELECT ?, ?, ?, ?, 'candidate', ?, ?
           WHERE NOT EXISTS (SELECT 1 FROM import_items
                             WHERE job_id = ? AND digest = ? AND digest <> '' AND item_id <> ?)
             AND (SELECT COUNT(*) FROM import_items WHERE job_id = ?) < ?
           ON CONFLICT (job_id, item_id) DO UPDATE SET
             url = excluded.url, input = excluded.input,
             captured_at = excluded.captured_at, digest = excluded.digest
           WHERE import_items.state = 'candidate'
             AND excluded.captured_at > import_items.captured_at`
        )
        .bind(
          jobId,
          candidate.itemId,
          candidate.url,
          JSON.stringify(candidate.input),
          candidate.capturedAt,
          candidate.digest,
          jobId,
          candidate.digest,
          candidate.itemId,
          jobId,
          MAX_SITE_PAGES
        )
    )
  );
  const count = await db
    .prepare("SELECT COUNT(*) AS count FROM import_items WHERE job_id = ?")
    .bind(jobId)
    .first<{ count: number }>();
  if ((count?.count ?? 0) >= MAX_SITE_PAGES) {
    await db
      .prepare("UPDATE import_jobs SET capped = 1 WHERE id = ?")
      .bind(jobId)
      .run();
    return true;
  }
  return false;
}

/**
 * Moves a listing import on to waiting for the owner once none of its
 * lookups are left. Conditional, so exactly one finishing lookup does it.
 */
export async function finishListingIfComplete(
  db: D1Database,
  jobId: string,
  now: number
): Promise<boolean> {
  const result = await db
    .prepare(
      `UPDATE import_jobs SET status = 'awaiting_pick', updated_at = ?
       WHERE id = ? AND status = 'listing'
         AND NOT EXISTS (SELECT 1 FROM site_lookups
                         WHERE job_id = ? AND state = 'queued')`
    )
    .bind(now, jobId, jobId)
    .run();
  return result.meta.changes === 1;
}

export async function lookupCounts(
  db: D1Database,
  jobId: string
): Promise<{ total: number; done: number; failed: number }> {
  const { results } = await db
    .prepare(
      `SELECT state, COUNT(*) AS count FROM site_lookups
       WHERE job_id = ? GROUP BY state`
    )
    .bind(jobId)
    .all<{ state: string; count: number }>();
  const count = (state: string) =>
    results.find((row) => row.state === state)?.count ?? 0;
  return {
    total: results.reduce((sum, row) => sum + row.count, 0),
    done: count("done"),
    failed: count("failed"),
  };
}

export async function listCandidates(
  db: D1Database,
  jobId: string
): Promise<{ itemId: string; url: string; capturedAt: string }[]> {
  const { results } = await db
    .prepare(
      `SELECT item_id, url, captured_at FROM import_items
       WHERE job_id = ? AND state = 'candidate' ORDER BY url`
    )
    .bind(jobId)
    .all<{ item_id: string; url: string; captured_at: string }>();
  return results.map((row) => ({
    itemId: row.item_id,
    url: row.url,
    capturedAt: row.captured_at,
  }));
}

/**
 * The owner's pick: the chosen pages join the import's queue, the rest are
 * forgotten. Returns how many were queued.
 */
export async function pickCandidates(
  db: D1Database,
  jobId: string,
  itemIds: readonly string[]
): Promise<number> {
  const statements: D1PreparedStatement[] = [];
  for (let i = 0; i < itemIds.length; i += IDS_PER_STATEMENT) {
    const chunk = itemIds.slice(i, i + IDS_PER_STATEMENT);
    statements.push(
      db
        .prepare(
          `UPDATE import_items SET state = 'queued'
           WHERE job_id = ? AND state = 'candidate'
             AND item_id IN (${chunk.map(() => "?").join(", ")})`
        )
        .bind(jobId, ...chunk)
    );
  }
  statements.push(
    db
      .prepare(
        "DELETE FROM import_items WHERE job_id = ? AND state = 'candidate'"
      )
      .bind(jobId)
  );
  await runInBatches(db, statements);
  const queued = await db
    .prepare(
      "SELECT COUNT(*) AS count FROM import_items WHERE job_id = ? AND state = 'queued'"
    )
    .bind(jobId)
    .first<{ count: number }>();
  return queued?.count ?? 0;
}

/** Starts a picked website import running, with the owner's key and an import's usual lifetime. */
export async function startPickedJob(
  db: D1Database,
  jobId: string,
  values: {
    total: number;
    sessionKeyEnc: string;
    now: number;
    expiresAt: number;
  }
): Promise<boolean> {
  const result = await db
    .prepare(
      `UPDATE import_jobs
       SET status = 'running', total = ?, session_key_enc = ?, updated_at = ?, expires_at = ?
       WHERE id = ? AND status = 'awaiting_pick'`
    )
    .bind(
      values.total,
      values.sessionKeyEnc,
      values.now,
      values.expiresAt,
      jobId
    )
    .run();
  return result.meta.changes === 1;
}

/** Forgets the pages a website import offered, once it has ended without a pick. */
export async function deleteCandidates(
  db: D1Database,
  jobId: string
): Promise<void> {
  await db.batch([
    db
      .prepare(
        "DELETE FROM import_items WHERE job_id = ? AND state = 'candidate'"
      )
      .bind(jobId),
    db.prepare("DELETE FROM site_lookups WHERE job_id = ?").bind(jobId),
  ]);
}
