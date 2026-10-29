/**
 * The parts of the Cloudflare Workers runtime this worker uses, described
 * here instead of through `@cloudflare/workers-types` (whose globals clash
 * with the DOM types the rest of the repo is checked against). The real
 * bindings satisfy these shapes, and so do the test doubles.
 */

export interface D1Result<T = Record<string, unknown>> {
  results: T[];
  meta: { changes: number };
}

export interface D1PreparedStatement {
  bind: (...values: unknown[]) => D1PreparedStatement;
  first: <T = Record<string, unknown>>() => Promise<T | null>;
  all: <T = Record<string, unknown>>() => Promise<D1Result<T>>;
  run: () => Promise<D1Result>;
}

export interface D1Database {
  prepare: (query: string) => D1PreparedStatement;
  batch: (statements: D1PreparedStatement[]) => Promise<D1Result[]>;
}

export interface QueueSender<Body> {
  send: (body: Body, options?: { delaySeconds?: number }) => Promise<void>;
  sendBatch: (
    messages: { body: Body; delaySeconds?: number }[]
  ) => Promise<void>;
}

export interface QueueMessage<Body> {
  readonly body: Body;
  readonly attempts: number;
  ack: () => void;
  retry: (options?: { delaySeconds?: number }) => void;
}

export interface MessageBatch<Body> {
  readonly queue: string;
  readonly messages: readonly QueueMessage<Body>[];
}

export interface DurableObjectStub {
  fetch: (request: Request) => Promise<Response>;
}

export interface DurableObjectNamespace {
  idFromName: (name: string) => unknown;
  get: (id: unknown) => DurableObjectStub;
}

/** One link of an import, as queued. Never carries the session key. */
export interface ImportMessage {
  jobId: string;
  itemId: string;
}

export interface Env {
  DB: D1Database;
  IMPORT_QUEUE: QueueSender<ImportMessage>;
  LIBRARY_WRITER: DurableObjectNamespace;
  /** The CasualOS records server, e.g. `https://auth.seedbible.org`. */
  CASUALOS_ENDPOINT: string;
  /** Comma-separated origins allowed to call the API, e.g. `https://seedbible.org`. */
  ALLOWED_ORIGINS: string;
  /** Base64 of 32 random bytes. Encrypts the session keys imports hold. A secret, set with `wrangler secret put`. */
  SESSION_KEY_SECRET: string;
  /** Name of the dead-letter queue, so the consumer can tell its batches apart. */
  DEAD_LETTER_QUEUE?: string;
}
