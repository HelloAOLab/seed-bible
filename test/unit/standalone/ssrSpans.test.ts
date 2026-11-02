import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SpanStatusCode } from "@opentelemetry/api";
import {
  InMemorySpanExporter,
  type ReadableSpan,
} from "@opentelemetry/sdk-trace-base";
import {
  AggregationTemporality,
  InMemoryMetricExporter,
} from "@opentelemetry/sdk-metrics";
import {
  initTelemetry,
  withSpan,
  type Telemetry,
} from "../../../server/telemetry";
import { render } from "../../../standalone/entry-ssr";
import { traceWait } from "../../../standalone/ssrSpans";
import { resetSsrTranslationsCacheForTests } from "../../../standalone/ssrTranslationsCache";
import { DEFAULT_APP_CONFIG } from "@packages/seed-bible/seed-bible/app/appConfig";
import { createDefaultManagerResponseMap } from "../seed-bible/managers/testUtils/mockBibleApiData";

describe("SSR render spans", () => {
  let spans: InMemorySpanExporter;
  let telemetry: Telemetry;
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    resetSsrTranslationsCacheForTests();
    spans = new InMemorySpanExporter();
    telemetry = initTelemetry({
      exporters: {
        traces: spans,
        metrics: new InMemoryMetricExporter(AggregationTemporality.CUMULATIVE),
      },
    });
  });

  afterEach(async () => {
    globalThis.fetch = originalFetch;
    await telemetry.shutdown();
  });

  async function finishedSpans(): Promise<ReadableSpan[]> {
    await telemetry.forceFlush();
    return spans.getFinishedSpans();
  }

  it("records each wait and the HTML render as children of ssr.render", async () => {
    const responses = createDefaultManagerResponseMap();
    globalThis.fetch = (async (url: string) => {
      const response = responses[url];
      if (!response) {
        throw new Error(`No mocked response for ${url}`);
      }
      return response;
    }) as typeof globalThis.fetch;

    import.meta.env.SSR = true;
    try {
      // Mirrors how server/index.ts wraps render().
      const result = await withSpan("ssr.render", {}, () =>
        render({
          path: "/en/AAB/genesis/1?useFreeBibleAPI=true",
          config: { ...DEFAULT_APP_CONFIG, acceptedLanguages: [] },
          html: "<!-- APP_HTML -->",
        })
      );
      expect(result).toHaveProperty("html");
    } finally {
      delete import.meta.env.SSR;
    }

    const finished = await finishedSpans();
    const parent = finished.find((s) => s.name === "ssr.render");
    const childNames = finished
      .filter(
        (s) => s.parentSpanContext?.spanId === parent?.spanContext().spanId
      )
      .map((s) => s.name);

    expect(childNames).toEqual(
      expect.arrayContaining([
        "ssr.wait.i18n",
        "ssr.wait.chapter",
        "ssr.renderToString",
      ])
    );
  });

  it("records no span when there is nothing to wait on", async () => {
    await withSpan("ssr.render", {}, async () => {
      await traceWait("ssr.wait.playlistPlayback", undefined);
    });

    const names = (await finishedSpans()).map((s) => s.name);
    expect(names).toEqual(["ssr.render"]);
  });

  it("marks the wait span failed when the awaited work rejects", async () => {
    await expect(
      traceWait("ssr.wait.chapter", Promise.reject(new Error("api down")))
    ).rejects.toThrow("api down");

    const [span] = await finishedSpans();
    expect(span?.name).toBe("ssr.wait.chapter");
    expect(span?.status.code).toBe(SpanStatusCode.ERROR);
    expect(span?.events.map((e) => e.name)).toContain("exception");
  });
});
