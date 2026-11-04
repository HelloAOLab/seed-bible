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
const USER_AGENT = "SeedBibleContentImport/1.0 (+https://seedbible.org)";

/** A failed archive read; `code` says whether it's worth trying again (`http_5xx`, `http_429`). */
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

function gunzip(bytes: Uint8Array): Promise<Uint8Array> {
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
  if (warcEnd < 0) {
    throw new ArchiveError("invalid_archive_record", "Not a WARC record.");
  }
  const warcHeaders = parseHeaders(bytesToText(record.subarray(0, warcEnd)));
  if ((warcHeaders.get("warc-type") ?? "").toLowerCase() !== "response") {
    throw new ArchiveError(
      "invalid_archive_record",
      "The archive record isn't a saved response."
    );
  }
  const httpStart = warcEnd + 4;
  const httpEnd = headerEnd(record, httpStart);
  if (httpEnd < 0) {
    throw new ArchiveError(
      "invalid_archive_record",
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
    throw new ArchiveError(
      "invalid_archive_record",
      "Unexpected archive file."
    );
  }
  if (location.length > MAX_RECORD_BYTES) {
    throw new ArchiveError("page_too_large", "The saved page is too large.");
  }
  let response: Response;
  try {
    response = await fetchImpl(`https://${DATA_HOST}/${location.filename}`, {
      headers: {
        Range: `bytes=${location.offset}-${location.offset + location.length - 1}`,
        "User-Agent": USER_AGENT,
      },
    });
  } catch (error) {
    throw new ArchiveError("network_error", String(error));
  }
  if (response.status !== 206 && response.status !== 200) {
    throw new ArchiveError(
      `http_${response.status}`,
      `The archive answered ${response.status}.`
    );
  }
  if (!response.body) {
    throw new ArchiveError(
      "invalid_archive_record",
      "The archive sent nothing."
    );
  }
  const zipped = await readCapped(response.body, location.length);
  let record: Uint8Array;
  try {
    record = await gunzip(zipped);
  } catch {
    throw new ArchiveError(
      "invalid_archive_record",
      "The saved page couldn't be unzipped."
    );
  }
  return parseWarcRecord(record);
}
