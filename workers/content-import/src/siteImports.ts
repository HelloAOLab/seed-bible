import {
  SITE_CRAWLS,
  pickSitePagesRequestSchema,
  startSiteImportRequestSchema,
  type SiteImport,
} from "../../../packages/seed-bible/seed-bible/managers/customContent/importApi";
import {
  formatSiteAddress,
  parseSiteAddress,
  siteSearchPattern,
} from "../../../packages/seed-bible/seed-bible/managers/customContent/siteImport";
import { enqueue } from "./queue";
import {
  COLLECTIONS_URL,
  MAX_LOOKUP_PAGES_PER_CRAWL,
  pageCountUrl,
  parseCaptures,
  parseCollections,
  parsePageCount,
  pickCrawls,
  resultPageUrl,
  selectCandidates,
  type Crawl,
} from "./commonCrawl/cdx";
import { fetchThroughGate } from "./commonCrawlGate";
import type { WorkerDeps } from "./deps";
import { HttpError, checkLibraryAccess, readBody, type Caller } from "./http";
import {
  JOB_LIFETIME_MS,
  findActiveJob,
  getJob,
  isActiveImportConflict,
  jobProgress,
  queuedItemIds,
  type JobRow,
} from "./jobs";
import type { MessageOutcome } from "./consumer";
import type { Env, SiteLookupMessage } from "./platform";
import { encryptSessionKey } from "./sessionKeys";
import {
  addCandidates,
  createSiteJob,
  finishListingIfComplete,
  listCandidates,
  lookupCounts,
  lookupState,
  pickCandidates,
  recordPageCount,
  settleLookup,
  siteDetails,
  startPickedJob,
} from "./siteJobs";

/**
 * Website imports from Common Crawl (design doc §5.7): look the site's
 * pages up in the archive's index, let the owner pick, then import the
 * picked pages through the same queue as pasted links.
 */

/** How long the list of crawls is reused before asking for it again. */
const COLLECTIONS_CACHE_MS = 60 * 60 * 1000;
let collections: { crawls: Crawl[]; until: number } | null = null;

function gate(env: Env) {
  return env.COMMON_CRAWL_GATE.get(env.COMMON_CRAWL_GATE.idFromName("global"));
}

async function latestCrawls(env: Env, deps: WorkerDeps): Promise<Crawl[]> {
  if (collections && collections.until > deps.now()) {
    return collections.crawls;
  }
  const response = await fetchThroughGate(gate(env), COLLECTIONS_URL);
  const crawls =
    response.status === 200
      ? parseCollections(await response.json().catch(() => null))
      : [];
  if (crawls.length === 0) {
    throw new HttpError(
      502,
      "common_crawl_unavailable",
      "Common Crawl couldn't be reached. Please try again later."
    );
  }
  collections = { crawls, until: deps.now() + COLLECTIONS_CACHE_MS };
  return crawls;
}

/** Forgets the cached list of crawls (for tests). */
export function clearCrawlCache(): void {
  collections = null;
}

/** A page's item id, the same every time the same page is found. */
async function candidateItemId(key: string): Promise<string> {
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(key)
  );
  return `item_${[...new Uint8Array(hash).slice(0, 16)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")}`;
}

export async function getSiteImport(
  env: Env,
  job: JobRow
): Promise<SiteImport> {
  const details = siteDetails(job);
  if (!details) {
    throw new HttpError(404, "import_not_found");
  }
  return {
    progress: await jobProgress(env.DB, job),
    site: details.site,
    include: details.include,
    exclude: details.exclude,
    sourceId: details.sourceId,
    crawls: details.crawls.map(({ id, name }) => ({ id, name })),
    lookups: await lookupCounts(env.DB, job.id),
    capped: job.capped === 1,
    ...(job.status === "awaiting_pick"
      ? { candidates: await listCandidates(env.DB, job.id) }
      : {}),
  };
}

export async function startSiteImport(
  request: Request,
  env: Env,
  deps: WorkerDeps,
  caller: Caller
): Promise<{ body: unknown; status: number }> {
  const parsed = startSiteImportRequestSchema.safeParse(
    await readBody(request)
  );
  if (!parsed.success) {
    throw new HttpError(400, "invalid_request", parsed.error.message);
  }
  const address = parseSiteAddress(parsed.data.site);
  if (!address) {
    throw new HttpError(
      400,
      "invalid_site",
      "Enter a website address, like gracecommunity.org/sermons."
    );
  }
  const { contentRecordName } = parsed.data;
  const now = deps.now();
  await checkLibraryAccess(caller, contentRecordName, now);

  const crawls = pickCrawls(
    await latestCrawls(env, deps),
    SITE_CRAWLS,
    parsed.data.sinceCrawlId
  );
  const jobId = `import_${crypto.randomUUID()}`;
  try {
    await createSiteJob(env.DB, {
      id: jobId,
      user_id: caller.userId,
      content_record_name: contentRecordName,
      created_at: now,
      details: {
        site: formatSiteAddress(address),
        pattern: siteSearchPattern(address),
        include: parsed.data.include ?? [],
        exclude: parsed.data.exclude ?? [],
        sourceId: parsed.data.sourceId ?? `site_${crypto.randomUUID()}`,
        crawls,
      },
    });
  } catch (error) {
    if (isActiveImportConflict(error)) {
      const running = await findActiveJob(env.DB, contentRecordName);
      throw new HttpError(
        409,
        "import_running",
        "This library already has an import running.",
        { jobId: running?.id }
      );
    }
    throw error;
  }
  if (crawls.length > 0) {
    await env.IMPORT_QUEUE.sendBatch(
      crawls.map((crawl) => ({
        body: { kind: "lookup", jobId, crawlId: crawl.id, page: -1 },
      }))
    );
  } else {
    // Nothing newer to look in: straight to an empty pick.
    await finishListingIfComplete(env.DB, jobId, now);
  }
  return {
    body: await getSiteImport(env, (await getJob(env.DB, jobId))!),
    status: 201,
  };
}

export async function pickSitePages(
  request: Request,
  env: Env,
  deps: WorkerDeps,
  caller: Caller,
  job: JobRow
): Promise<{ body: unknown; status: number }> {
  if (job.status !== "awaiting_pick") {
    throw new HttpError(
      409,
      "not_waiting",
      "This website import isn't waiting for pages to be picked."
    );
  }
  const parsed = pickSitePagesRequestSchema.safeParse(await readBody(request));
  if (!parsed.success) {
    throw new HttpError(400, "invalid_request", parsed.error.message);
  }
  const offered = new Set(
    (await listCandidates(env.DB, job.id)).map((c) => c.itemId)
  );
  const chosen = [...new Set(parsed.data.itemIds)].filter((id) =>
    offered.has(id)
  );
  if (chosen.length === 0) {
    throw new HttpError(
      400,
      "nothing_to_import",
      "None of the chosen pages were found."
    );
  }
  const now = deps.now();
  await checkLibraryAccess(caller, job.content_record_name, now);
  const total = await pickCandidates(env.DB, job.id, chosen);
  const started = await startPickedJob(env.DB, job.id, {
    total,
    sessionKeyEnc: await encryptSessionKey(
      caller.sessionKey,
      env.SESSION_KEY_SECRET
    ),
    now,
    expiresAt: now + JOB_LIFETIME_MS,
  });
  if (!started) {
    throw new HttpError(
      409,
      "not_waiting",
      "This website import isn't waiting for pages to be picked."
    );
  }
  await enqueue(env, job.id, await queuedItemIds(env.DB, job.id));
  return {
    body: await jobProgress(env.DB, (await getJob(env.DB, job.id))!),
    status: 200,
  };
}

const RETRY_STATUSES = new Set([429, 500, 502, 503, 504]);

/**
 * One index lookup of a website import. Counting a crawl's result pages
 * queues a lookup per page; each page adds the pages it lists to the
 * offer. The last lookup to finish hands the list to the owner.
 */
export async function processLookupMessage(
  env: Env,
  deps: WorkerDeps,
  message: SiteLookupMessage,
  retryDelay: number
): Promise<MessageOutcome> {
  const job = await getJob(env.DB, message.jobId);
  if (!job || job.status !== "listing") {
    return { kind: "ack" };
  }
  if (
    (await lookupState(env.DB, job.id, message.crawlId, message.page)) !==
    "queued"
  ) {
    return { kind: "ack" };
  }
  const details = siteDetails(job);
  const crawl = details?.crawls.find((c) => c.id === message.crawlId);
  if (!details || !crawl) {
    await settleLookup(env.DB, job.id, message.crawlId, message.page, {
      state: "failed",
      error: "unknown_crawl",
    });
    await finishListingIfComplete(env.DB, job.id, deps.now());
    return { kind: "ack" };
  }

  const url =
    message.page < 0
      ? pageCountUrl(crawl, details.pattern)
      : resultPageUrl(crawl, details.pattern, message.page);
  const response = await fetchThroughGate(gate(env), url);
  if (RETRY_STATUSES.has(response.status)) {
    return { kind: "retry", delaySeconds: retryDelay };
  }
  // The index answers 404 for a site it has nothing from. Anything else
  // that isn't a 200 is a real failure, never read as "no pages".
  const empty = response.status === 404;
  if (!empty && response.status !== 200) {
    await settleLookup(env.DB, job.id, crawl.id, message.page, {
      state: "failed",
      error: `http_${response.status}`,
    });
    await finishListingIfComplete(env.DB, job.id, deps.now());
    return { kind: "ack" };
  }
  const body = empty ? "" : await response.text();

  if (message.page < 0) {
    const pages = Math.min(parsePageCount(body), MAX_LOOKUP_PAGES_PER_CRAWL);
    await recordPageCount(env.DB, job.id, crawl.id, pages);
    if (pages > 0) {
      await env.IMPORT_QUEUE.sendBatch(
        Array.from({ length: pages }, (_, page) => ({
          body: {
            kind: "lookup" as const,
            jobId: job.id,
            crawlId: crawl.id,
            page,
          },
        }))
      );
    }
  } else {
    const candidates = selectCandidates(parseCaptures(body), {
      crawlId: crawl.id,
      sourceId: details.sourceId,
      include: details.include,
      exclude: details.exclude,
    });
    await addCandidates(
      env.DB,
      job.id,
      await Promise.all(
        candidates.map(async (candidate) => ({
          ...candidate,
          itemId: await candidateItemId(candidate.key),
        }))
      )
    );
    await settleLookup(env.DB, job.id, crawl.id, message.page, {
      state: "done",
    });
  }
  await finishListingIfComplete(env.DB, job.id, deps.now());
  return { kind: "ack" };
}

/** A lookup that ran out of retries: recorded as failed, so the listing can still finish. */
export async function processLookupDeadLetter(
  env: Env,
  deps: WorkerDeps,
  message: SiteLookupMessage
): Promise<void> {
  await settleLookup(env.DB, message.jobId, message.crawlId, message.page, {
    state: "failed",
    error: "gave_up_after_retries",
  });
  await finishListingIfComplete(env.DB, message.jobId, deps.now());
}
