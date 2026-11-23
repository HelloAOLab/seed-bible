import { MAX_RUNNING_PER_JOB } from "./jobs";
import type { Env, ImportMessage } from "./platform";

/** Messages per `sendBatch`, the queue's own limit. */
const MESSAGES_PER_SEND = 100;

/** The queue refused or couldn't be reached, so nothing will run the work. */
export class QueueSendError extends Error {
  constructor(cause: unknown) {
    super(`Couldn't queue the work: ${String(cause)}`);
    this.name = "QueueSendError";
  }
}

/** Sends messages, throwing a {@link QueueSendError} if the queue fails. */
export async function sendAll<T>(
  queue: { sendBatch(messages: { body: T }[]): Promise<unknown> },
  bodies: readonly T[]
): Promise<void> {
  try {
    for (let i = 0; i < bodies.length; i += MESSAGES_PER_SEND) {
      await queue.sendBatch(
        bodies.slice(i, i + MESSAGES_PER_SEND).map((body) => ({ body }))
      );
    }
  } catch (error) {
    throw new QueueSendError(error);
  }
}

/**
 * Gets an import's links going: one message per slot, each of which works
 * through the links one at a time (see `processImportMessage`). Queuing a
 * message per link instead had every link waiting for a slot re-sent every
 * few seconds, and each send counts towards the queue's daily limit.
 */
export async function startLinks(
  env: Env,
  jobId: string,
  waitingLinks: number
): Promise<void> {
  await sendAll<ImportMessage>(
    env.IMPORT_QUEUE,
    Array.from({ length: Math.min(waitingLinks, MAX_RUNNING_PER_JOB) }, () => ({
      jobId,
    }))
  );
}
