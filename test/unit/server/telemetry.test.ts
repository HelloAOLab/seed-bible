// @vitest-environment node
//
// The suite runs under jsdom globally (see vite.config.ts); this file needs the
// real Node environment because it exercises server-side telemetry helpers.
import { describe, expect, it, beforeEach } from "vitest";
import {
  branchLabel,
  expressSpanMiddleware,
  initTelemetry,
  instrumentStore,
  routeLabel,
  setBranchAllowlistForTesting,
  withSpan,
  type MiddlewareRequest,
  type MiddlewareResponse,
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
