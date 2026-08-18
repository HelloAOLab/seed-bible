// @vitest-environment node
//
// The suite runs under jsdom globally (see vite.config.ts); this file needs the
// real Node environment because it exercises server-side telemetry helpers.
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { SpanKind, SpanStatusCode } from "@opentelemetry/api";
import { InMemorySpanExporter } from "@opentelemetry/sdk-trace-base";
import {
  AggregationTemporality,
  InMemoryMetricExporter,
  type DataPoint,
  type Histogram as HistogramData,
} from "@opentelemetry/sdk-metrics";
import {
  branchLabel,
  expressSpanMiddleware,
  initTelemetry,
  instrumentStore,
  markRenderDegraded,
  recordCacheLookup,
  recordHttpRequest,
  requestSpanAttributes,
  routeLabel,
  setBranchAllowlistForTesting,
  setResponseStatus,
  withSpan,
  type MiddlewareRequest,
  type MiddlewareResponse,
  type Telemetry,
} from "../../../server/telemetry";
import type {
  ArtifactStore,
  BranchArtifacts,
  BranchPointer,
} from "../../../server/store";

describe("routeLabel", () => {
  it("maps each request shape to a bounded label", () => {
    expect(routeLabel("/")).toBe("/");
    expect(routeLabel("/genesis/1")).toBe("/");
    expect(routeLabel("/healthz")).toBe("/healthz");
    expect(routeLabel("/__invalidate")).toBe("/__invalidate");
    expect(routeLabel("/b/main")).toBe("/b/:branch");
    expect(routeLabel("/b/main/20240101-abc")).toBe("/b/:branch/:buildId");
  });

  it("never lets a branch name or build id leak into the label", () => {
    // This is the whole point: labels become metric attributes, and branch
    // names are unbounded.
    const label = routeLabel("/b/some-wild-feature-branch/build-12345");
    expect(label).toBe("/b/:branch/:buildId");
    expect(label).not.toContain("some-wild-feature-branch");
    expect(label).not.toContain("build-12345");
  });

  it("ignores extra path segments beyond the build id", () => {
    expect(routeLabel("/b/main/build-1/genesis/1")).toBe("/b/:branch/:buildId");
  });
});

describe("branchLabel", () => {
  beforeEach(() => {
    setBranchAllowlistForTesting(new Set(["main", "alpha"]));
  });

  it("passes through branches we server-side render", () => {
    expect(branchLabel("main")).toBe("main");
    expect(branchLabel("alpha")).toBe("alpha");
  });

  it("collapses everything else to a single bucket", () => {
    // Guards metric cardinality: anyone can deploy a branch, so unknown names
    // must not become distinct time series.
    expect(branchLabel("some-contributors-branch")).toBe("other");
    expect(branchLabel("")).toBe("other");
  });
});

describe("initTelemetry", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
    delete process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT;
    delete process.env.OTEL_SDK_DISABLED;
  });

  it("stays disabled when no OTLP endpoint is configured", () => {
    const telemetry = initTelemetry();
    expect(telemetry.enabled).toBe(false);
  });

  it("stays disabled when explicitly switched off, endpoint or not", () => {
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT = "http://localhost:4318";
    process.env.OTEL_SDK_DISABLED = "true";
    expect(initTelemetry().enabled).toBe(false);
  });

  it("still applies the branch allowlist while disabled", () => {
    initTelemetry({ allowedBranches: new Set(["release"]) });
    expect(branchLabel("release")).toBe("release");
    expect(branchLabel("main")).toBe("other");
  });

  it("shutdown resolves when disabled", async () => {
    await expect(initTelemetry().shutdown()).resolves.toBeUndefined();
  });
});

describe("withSpan when telemetry is disabled", () => {
  beforeEach(() => {
    delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
    initTelemetry();
  });

  it("returns the callback's value", async () => {
    await expect(withSpan("noop", {}, async () => 42)).resolves.toBe(42);
  });

  it("propagates thrown errors rather than swallowing them", async () => {
    await expect(
      withSpan("noop", {}, async () => {
        throw new Error("boom");
      })
    ).rejects.toThrow("boom");
  });
});

// The suite above covers the disabled fast path. These exercise the real
// wiring — providers, processors, exporters, span and metric creation — against
// in-process exporters, so a bad provider option or a typo'd attribute key
// fails in CI rather than the first time telemetry is switched on in prod.
describe("with telemetry enabled", () => {
  let spans: InMemorySpanExporter;
  let metricsExporter: InMemoryMetricExporter;
  let telemetry: Telemetry;

  beforeEach(() => {
    spans = new InMemorySpanExporter();
    metricsExporter = new InMemoryMetricExporter(
      AggregationTemporality.CUMULATIVE
    );
    telemetry = initTelemetry({
      allowedBranches: new Set(["main"]),
      rootBranch: "main",
      exporters: { traces: spans, metrics: metricsExporter },
    });
  });

  afterEach(async () => {
    await telemetry.shutdown();
  });

  it("registers providers and reports itself enabled", () => {
    expect(telemetry.enabled).toBe(true);
  });

  async function finishedSpans() {
    await telemetry.forceFlush();
    return spans.getFinishedSpans();
  }

  it("creates a real span with the given name and attributes", async () => {
    await withSpan(
      "GET /b/:branch/:buildId",
      {
        kind: SpanKind.SERVER,
        attributes: requestSpanAttributes({
          method: "GET",
          pathname: "/b/main/build-1",
          route: "/b/:branch/:buildId",
          httpVersion: "1.1",
          host: "seedbible.org",
          clientAddress: "203.0.113.7",
          userAgent: "test-agent",
        }),
      },
      async (span) => {
        setResponseStatus(span, 200);
      }
    );

    const [span] = await finishedSpans();
    expect(span?.name).toBe("GET /b/:branch/:buildId");
    expect(span?.kind).toBe(SpanKind.SERVER);
    expect(span?.attributes).toMatchObject({
      "http.request.method": "GET",
      "http.route": "/b/:branch/:buildId",
      "url.path": "/b/main/build-1",
      "url.scheme": "http",
      "network.protocol.version": "1.1",
      "server.address": "seedbible.org",
      "client.address": "203.0.113.7",
      "user_agent.original": "test-agent",
      "http.response.status_code": 200,
    });
  });

  it("nests child spans under the active request span", async () => {
    await withSpan("GET /", { kind: SpanKind.SERVER }, async () => {
      await withSpan("ssr.render", {}, async () => {});
    });

    const finished = await finishedSpans();
    const parent = finished.find((s) => s.name === "GET /");
    const child = finished.find((s) => s.name === "ssr.render");
    // Context propagation across `await` is the thing most likely to silently
    // break; without it every span would come out as its own root.
    expect(child?.parentSpanContext?.spanId).toBe(parent?.spanContext().spanId);
    expect(child?.spanContext().traceId).toBe(parent?.spanContext().traceId);
  });

  it("records a thrown error on the span and marks it failed", async () => {
    await expect(
      withSpan("ssr.render", {}, async () => {
        throw new Error("render exploded");
      })
    ).rejects.toThrow("render exploded");

    const [span] = await finishedSpans();
    expect(span?.status.code).toBe(SpanStatusCode.ERROR);
    expect(span?.attributes["error.type"]).toBe("Error");
    expect(span?.events.map((e) => e.name)).toContain("exception");
  });

  it("flags a degraded render on the surrounding request span", async () => {
    await withSpan("GET /", { kind: SpanKind.SERVER }, async () => {
      // Mirrors renderAndRespond's fallback: render() threw, we serve the
      // un-rendered shell with a 200 anyway.
      markRenderDegraded();
    });

    const [span] = await finishedSpans();
    expect(span?.attributes["seedbible.ssr.degraded"]).toBe(true);
  });

  it("marks a 5xx response as an errored span", async () => {
    await withSpan("GET /", { kind: SpanKind.SERVER }, async (span) => {
      setResponseStatus(span, 500);
    });

    const [span] = await finishedSpans();
    expect(span?.status.code).toBe(SpanStatusCode.ERROR);
  });

  it("continues an upstream trace from a traceparent header", async () => {
    const traceId = "4bf92f3577b34da6a3ce929d0e0e4736";
    const { extractContext } = await import("../../../server/telemetry");

    await withSpan(
      "GET /",
      {
        kind: SpanKind.SERVER,
        parent: extractContext({
          traceparent: `00-${traceId}-00f067aa0ba902b7-01`,
        }),
      },
      async () => {}
    );

    const [span] = await finishedSpans();
    expect(span?.spanContext().traceId).toBe(traceId);
    expect(span?.parentSpanContext?.spanId).toBe("00f067aa0ba902b7");
  });

  it("records the request duration histogram with clamped branch labels", async () => {
    recordHttpRequest(performance.now() - 25, {
      method: "GET",
      statusCode: 200,
      route: "/",
      branch: "main",
    });
    recordHttpRequest(performance.now() - 5, {
      method: "GET",
      statusCode: 200,
      route: "/b/:branch/:buildId",
      branch: "someones-feature-branch",
    });

    await telemetry.forceFlush();
    const metrics = metricsExporter
      .getMetrics()
      .flatMap((rm) => rm.scopeMetrics)
      .flatMap((sm) => sm.metrics);

    const duration = metrics.find(
      (m) => m.descriptor.name === "http.server.request.duration"
    );
    expect(duration).toBeDefined();
    expect(duration?.descriptor.unit).toBe("s");

    const points = (duration?.dataPoints ?? []) as DataPoint<HistogramData>[];
    const branches = points.map((p) => p.attributes["seedbible.branch"]);
    expect(branches).toContain("main");
    // The unknown branch must not appear verbatim — that is the cardinality
    // guard doing its job on real recorded data, not just in isolation.
    expect(branches).toContain("other");
    expect(branches).not.toContain("someones-feature-branch");

    const mainPoint = points.find(
      (p) => p.attributes["seedbible.branch"] === "main"
    );
    expect(mainPoint?.value.count).toBe(1);
    expect(mainPoint?.value.sum).toBeGreaterThan(0);
  });

  it("counts cache hits and misses separately", async () => {
    recordCacheLookup("pointer", true);
    recordCacheLookup("pointer", true);
    recordCacheLookup("pointer", false);

    await telemetry.forceFlush();
    const lookups = metricsExporter
      .getMetrics()
      .flatMap((rm) => rm.scopeMetrics)
      .flatMap((sm) => sm.metrics)
      .find((m) => m.descriptor.name === "seedbible.cache.lookups");

    const byResult = Object.fromEntries(
      (lookups?.dataPoints ?? []).map((p) => [
        `${p.attributes["seedbible.cache"]}:${p.attributes["seedbible.cache.result"]}`,
        p.value,
      ])
    );
    expect(byResult["pointer:hit"]).toBe(2);
    expect(byResult["pointer:miss"]).toBe(1);
  });

  it("traces store reads through instrumentStore", async () => {
    const store = instrumentStore(
      {
        readPointer: async () => ({ buildId: "b1" }),
        fetchArtifacts: async () => ({
          serverModulePath: "/tmp/s.mjs",
          html: "",
        }),
        fetchHtml: async () => "",
      },
      "s3"
    );

    await store.readPointer("main");

    const [span] = await finishedSpans();
    expect(span?.name).toBe("store.readPointer");
    expect(span?.attributes).toMatchObject({
      "seedbible.store.operation": "readPointer",
      "seedbible.branch": "main",
      "seedbible.store.backend": "s3",
    });
  });
});

describe("instrumentStore", () => {
  function fakeStore(overrides: Partial<ArtifactStore> = {}): ArtifactStore {
    return {
      readPointer: async (branch) => ({ buildId: `${branch}-build` }),
      fetchArtifacts: async (branch, buildId) => ({
        serverModulePath: `/tmp/${branch}/${buildId}/server.mjs`,
        html: "<html></html>",
      }),
      fetchHtml: async (branch, buildId) => `html:${branch}:${buildId}`,
      ...overrides,
    };
  }

  it("forwards arguments and returns results unchanged", async () => {
    const seen: string[][] = [];
    const store = instrumentStore(
      fakeStore({
        fetchHtml: async (branch, buildId) => {
          seen.push([branch, buildId]);
          return `html:${branch}:${buildId}`;
        },
      }),
      "local"
    );

    const pointer: BranchPointer | null = await store.readPointer("main");
    expect(pointer).toEqual({ buildId: "main-build" });

    const artifacts: BranchArtifacts = await store.fetchArtifacts("main", "b1");
    expect(artifacts.serverModulePath).toBe("/tmp/main/b1/server.mjs");

    await expect(store.fetchHtml("alpha", "b2")).resolves.toBe("html:alpha:b2");
    expect(seen).toEqual([["alpha", "b2"]]);
  });

  it("re-throws errors instead of hiding them", async () => {
    const store = instrumentStore(
      fakeStore({
        readPointer: async () => {
          throw new Error("s3 unavailable");
        },
      }),
      "s3"
    );

    await expect(store.readPointer("main")).rejects.toThrow("s3 unavailable");
  });

  it("passes through a null pointer for an unknown branch", async () => {
    const store = instrumentStore(
      fakeStore({ readPointer: async () => null }),
      "local"
    );
    await expect(store.readPointer("nope")).resolves.toBeNull();
  });
});

describe("expressSpanMiddleware", () => {
  function fakeExchange(url: string): {
    req: MiddlewareRequest;
    res: MiddlewareResponse & { finish: () => void };
  } {
    const listeners: Record<string, Array<() => void>> = {};
    return {
      req: {
        method: "GET",
        originalUrl: url,
        httpVersion: "1.1",
        headers: { host: "localhost:3002" },
        socket: { remoteAddress: "127.0.0.1" },
      },
      res: {
        statusCode: 200,
        once(event, listener) {
          (listeners[event] ??= []).push(listener);
          return this;
        },
        finish() {
          for (const listener of listeners["finish"] ?? []) listener();
        },
      },
    };
  }

  it("calls next() synchronously so the chain is not stalled", () => {
    const middleware = expressSpanMiddleware("main");
    const { req, res } = fakeExchange("/genesis/1");
    let called = false;

    middleware(req, res, () => {
      called = true;
    });

    // If next() were deferred to a microtask, every dev request would hang.
    expect(called).toBe(true);
    res.finish();
  });

  it("works when the response finishes after next() returns", async () => {
    const middleware = expressSpanMiddleware("main");
    const { req, res } = fakeExchange("/b/main/build-1");

    middleware(req, res, () => {
      res.statusCode = 404;
    });
    res.finish();

    // Nothing should throw once the response completes.
    await Promise.resolve();
    expect(res.statusCode).toBe(404);
  });
});
