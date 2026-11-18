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

/** Queues one message per link of an import. */
export async function enqueue(
  env: Env,
  jobId: string,
  itemIds: readonly string[]
): Promise<void> {
  await sendAll<ImportMessage>(
    env.IMPORT_QUEUE,
    itemIds.map((itemId) => ({ jobId, itemId }))
  );
}
