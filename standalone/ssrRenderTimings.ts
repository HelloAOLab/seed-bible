/**
 * One timed step of an SSR render, in wall-clock milliseconds since the epoch.
 *
 * The render records plain data rather than OpenTelemetry spans because in
 * production it runs inside a worker thread (`server/ssrWorker.ts`) that has
 * no tracer provider and no access to the host's active `ssr.render` span.
 * `render()` returns these alongside its HTML, and the host turns each one
 * into a child span (`recordRenderTimings` in `server/telemetry.ts`).
 * Wall-clock times are used because each thread has its own
 * `performance.timeOrigin`, so `performance.now()` alone wouldn't line up
 * across the boundary.
 */
export interface RenderTiming {
  name: string;
  startTime: number;
  endTime: number;
  /** Present only when the step failed; plain data so it survives `postMessage`. */
  error?: { name?: string; message: string };
}

function now(): number {
  return performance.timeOrigin + performance.now();
}

function toTimingError(err: unknown): NonNullable<RenderTiming["error"]> {
  return err instanceof Error
    ? { name: err.name, message: err.message }
    : { message: String(err) };
}

export interface RenderTimer {
  /** Every step recorded so far, in the order each one finished. */
  readonly timings: RenderTiming[];
  /**
   * Times how long the render spends waiting on an already-started promise.
   * The timing covers only the wait, starting now, not when the work began.
   * Nothing to wait on (`undefined`) records nothing, so only waits that
   * actually happened show up.
   */
  wait<T>(
    name: string,
    promise: Promise<T> | undefined
  ): Promise<T> | undefined;
  /**
   * Times a step from the moment it is called, including any synchronous work
   * it does before handing back its promise.
   */
  step<T>(name: string, fn: () => T | Promise<T>): Promise<T>;
}

/** A fresh timer per render, so concurrent renders never share timings. */
export function createRenderTimer(): RenderTimer {
  const timings: RenderTiming[] = [];

  const record = (
    name: string,
    startTime: number,
    failure?: { err: unknown }
  ) => {
    timings.push({
      name,
      startTime,
      endTime: now(),
      // A wrapper object rather than `err` itself, so a rejection with no
      // value (`Promise.reject()`) still counts as a failure.
      ...(failure ? { error: toTimingError(failure.err) } : {}),
    });
  };

  return {
    timings,
    wait(name, promise) {
      if (!promise) {
        return promise;
      }
      const startTime = now();
      return promise.then(
        (value) => {
          record(name, startTime);
          return value;
        },
        (err: unknown) => {
          record(name, startTime, { err });
          throw err;
        }
      );
    },
    async step(name, fn) {
      const startTime = now();
      try {
        const value = await fn();
        record(name, startTime);
        return value;
      } catch (err) {
        record(name, startTime, { err });
        throw err;
      }
    },
  };
}
