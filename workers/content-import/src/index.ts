import { handleRequest } from "./api";
import { runCleanup } from "./cleanup";
import { handleQueueBatch } from "./consumer";
import { defaultDeps } from "./deps";
import type { Env, ImportMessage, MessageBatch } from "./platform";

export { CommonCrawlGate } from "./commonCrawlGate";
export { LibraryWriter } from "./libraryWriter";

/** The content import worker. See `README.md` and docs/custom-content-database.md §5.8. */
export default {
  fetch: (request: Request, env: Env) =>
    handleRequest(request, env, defaultDeps),
  queue: (batch: MessageBatch<ImportMessage>, env: Env) =>
    handleQueueBatch(batch, env, defaultDeps),
  scheduled: (_controller: unknown, env: Env) => runCleanup(env, defaultDeps),
};
