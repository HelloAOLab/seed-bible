import { readFileSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { gzipSync } from "node:zlib";
import { LibraryWriter } from "../../../workers/content-import/src/libraryWriter";
import { handleQueueBatch } from "../../../workers/content-import/src/consumer";
import type { WorkerDeps } from "../../../workers/content-import/src/deps";
import type {
  D1Database,
  D1PreparedStatement,
  D1Result,
  Env,
  ImportMessage,
  QueueMessage,
} from "../../../workers/content-import/src/platform";

const MIGRATIONS = path.resolve(
  __dirname,
  "../../../workers/content-import/migrations"
);

/** D1, backed by a real in-memory SQLite database with the worker's migrations applied. */
export function createTestD1(): D1Database & { sqlite: DatabaseSync } {
  const sqlite = new DatabaseSync(":memory:");
  for (const file of [
    "0001_import_jobs.sql",
    "0002_site_imports.sql",
    "0003_index_blocks.sql",
  ]) {
    sqlite.exec(readFileSync(path.join(MIGRATIONS, file), "utf-8"));
  }
  type Bindable = string | number | null;
  const statement = (sql: string, params: Bindable[]): D1PreparedStatement => ({
    bind: (...values) => statement(sql, values as Bindable[]),
    first: async <T>() =>
      ((sqlite.prepare(sql).get(...params) as T | undefined) ??
        null) as T | null,
    all: async <T>(): Promise<D1Result<T>> => {
      const results = sqlite.prepare(sql).all(...params) as T[];
      return { results, meta: { changes: results.length } };
    },
    run: async (): Promise<D1Result> => {
      const result = sqlite.prepare(sql).run(...params);
      return { results: [], meta: { changes: Number(result.changes) } };
    },
  });
  return {
    sqlite,
    prepare: (sql) => statement(sql, []),
    // D1 runs a batch as one transaction.
    batch: async (statements) => {
      sqlite.exec("BEGIN");
      try {
        const results: D1Result[] = [];
        for (const s of statements) {
          results.push(await s.run());
        }
        sqlite.exec("COMMIT");
        return results;
      } catch (error) {
        sqlite.exec("ROLLBACK");
        throw error;
      }
    },
  };
}

interface StoredEntry {
  data: unknown;
  markers: string[];
}

export function sessionKeyFor(userId: string, sessionId = "session-1"): string {
  const b64 = (value: string) => Buffer.from(value).toString("base64");
  return `vSK1.${b64(userId)}.${b64(sessionId)}.${b64("secret")}.${b64("Infinity")}`;
}

/**
 * CasualOS's records API, in memory: who owns which record, which sessions
 * are live, and the data in each record, answering the same procedure calls
 * the worker makes. Records it shares with a browser-side fake can be passed
 * in, so both sides see the same data.
 */
export function createFakeCasualOS(
  options: { records?: Map<string, Map<string, StoredEntry>> } = {}
) {
  const records =
    options.records ?? new Map<string, Map<string, StoredEntry>>();
  const owners = new Map<string, string>();
  const sessions = new Map<string, { userId: string; live: boolean }>();
  const previews = new Map<string, Record<string, string> | string>();
  /** Procedure name → error code to answer the next N calls with. */
  const failures = new Map<string, { code: string; times: number }>();
  const calls: { procedure: string; input: Record<string, unknown> }[] = [];
  const allowedOrigins = new Set([APP_ORIGIN]);
  const PAGE_SIZE = 2;

  const signIn = (userId: string, sessionId?: string) => {
    const key = sessionKeyFor(userId, sessionId);
    sessions.set(key, { userId, live: true });
    return key;
  };

  const createRecord = (recordName: string, ownerId: string) => {
    owners.set(recordName, ownerId);
    if (!records.has(recordName)) {
      records.set(recordName, new Map());
    }
  };

  const fail = (errorCode: string) => ({
    success: false,
    errorCode,
    errorMessage: errorCode,
  });

  const answer = (
    procedure: string,
    input: Record<string, unknown>,
    sessionKey: string | null
  ): unknown => {
    const failure = failures.get(procedure);
    if (failure && failure.times > 0) {
      failure.times--;
      return fail(failure.code);
    }
    const session = sessionKey ? sessions.get(sessionKey) : undefined;
    if (sessionKey && !session) {
      return fail("invalid_key");
    }
    if (session && !session.live) {
      return fail("session_expired");
    }
    const user = session?.userId ?? null;
    const canWrite = (record: string) => owners.get(record) === user;

    switch (procedure) {
      case "getUserInfo":
        return user && user === input.userId
          ? { success: true, userId: user, email: `${user}@example.org` }
          : fail(user ? "not_authorized" : "not_logged_in");
      case "getData": {
        const entry = records
          .get(String(input.recordName))
          ?.get(String(input.address));
        if (!entry) {
          return fail("data_not_found");
        }
        const isPublic = entry.markers.some((m) => m.startsWith("publicRead:"));
        if (!isPublic && !canWrite(String(input.recordName))) {
          return fail("not_authorized");
        }
        return { success: true, data: structuredClone(entry.data) };
      }
      case "recordData": {
        const record = String(input.recordKey);
        if (!records.has(record)) {
          return fail("record_not_found");
        }
        if (!canWrite(record)) {
          return fail("not_authorized");
        }
        records.get(record)!.set(String(input.address), {
          data: structuredClone(input.data),
          markers: (input.markers as string[] | undefined) ?? [],
        });
        return { success: true, recordName: record, address: input.address };
      }
      case "eraseData": {
        const record = String(input.recordKey);
        if (!canWrite(record)) {
          return fail("not_authorized");
        }
        return records.get(record)?.delete(String(input.address))
          ? { success: true }
          : fail("data_not_found");
      }
      case "listData": {
        const record = String(input.recordName);
        const marker = String(input.marker);
        if (!marker.startsWith("publicRead:") && !canWrite(record)) {
          return fail("not_authorized");
        }
        const matching = [...(records.get(record)?.entries() ?? [])]
          .filter(([, entry]) => entry.markers.includes(marker))
          .map(([address, entry]) => ({
            address,
            data: structuredClone(entry.data),
          }))
          .sort((a, b) => a.address.localeCompare(b.address));
        const after = input.address ? String(input.address) : null;
        const rest = after
          ? matching.filter((i) => i.address > after)
          : matching;
        return {
          success: true,
          items: rest.slice(0, PAGE_SIZE),
          totalCount: matching.length,
        };
      }
      case "getLinkPreview": {
        const preview = previews.get(String(input.url));
        if (typeof preview === "string") {
          return fail(preview);
        }
        return {
          success: true,
          ...(preview ?? { title: `Title of ${String(input.url)}` }),
        };
      }
      default:
        return fail("unacceptable_request");
    }
  };

  const fetchImpl: typeof fetch = async (url, init) => {
    const target = String(url);
    if (!target.endsWith("/api/v3/callProcedure")) {
      throw new Error(`Unexpected request to ${target}`);
    }
    const headers = new Headers(init?.headers);
    // Like the real server: calls must come from one of its allowed origins.
    if (!allowedOrigins.has(headers.get("Origin") ?? "")) {
      return Response.json(fail("invalid_origin"), { status: 403 });
    }
    const auth = headers.get("Authorization");
    const body = JSON.parse(String(init?.body)) as {
      procedure: string;
      input: Record<string, unknown>;
    };
    calls.push(body);
    return Response.json(
      answer(
        body.procedure,
        body.input,
        auth ? auth.replace(/^Bearer /, "") : null
      )
    );
  };

  return {
    records,
    sessions,
    previews,
    allowedOrigins,
    failures,
    calls,
    signIn,
    createRecord,
    fetch: fetchImpl,
    /** The session ends, as when the owner signs out elsewhere. */
    endSession: (key: string) => {
      const session = sessions.get(key);
      if (session) {
        session.live = false;
      }
    },
  };
}

export type FakeCasualOS = ReturnType<typeof createFakeCasualOS>;

const SECRET = Buffer.alloc(32, 7).toString("base64");
export const APP_ORIGIN = "https://app.test";
const MAX_RETRIES = 5;

/**
 * The worker with its bindings: D1 on SQLite, a queue that delivers
 * when told to (applying Cloudflare's retry and dead-letter rules), and one
 * LibraryWriter per library.
 */
export function createTestWorker(
  casualos: FakeCasualOS,
  commonCrawl: FakeCommonCrawl = createFakeCommonCrawl()
) {
  const clock = { now: 1_800_000_000_000 };
  /** Every outside request the worker made, by host. */
  const requests: { host: string; url: string; at: number }[] = [];
  const deps: WorkerDeps = {
    fetch: async (input, init) => {
      const url = new URL(String(input));
      requests.push({ host: url.hostname, url: url.toString(), at: clock.now });
      return url.hostname.endsWith("commoncrawl.org")
        ? commonCrawl.fetch(url, init)
        : casualos.fetch(input, init);
    },
    now: () => clock.now,
  };
  const db = createTestD1();
  const pending: { body: ImportMessage; attempts: number }[] = [];
  const deadLetters: { body: ImportMessage; attempts: number }[] = [];
  const sent: ImportMessage[] = [];
  const writers = new Map<string, LibraryWriter>();

  const env: Env = {
    DB: db,
    IMPORT_QUEUE: {
      send: async (body) => {
        sent.push(body);
        pending.push({ body, attempts: 1 });
      },
      sendBatch: async (messages) => {
        for (const message of messages) {
          sent.push(message.body);
          pending.push({ body: message.body, attempts: 1 });
        }
      },
    },
    LIBRARY_WRITER: {
      idFromName: (name) => name,
      get: (id) => {
        const name = String(id);
        if (!writers.has(name)) {
          writers.set(name, new LibraryWriter(null, env, deps));
        }
        return writers.get(name)!;
      },
    },
    CASUALOS_ENDPOINT: "https://casualos.test",
    CASUALOS_ORIGIN: APP_ORIGIN,
    ALLOWED_ORIGINS: APP_ORIGIN,
    SESSION_KEY_SECRET: SECRET,
    DEAD_LETTER_QUEUE: "dlq",
  };

  /** Delivers everything queued (and anything re-queued), batch by batch, until the queue is empty. */
  const drain = async (options: { batchSize?: number } = {}) => {
    const batchSize = options.batchSize ?? 10;
    for (
      let round = 0;
      round < 1000 && (pending.length || deadLetters.length);
      round++
    ) {
      const fromDeadLetters = pending.length === 0;
      const source = fromDeadLetters ? deadLetters : pending;
      const taken = source.splice(0, batchSize);
      const messages = taken.map(
        (entry): QueueMessage<ImportMessage> => ({
          body: entry.body,
          attempts: entry.attempts,
          ack: () => undefined,
          retry: () => {
            if (entry.attempts >= MAX_RETRIES) {
              deadLetters.push({ body: entry.body, attempts: entry.attempts });
            } else {
              pending.push({ body: entry.body, attempts: entry.attempts + 1 });
            }
          },
        })
      );
      await handleQueueBatch(
        {
          queue: fromDeadLetters ? "dlq" : "seed-bible-content-import",
          messages,
        },
        env,
        deps
      );
    }
  };

  return { env, deps, db, clock, sent, pending, drain, requests, commonCrawl };
}

export type TestWorker = ReturnType<typeof createTestWorker>;

/** One saved page in the fake archive's index. */
interface FakeCapture {
  url: string;
  timestamp: string;
  status?: string;
  mime?: string;
  digest?: string;
  filename: string;
  offset: number;
  length: number;
}

/** A WARC response record for a page, gzipped as Common Crawl stores each record. */
export function warcRecord(
  url: string,
  html: string | Uint8Array,
  options: { contentType?: string } = {}
): Uint8Array {
  const body = typeof html === "string" ? Buffer.from(html, "utf-8") : html;
  const http = Buffer.concat([
    Buffer.from(
      `HTTP/1.1 200 OK\r\nContent-Type: ${options.contentType ?? "text/html; charset=UTF-8"}\r\nContent-Length: ${body.length}\r\n\r\n`,
      "latin1"
    ),
    body,
  ]);
  const warc = Buffer.concat([
    Buffer.from(
      `WARC/1.0\r\nWARC-Type: response\r\nWARC-Target-URI: ${url}\r\nContent-Type: application/http; msgtype=response\r\nContent-Length: ${http.length}\r\n\r\n`,
      "latin1"
    ),
    http,
    Buffer.from("\r\n\r\n", "latin1"),
  ]);
  return gzipSync(warc);
}

/** A page's SURT key, as Common Crawl writes its index: `org,example)/path?q`. */
function surtKey(url: string): string {
  const parsed = new URL(url);
  const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
  return `${host.split(".").reverse().join(",")})${parsed.pathname}${parsed.search}`.toLowerCase();
}

/**
 * Common Crawl's archive host, in memory: the crawl list page; each
 * crawl's index as Common Crawl publishes it (gzipped CDX blocks sorted by
 * SURT key, and a `cluster.idx` naming each block), built from the pages
 * added; and WARC files. Every file answers range requests.
 */
export function createFakeCommonCrawl() {
  const crawls: { id: string; name: string }[] = [
    { id: "CC-MAIN-2026-38", name: "September 2026" },
    { id: "CC-MAIN-2026-30", name: "July 2026" },
    { id: "CC-MAIN-2026-22", name: "May 2026" },
    { id: "CC-MAIN-2026-13", name: "March 2026" },
  ];
  const captures = new Map<string, FakeCapture[]>();
  const files = new Map<string, Buffer>();
  /** Index entries per block; Common Crawl's are about 3,000. */
  const blockSize = { value: 50 };
  /**
   * Entries from other sites in every crawl's index, sorted before and
   * after the test's own, so the index is big enough to need searching.
   */
  const otherSites = { value: 20 };
  /** HTTP statuses to answer the next index-file requests with, in order; 0 answers normally. */
  const indexFailures: number[] = [];
  /** Crawls whose index files are built; adding a page rebuilds its crawl's. */
  const built = new Set<string>();

  /** Saves a page in a crawl, as an index entry plus a record in that crawl's WARC file. */
  const addPage = (
    crawlId: string,
    url: string,
    html: string | Uint8Array,
    options: {
      timestamp?: string;
      digest?: string;
      status?: string;
      mime?: string;
      contentType?: string;
    } = {}
  ) => {
    const filename = `crawl-data/${crawlId}/segments/1/warc/part-00000.warc.gz`;
    const record = Buffer.from(warcRecord(url, html, options));
    const file = files.get(filename) ?? Buffer.alloc(0);
    files.set(filename, Buffer.concat([file, record]));
    const list = captures.get(crawlId) ?? [];
    list.push({
      url,
      timestamp: options.timestamp ?? `${crawlId.slice(8, 12)}0901120000`,
      status: options.status,
      mime: options.mime,
      digest: options.digest ?? `sha1:${url}`,
      filename,
      offset: file.length,
      length: record.length,
    });
    captures.set(crawlId, list);
    built.delete(crawlId);
  };

  /** Builds a crawl's CDX file and `cluster.idx` from its pages, as Common Crawl's tools do. */
  const buildIndex = (crawlId: string) => {
    const other = (prefix: string, i: number): FakeCapture => ({
      url: `https://${prefix}${String(i).padStart(5, "0")}.example/`,
      timestamp: "20260101000000",
      filename: "crawl-data/other.warc.gz",
      offset: 0,
      length: 1,
    });
    const entries = [
      ...Array.from({ length: otherSites.value }, (_, i) => other("aaa", i)),
      ...(captures.get(crawlId) ?? []),
      ...Array.from({ length: otherSites.value }, (_, i) => other("zzz", i)),
    ]
      .map((capture) => ({
        key: surtKey(capture.url),
        line: `${surtKey(capture.url)} ${capture.timestamp} ${JSON.stringify({
          url: capture.url,
          mime: capture.mime ?? "text/html",
          status: capture.status ?? "200",
          digest: capture.digest ?? "",
          length: String(capture.length),
          offset: String(capture.offset),
          filename: capture.filename,
        })}`,
      }))
      .sort((a, b) => (a.line < b.line ? -1 : a.line > b.line ? 1 : 0));
    const blocks: Buffer[] = [];
    const cluster: string[] = [];
    let offset = 0;
    for (let i = 0; i < entries.length; i += blockSize.value) {
      const block = entries.slice(i, i + blockSize.value);
      const zipped = gzipSync(
        Buffer.from(block.map((entry) => entry.line).join("\n") + "\n")
      );
      const [key, timestamp] = block[0]!.line.split(" ");
      cluster.push(
        `${key} ${timestamp}\tcdx-00000.gz\t${offset}\t${zipped.length}\t${cluster.length + 1}`
      );
      blocks.push(zipped);
      offset += zipped.length;
    }
    const base = `cc-index/collections/${crawlId}/indexes`;
    files.set(`${base}/cdx-00000.gz`, Buffer.concat(blocks));
    files.set(`${base}/cluster.idx`, Buffer.from(cluster.join("\n") + "\n"));
  };

  const fetchImpl = async (url: URL, init?: RequestInit): Promise<Response> => {
    if (url.hostname !== "data.commoncrawl.org") {
      throw new Error(`Unexpected request to ${url}`);
    }
    const path = url.pathname.slice(1);
    const isIndex =
      path === "crawl-data/index.html" || path.startsWith("cc-index/");
    if (isIndex) {
      const failure = indexFailures.shift();
      if (failure) {
        return new Response("Slow down", { status: failure });
      }
    }
    if (path === "crawl-data/index.html") {
      return new Response(
        `<table><tbody>${crawls
          .map(
            (crawl) =>
              `<tr>\n<td><a href="./${crawl.id}/index.html">${crawl.id}</a></td>\n<td><a href="https://commoncrawl.org/blog/x">${crawl.name}</a></td>\n</tr>`
          )
          .join("\n")}</tbody></table>`
      );
    }
    const indexOf = /^cc-index\/collections\/(CC-MAIN-[\w-]+)\/indexes\//.exec(
      path
    );
    if (
      indexOf &&
      !built.has(indexOf[1]!) &&
      crawls.some((crawl) => crawl.id === indexOf[1])
    ) {
      buildIndex(indexOf[1]!);
      built.add(indexOf[1]!);
    }
    const file = files.get(path);
    const range = /^bytes=(\d+)-(\d+)$/.exec(
      new Headers(init?.headers).get("Range") ?? ""
    );
    if (!file || !range) {
      // S3 answers 403 for a file that isn't there.
      return new Response("AccessDenied", { status: 403 });
    }
    const start = Number(range[1]);
    const end = Math.min(Number(range[2]), file.length - 1);
    return new Response(new Uint8Array(file.subarray(start, end + 1)), {
      status: 206,
      headers: { "Content-Range": `bytes ${start}-${end}/${file.length}` },
    });
  };

  return {
    crawls,
    captures,
    files,
    blockSize,
    otherSites,
    indexFailures,
    addPage,
    fetch: fetchImpl,
  };
}

export type FakeCommonCrawl = ReturnType<typeof createFakeCommonCrawl>;
