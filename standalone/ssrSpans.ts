import { SpanStatusCode, trace, type Span } from "@opentelemetry/api";

/*
 * Talks to `@opentelemetry/api` directly rather than reusing `withSpan` from
 * `server/telemetry.ts`: this file ships inside each branch's SSR bundle,
 * which carries its own bundled copy of everything it imports, so module
 * state in `server/telemetry.ts` (its `tracer`, its `enabled` flag) would be
 * a separate, never-initialized copy here. The API package keeps its
 * registered provider and context manager on `globalThis` instead, so these
 * spans reach the server's exporter and nest under its active `ssr.render`
 * span. With no provider registered (telemetry off, or tests) every call
 * below is a no-op.
 *
 * The tracer is looked up per span, not once at module load: a tracer taken
 * from the API before or across a provider being (re)registered stays bound
 * to whichever provider it first resolved, so spans would go to a dead one.
 */
function startSpan(name: string): Span {
  return trace.getTracer("seed-bible-ssr-render").startSpan(name);
}

function endSpan(span: Span, err?: unknown): void {
  if (err !== undefined) {
    span.recordException(err as Error);
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: err instanceof Error ? err.message : String(err),
    });
  }
  span.end();
}

/**
 * Times how long the render spends waiting on an already-started promise.
 * The span covers only the wait, starting now, not when the work began.
 * Nothing to wait on (`undefined`) records no span, so the trace shows only
 * the waits that actually happened.
 */
export function traceWait<T>(
  name: string,
  promise: Promise<T> | undefined
): Promise<T> | undefined {
  if (!promise) {
    return promise;
  }
  const span = startSpan(name);
  return promise.then(
    (value) => {
      endSpan(span);
      return value;
    },
    (err: unknown) => {
      endSpan(span, err);
      throw err;
    }
  );
}

/**
 * Times a step from the moment it is called, including any synchronous work
 * it does before handing back its promise.
 */
export async function traceStep<T>(
  name: string,
  fn: () => T | Promise<T>
): Promise<T> {
  const span = startSpan(name);
  try {
    const value = await fn();
    endSpan(span);
    return value;
  } catch (err) {
    endSpan(span, err);
    throw err;
  }
}
