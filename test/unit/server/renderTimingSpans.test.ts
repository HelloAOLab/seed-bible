// @vitest-environment node
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import { SpanKind, SpanStatusCode } from "@opentelemetry/api";
import { InMemorySpanExporter } from "@opentelemetry/sdk-trace-base";
import {
  AggregationTemporality,
  InMemoryMetricExporter,
} from "@opentelemetry/sdk-metrics";
import {
  startBuildWorker,
  type BuildWorker,
} from "../../../server/buildWorker";
import { renderAndRespond, type Route } from "../../../server/index";
import {
  initTelemetry,
  withSpan,
  type Telemetry,
} from "../../../server/telemetry";

const TIMINGS_MODULE = path.resolve(
  import.meta.dirname,
  "../../../standalone/ssrRenderTimings.ts"
);

// A stand-in SSR bundle that times its waits with the real render timer, run
// in a real worker thread the way a deployed build's server.mjs is. Production
// renders happen there, where no tracer provider exists, so this is the path
// the spans have to survive.
const BUNDLE = `
import { createRenderTimer } from ${JSON.stringify(TIMINGS_MODULE)};

export async function render(opts) {
  const timer = createRenderTimer();
  const delay = (ms) => new Promise((r) => setTimeout(r, ms));
  await Promise.all([
    timer.wait("ssr.wait.i18n", delay(5)),
    timer.wait("ssr.wait.chapter", delay(30)),
  ]);
  await timer.wait(
    "ssr.wait.playlistPlayback",
    Promise.reject(new TypeError("playlist gone"))
  ).catch(() => {});
  const html = await timer.step("ssr.renderToString", () => "<p>" + opts.path + "</p>");
  return { html, timings: timer.timings };
}
`;

const ROUTE: Route = {
  branch: "main",
  basePath: "",
  appUrl: "/en/AAB/genesis/1",
};

function makeReq(): IncomingMessage {
  return { headers: { "user-agent": "Mozilla/5.0" } } as IncomingMessage;
}

function makeRes(): ServerResponse {
  const res = {
    writeHead: () => res,
    end: () => res,
  };
  return res as unknown as ServerResponse;
}

describe("render timings from the SSR worker", () => {
  let dir: string;
  let worker: BuildWorker;
  let spans: InMemorySpanExporter;
  let telemetry: Telemetry;

  beforeAll(async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), "render-timings-test-"));
    const bundlePath = path.join(dir, "server.mjs");
    await writeFile(bundlePath, BUNDLE);
    worker = await startBuildWorker({
      modulePath: bundlePath,
      timeoutMs: 5_000,
    });
  });

  afterAll(async () => {
    worker.retire();
    await rm(dir, { recursive: true, force: true });
  });

  beforeEach(() => {
    spans = new InMemorySpanExporter();
    telemetry = initTelemetry({
      allowedBranches: new Set(["main"]),
      exporters: {
        traces: spans,
        metrics: new InMemoryMetricExporter(AggregationTemporality.CUMULATIVE),
      },
    });
  });

  afterEach(async () => {
    await telemetry.shutdown();
  });

  async function renderOneRequest() {
    await withSpan("GET /", { kind: SpanKind.SERVER }, () =>
      renderAndRespond(makeReq(), makeRes(), worker.render, ROUTE, "<shell>")
    );
    await telemetry.forceFlush();
    return spans.getFinishedSpans();
  }

  it("turns each step into a child span of ssr.render", async () => {
    const finished = await renderOneRequest();
    const parent = finished.find((s) => s.name === "ssr.render");
    const children = finished.filter(
      (s) => s.parentSpanContext?.spanId === parent?.spanContext().spanId
    );

    expect(children.map((s) => s.name).sort()).toEqual([
      "ssr.renderToString",
      "ssr.wait.chapter",
      "ssr.wait.i18n",
      "ssr.wait.playlistPlayback",
    ]);
    for (const child of children) {
      expect(child.spanContext().traceId).toBe(parent?.spanContext().traceId);
    }
  });

  it("keeps the times the worker measured, not when the host received them", async () => {
    const finished = await renderOneRequest();
    const parent = finished.find((s) => s.name === "ssr.render")!;
    const chapter = finished.find((s) => s.name === "ssr.wait.chapter")!;
    const toMs = ([sec, ns]: [number, number]) => sec * 1000 + ns / 1e6;

    // The worker waited ~30ms; a span stamped on arrival would be ~0ms.
    expect(toMs(chapter.duration)).toBeGreaterThanOrEqual(25);
    // And it sits inside its parent on the host's timeline.
    expect(toMs(chapter.startTime)).toBeGreaterThanOrEqual(
      toMs(parent.startTime) - 1
    );
    expect(toMs(chapter.endTime)).toBeLessThanOrEqual(toMs(parent.endTime) + 1);
  });

  it("marks a failed step's span as an error, like any other failed span", async () => {
    const finished = await renderOneRequest();
    const failed = finished.find((s) => s.name === "ssr.wait.playlistPlayback");

    expect(failed?.status).toMatchObject({
      code: SpanStatusCode.ERROR,
      message: "playlist gone",
    });
    expect(failed?.attributes["error.type"]).toBe("TypeError");
    expect(failed?.events.map((e) => e.name)).toContain("exception");

    const chapter = finished.find((s) => s.name === "ssr.wait.chapter");
    expect(chapter?.status.code).toBe(SpanStatusCode.UNSET);
  });
});
