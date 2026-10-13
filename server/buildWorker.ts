/**
 * Runs one build's SSR bundle in its own worker thread, so the bundle's memory
 * can be released (by terminating the worker) once the build is no longer
 * served. See `ssrWorker.ts` for why it can't simply be imported here.
 */
import { Worker } from "node:worker_threads";
import type { BrandingConfig } from "@packages/seed-bible/seed-bible/app/appConfig";
import type {
  SerializedError,
  WorkerData,
  WorkerMessage,
  WorkerRenderRequest,
} from "./ssrWorker";

export type RenderFn = (opts: {
  path: string;
  config: {
    basePath: string;
    assetHost: string;
    renderedAsMobile: boolean;
    renderedAsWebKit: boolean;
    acceptedLanguages: string[];
    branding?: BrandingConfig;
  };
  html: string;
}) => Promise<
  | { html: string; notFound?: true }
  | { redirectTo: string; redirectStatus?: number; vary?: string }
  | string
>;

type RenderResult = Awaited<ReturnType<RenderFn>>;

export interface BuildWorker {
  render: RenderFn;
  /**
   * Marks the worker as in use until the returned function is called, so
   * `retire()` can't stop it before the holder gets to render. Returns null if
   * the worker is already stopping. Releasing twice is harmless.
   */
  acquire(): (() => void) | null;
  /**
   * Stops the worker once nothing holds it and no render is in flight on it,
   * releasing the build's memory. A holder that never lets go is cut off after
   * a grace period of twice the timeout. Safe to call more than once.
   */
  retire(): void;
}

export interface StartBuildWorkerOptions {
  /** Local path of the build's SSR bundle. */
  modulePath: string;
  /** Bounds both the bundle's initial load and each render. */
  timeoutMs: number;
  /**
   * Called once the worker has exited, whether retired or crashed, so the
   * caller can stop handing it out.
   */
  onExit?: () => void;
  /** Overrides the worker entry; tests only. */
  workerUrl?: URL;
}

// Built alongside `index.js` as its own entry point (see the Dockerfile and
// `build:server`); from source it is the .ts file next to this one.
const DEFAULT_WORKER_URL = new URL(
  import.meta.url.endsWith(".ts") ? "./ssrWorker.ts" : "./ssrWorker.js",
  import.meta.url
);

function toError(serialized: SerializedError): Error {
  const err = new Error(serialized.message);
  if (serialized.name) err.name = serialized.name;
  if (serialized.stack) err.stack = serialized.stack;
  return err;
}

interface PendingRender {
  resolve: (result: RenderResult) => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

/**
 * Starts a worker for the bundle at `modulePath` and resolves once the bundle
 * has loaded. Rejects (and stops the worker) if the bundle fails to load,
 * doesn't export `render()`, or takes longer than `timeoutMs`.
 */
export function startBuildWorker({
  modulePath,
  timeoutMs,
  onExit,
  workerUrl = DEFAULT_WORKER_URL,
}: StartBuildWorkerOptions): Promise<BuildWorker> {
  const worker = new Worker(workerUrl, {
    workerData: { modulePath } satisfies WorkerData,
  });

  const pending = new Map<number, PendingRender>();
  let nextId = 0;
  let holders = 0;
  let retired = false;
  let terminating = false;
  let retireGraceTimer: ReturnType<typeof setTimeout> | undefined;

  const terminate = () => {
    if (terminating) return;
    terminating = true;
    void worker.terminate();
  };

  const terminateIfDrained = () => {
    if (retired && holders === 0 && pending.size === 0) terminate();
  };

  const settle = (id: number, settleWith: (p: PendingRender) => void) => {
    const entry = pending.get(id);
    if (!entry) return;
    pending.delete(id);
    clearTimeout(entry.timer);
    settleWith(entry);
    terminateIfDrained();
  };

  const render: RenderFn = (opts) => {
    if (terminating) {
      return Promise.reject(new Error("SSR worker has been stopped"));
    }
    const id = nextId++;
    return new Promise<RenderResult>((resolve, reject) => {
      // The render keeps running in the worker; its late result is dropped.
      const timer = setTimeout(
        () =>
          settle(id, (p) =>
            p.reject(new Error(`SSR render timed out after ${timeoutMs}ms`))
          ),
        timeoutMs
      );
      pending.set(id, { resolve, reject, timer });
      worker.postMessage({
        type: "render",
        id,
        opts,
      } satisfies WorkerRenderRequest);
    });
  };

  const handle: BuildWorker = {
    render,
    acquire: () => {
      if (terminating) return null;
      holders++;
      let released = false;
      return () => {
        if (released) return;
        released = true;
        holders--;
        terminateIfDrained();
      };
    },
    retire: () => {
      if (retired) return;
      retired = true;
      // Renders are bounded by the timeout, but a holder can also be waiting
      // on something unbounded (an S3 read for a pinned build's HTML).
      retireGraceTimer = setTimeout(terminate, timeoutMs * 2);
      retireGraceTimer.unref?.();
      terminateIfDrained();
    },
  };

  return new Promise<BuildWorker>((resolve, reject) => {
    const loadTimer = setTimeout(() => {
      reject(new Error(`SSR bundle took over ${timeoutMs}ms to load`));
      terminate();
    }, timeoutMs);

    worker.on("message", (message: WorkerMessage) => {
      switch (message.type) {
        case "ready":
          clearTimeout(loadTimer);
          resolve(handle);
          return;
        case "load-error":
          clearTimeout(loadTimer);
          reject(toError(message.error));
          terminate();
          return;
        case "result":
          settle(message.id, (p) => p.resolve(message.result as RenderResult));
          return;
        case "render-error":
          settle(message.id, (p) => p.reject(toError(message.error)));
          return;
      }
    });

    // Always followed by "exit", which does the cleanup.
    worker.on("error", (err) => {
      console.error(`SSR worker for ${modulePath} crashed:`, err);
    });

    worker.on("exit", (code) => {
      terminating = true;
      clearTimeout(loadTimer);
      clearTimeout(retireGraceTimer);
      const exitError = new Error(`SSR worker exited with code ${code}`);
      // A no-op once the worker became ready.
      reject(exitError);
      for (const [id] of pending) settle(id, (p) => p.reject(exitError));
      onExit?.();
    });
  });
}
