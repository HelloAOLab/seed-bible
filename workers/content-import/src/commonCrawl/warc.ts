/**
 * Reading one saved page out of Common Crawl's archive: a range request
 * for just its record in a WARC file (the web archive format) on
 * `data.commoncrawl.org`, unzipped and split into its parts.
 */

export const DATA_HOST = "data.commoncrawl.org";
/** Records bigger than this aren't fetched. Common Crawl itself truncates pages at 1 MiB. */
export const MAX_RECORD_BYTES = 5 * 1024 * 1024;
/** Most unzipped bytes read from one record. */
const MAX_UNZIPPED_BYTES = 8 * 1024 * 1024;
/**
 * In the usual "compatible" form: Common Crawl's front end turned away the
 * bare `SeedBibleContentImport/1.0 (+https://seedbible.org)` with a 403.
 */
export const COMMON_CRAWL_USER_AGENT =
  "Mozilla/5.0 (compatible; SeedBibleContentImport/1.0; +https://seedbible.org)";

/**
 * A failed archive read. `code` says what went wrong, and is what's recorded
 * on a page that fails to import; `http_5xx` and `http_429` are retried.
 */
export class ArchiveError extends Error {
  constructor(
    readonly code: string,
    message: string
  ) {
    super(message);
    this.name = "ArchiveError";
  }
}

export interface ArchivedPage {
  /** The page's HTTP headers, lowercased. */
  headers: Map<string, string>;
  html: string;
}

async function readCapped(
  stream: ReadableStream<Uint8Array>,
  max: number
): Promise<Uint8Array> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    const room = max - size;
    chunks.push(value.length > room ? value.subarray(0, room) : value);
    size += Math.min(value.length, room);
    if (size >= max) {
      await reader.cancel();
      break;
    }
  }
  const bytes = new Uint8Array(size);
  let at = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, at);
    at += chunk.length;
  }
  return bytes;
}

export function gunzip(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([bytes as BlobPart])
    .stream()
    .pipeThrough(new DecompressionStream("gzip"));
  return readCapped(stream as ReadableStream<Uint8Array>, MAX_UNZIPPED_BYTES);
}

/** Where the blank line ending a header block is, or -1. */
function headerEnd(bytes: Uint8Array, from: number): number {
  for (let i = from; i + 3 < bytes.length; i++) {
    if (
      bytes[i] === 13 &&
      bytes[i + 1] === 10 &&
      bytes[i + 2] === 13 &&
      bytes[i + 3] === 10
    ) {
      return i;
    }
  }
  return -1;
}

/**
 * Header bytes read one byte per character. Done by hand because not every
 * runtime's `TextDecoder` knows the single-byte encodings.
 */
function bytesToText(bytes: Uint8Array): string {
  let text = "";
  for (let i = 0; i < bytes.length; i += 8192) {
    text += String.fromCharCode(...bytes.subarray(i, i + 8192));
  }
  return text;
}

function parseHeaders(block: string): Map<string, string> {
  const headers = new Map<string, string>();
  for (const line of block.split("\r\n").slice(1)) {
    const colon = line.indexOf(":");
    if (colon > 0) {
      headers.set(
        line.slice(0, colon).trim().toLowerCase(),
        line.slice(colon + 1).trim()
      );
    }
  }
  return headers;
}

/** Undoes `Transfer-Encoding: chunked`, in case the archive kept it. */
function unchunk(bytes: Uint8Array): Uint8Array {
  const parts: Uint8Array[] = [];
  let at = 0;
  while (at < bytes.length) {
    let lineEnd = at;
    while (
      lineEnd + 1 < bytes.length &&
      !(bytes[lineEnd] === 13 && bytes[lineEnd + 1] === 10)
    ) {
      lineEnd++;
    }
    const size = parseInt(bytesToText(bytes.subarray(at, lineEnd)), 16);
    if (!Number.isFinite(size) || size <= 0) {
      break;
    }
    parts.push(bytes.subarray(lineEnd + 2, lineEnd + 2 + size));
    at = lineEnd + 2 + size + 2;
  }
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const joined = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    joined.set(part, offset);
    offset += part.length;
  }
  return joined;
}

/** The character set the page says it uses, from its headers or an early `<meta>`. */
function charsetOf(headers: Map<string, string>, body: Uint8Array): string {
  const fromHeader = /charset=["']?([\w-]+)/i.exec(
    headers.get("content-type") ?? ""
  )?.[1];
  if (fromHeader) {
    return fromHeader;
  }
  const head = bytesToText(body.subarray(0, 4096));
  return /<meta[^>]+charset=["']?([\w-]+)/i.exec(head)?.[1] ?? "utf-8";
}

function decode(body: Uint8Array, charset: string): string {
  try {
    return new TextDecoder(charset.toLowerCase()).decode(body);
  } catch {
    return new TextDecoder("utf-8").decode(body);
  }
}

/**
 * Splits an unzipped WARC response record into the page's HTTP headers and
 * its HTML, decoded with the page's own character set.
 */
export async function parseWarcRecord(
  record: Uint8Array
): Promise<ArchivedPage> {
  const warcEnd = headerEnd(record, 0);
  if (warcEnd < 0 || bytesToText(record.subarray(0, 5)) !== "WARC/") {
    throw new ArchiveError(
      "warc_no_headers",
      `Not a WARC record; it starts ${describeBytes(record)}.`
    );
  }
  const warcHeaders = parseHeaders(bytesToText(record.subarray(0, warcEnd)));
  const type = warcHeaders.get("warc-type") ?? "";
  if (type.toLowerCase() !== "response") {
    throw new ArchiveError(
      "warc_not_response",
      `The archive record is a "${type}" record, not a saved page.`
    );
  }
  const httpStart = warcEnd + 4;
  const httpEnd = headerEnd(record, httpStart);
  if (httpEnd < 0) {
    throw new ArchiveError(
      "warc_no_page",
      "The archive record has no page in it."
    );
  }
  const headers = parseHeaders(
    bytesToText(record.subarray(httpStart, httpEnd))
  );
  let body = record.subarray(httpEnd + 4);
  if (/chunked/i.test(headers.get("transfer-encoding") ?? "")) {
    body = unchunk(body);
  }
  if (
    /gzip/i.test(headers.get("content-encoding") ?? "") &&
    body[0] === 0x1f &&
    body[1] === 0x8b
  ) {
    body = await gunzip(body);
  }
  return { headers, html: decode(body, charsetOf(headers, body)) };
}

/** The first bytes of a response, as text and hex, for the logs. */
function describeBytes(bytes: Uint8Array): string {
  const head = bytes.subarray(0, 24);
  return `${JSON.stringify(bytesToText(head))} (${[...head]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join(" ")})`;
}

function isGzip(bytes: Uint8Array): boolean {
  return bytes[0] === 0x1f && bytes[1] === 0x8b;
}

/**
 * Reads bytes `start` to `end` (exclusive) of a file on the archive host.
 * Null when the file isn't there. Only the exact slice asked for is
 * accepted: a server that ignored the range and sent the file from its
 * start would otherwise be read as if it were the record asked for.
 */
export async function readArchiveRange(
  fetchImpl: typeof fetch,
  url: string,
  start: number,
  end: number
): Promise<{ bytes: Uint8Array; size: number } | null> {
  let response: Response;
  try {
    response = await fetchImpl(url, {
      headers: {
        Range: `bytes=${start}-${end - 1}`,
        "User-Agent": COMMON_CRAWL_USER_AGENT,
        // The bytes exactly as stored: a gzip piece unzipped (or zipped
        // again) on the way would no longer match the index.
        "Accept-Encoding": "identity",
      },
    });
  } catch (error) {
    throw new ArchiveError("network_error", String(error));
  }
  const report = () =>
    `HTTP ${response.status}, Content-Range ${response.headers.get("Content-Range") ?? "none"}, Content-Encoding ${response.headers.get("Content-Encoding") ?? "none"}, for ${url} bytes ${start}-${end - 1}`;
  if (response.status === 404) {
    return null;
  }
  if (response.status === 403) {
    const body = await response.text();
    // S3 answers a missing file with an XML "AccessDenied"; anything else
    // (Common Crawl's front end turning the worker away) is a real refusal.
    if (/<Code>(AccessDenied|NoSuchKey)<\/Code>/.test(body)) {
      return null;
    }
    console.warn(
      `Common Crawl refused a read: ${report()}:`,
      body.slice(0, 200)
    );
    throw new ArchiveError("http_403", `Common Crawl refused: ${report()}.`);
  }
  if (response.status !== 206 && !(response.status === 200 && start === 0)) {
    console.warn(`Common Crawl read failed: ${report()}`);
    throw new ArchiveError(
      response.status === 200 ? "range_not_honored" : `http_${response.status}`,
      `Unexpected answer: ${report()}.`
    );
  }
  const range = /^bytes (\d+)-(\d+)\/(\d+|\*)$/.exec(
    response.headers.get("Content-Range") ?? ""
  );
  if (response.status === 206 && (!range || Number(range[1]) !== start)) {
    console.warn(`Common Crawl sent the wrong part of a file: ${report()}`);
    throw new ArchiveError(
      "range_not_honored",
      `Wrong part of the file: ${report()}.`
    );
  }
  if (!response.body) {
    throw new ArchiveError("archive_empty", `Nothing sent: ${report()}.`);
  }
  // The slice may arrive unzipped, and so longer than asked for.
  const bytes = await readCapped(
    response.body,
    response.status === 206
      ? Math.max(end - start, MAX_UNZIPPED_BYTES)
      : end - start
  );
  const total =
    range && range[3] !== "*"
      ? Number(range[3])
      : Number(response.headers.get("Content-Length")) || start + bytes.length;
  return { bytes, size: total };
}

/**
 * Unzips one gzip piece read from the archive. Bytes that arrive already
 * unzipped (a WARC record, or CDX lines) are used as they are.
 */
export async function unzipArchivePiece(
  bytes: Uint8Array,
  alreadyPlain: (bytes: Uint8Array) => boolean
): Promise<Uint8Array> {
  if (!isGzip(bytes)) {
    if (alreadyPlain(bytes)) {
      return bytes;
    }
    console.warn(
      `Common Crawl sent something other than gzip: ${describeBytes(bytes)}`
    );
    throw new ArchiveError(
      "archive_not_gzip",
      `Expected gzip; it starts ${describeBytes(bytes)}.`
    );
  }
  try {
    return await gunzip(bytes);
  } catch (error) {
    console.warn(
      `Couldn't unzip a Common Crawl piece of ${bytes.length} bytes starting ${describeBytes(bytes)}:`,
      error
    );
    throw new ArchiveError(
      "archive_unzip_failed",
      `Couldn't unzip: ${String(error)}.`
    );
  }
}

/**
 * Fetches one saved page from the archive with a range request for just
 * its record. Only ever contacts `data.commoncrawl.org`, for a file the
 * index named.
 */
export async function fetchArchivedPage(
  fetchImpl: typeof fetch,
  location: { filename: string; offset: number; length: number }
): Promise<ArchivedPage> {
  if (
    !/^crawl-data\/[\w.\-/]+\.warc\.gz$/.test(location.filename) ||
    location.filename.includes("..")
  ) {
    throw new ArchiveError("invalid_archive_file", "Unexpected archive file.");
  }
  if (location.length > MAX_RECORD_BYTES) {
    throw new ArchiveError("page_too_large", "The saved page is too large.");
  }
  const read = await readArchiveRange(
    fetchImpl,
    `https://${DATA_HOST}/${location.filename}`,
    location.offset,
    location.offset + location.length
  );
  if (!read) {
    throw new ArchiveError(
      "archive_missing",
      "Common Crawl no longer has this file."
    );
  }
  const record = await unzipArchivePiece(
    read.bytes,
    (bytes) => bytesToText(bytes.subarray(0, 5)) === "WARC/"
  );
  return parseWarcRecord(record);
}
