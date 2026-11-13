import {
  MAX_SITE_PAGES,
  type ImportItemInput,
} from "../../../../packages/seed-bible/seed-bible/managers/customContent/importApi";
import { normalizeContentUrl } from "../../../../packages/seed-bible/seed-bible/managers/customContent/normalizeUrl";
import {
  keepSitePage,
  type SiteAddress,
} from "../../../../packages/seed-bible/seed-bible/managers/customContent/siteImport";
import {
  ArchiveError,
  DATA_HOST,
  readArchiveRange,
  unzipArchivePiece,
} from "./warc";

/**
 * Common Crawl's URL index, read straight from the files Common Crawl
 * publishes on its archive host: which crawls exist, and which pages each
 * one saved from a site. See docs/custom-content-database.md §5.7.
 *
 * Each crawl's index is a set of gzipped CDX files sorted by SURT key (the
 * address with its host reversed: `org,gracechurch)/sermons/1`), plus a
 * small top-level file, `cluster.idx`, giving the first key of every block of
 * about 3,000 entries and where that block is. A site's pages are found by
 * binary-searching `cluster.idx` with range requests, then reading just the
 * blocks that can hold the site's keys. Only `data.commoncrawl.org` is ever
 * contacted: Common Crawl's own lookup server (`index.commoncrawl.org`)
 * turned out to be unreachable from Cloudflare.
 */

/** The page listing every crawl, newest first. */
export const CRAWL_LIST_URL = `https://${DATA_HOST}/crawl-data/index.html`;
/** Index blocks read per crawl, so one huge site can't run on and on. */
export const MAX_BLOCKS_PER_CRAWL = 20;
/** How close the binary search gets before reading the rest in one go. */
const SEARCH_WINDOW_BYTES = 64 * 1024;
/** Enough of `cluster.idx` to hold one whole line after a cut. */
const PROBE_BYTES = 4096;

export interface Crawl {
  id: string;
  /** As Common Crawl names it, e.g. "October 2026". */
  name: string;
}

/**
 * The crawls the crawl list page names, newest first. Each row links the
 * crawl's id and, in the next cell, its name.
 */
export function parseCrawlList(html: string): Crawl[] {
  const crawls = new Map<string, Crawl>();
  const row =
    /<a[^>]*>(CC-MAIN-\d{4}-\d{2})<\/a>\s*<\/td>\s*<td[^>]*>(?:<a[^>]*>)?([^<]*)/g;
  for (const match of html.matchAll(row)) {
    const id = match[1]!;
    if (!crawls.has(id)) {
      crawls.set(id, { id, name: match[2]!.trim() || id });
    }
  }
  // Ids sort by date ("CC-MAIN-2026-43"), whatever order the page is in.
  return [...crawls.values()].sort((a, b) => b.id.localeCompare(a.id));
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

/**
 * The SURT key every page under the site starts with: the host reversed
 * and lowercased (`www.` already dropped), then the path, also lowercased,
 * as Common Crawl writes its keys. `gracechurch.org/sermons/` becomes
 * `org,gracechurch)/sermons/`.
 */
export function surtPrefix(site: SiteAddress): string {
  return `${site.host.split(".").reverse().join(",")})${site.pathPrefix.toLowerCase()}`;
}

/** One block of a crawl's CDX index: where it is in which file. */
export interface IndexBlock {
  file: string;
  offset: number;
  length: number;
}

function indexFileUrl(crawlId: string, file: string): string {
  return `https://${DATA_HOST}/cc-index/collections/${crawlId}/indexes/${file}`;
}

/** A `cluster.idx` line: `<surt> <timestamp>\t<file>\t<offset>\t<length>\t<n>`. */
function parseClusterLine(line: string): (IndexBlock & { key: string }) | null {
  const [head, file, offset, length] = line.split("\t");
  const key = head?.split(" ")[0];
  if (!key || !file || !/^cdx-\d+\.gz$/.test(file)) {
    return null;
  }
  return { key, file, offset: Number(offset), length: Number(length) };
}

/** Complete lines in a chunk; the first is dropped when the chunk starts mid-line. */
function wholeLines(bytes: Uint8Array, startsMidLine: boolean): string[] {
  const lines = new TextDecoder().decode(bytes).split("\n");
  lines.pop();
  return startsMidLine ? lines.slice(1) : lines;
}

/**
 * The blocks of a crawl's index that can hold keys starting with `prefix`:
 * the last block starting before it (the prefix may begin inside it), and
 * every block starting with it. At most {@link MAX_BLOCKS_PER_CRAWL}. Null
 * when the crawl has no index yet.
 */
export async function findIndexBlocks(
  fetchImpl: typeof fetch,
  crawlId: string,
  prefix: string
): Promise<IndexBlock[] | null> {
  const url = indexFileUrl(crawlId, "cluster.idx");
  const first = await readArchiveRange(fetchImpl, url, 0, PROBE_BYTES);
  if (!first) {
    return null;
  }
  const size = first.size;
  // Invariant: the first whole line at or after `low` has a key before
  // `prefix` (or `low` is 0), and everything from `high` on is at or after it.
  let low = 0;
  let high = size;
  while (high - low > SEARCH_WINDOW_BYTES) {
    const middle = Math.floor((low + high) / 2);
    const probe = await readArchiveRange(
      fetchImpl,
      url,
      middle,
      middle + PROBE_BYTES
    );
    const line = probe && wholeLines(probe.bytes, true)[0];
    const key = line ? parseClusterLine(line)?.key : undefined;
    if (key !== undefined && key < prefix) {
      low = middle;
    } else {
      high = middle;
    }
  }

  const blocks: IndexBlock[] = [];
  let before: IndexBlock | null = null;
  let at = low;
  while (at < size) {
    const chunk = await readArchiveRange(
      fetchImpl,
      url,
      at,
      Math.min(at + SEARCH_WINDOW_BYTES, size)
    );
    if (!chunk) {
      break;
    }
    const atEnd = at + chunk.bytes.length >= size;
    const lines = wholeLines(chunk.bytes, at > 0);
    if (atEnd) {
      // The file's last line has no newline after it to be cut at.
      const tail = new TextDecoder().decode(
        chunk.bytes.subarray(chunk.bytes.lastIndexOf(10) + 1)
      );
      if (tail) {
        lines.push(tail);
      }
    }
    for (const line of lines) {
      const entry = parseClusterLine(line);
      if (!entry) {
        continue;
      }
      const { key, ...block } = entry;
      if (key < prefix) {
        before = block;
      } else if (key.startsWith(prefix)) {
        blocks.push(block);
        if (blocks.length + 1 >= MAX_BLOCKS_PER_CRAWL) {
          return [...(before ? [before] : []), ...blocks];
        }
      } else {
        return [...(before ? [before] : []), ...blocks];
      }
    }
    // Continue from the newline before the last (possibly cut) line.
    const cut = chunk.bytes.lastIndexOf(10);
    if (atEnd || cut <= 0) {
      break;
    }
    at += cut;
  }
  return [...(before ? [before] : []), ...blocks];
}

/**
 * The entries of one index block whose keys start with `prefix`, as JSON
 * lines ready for {@link parseCaptures}. A block is one gzip member of
 * lines like `<surt> <timestamp> {json}`.
 */
export async function readIndexBlock(
  fetchImpl: typeof fetch,
  crawlId: string,
  block: IndexBlock,
  prefix: string
): Promise<string> {
  const chunk = await readArchiveRange(
    fetchImpl,
    indexFileUrl(crawlId, block.file),
    block.offset,
    block.offset + block.length
  );
  if (!chunk) {
    throw new ArchiveError("index_missing", `${block.file} is missing.`);
  }
  // CDX lines are plain text; a block that arrives already unzipped is
  // used as it is.
  const text = new TextDecoder().decode(
    await unzipArchivePiece(
      chunk.bytes,
      (bytes) => bytes[0] !== undefined && bytes[0] < 0x80
    )
  );
  const rows: string[] = [];
  for (const line of text.split("\n")) {
    if (!line.startsWith(prefix)) {
      continue;
    }
    const space = line.indexOf(" ");
    const second = line.indexOf(" ", space + 1);
    if (space < 0 || second < 0) {
      continue;
    }
    try {
      const row = JSON.parse(line.slice(second + 1)) as Record<string, unknown>;
      rows.push(
        JSON.stringify({ ...row, timestamp: line.slice(space + 1, second) })
      );
    } catch {
      // A broken line is skipped.
    }
  }
  return rows.join("\n");
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
