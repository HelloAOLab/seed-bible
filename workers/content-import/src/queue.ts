import type { Env, ImportMessage } from "./platform";

/** Messages per `sendBatch`, the queue's own limit. */
const MESSAGES_PER_SEND = 100;

/** Queues one message per link of an import. */
export async function enqueue(
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
