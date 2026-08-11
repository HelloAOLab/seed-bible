/**
 * OpenTelemetry tracing + metrics for the SSR host server.
 *
 * ## Why this is all hand-written
 *
 * The usual advice — install `@opentelemetry/auto-instrumentations-node` and
 * call `NodeSDK.start()` — does not work for this server. Auto-instrumentation
 * works by intercepting module loads and swapping in patched copies of `http`,
 * `express`, and friends. That fails here twice over:
 *
 *  1. Production runs under **Bun** (`Dockerfile`), which does not implement the
 *     `require-in-the-middle` / `import-in-the-middle` hooks those packages need.
 *  2. The server ships as a *single pre-bundled file* (`bun build --outfile`),
 *     so by runtime there are no module loads left to intercept — every
 *     dependency was inlined at build time.
 *
 * So every span here is created explicitly at the call site. Only packages that
 * are pure JS and free of load-time monkey-patching are used.
 *
 * ## Enabling it
 *
 * Telemetry is off unless `OTEL_EXPORTER_OTLP_ENDPOINT` is set (and
 * `OTEL_SDK_DISABLED` is not truthy). When off, `initTelemetry()` registers
 * nothing and every helper below takes a fast path that allocates no spans, so
 * `pnpm dev` and the test suite are unaffected.
 */
import {
  context,
  metrics,
  propagation,
  trace,
  SpanKind,
  SpanStatusCode,
  type Attributes,
  type Context,
  type Counter,
  type Histogram,
  type Meter,
  type Span,
  type SpanOptions,
  type TextMapGetter,
  type Tracer,
} from "@opentelemetry/api";
import {
  BatchSpanProcessor,
  ConsoleSpanExporter,
  SimpleSpanProcessor,
  type SpanExporter,
  type SpanProcessor,
} from "@opentelemetry/sdk-trace-base";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import {
  MeterProvider,
  PeriodicExportingMetricReader,
  type PushMetricExporter,
} from "@opentelemetry/sdk-metrics";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import {
  defaultResource,
  resourceFromAttributes,
} from "@opentelemetry/resources";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";
import type { ArtifactStore, BranchArtifacts, BranchPointer } from "./store";

/** Name reported as the instrumentation scope on every span and metric. */
const SCOPE_NAME = "seed-bible/server";

/**
 * Attribute keys. The stable HTTP/URL conventions are spelled out here rather
 * than imported so this file does not break when the `ATTR_*` constant set is
 * reshuffled between semantic-convention releases — these strings are the
 * stable part of the contract.
 */
const ATTR = {
  httpRequestMethod: "http.request.method",
  httpResponseStatusCode: "http.response.status_code",
  httpRoute: "http.route",
  urlPath: "url.path",
  urlScheme: "url.scheme",
  urlFull: "url.full",
  serverAddress: "server.address",
  clientAddress: "client.address",
  userAgentOriginal: "user_agent.original",
  networkProtocolVersion: "network.protocol.version",
  errorType: "error.type",
  deploymentEnvironment: "deployment.environment.name",
} as const;

/** App-specific attributes, namespaced so they never collide with semconv. */
const APP_ATTR = {
  branch: "seedbible.branch",
  buildId: "seedbible.build_id",
  ssrAllowed: "seedbible.ssr_allowed",
  ssrDegraded: "seedbible.ssr.degraded",
  cache: "seedbible.cache",
  cacheResult: "seedbible.cache.result",
  storeOperation: "seedbible.store.operation",
  storeOutcome: "seedbible.store.outcome",
} as const;

export interface Telemetry {
  /** True when an OTLP endpoint was configured and providers were registered. */
  readonly enabled: boolean;
  /**
   * Exports everything buffered so far without shutting anything down. Spans
   * are batched and metrics are pushed on an interval, so this is what makes
   * either observable on demand. Safe to call when disabled.
   */
  forceFlush(): Promise<void>;
  /** Flushes and shuts down both providers. Safe to call when disabled. */
  shutdown(): Promise<void>;
}

export interface InitTelemetryOptions {
  /**
   * Branches that may appear verbatim in *metric* attributes. Any other branch
   * collapses to `"other"` — see {@link branchLabel}.
   */
  allowedBranches?: ReadonlySet<string>;
  /** Reported as a resource attribute, for grouping deployments. */
  rootBranch?: string;
  /**
   * Sends telemetry somewhere other than an OTLP endpoint. Supplying this also
   * switches telemetry on, so tests can exercise the real provider/exporter
   * wiring against in-process exporters instead of only the disabled fast path.
   */
  exporters?: {
    traces: SpanExporter;
    metrics: PushMetricExporter;
  };
}

interface Instruments {
  httpDuration: Histogram;
  renderDuration: Histogram;
  renderFailures: Counter;
  cacheLookups: Counter;
  storeDuration: Histogram;
  assetProxyDuration: Histogram;
}

// ─── Module state ────────────────────────────────────────────────────────────
//
// The tracer and instruments must be created *after* the providers are
// registered. The OpenTelemetry API hands out permanently no-op objects to
// anyone who asks before registration, so these start empty and are filled in
// by initTelemetry().

let enabled = false;
let tracer: Tracer | null = null;
let instruments: Instruments | null = null;
let branchAllowlist: ReadonlySet<string> = new Set();

const DISABLED: Telemetry = {
  enabled: false,
  async forceFlush() {},
  async shutdown() {},
};

/** Treats "1", "true", "yes" (any case) as on. */
function isTruthyEnv(value: string | undefined): boolean {
  if (!value) return false;
  const v = value.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

/**
 * Starts the OpenTelemetry SDK, or returns a disabled handle when no OTLP
 * endpoint is configured. Call once, before the server starts listening.
 *
 * Endpoints, headers, sampling and export intervals are read from the standard
 * `OTEL_*` environment variables by the SDK itself — see `server/README.md`.
 */
export function initTelemetry(options: InitTelemetryOptions = {}): Telemetry {
  branchAllowlist = options.allowedBranches ?? new Set();

  const injected = options.exporters;
  const endpoint =
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT ??
    process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT;

  if ((!endpoint && !injected) || isTruthyEnv(process.env.OTEL_SDK_DISABLED)) {
    enabled = false;
    return DISABLED;
  }

  const resource = defaultResource().merge(
    resourceFromAttributes({
      [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME ?? "seed-bible-ssr",
      [ATTR_SERVICE_VERSION]: process.env.APP_VERSION ?? "unknown",
      [ATTR.deploymentEnvironment]: process.env.NODE_ENV ?? "development",
      ...(options.rootBranch
        ? { "seedbible.root_branch": options.rootBranch }
        : {}),
    })
  );

  const spanProcessors: SpanProcessor[] = [
    new BatchSpanProcessor(injected?.traces ?? new OTLPTraceExporter()),
  ];
  // Local debugging aid: print spans to stdout as well, so span shape can be
  // checked without standing up a collector.
  if (isTruthyEnv(process.env.OTEL_DEBUG_CONSOLE)) {
    spanProcessors.push(new SimpleSpanProcessor(new ConsoleSpanExporter()));
  }

  const tracerProvider = new NodeTracerProvider({ resource, spanProcessors });
  // register() installs the AsyncLocalStorage context manager (which Bun does
  // support) and the W3C trace-context propagator.
  tracerProvider.register();

  // PeriodicExportingMetricReader does not read OTEL_METRIC_EXPORT_INTERVAL
  // itself (it just defaults to 60s), so honour the standard variable here.
  const exportInterval = Number(process.env.OTEL_METRIC_EXPORT_INTERVAL);
  const meterProvider = new MeterProvider({
    resource,
    readers: [
      new PeriodicExportingMetricReader({
        exporter: injected?.metrics ?? new OTLPMetricExporter(),
        ...(Number.isFinite(exportInterval) && exportInterval > 0
          ? { exportIntervalMillis: exportInterval }
          : {}),
      }),
    ],
  });
  metrics.setGlobalMeterProvider(meterProvider);

  tracer = trace.getTracer(SCOPE_NAME);
  instruments = createInstruments(metrics.getMeter(SCOPE_NAME));
  enabled = true;

  return {
    enabled: true,
    async forceFlush() {
      await Promise.allSettled([
        tracerProvider.forceFlush(),
        meterProvider.forceFlush(),
      ]);
    },
    async shutdown() {
      enabled = false;
      tracer = null;
      instruments = null;
      await Promise.allSettled([
        tracerProvider.shutdown(),
        meterProvider.shutdown(),
      ]);
      // Unregister what register() installed, so shutdown is a true inverse of
      // init. The OpenTelemetry API ignores a second attempt to set a global
      // provider, so without this a later initTelemetry() would silently keep
      // using the dead providers instead of the new ones.
      trace.disable();
      metrics.disable();
      propagation.disable();
      context.disable();
    },
  };
}

function createInstruments(meter: Meter): Instruments {
  meter
    .createObservableGauge("seedbible.process.memory", {
      description: "Resident and heap memory used by the server process",
      unit: "By",
    })
    .addCallback((result) => {
      const usage = process.memoryUsage();
      result.observe(usage.rss, { type: "rss" });
      result.observe(usage.heapUsed, { type: "heap_used" });
      result.observe(usage.heapTotal, { type: "heap_total" });
    });

  return {
    httpDuration: meter.createHistogram("http.server.request.duration", {
      description: "Duration of inbound HTTP requests",
      unit: "s",
    }),
    renderDuration: meter.createHistogram("seedbible.ssr.render.duration", {
      description: "Duration of the SSR render() call",
      unit: "s",
    }),
    renderFailures: meter.createCounter("seedbible.ssr.render.failures", {
      description:
        "Renders that threw and fell back to serving un-rendered HTML",
    }),
    cacheLookups: meter.createCounter("seedbible.cache.lookups", {
      description: "Pointer / module / HTML cache lookups by outcome",
    }),
    storeDuration: meter.createHistogram("seedbible.store.operation.duration", {
      description: "Duration of artifact store reads",
      unit: "s",
    }),
    assetProxyDuration: meter.createHistogram(
      "seedbible.asset_proxy.duration",
      {
        description: "Duration of upstream fetches made by the asset proxy",
        unit: "s",
      }
    ),
  };
}

// ─── Label helpers ───────────────────────────────────────────────────────────

/**
 * Collapses a request path into one of a fixed set of route labels.
 *
 * Metric attributes must come from a bounded set, so the raw path (which
 * contains branch names and build ids) can never be used directly.
 */
export function routeLabel(pathname: string): string {
  if (pathname === "/healthz") return "/healthz";
  if (pathname.startsWith("/__invalidate")) return "/__invalidate";

  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] === "b" && segments.length >= 2) {
    return segments.length >= 3 ? "/b/:branch/:buildId" : "/b/:branch";
  }
  return "/";
}

/**
 * Returns the branch name only if it is one we server-side render; anything
 * else becomes `"other"`.
 *
 * Any branch can be deployed and requested, so using the raw name as a metric
 * attribute would be unbounded cardinality — enough to overwhelm a metrics
 * backend. Spans are not aggregated, so they keep the real branch name.
 */
export function branchLabel(branch: string): string {
  return branchAllowlist.has(branch) ? branch : "other";
}

/** Test seam: sets the allowlist {@link branchLabel} consults. */
export function setBranchAllowlistForTesting(
  allowed: ReadonlySet<string>
): void {
  branchAllowlist = allowed;
}

// ─── Span helpers ────────────────────────────────────────────────────────────

/** Flattens the `string | string[]` shape of Node request headers. */
const headerGetter: TextMapGetter<
  Record<string, string | string[] | undefined>
> = {
  keys(carrier) {
    return Object.keys(carrier);
  },
  get(carrier, key) {
    const value = carrier[key.toLowerCase()];
    return Array.isArray(value) ? value[0] : value;
  },
};

/**
 * Extracts a `traceparent` from inbound request headers so a trace started by a
 * CDN or load balancer continues here instead of starting over.
 */
export function extractContext(
  headers: Record<string, string | string[] | undefined>
): Context {
  if (!enabled) return context.active();
  return propagation.extract(context.active(), headers, headerGetter);
}

/**
 * Runs `fn` inside a span, recording any thrown error and always ending the
 * span. When telemetry is disabled this calls `fn` directly — no span is
 * allocated.
 */
export async function withSpan<T>(
  name: string,
  options: SpanOptions & { parent?: Context },
  fn: (span: Span) => Promise<T>
): Promise<T> {
  const activeTracer = tracer;
  if (!enabled || !activeTracer) {
    return fn(trace.getSpan(context.active()) ?? NOOP_SPAN);
  }

  const { parent, ...spanOptions } = options;
  return activeTracer.startActiveSpan(
    name,
    spanOptions,
    parent ?? context.active(),
    async (span) => {
      try {
        return await fn(span);
      } catch (err) {
        recordError(span, err);
        throw err;
      } finally {
        span.end();
      }
    }
  );
}

/** Marks a span as failed and attaches the error. */
export function recordError(span: Span, err: unknown): void {
  span.recordException(err as Error);
  span.setStatus({
    code: SpanStatusCode.ERROR,
    message: err instanceof Error ? err.message : String(err),
  });
  span.setAttribute(
    ATTR.errorType,
    err instanceof Error ? err.name : typeof err
  );
}

/** The span for the request currently being handled, if any. */
export function activeSpan(): Span | undefined {
  return trace.getSpan(context.active());
}

/** Stand-in handed to callers when telemetry is off, so `fn` needs no null checks. */
const NOOP_SPAN = trace.wrapSpanContext({
  traceId: "00000000000000000000000000000000",
  spanId: "0000000000000000",
  traceFlags: 0,
});

// ─── Recording helpers ───────────────────────────────────────────────────────

/** Seconds elapsed since a `performance.now()` reading. */
function secondsSince(startMs: number): number {
  return (performance.now() - startMs) / 1000;
}

export function recordHttpRequest(
  startMs: number,
  attributes: {
    method: string;
    statusCode: number;
    route: string;
    branch: string;
  }
): void {
  instruments?.httpDuration.record(secondsSince(startMs), {
    [ATTR.httpRequestMethod]: attributes.method,
    [ATTR.httpResponseStatusCode]: attributes.statusCode,
    [ATTR.httpRoute]: attributes.route,
    [APP_ATTR.branch]: branchLabel(attributes.branch),
  });
}

export function recordRender(
  startMs: number,
  branch: string,
  failed: boolean
): void {
  const attrs: Attributes = { [APP_ATTR.branch]: branchLabel(branch) };
  instruments?.renderDuration.record(secondsSince(startMs), attrs);
  if (failed) instruments?.renderFailures.add(1, attrs);
}

export type CacheName = "pointer" | "module" | "html";

export function recordCacheLookup(cache: CacheName, hit: boolean): void {
  instruments?.cacheLookups.add(1, {
    [APP_ATTR.cache]: cache,
    [APP_ATTR.cacheResult]: hit ? "hit" : "miss",
  });
}

export function recordAssetProxy(startMs: number, statusCode: number): void {
  instruments?.assetProxyDuration.record(secondsSince(startMs), {
    [ATTR.httpResponseStatusCode]: statusCode,
  });
}

// ─── HTTP span attributes ────────────────────────────────────────────────────

export interface RequestSpanAttributes {
  method: string;
  pathname: string;
  route: string;
  httpVersion: string;
  host: string | undefined;
  clientAddress: string | undefined;
  userAgent: string | undefined;
}

/** Semantic-convention attributes for an inbound request. */
export function requestSpanAttributes(
  attributes: RequestSpanAttributes
): Attributes {
  return {
    [ATTR.httpRequestMethod]: attributes.method,
    [ATTR.httpRoute]: attributes.route,
    [ATTR.urlPath]: attributes.pathname,
    [ATTR.urlScheme]: "http",
    [ATTR.networkProtocolVersion]: attributes.httpVersion,
    ...(attributes.host ? { [ATTR.serverAddress]: attributes.host } : {}),
    ...(attributes.clientAddress
      ? { [ATTR.clientAddress]: attributes.clientAddress }
      : {}),
    ...(attributes.userAgent
      ? { [ATTR.userAgentOriginal]: attributes.userAgent }
      : {}),
  };
}

/** Records the response status on the request span. */
export function setResponseStatus(span: Span, statusCode: number): void {
  span.setAttribute(ATTR.httpResponseStatusCode, statusCode);
  if (statusCode >= 500) {
    span.setStatus({ code: SpanStatusCode.ERROR });
  }
}

/** Flags on the request span that the page was served without SSR content. */
export function markRenderDegraded(): void {
  activeSpan()?.setAttribute(APP_ATTR.ssrDegraded, true);
}

/** Records branch/build attributes on the request span. */
export function setRouteAttributes(
  span: Span,
  branch: string,
  buildId: string | undefined,
  ssrAllowed: boolean
): void {
  // Spans are not aggregated, so the real branch name is safe here.
  span.setAttribute(APP_ATTR.branch, branch);
  span.setAttribute(APP_ATTR.ssrAllowed, ssrAllowed);
  if (buildId) span.setAttribute(APP_ATTR.buildId, buildId);
}

// ─── Express middleware (dev server) ─────────────────────────────────────────

/**
 * The parts of a request/response this middleware touches. Typed structurally
 * so this module does not depend on Express, which is a dev-only dependency and
 * is marked external in the production bundle.
 */
export interface MiddlewareRequest {
  method?: string | undefined;
  originalUrl?: string | undefined;
  url?: string | undefined;
  httpVersion?: string | undefined;
  headers: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string | undefined } | undefined;
}

export interface MiddlewareResponse {
  statusCode: number;
  once(event: string, listener: () => void): unknown;
}

/**
 * Wraps each request in a server span for the dev server's Express chain.
 *
 * `next()` is called *inside* the span's active context, so every span created
 * further down the chain nests under this one. The span ends when the response
 * finishes or the connection closes.
 */
export function expressSpanMiddleware(
  defaultBranch: string
): (req: MiddlewareRequest, res: MiddlewareResponse, next: () => void) => void {
  return (req, res, next) => {
    const target = req.originalUrl ?? req.url ?? "/";
    const pathname = new URL(target, "http://localhost").pathname;
    const method = req.method ?? "GET";
    const route = routeLabel(pathname);
    const start = performance.now();

    // Not awaited — the middleware must return once `next()` has been called.
    // The catch is required: a downstream middleware that throws synchronously
    // instead of calling `next(err)` would otherwise surface as an unhandled
    // promise rejection rather than a logged error.
    void withSpan(
      `${method} ${route}`,
      {
        kind: SpanKind.SERVER,
        parent: extractContext(req.headers),
        attributes: requestSpanAttributes({
          method,
          pathname,
          route,
          httpVersion: req.httpVersion ?? "1.1",
          host:
            typeof req.headers.host === "string" ? req.headers.host : undefined,
          clientAddress: req.socket?.remoteAddress,
          userAgent:
            typeof req.headers["user-agent"] === "string"
              ? req.headers["user-agent"]
              : undefined,
        }),
      },
      async (span) => {
        const finished = new Promise<void>((resolve) => {
          res.once("finish", () => resolve());
          res.once("close", () => resolve());
        });
        next();
        await finished;
        setResponseStatus(span, res.statusCode);
        recordHttpRequest(start, {
          method,
          statusCode: res.statusCode,
          route,
          branch: defaultBranch,
        });
      }
    ).catch((err: unknown) => {
      console.error("Request span failed:", err);
    });
  };
}

// ─── Store instrumentation ───────────────────────────────────────────────────

/**
 * Wraps an {@link ArtifactStore} so every read is traced and timed.
 *
 * Done as a wrapper rather than by editing `store.ts` so one implementation
 * covers all three backends (dev, local filesystem, S3).
 */
export function instrumentStore(
  store: ArtifactStore,
  backend: string
): ArtifactStore {
  async function traced<T>(
    operation: string,
    branch: string,
    buildId: string | undefined,
    run: () => Promise<T>
  ): Promise<T> {
    const start = performance.now();
    let outcome = "ok";
    try {
      return await withSpan(
        `store.${operation}`,
        {
          attributes: {
            [APP_ATTR.storeOperation]: operation,
            [APP_ATTR.branch]: branch,
            ...(buildId ? { [APP_ATTR.buildId]: buildId } : {}),
            "seedbible.store.backend": backend,
          },
        },
        run
      );
    } catch (err) {
      outcome = "error";
      throw err;
    } finally {
      instruments?.storeDuration.record((performance.now() - start) / 1000, {
        [APP_ATTR.storeOperation]: operation,
        "seedbible.store.backend": backend,
        [APP_ATTR.storeOutcome]: outcome,
      });
    }
  }

  return {
    readPointer(branch: string): Promise<BranchPointer | null> {
      return traced("readPointer", branch, undefined, () =>
        store.readPointer(branch)
      );
    },
    fetchArtifacts(branch: string, buildId: string): Promise<BranchArtifacts> {
      return traced("fetchArtifacts", branch, buildId, () =>
        store.fetchArtifacts(branch, buildId)
      );
    },
    fetchHtml(branch: string, buildId: string): Promise<string> {
      return traced("fetchHtml", branch, buildId, () =>
        store.fetchHtml(branch, buildId)
      );
    },
  };
}
