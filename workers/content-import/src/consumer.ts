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
  MAX_ITEM_ATTEMPTS,
  claimNextItem,
  countQueued,
  finishIfComplete,
  getJob,
  gaveUpReason,
  jobProgress,
  releaseItem,
  setJobStatus,
  settleItem,
  type ItemRow,
  type JobRow,
} from "./jobs";
import { ArchiveError, fetchArchivedPage } from "./commonCrawl/warc";
import { trimSiteName } from "../../../packages/seed-bible/seed-bible/managers/customContent/titles";
import { extractPage } from "./commonCrawl/extract";
import { findPageReferences } from "../../../packages/seed-bible/seed-bible/managers/customContent/explicitReferences";
import type {
  Env,
  ImportItemMessage,
  ImportMessage,
  MessageBatch,
} from "./platform";
import { processLookupDeadLetter, processLookupMessage } from "./siteImports";
import { decryptSessionKey } from "./sessionKeys";
import type { WorkerDeps } from "./deps";

export type MessageOutcome =
  /** Finished with, one way or another. */
  | { kind: "ack" }
  /** Failed for a passing reason: try again later, counting towards the retry limit. */
  | { kind: "retry"; delaySeconds: number }
  /**
   * Finished with, and the import has more to do: send a fresh message for
   * it after `delaySeconds`, which doesn't count as a failure.
   */
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
  fetchImpl: typeof fetch,
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

  let details: {
    title?: string;
    siteName?: string;
    description?: string;
    image?: string;
    author?: string;
    mediaUrl?: string;
  } | null;
  let references = input.references;
  let classification: ContentItem["classification"];
  if (input.site) {
    const page = extractPage(
      (await fetchArchivedPage(fetchImpl, input.site)).html,
      input.url
    );
    details = {
      title: page.title,
      siteName: page.siteName,
      description: page.description,
      image: page.image,
      author: page.author,
      mediaUrl: page.mediaUrl,
    };
    // The full text names passages the short description doesn't. It's
    // read here and thrown away; only the passages are kept, as step 1's
    // result, so the editor doesn't redo it from the shorter description.
    if (!references) {
      references = findPageReferences(page);
      classification = { status: "done", at: now };
    }
  } else {
    const preview = await client.getLinkPreview(input.url);
    details = preview && { ...preview, image: preview.imageUrl };
  }
  const author = clip(
    input.author ?? details?.author ?? job.default_author ?? undefined,
    200
  );
  const image = safeImageUrl(details?.image);
  const mediaUrl = safeImageUrl(details?.mediaUrl);
  const item: ContentItem = contentItemSchema.parse({
    id: row.item_id,
    url: input.url,
    status: "needs_review",
    // A title the owner gave is kept as it is; one found on the page loses
    // the site's name, which the author and link already show.
    title:
      clip(
        input.title ??
          (details?.title &&
            trimSiteName(
              details.title,
              [details.siteName, job.default_author],
              input.url
            )),
        MAX_CONTENT_TITLE_LENGTH
      ) ?? "",
    description:
      clip(
        input.description ?? details?.description,
        MAX_CONTENT_DESCRIPTION_LENGTH
      ) ?? "",
    ...(image ? { image } : {}),
    ...(author ? { author } : {}),
    ...(mediaUrl ? { mediaUrl } : {}),
    categoryIds: input.categoryIds ?? [],
    references: references ?? [],
    ...(input.site
      ? {
          origin: {
            kind: "site",
            sourceId: input.site.sourceId,
            crawlId: input.site.crawlId,
            capturedAt: input.site.capturedAt,
          },
        }
      : {}),
    ...(classification ? { classification } : {}),
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

/**
 * Works on an import's next link that's ready, then hands on to a fresh
 * message for the link after it. An import keeps one message per slot this
 * way, however many links it has. A message that finds every slot taken is
 * dropped: the links running will each hand on when they finish.
 *
 * Retries are counted on the link's row rather than by the queue, because
 * the next message may well take a different link. Never throws: every
 * failure becomes an outcome.
 */
export async function processImportMessage(
  env: Env,
  deps: WorkerDeps,
  message: ImportItemMessage
): Promise<MessageOutcome> {
  const now = deps.now();
  const job = await getJob(env.DB, message.jobId);
  // Paused imports start new messages when they resume; cancelled and
  // expired ones are over. Either way this message has nothing to do.
  if (!job || job.status !== "running" || !job.session_key_enc) {
    return ACK;
  }
  const claim = await claimNextItem(env.DB, job.id, now);
  if (claim.kind === "waiting") {
    return {
      kind: "later",
      delaySeconds: Math.max(1, Math.ceil((claim.retryAt - now) / 1000)),
    };
  }
  if (claim.kind !== "claimed") {
    return ACK;
  }
  const row = claim.item;

  const sessionKey = await decryptSessionKey(
    job.session_key_enc,
    env.SESSION_KEY_SECRET
  );
  const client = createCasualOSClient(env, sessionKey, deps.fetch);

  try {
    await importOne(client, deps.fetch, job, row, now);
    await settleItem(env.DB, job.id, row.item_id, { state: "done" });
  } catch (error) {
    const code =
      error instanceof CasualOSError || error instanceof ArchiveError
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
    // An archive failure keeps what the archive answered, so the row says
    // why without the logs.
    const reason =
      error instanceof ArchiveError
        ? `${code}: ${error.message}`.slice(0, 1000)
        : code;
    if (isTransientError(code) && row.attempts < MAX_ITEM_ATTEMPTS) {
      await releaseItem(env.DB, job.id, row.item_id, {
        lastError: reason,
        retryAt: now + retryDelay(row.attempts) * 1000,
      });
    } else {
      await settleItem(env.DB, job.id, row.item_id, {
        state: "failed",
        error: isTransientError(code) ? gaveUpReason(reason) : reason,
      });
    }
  }

  await finishJob(env, client, job, now);
  return (await countQueued(env.DB, job.id)) > 0
    ? { kind: "later", delaySeconds: 0 }
    : ACK;
}

/**
 * The queue handler: links and lookups from the import queue, or from its
 * dead-letter queue. A link's message only gets there after failing
 * unexpectedly five times over; its links are still on their rows, and
 * cleanup restarts the import if no other message carries it on.
 */
export async function handleQueueBatch(
  batch: MessageBatch<ImportMessage>,
  env: Env,
  deps: WorkerDeps
): Promise<void> {
  const deadLetters = batch.queue === (env.DEAD_LETTER_QUEUE ?? "");
  await Promise.all(
    batch.messages.map(async (message) => {
      try {
        const body = message.body;
        if (deadLetters) {
          if (body.kind === "lookup") {
            await processLookupDeadLetter(env, deps, body);
          }
          message.ack();
          return;
        }
        const outcome =
          body.kind === "lookup"
            ? await processLookupMessage(
                env,
                deps,
                body,
                retryDelay(message.attempts)
              )
            : await processImportMessage(env, deps, body);
        if (outcome.kind === "retry") {
          message.retry({ delaySeconds: outcome.delaySeconds });
        } else if (outcome.kind === "later") {
          // A fresh message, so carrying on doesn't use up retries.
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
