import { importItemInputSchema } from "../../../packages/seed-bible/seed-bible/managers/customContent/importApi";
import {
  MAX_CONTENT_DESCRIPTION_LENGTH,
  MAX_CONTENT_TITLE_LENGTH,
  MAX_CONTENT_URL_LENGTH,
  CONTENT_ITEM_MARKER,
  contentItemAddress,
  contentItemSchema,
  type ContentItem,
} from "../../../packages/seed-bible/seed-bible/managers/customContent/schema";
import {
  CasualOSError,
  createCasualOSClient,
  isFatalSessionError,
  isTransientError,
  type CasualOSClient,
} from "./casualos";
import { writeImportStatus } from "./importStatus";
import {
  claimItem,
  finishIfComplete,
  getItem,
  getJob,
  jobProgress,
  releaseItem,
  setJobStatus,
  settleItem,
  type ItemRow,
  type JobRow,
} from "./jobs";
import type { Env, ImportMessage, MessageBatch } from "./platform";
import { decryptSessionKey } from "./sessionKeys";
import type { WorkerDeps } from "./deps";

/** How long a link waits before trying again when its import's slots are all taken. */
const SLOT_WAIT_SECONDS = 10;

export type MessageOutcome =
  /** Finished with, one way or another. */
  | { kind: "ack" }
  /** Failed for a passing reason: try again later, counting towards the retry limit. */
  | { kind: "retry"; delaySeconds: number }
  /** Not started (no free slot): send again later, without counting it as a failure. */
  | { kind: "later"; delaySeconds: number };

const ACK: MessageOutcome = { kind: "ack" };

function retryDelay(attempts: number): number {
  return Math.min(30 * 2 ** Math.max(attempts - 1, 0), 15 * 60);
}

function clip(value: string | undefined, max: number): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed.slice(0, max) : undefined;
}

function safeImageUrl(value: string | undefined): string | undefined {
  if (!value || value.length > MAX_CONTENT_URL_LENGTH) {
    return undefined;
  }
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Fills in one link and saves it to the library as an item for the owner to
 * review. What the owner supplied (a CSV's title, categories, passages)
 * wins over the page's own details. An item that already exists, because an
 * earlier attempt saved it or the owner has since edited it, is left alone.
 */
async function importOne(
  client: CasualOSClient,
  job: JobRow,
  row: ItemRow,
  now: number
): Promise<void> {
  const input = importItemInputSchema.parse(JSON.parse(row.input));
  const record = job.content_record_name;
  const address = contentItemAddress(row.item_id);

  const existing = await client.store.getData(record, address);
  if (existing.success) {
    return;
  }
  if (existing.errorCode !== "data_not_found") {
    throw new CasualOSError(existing.errorCode, "Couldn't check the item.");
  }

  const preview = await client.getLinkPreview(input.url);
  const author = clip(input.author ?? job.default_author ?? undefined, 200);
  const image = safeImageUrl(preview?.imageUrl);
  const item: ContentItem = contentItemSchema.parse({
    id: row.item_id,
    url: input.url,
    status: "needs_review",
    title: clip(input.title ?? preview?.title, MAX_CONTENT_TITLE_LENGTH) ?? "",
    description:
      clip(
        input.description ?? preview?.description,
        MAX_CONTENT_DESCRIPTION_LENGTH
      ) ?? "",
    ...(image ? { image } : {}),
    ...(author ? { author } : {}),
    categoryIds: input.categoryIds ?? [],
    references: input.references ?? [],
    createdAt: now,
    updatedAt: now,
  });

  const saved = await client.store.recordData(
    record,
    address,
    item,
    CONTENT_ITEM_MARKER
  );
  if (!saved.success) {
    throw new CasualOSError(saved.errorCode, "Couldn't save the item.");
  }
}

async function finishJob(
  env: Env,
  client: CasualOSClient,
  job: JobRow,
  now: number
): Promise<void> {
  if (await finishIfComplete(env.DB, job.id, now)) {
    const finished = await getJob(env.DB, job.id);
    if (finished) {
      await writeImportStatus(
        client.store,
        await jobProgress(env.DB, finished),
        now
      );
    }
  }
}

/** Works on one link of an import. Never throws: every failure becomes an outcome. */
export async function processImportMessage(
  env: Env,
  deps: WorkerDeps,
  message: ImportMessage,
  attempts: number
): Promise<MessageOutcome> {
  const now = deps.now();
  const job = await getJob(env.DB, message.jobId);
  // Paused imports re-send their queued links when they resume; cancelled
  // and expired ones are over. Either way this message has nothing to do.
  if (!job || job.status !== "running" || !job.session_key_enc) {
    return ACK;
  }
  const row = await getItem(env.DB, message.jobId, message.itemId);
  if (!row || row.state === "done" || row.state === "failed") {
    return ACK;
  }
  if (!(await claimItem(env.DB, job.id, row.item_id, now))) {
    const current = await getItem(env.DB, job.id, row.item_id);
    // Still queued means every slot was taken. Running means another
    // delivery of this same message has it.
    return current?.state === "queued"
      ? { kind: "later", delaySeconds: SLOT_WAIT_SECONDS }
      : ACK;
  }

  const sessionKey = await decryptSessionKey(
    job.session_key_enc,
    env.SESSION_KEY_SECRET
  );
  const client = createCasualOSClient(
    env.CASUALOS_ENDPOINT,
    sessionKey,
    deps.fetch
  );

  try {
    await importOne(client, job, row, now);
    await settleItem(env.DB, job.id, row.item_id, { state: "done" });
  } catch (error) {
    const code =
      error instanceof CasualOSError
        ? error.code
        : error instanceof SyntaxError || (error as Error)?.name === "ZodError"
          ? "invalid_item"
          : "server_error";
    if (isFatalSessionError(code)) {
      // Never retry with a dead key: pause, and let the owner sign in again.
      await releaseItem(env.DB, job.id, row.item_id);
      await setJobStatus(env.DB, job.id, ["running"], "paused_signin", now, {
        clearKey: true,
      });
      return ACK;
    }
    if (isTransientError(code)) {
      await releaseItem(env.DB, job.id, row.item_id);
      return { kind: "retry", delaySeconds: retryDelay(attempts) };
    }
    await settleItem(env.DB, job.id, row.item_id, {
      state: "failed",
      error: code,
    });
  }

  await finishJob(env, client, job, now);
  return ACK;
}

/**
 * A link that ran out of retries: marks it failed with the reason, so
 * nothing disappears silently, and finishes the import if it was the last.
 */
export async function processDeadLetter(
  env: Env,
  deps: WorkerDeps,
  message: ImportMessage
): Promise<void> {
  const now = deps.now();
  const row = await getItem(env.DB, message.jobId, message.itemId);
  if (!row || row.state === "done" || row.state === "failed") {
    return;
  }
  await settleItem(env.DB, message.jobId, message.itemId, {
    state: "failed",
    error: "gave_up_after_retries",
  });
  const job = await getJob(env.DB, message.jobId);
  if (!job?.session_key_enc) {
    return;
  }
  const sessionKey = await decryptSessionKey(
    job.session_key_enc,
    env.SESSION_KEY_SECRET
  );
  await finishJob(
    env,
    createCasualOSClient(env.CASUALOS_ENDPOINT, sessionKey, deps.fetch),
    job,
    now
  );
}

/** The queue handler: links from the import queue, or from its dead-letter queue. */
export async function handleQueueBatch(
  batch: MessageBatch<ImportMessage>,
  env: Env,
  deps: WorkerDeps
): Promise<void> {
  const deadLetters = batch.queue === (env.DEAD_LETTER_QUEUE ?? "");
  await Promise.all(
    batch.messages.map(async (message) => {
      try {
        if (deadLetters) {
          await processDeadLetter(env, deps, message.body);
          message.ack();
          return;
        }
        const outcome = await processImportMessage(
          env,
          deps,
          message.body,
          message.attempts
        );
        if (outcome.kind === "retry") {
          message.retry({ delaySeconds: outcome.delaySeconds });
        } else if (outcome.kind === "later") {
          // A fresh message, so waiting for a slot doesn't use up retries.
          await env.IMPORT_QUEUE.send(message.body, {
            delaySeconds: outcome.delaySeconds,
          });
          message.ack();
        } else {
          message.ack();
        }
      } catch (error) {
        console.error("Content import message failed:", error);
        message.retry({ delaySeconds: retryDelay(message.attempts) });
      }
    })
  );
}
