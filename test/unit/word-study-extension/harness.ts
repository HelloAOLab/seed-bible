import type { Mock } from "vitest";
import { createBibleDataManager } from "@packages/seed-bible/seed-bible/managers/BibleDataManager";
import { FreeUseBibleAPI } from "@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI";
import type { RecordStore } from "@packages/word-study-extension/ext_WordStudy/cache";
import { createWordStudyProvider } from "@packages/word-study-extension/ext_WordStudy/provider";

export const ENDPOINT = "https://bible.example/";

/**
 * Replaces `fetch` for the current test: the network is the only boundary
 * these tests fake. Restores the real one after each test.
 */
export function useFetchMock(): () => Mock {
  let fetchMock: Mock;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    fetchMock = vi.fn(() => Promise.reject(new Error("No network in tests")));
    globalThis.fetch = fetchMock;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  return () => fetchMock;
}

function respond(status: number, statusText: string, payload: unknown) {
  return Promise.resolve({
    status,
    statusText,
    json: () => Promise.resolve(payload),
  });
}

/** Answers the API paths given; every other path is a 404, like the real API. */
export function serve(fetchMock: Mock, files: Record<string, unknown>) {
  fetchMock.mockImplementation((url: string) => {
    const path = new URL(url).pathname.slice(1);
    return path in files
      ? respond(200, "OK", files[path])
      : respond(404, "Not Found", null);
  });
}

export function goOffline(fetchMock: Mock) {
  fetchMock.mockImplementation(() =>
    Promise.reject(new TypeError("Failed to fetch"))
  );
}

/** Leaves every request waiting, to see what shows while loading. */
export function hang(fetchMock: Mock) {
  fetchMock.mockImplementation(() => new Promise(() => undefined));
}

/**
 * A provider as one page load sees it: its own API client (so nothing is
 * remembered in memory from an earlier "visit") over the given device store.
 */
export function createProvider(store: RecordStore | null) {
  const source = createBibleDataManager(new FreeUseBibleAPI(ENDPOINT));
  return createWordStudyProvider({ source, store });
}

/** Polls `condition`, yielding to pending work between checks. */
export async function waitForCondition(
  condition: () => boolean,
  timeoutMs = 2000
): Promise<void> {
  const start = performance.now();
  while (!condition()) {
    if (performance.now() - start > timeoutMs) {
      throw new Error("Timed out waiting for condition.");
    }
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}
