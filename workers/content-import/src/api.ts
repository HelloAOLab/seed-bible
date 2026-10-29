import {
  publishRequestSchema,
  startImportRequestSchema,
  type ImportItemInput,
} from "../../../packages/seed-bible/seed-bible/managers/customContent/importApi";
import { normalizeContentUrl } from "../../../packages/seed-bible/seed-bible/managers/customContent/normalizeUrl";
import { readLibraryManifest } from "../../../packages/seed-bible/seed-bible/managers/customContent/publish";
import {
  CONTENT_IMPORT_STATUS_ADDRESS,
  CONTENT_IMPORT_STATUS_MARKER,
} from "../../../packages/seed-bible/seed-bible/managers/customContent/schema";
import {
  createCasualOSClient,
  isFatalSessionError,
  type CasualOSClient,
} from "./casualos";
import type { WorkerDeps } from "./deps";
import { writeImportStatus } from "./importStatus";
import {
  JOB_LIFETIME_MS,
  createJob,
  findActiveJob,
  getJob,
  isActiveImportConflict,
  jobProgress,
  queuedItemIds,
  setJobStatus,
  type JobRow,
} from "./jobs";
import type { Env, ImportMessage } from "./platform";
import {
  encryptSessionKey,
  sessionKeyFingerprint,
  sessionKeyUserId,
} from "./sessionKeys";

/** Messages per `sendBatch`, the queue's own limit. */
const MESSAGES_PER_SEND = 100;
/** How long a checked session key is trusted before asking CasualOS again. */
const AUTH_CACHE_MS = 60 * 1000;

const authCache = new Map<string, { userId: string; until: number }>();

class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message?: string,
    readonly extra: Record<string, unknown> = {}
  ) {
    super(message ?? code);
  }
}

function allowedOrigin(request: Request, env: Env): string | null {
  const origin = request.headers.get("Origin");
  if (!origin) {
    return null;
  }
  const allowed = env.ALLOWED_ORIGINS.split(",").map((o) => o.trim());
  return allowed.includes(origin) ? origin : null;
}

function corsHeaders(origin: string | null): Record<string, string> {
  return origin
    ? {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Authorization, Content-Type",
        "Access-Control-Max-Age": "86400",
        Vary: "Origin",
      }
    : { Vary: "Origin" };
}

function json(body: unknown, status: number, origin: string | null): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
  });
}

interface Caller {
  userId: string;
  sessionKey: string;
  client: CasualOSClient;
}

/**
 * Who is calling, checked with CasualOS: the user id is read from the
 * session key, and `getUserInfo` with that key only succeeds for a live
 * session belonging to that user.
 */
async function authenticate(
  request: Request,
  env: Env,
  deps: WorkerDeps
): Promise<Caller> {
  const header = request.headers.get("Authorization") ?? "";
  const sessionKey = header.startsWith("Bearer ")
    ? header.slice("Bearer ".length).trim()
    : "";
  const userId = sessionKey ? sessionKeyUserId(sessionKey) : null;
  if (!sessionKey || !userId) {
    throw new HttpError(401, "not_logged_in", "Sign in to import content.");
  }
  const client = createCasualOSClient(
    env.CASUALOS_ENDPOINT,
    sessionKey,
    deps.fetch
  );

  const fingerprint = await sessionKeyFingerprint(sessionKey);
  const cached = authCache.get(fingerprint);
  if (cached && cached.until > deps.now() && cached.userId === userId) {
    return { userId, sessionKey, client };
  }
  const info = await client.getUserInfo(userId);
  if (!info.success) {
    authCache.delete(fingerprint);
    if (
      isFatalSessionError(info.errorCode) ||
      info.errorCode === "not_logged_in" ||
      info.errorCode === "not_authorized"
    ) {
      throw new HttpError(401, "session_invalid", "Sign in again to continue.");
    }
    throw new HttpError(
      502,
      "casualos_unavailable",
      "CasualOS couldn't confirm who you are."
    );
  }
  authCache.set(fingerprint, { userId, until: deps.now() + AUTH_CACHE_MS });
  return { userId, sessionKey, client };
}

async function readBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new HttpError(400, "invalid_request", "The request body isn't JSON.");
  }
}

async function ownJob(env: Env, caller: Caller, id: string): Promise<JobRow> {
  const job = await getJob(env.DB, id);
  // Someone else's import reads as missing, not forbidden.
  if (!job || job.user_id !== caller.userId) {
    throw new HttpError(404, "import_not_found");
  }
  return job;
}

async function enqueue(
  env: Env,
  jobId: string,
  itemIds: readonly string[]
): Promise<void> {
  for (let i = 0; i < itemIds.length; i += MESSAGES_PER_SEND) {
    await env.IMPORT_QUEUE.sendBatch(
      itemIds
        .slice(i, i + MESSAGES_PER_SEND)
        .map((itemId): { body: ImportMessage } => ({ body: { jobId, itemId } }))
    );
  }
}

async function startImport(
  request: Request,
  env: Env,
  deps: WorkerDeps,
  caller: Caller
): Promise<{ body: unknown; status: number }> {
  const parsed = startImportRequestSchema.safeParse(await readBody(request));
  if (!parsed.success) {
    throw new HttpError(400, "invalid_request", parsed.error.message);
  }
  const { contentRecordName } = parsed.data;
  const now = deps.now();

  // Reading the manifest proves the library exists and finds its default
  // author; writing the status entry proves the caller may write to it,
  // before anything is queued.
  let defaultAuthor: string | null = null;
  try {
    defaultAuthor =
      (await readLibraryManifest(caller.client.store, contentRecordName))
        .defaultAuthor ?? null;
  } catch {
    throw new HttpError(404, "library_not_found");
  }
  const probe = await caller.client.store.recordData(
    contentRecordName,
    CONTENT_IMPORT_STATUS_ADDRESS,
    { status: "starting", updatedAt: now },
    CONTENT_IMPORT_STATUS_MARKER
  );
  if (!probe.success) {
    if (
      probe.errorCode === "not_authorized" ||
      probe.errorCode === "record_not_found"
    ) {
      throw new HttpError(
        403,
        "not_authorized",
        "You can't change this library."
      );
    }
    throw new HttpError(
      502,
      "casualos_unavailable",
      "CasualOS couldn't be reached. Please try again."
    );
  }

  const seen = new Set<string>();
  const items: { itemId: string; input: ImportItemInput }[] = [];
  let skipped = 0;
  for (const input of parsed.data.items) {
    const key = normalizeContentUrl(input.url);
    if (!key || seen.has(key)) {
      skipped++;
      continue;
    }
    seen.add(key);
    items.push({ itemId: `item_${crypto.randomUUID()}`, input });
  }
  if (items.length === 0) {
    throw new HttpError(
      400,
      "nothing_to_import",
      "None of the links can be imported."
    );
  }

  const jobId = `import_${crypto.randomUUID()}`;
  try {
    await createJob(
      env.DB,
      {
        id: jobId,
        user_id: caller.userId,
        content_record_name: contentRecordName,
        session_key_enc: await encryptSessionKey(
          caller.sessionKey,
          env.SESSION_KEY_SECRET
        ),
        default_author: defaultAuthor,
        total: items.length,
        skipped,
        created_at: now,
        expires_at: now + JOB_LIFETIME_MS,
      },
      items
    );
  } catch (error) {
    if (isActiveImportConflict(error)) {
      const running = await findActiveJob(env.DB, contentRecordName);
      throw new HttpError(
        409,
        "import_running",
        "This library already has an import running.",
        {
          jobId: running?.id,
        }
      );
    }
    throw error;
  }
  await enqueue(
    env,
    jobId,
    items.map((item) => item.itemId)
  );
  const job = await getJob(env.DB, jobId);
  return { body: await jobProgress(env.DB, job!), status: 201 };
}

async function route(
  request: Request,
  env: Env,
  deps: WorkerDeps
): Promise<{ body: unknown; status: number }> {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "");
  const caller = await authenticate(request, env, deps);
  const now = deps.now();

  if (request.method === "POST" && path === "/imports") {
    return startImport(request, env, deps, caller);
  }

  if (request.method === "GET" && path === "/imports") {
    const record = url.searchParams.get("contentRecordName");
    if (!record) {
      throw new HttpError(
        400,
        "invalid_request",
        "contentRecordName is required."
      );
    }
    const job = await findActiveJob(env.DB, record);
    return {
      body:
        job && job.user_id === caller.userId
          ? await jobProgress(env.DB, job)
          : null,
      status: 200,
    };
  }

  const match = path.match(/^\/imports\/([^/]+)(?:\/(cancel|resume))?$/);
  if (match) {
    const job = await ownJob(env, caller, decodeURIComponent(match[1]!));
    const action = match[2];
    if (request.method === "GET" && !action) {
      return { body: await jobProgress(env.DB, job), status: 200 };
    }
    if (request.method === "POST" && action === "cancel") {
      if (
        await setJobStatus(
          env.DB,
          job.id,
          ["running", "paused_signin"],
          "cancelled",
          now,
          {
            clearKey: true,
          }
        )
      ) {
        const cancelled = (await getJob(env.DB, job.id))!;
        await writeImportStatus(
          caller.client.store,
          await jobProgress(env.DB, cancelled),
          now
        );
      }
      return {
        body: await jobProgress(env.DB, (await getJob(env.DB, job.id))!),
        status: 200,
      };
    }
    if (request.method === "POST" && action === "resume") {
      if (job.status !== "paused_signin") {
        throw new HttpError(409, "not_paused", "This import isn't paused.");
      }
      const resumed = await setJobStatus(
        env.DB,
        job.id,
        ["paused_signin"],
        "running",
        now,
        {
          sessionKeyEnc: await encryptSessionKey(
            caller.sessionKey,
            env.SESSION_KEY_SECRET
          ),
        }
      );
      if (resumed) {
        await enqueue(env, job.id, await queuedItemIds(env.DB, job.id));
      }
      return {
        body: await jobProgress(env.DB, (await getJob(env.DB, job.id))!),
        status: 200,
      };
    }
  }

  if (request.method === "POST" && path === "/publish") {
    const parsed = publishRequestSchema.safeParse(await readBody(request));
    if (!parsed.success) {
      throw new HttpError(400, "invalid_request", parsed.error.message);
    }
    const writer = env.LIBRARY_WRITER.get(
      env.LIBRARY_WRITER.idFromName(parsed.data.contentRecordName)
    );
    const response = await writer.fetch(
      new Request("https://library-writer/publish", {
        method: "POST",
        body: JSON.stringify({
          ...parsed.data,
          sessionKey: caller.sessionKey,
        }),
      })
    );
    return { body: await response.json(), status: response.status };
  }

  throw new HttpError(404, "not_found");
}

/** The worker's HTTP API. Every route acts as the caller, checked with CasualOS first. */
export async function handleRequest(
  request: Request,
  env: Env,
  deps: WorkerDeps
): Promise<Response> {
  const origin = allowedOrigin(request, env);
  // Calls from a page carry an Origin; only the app's own may use the API.
  if (request.headers.get("Origin") && !origin) {
    return json({ error: "origin_not_allowed" }, 403, null);
  }
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }
  try {
    const { body, status } = await route(request, env, deps);
    return json(body, status, origin);
  } catch (error) {
    if (error instanceof HttpError) {
      return json(
        { error: error.code, message: error.message, ...error.extra },
        error.status,
        origin
      );
    }
    console.error("Content import API failed:", error);
    return json({ error: "server_error" }, 500, origin);
  }
}
