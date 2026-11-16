import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { render } from "../../../standalone/entry-ssr";
import { createRenderTimer } from "../../../standalone/ssrRenderTimings";
import { resetSsrTranslationsCacheForTests } from "../../../standalone/ssrTranslationsCache";
import { DEFAULT_APP_CONFIG } from "@packages/seed-bible/seed-bible/app/appConfig";
import { createDefaultManagerResponseMap } from "../seed-bible/managers/testUtils/mockBibleApiData";

describe("render() step timings", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    resetSsrTranslationsCacheForTests();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("returns a timing for each wait and for turning the app into HTML", async () => {
    const responses = createDefaultManagerResponseMap();
    globalThis.fetch = (async (url: string) => {
      const response = responses[url];
      if (!response) {
        throw new Error(`No mocked response for ${url}`);
      }
      return response;
    }) as typeof globalThis.fetch;

    const before = Date.now();
    import.meta.env.SSR = true;
    let result: Awaited<ReturnType<typeof render>>;
    try {
      result = await render({
        path: "/en/AAB/genesis/1?useFreeBibleAPI=true",
        config: { ...DEFAULT_APP_CONFIG, acceptedLanguages: [] },
        html: "<!-- APP_HTML -->",
      });
    } finally {
      delete import.meta.env.SSR;
    }
    const after = Date.now();

    if (typeof result !== "object" || !("html" in result)) {
      throw new Error("Expected rendered HTML");
    }
    const timings = result.timings ?? [];
    expect(timings.map((t) => t.name)).toEqual(
      expect.arrayContaining([
        "ssr.wait.i18n",
        "ssr.wait.chapter",
        "ssr.renderToString",
      ])
    );
    // Wall-clock times, so the host thread can place them on its own timeline.
    for (const timing of timings) {
      expect(timing.startTime).toBeGreaterThanOrEqual(before - 1);
      expect(timing.endTime).toBeLessThanOrEqual(after + 1);
      expect(timing.endTime).toBeGreaterThanOrEqual(timing.startTime);
      expect(timing.error).toBeUndefined();
    }
  });

  it("returns no timings for a redirect, which waits on nothing", async () => {
    const result = await render({
      path: "/en/AAB/senesis/3",
      config: DEFAULT_APP_CONFIG,
      html: "",
    });

    expect(result).toEqual({ redirectTo: "/en/AAB/genesis/3" });
  });
});

describe("createRenderTimer", () => {
  it("records nothing when there is nothing to wait on", async () => {
    const timer = createRenderTimer();

    await timer.wait("ssr.wait.playlistPlayback", undefined);

    expect(timer.timings).toEqual([]);
  });

  it("records the error and still rejects when the awaited work fails", async () => {
    const timer = createRenderTimer();

    await expect(
      timer.wait("ssr.wait.chapter", Promise.reject(new TypeError("api down")))
    ).rejects.toThrow("api down");

    expect(timer.timings).toEqual([
      expect.objectContaining({
        name: "ssr.wait.chapter",
        error: { name: "TypeError", message: "api down" },
      }),
    ]);
  });

  it("counts a rejection with no value as a failure", async () => {
    const timer = createRenderTimer();

    await expect(
      timer.wait("ssr.wait.i18n", Promise.reject())
    ).rejects.toBeUndefined();

    expect(timer.timings[0]?.error).toEqual({ message: "undefined" });
  });

  it("times a step's synchronous work as well as its promise", async () => {
    const timer = createRenderTimer();

    await timer.step("ssr.renderToString", () => {
      const start = performance.now();
      while (performance.now() - start < 20) {
        // busy-wait: synchronous work done before any promise exists
      }
      return "html";
    });

    const [timing] = timer.timings;
    expect(timing!.endTime - timing!.startTime).toBeGreaterThanOrEqual(19);
  });
});
