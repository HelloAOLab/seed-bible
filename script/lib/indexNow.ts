/**
 * Pure/IO helpers for `script/index-sitemap-urls.ts`, split out so the tricky
 * bits — the submission log's read-or-default shape and response-code
 * handling — can be unit-tested without a network or a real submission log
 * file on disk.
 */
import { readFile, writeFile } from "node:fs/promises";

/** The default, shared IndexNow endpoint. Propagates to every participating engine. */
export const DEFAULT_INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";

/**
 * The largest number of URLs IndexNow accepts in a single bulk submission
 * request, per the protocol.
 */
export const INDEXNOW_MAX_URLS_PER_REQUEST = 10000;

export interface IndexNowSubmissionEntry {
  /** The chapter's canonical path, e.g. "/en/AAB/genesis/1". */
  path: string;
  /** The chapter content's sha256 at the time it was submitted. */
  submittedSha256: string;
  /** ISO timestamp of the successful submission. */
  submittedAt: string;
}

/**
 * State of every chapter path submitted so far, keyed by `path`. A map
 * rather than an ever-growing array — re-running the script only needs each
 * path's most recent submission to decide whether it changed, not a full
 * history.
 */
export type IndexNowSubmissionLog = Record<string, IndexNowSubmissionEntry>;

/**
 * Reads a submission log from disk. Returns an empty log if the file doesn't
 * exist yet — the first run of the script always has nothing to compare
 * against.
 */
export async function readSubmissionLog(
  filePath: string
): Promise<IndexNowSubmissionLog> {
  try {
    const text = await readFile(filePath, "utf-8");
    return JSON.parse(text) as IndexNowSubmissionLog;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return {};
    }
    throw error;
  }
}

export async function writeSubmissionLog(
  filePath: string,
  log: IndexNowSubmissionLog
): Promise<void> {
  await writeFile(filePath, JSON.stringify(log, null, 2), "utf-8");
}

export interface IndexNowPayload {
  host: string;
  key: string;
  keyLocation: string;
  urlList: string[];
}

/** Shapes the JSON body for an IndexNow bulk submission request. */
export function buildIndexNowPayload(params: {
  host: string;
  key: string;
  keyLocation: string;
  urlList: readonly string[];
}): IndexNowPayload {
  return {
    host: params.host,
    key: params.key,
    keyLocation: params.keyLocation,
    urlList: [...params.urlList],
  };
}

/** How many times a 429 (rate limited) response is retried before giving up. */
const MAX_RATE_LIMIT_RETRIES = 3;
const RATE_LIMIT_BACKOFF_MS = 2000;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Submits one batch of URLs to IndexNow. Treats HTTP 200/202 as success.
 * Retries a 429 (rate limited) a few times with a fixed backoff; any other
 * non-2xx status throws with a message describing what went wrong (403 in
 * particular usually means the key file isn't reachable/valid yet).
 */
export async function submitIndexNowBatch(
  payload: IndexNowPayload,
  endpoint: string = DEFAULT_INDEXNOW_ENDPOINT
): Promise<void> {
  for (let attempt = 0; ; attempt++) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(payload),
    });

    if (response.status === 200 || response.status === 202) {
      return;
    }

    if (response.status === 429 && attempt < MAX_RATE_LIMIT_RETRIES) {
      await delay(RATE_LIMIT_BACKOFF_MS * (attempt + 1));
      continue;
    }

    const body = await response.text().catch(() => "");
    const hint =
      response.status === 403
        ? ` Check that the key file is reachable at ${payload.keyLocation} and contains exactly the key "${payload.key}".`
        : "";
    throw new Error(
      `IndexNow submission failed (${response.status} ${response.statusText}) for ${payload.urlList.length} URL(s).${hint}${body ? ` Response: ${body}` : ""}`
    );
  }
}
