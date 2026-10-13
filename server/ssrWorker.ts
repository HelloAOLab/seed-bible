/**
 * Worker-thread entry that hosts one build's SSR bundle (see `buildWorker.ts`).
 *
 * An imported ES module can never be unloaded, so a bundle imported on the
 * host's main thread stays in memory for the life of the process — and every
 * deploy adds another. Importing it in a worker instead lets the host free the
 * whole bundle by terminating the worker.
 *
 * Node runs this file directly in tests (type stripping), so it must stay
 * plain erasable TypeScript with no local imports.
 */
import { parentPort, workerData } from "node:worker_threads";
import { pathToFileURL } from "node:url";

export interface SerializedError {
  name?: string;
  message: string;
  stack?: string;
}

export interface WorkerRenderRequest {
  type: "render";
  id: number;
  opts: unknown;
}

export type WorkerMessage =
  | { type: "ready" }
  | { type: "load-error"; error: SerializedError }
  | { type: "result"; id: number; result: unknown }
  | { type: "render-error"; id: number; error: SerializedError };

export interface WorkerData {
  modulePath: string;
}

function serializeError(err: unknown): SerializedError {
  if (err instanceof Error) {
    return { name: err.name, message: err.message, stack: err.stack };
  }
  return { message: String(err) };
}

const port = parentPort;
if (port) {
  // An unhandled rejection would otherwise kill the worker and every render
  // in flight on it. A stray background rejection from the app (a fetch
  // nobody awaited) shouldn't take the build down.
  process.on("unhandledRejection", (reason) => {
    console.error("Unhandled rejection in SSR worker:", reason);
  });

  const send = (message: WorkerMessage) => port.postMessage(message);
  const { modulePath } = workerData as WorkerData;

  try {
    const mod = (await import(pathToFileURL(modulePath).href)) as {
      render?: (opts: unknown) => Promise<unknown>;
    };
    const render = mod.render;
    if (typeof render !== "function") {
      throw new Error(`SSR bundle ${modulePath} does not export render()`);
    }

    port.on("message", (request: WorkerRenderRequest) => {
      render(request.opts).then(
        (result) => send({ type: "result", id: request.id, result }),
        (err: unknown) =>
          send({
            type: "render-error",
            id: request.id,
            error: serializeError(err),
          })
      );
    });
    send({ type: "ready" });
  } catch (err) {
    send({ type: "load-error", error: serializeError(err) });
  }
}
