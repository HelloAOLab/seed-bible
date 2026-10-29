import { readFileSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
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
  for (const file of ["0001_import_jobs.sql"]) {
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
export function createTestWorker(casualos: FakeCasualOS) {
  const clock = { now: 1_800_000_000_000 };
  const deps: WorkerDeps = { fetch: casualos.fetch, now: () => clock.now };
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

  return { env, deps, db, clock, sent, pending, drain };
}

export type TestWorker = ReturnType<typeof createTestWorker>;
