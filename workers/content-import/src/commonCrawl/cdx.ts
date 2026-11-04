import {
  MAX_SITE_PAGES,
  type ImportItemInput,
} from "../../../../packages/seed-bible/seed-bible/managers/customContent/importApi";
import { normalizeContentUrl } from "../../../../packages/seed-bible/seed-bible/managers/customContent/normalizeUrl";
import { keepSitePage } from "../../../../packages/seed-bible/seed-bible/managers/customContent/siteImport";

/**
 * Common Crawl's URL index (a pywb "CDX" server): which crawls exist, and
 * which pages each one saved from a site. See docs/custom-content-database.md
 * §5.7. Only `index.commoncrawl.org` is ever asked, and only through the
 * CommonCrawlGate.
 */

export const INDEX_HOST = "index.commoncrawl.org";
export const COLLECTIONS_URL = `https://${INDEX_HOST}/collinfo.json`;
/** Result pages looked at per crawl, so one huge site can't take over the gate. */
export const MAX_LOOKUP_PAGES_PER_CRAWL = 20;

export interface Crawl {
  id: string;
  name: string;
  /** The crawl's index endpoint. */
  cdxApi: string;
}

/**
 * The crawls `collinfo.json` lists, newest first. Entries without a usable
 * id, or whose index isn't on Common Crawl's own index host, are skipped.
 */
export function parseCollections(json: unknown): Crawl[] {
  if (!Array.isArray(json)) {
    return [];
  }
  const crawls: Crawl[] = [];
  for (const entry of json as Record<string, unknown>[]) {
    const id = typeof entry?.id === "string" ? entry.id : "";
    if (!/^CC-MAIN-[\w-]+$/.test(id)) {
      continue;
    }
    const given = entry["cdx-api"];
    let cdxApi = `https://${INDEX_HOST}/${id}-index`;
    if (typeof given === "string") {
      try {
        const url = new URL(given);
        if (url.protocol === "https:" && url.hostname === INDEX_HOST) {
          cdxApi = url.toString();
        }
      } catch {
        // Keep the default.
      }
    }
    crawls.push({
      id,
      name: typeof entry.name === "string" ? entry.name : id,
      cdxApi,
    });
  }
  // Crawl ids sort by date ("CC-MAIN-2026-38"), whatever order the list is in.
  return crawls.sort((a, b) => b.id.localeCompare(a.id));
}

/** The latest `count` crawls, only ones newer than `sinceCrawlId` when given. */
export function pickCrawls(
  crawls: readonly Crawl[],
  count: number,
  sinceCrawlId?: string
): Crawl[] {
  return crawls
    .filter((crawl) => !sinceCrawlId || crawl.id > sinceCrawlId)
    .slice(0, count);
}

/** How many result pages a crawl's index has for the pattern. */
export function pageCountUrl(crawl: Crawl, pattern: string): string {
  const url = new URL(crawl.cdxApi);
  url.searchParams.set("url", pattern);
  url.searchParams.set("output", "json");
  url.searchParams.set("showNumPages", "true");
  return url.toString();
}

/**
 * One result page of a crawl's captures for the pattern. No server-side
 * filters: {@link parseCaptures} keeps only saved HTML pages itself, so an
 * index that read a filter differently can't silently return nothing.
 */
export function resultPageUrl(
  crawl: Crawl,
  pattern: string,
  page: number
): string {
  const url = new URL(crawl.cdxApi);
  url.searchParams.set("url", pattern);
  url.searchParams.set("output", "json");
  url.searchParams.set("page", String(page));
  return url.toString();
}

/**
 * Reads a `showNumPages` answer. pywb answers `{"pages": N, ...}`; a bare
 * number is accepted too.
 */
export function parsePageCount(body: string): number {
  const trimmed = body.trim();
  if (!trimmed) {
    return 0;
  }
  let value: unknown;
  try {
    value = JSON.parse(trimmed);
  } catch {
    return 0;
  }
  const pages =
    typeof value === "number"
      ? value
      : Number((value as { pages?: unknown } | null)?.pages);
  return Number.isInteger(pages) && pages > 0 ? pages : 0;
}

/** One saved page, as the index describes it. */
export interface Capture {
  url: string;
  timestamp: string;
  digest: string;
  filename: string;
  offset: number;
  length: number;
}

const FILENAME_PATTERN = /^crawl-data\/[\w.\-/]+\.warc\.gz$/;

/**
 * The usable captures in one result page (one JSON object per line):
 * status 200, HTML, stored in a Common Crawl WARC file. Numbers may come
 * as strings. Lines that don't parse are skipped.
 */
export function parseCaptures(body: string): Capture[] {
  const captures: Capture[] = [];
  for (const line of body.split("\n")) {
    if (!line.trim()) {
      continue;
    }
    let row: Record<string, unknown>;
    try {
      row = JSON.parse(line) as Record<string, unknown>;
    } catch {
      continue;
    }
    const text = (key: string) =>
      row[key] === undefined || row[key] === null ? "" : String(row[key]);
    const offset = Number(text("offset"));
    const length = Number(text("length"));
    const mime = text("mime").toLowerCase();
    if (
      text("status") !== "200" ||
      (mime && !mime.startsWith("text/html")) ||
      !FILENAME_PATTERN.test(text("filename")) ||
      text("filename").includes("..") ||
      !Number.isInteger(offset) ||
      offset < 0 ||
      !Number.isInteger(length) ||
      length <= 0 ||
      !/^\d{8,14}$/.test(text("timestamp")) ||
      !/^https?:\/\//i.test(text("url"))
    ) {
      continue;
    }
    captures.push({
      url: text("url"),
      timestamp: text("timestamp"),
      digest: text("digest"),
      filename: text("filename"),
      offset,
      length,
    });
  }
  return captures;
}

/** A page to offer the owner, keyed by its normalized address. */
export interface CandidatePage {
  key: string;
  url: string;
  capturedAt: string;
  digest: string;
  input: ImportItemInput;
}

/**
 * The captures worth offering: inside the owner's filters, one per page
 * (the newest capture wins) and one per content (`digest`), since the same
 * page is often saved under several addresses.
 */
export function selectCandidates(
  captures: readonly Capture[],
  options: {
    crawlId: string;
    sourceId: string;
    include: readonly string[];
    exclude: readonly string[];
  }
): CandidatePage[] {
  const byKey = new Map<string, CandidatePage>();
  for (const capture of captures) {
    if (!keepSitePage(capture.url, options)) {
      continue;
    }
    const key = normalizeContentUrl(capture.url);
    if (!key) {
      continue;
    }
    const existing = byKey.get(key);
    if (existing && existing.capturedAt >= capture.timestamp) {
      continue;
    }
    byKey.set(key, {
      key,
      url: capture.url,
      capturedAt: capture.timestamp,
      digest: capture.digest,
      input: {
        url: capture.url,
        site: {
          sourceId: options.sourceId,
          crawlId: options.crawlId,
          capturedAt: capture.timestamp,
          filename: capture.filename,
          offset: capture.offset,
          length: capture.length,
        },
      },
    });
  }
  const digests = new Set<string>();
  const kept: CandidatePage[] = [];
  for (const candidate of byKey.values()) {
    if (candidate.digest && digests.has(candidate.digest)) {
      continue;
    }
    if (candidate.digest) {
      digests.add(candidate.digest);
    }
    kept.push(candidate);
  }
  return kept.slice(0, MAX_SITE_PAGES);
}
