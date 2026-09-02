import {
  createBibleDataManager,
  type BibleDataManager,
} from "@packages/seed-bible/seed-bible/managers/BibleDataManager";
import { FreeUseBibleAPI } from "@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI";
import type { Translation } from "@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI";
import {
  estimateTranslationSizeBytes,
  formatBytes,
} from "@packages/seed-bible/seed-bible/managers/OfflineTranslationsManager";
import { createInMemoryTranslationStore } from "@packages/seed-bible/seed-bible/managers/OfflineTranslationStore";
import {
  EXAMPLE_API_ENDPOINT,
  aabBooks,
  createResponse,
  createStreamingResponse,
  makeCompleteTranslation,
  type WebResponseMap,
} from "./testUtils/mockBibleApiData";
import type { Mock } from "vitest";

/**
 * The offer to save the current translation for offline reading.
 *
 * Every case builds a manager through `createBibleDataManager`, so the gates are
 * exercised the way the app hits them — the only fakes are the network and the
 * storage back end.
 */

/** A second translation, so "some other translation" cases have one to use. */
const BSB: Translation = {
  ...aabBooks.translation,
  id: "BSB",
  name: "Berean Standard Bible",
  shortName: "BSB",
};

let webGetMock: Mock;
const originalFetch = globalThis.fetch;
const managers: BibleDataManager[] = [];

beforeEach(() => {
  webGetMock = vi.fn();
  globalThis.fetch = webGetMock as unknown as typeof fetch;
  localStorage.clear();
});

afterEach(() => {
  // Managers hold `online`/`offline` listeners, and one test takes the device
  // offline — leaving that listener attached would follow other cases around.
  for (const manager of managers.splice(0)) {
    manager.offline.dispose();
  }
  globalThis.fetch = originalFetch;
  vi.useRealTimers();
});

function makeEndpointUrl(path: string): string {
  return new URL(path, EXAMPLE_API_ENDPOINT).href;
}

function responses(): WebResponseMap {
  return {
    [makeEndpointUrl("api/available_translations.json")]: createResponse({
      translations: [aabBooks.translation, BSB],
    }),
    [makeEndpointUrl("api/AAB/books.json")]: createResponse(aabBooks),
    [makeEndpointUrl("api/AAB/complete.json")]: createStreamingResponse(
      makeCompleteTranslation(aabBooks, 2)
    ),
    [makeEndpointUrl("api/BSB/complete.json")]: createStreamingResponse(
      makeCompleteTranslation({ ...aabBooks, translation: BSB }, 2)
    ),
  };
}

/**
 * A fresh manager, which is also a fresh session — the "one prompt per session"
 * rule lives in the manager instance, so a new one models a new page load.
 */
async function startSession(): Promise<BibleDataManager> {
  const mocked = responses();
  webGetMock.mockImplementation((url: string) => {
    const response = mocked[url];
    return response
      ? Promise.resolve(response)
      : Promise.reject(new Error(`No mocked response for ${url}`));
  });

  const manager = createBibleDataManager(
    new FreeUseBibleAPI(EXAMPLE_API_ENDPOINT),
    { offlineStore: createInMemoryTranslationStore() }
  );
  managers.push(manager);
  await manager.offline.ready;
  await manager.getTranslations();
  return manager;
}

describe("offering the offline download", () => {
  it("offers the current translation when the device holds no downloads", async () => {
    const manager = await startSession();

    expect(manager.offline.offerDownloadPrompt(aabBooks.translation)).toBe(
      true
    );
    expect(manager.offline.downloadPrompt.value?.id).toBe("AAB");
  });

  it("shows nothing further once a prompt has been shown this session", async () => {
    const manager = await startSession();

    expect(manager.offline.offerDownloadPrompt(aabBooks.translation)).toBe(
      true
    );
    manager.offline.dismissDownloadPrompt();

    // A different translation that has never been offered — still refused,
    // because one prompt is the whole session's budget.
    expect(manager.offline.offerDownloadPrompt(BSB)).toBe(false);
    expect(manager.offline.downloadPrompt.value).toBeNull();
  });

  it("does not offer the same translation again on a later visit", async () => {
    const first = await startSession();
    expect(first.offline.offerDownloadPrompt(aabBooks.translation)).toBe(true);

    // A new manager is a new session, but the record of the offer persists.
    const second = await startSession();
    expect(second.offline.offerDownloadPrompt(aabBooks.translation)).toBe(
      false
    );
  });

  it("does not offer a translation that is already downloaded", async () => {
    const manager = await startSession();
    await manager.offline.downloadTranslation("AAB");

    expect(manager.offline.offerDownloadPrompt(aabBooks.translation)).toBe(
      false
    );
  });

  it("does not offer a translation that is already downloading", async () => {
    const manager = await startSession();

    // The offer has to be made *while* progress is live. Against an in-memory
    // store the download settles in a couple of microtasks, so this rides the
    // progress signal rather than trying to catch the window by polling.
    let offeredMidDownload: boolean | null = null;
    const stopWatching = manager.offline.downloads.subscribe((downloads) => {
      if (downloads.has("AAB") && offeredMidDownload === null) {
        offeredMidDownload = manager.offline.offerDownloadPrompt(
          aabBooks.translation
        );
      }
    });

    await manager.offline.downloadTranslation("AAB");
    stopWatching();

    expect(offeredMidDownload).toBe(false);
    expect(manager.offline.downloadPrompt.value).toBeNull();
  });

  it("does not offer a download while the device is offline", async () => {
    const manager = await startSession();

    window.dispatchEvent(new Event("offline"));
    expect(manager.offline.isOnline.value).toBe(false);

    expect(manager.offline.offerDownloadPrompt(aabBooks.translation)).toBe(
      false
    );

    window.dispatchEvent(new Event("online"));
  });
});

describe("the 24-hour rule, once an offer has already been made", () => {
  it("does not offer a translation the user switched to today, even with nothing downloaded", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-01T09:00:00Z"));

    const first = await startSession();
    expect(first.offline.offerDownloadPrompt(aabBooks.translation)).toBe(true);
    first.offline.dismissDownloadPrompt();

    // A later visit, now reading something else. Nothing was ever downloaded,
    // so the only thing standing between the user and a second prompt is the
    // day of tenure — switching translations must not buy one.
    const second = await startSession();
    second.offline.noteTranslationInUse("BSB");
    expect(second.offline.offerDownloadPrompt(BSB)).toBe(false);
  });

  it("offers that translation once the user has stayed with it for a day", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-01T09:00:00Z"));

    const first = await startSession();
    first.offline.offerDownloadPrompt(aabBooks.translation);
    first.offline.dismissDownloadPrompt();

    const second = await startSession();
    second.offline.noteTranslationInUse("BSB");

    vi.setSystemTime(new Date("2026-03-02T10:00:00Z")); // 25 hours later
    const third = await startSession();
    expect(third.offline.offerDownloadPrompt(BSB)).toBe(true);
  });
});

describe("the 24-hour rule, once something is already downloaded", () => {
  it("does not offer a translation the user has only just started reading", async () => {
    const manager = await startSession();
    await manager.offline.downloadTranslation("AAB");

    manager.offline.noteTranslationInUse("BSB");

    expect(manager.offline.offerDownloadPrompt(BSB)).toBe(false);
  });

  it("does not offer a translation that has been in use for under a day", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-01T09:00:00Z"));

    const manager = await startSession();
    await manager.offline.downloadTranslation("AAB");
    manager.offline.noteTranslationInUse("BSB");

    vi.setSystemTime(new Date("2026-03-02T08:00:00Z")); // 23 hours later
    expect(manager.offline.offerDownloadPrompt(BSB)).toBe(false);
  });

  it("offers a translation the user has stayed with for a day", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-01T09:00:00Z"));

    const manager = await startSession();
    await manager.offline.downloadTranslation("AAB");
    manager.offline.noteTranslationInUse("BSB");

    vi.setSystemTime(new Date("2026-03-02T10:00:00Z")); // 25 hours later
    expect(manager.offline.offerDownloadPrompt(BSB)).toBe(true);
    expect(manager.offline.downloadPrompt.value?.id).toBe("BSB");
  });

  it("keeps the first-seen time rather than resetting it on later reads", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-01T09:00:00Z"));

    const manager = await startSession();
    await manager.offline.downloadTranslation("AAB");
    manager.offline.noteTranslationInUse("BSB");

    // Reading it again 10 hours in must not restart the clock, or a translation
    // in daily use would never reach a day's tenure.
    vi.setSystemTime(new Date("2026-03-01T19:00:00Z"));
    manager.offline.noteTranslationInUse("BSB");

    vi.setSystemTime(new Date("2026-03-02T10:00:00Z")); // 25 hours after first
    expect(manager.offline.offerDownloadPrompt(BSB)).toBe(true);
  });
});

describe("the stored timestamp maps", () => {
  it("keeps only the five most recently used translations", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-01T09:00:00Z"));

    const manager = await startSession();

    // Seven translations, each first used an hour after the last, so the map
    // has an unambiguous order to trim by.
    const ids = ["T1", "T2", "T3", "T4", "T5", "T6", "T7"];
    for (const id of ids) {
      manager.offline.noteTranslationInUse(id);
      vi.advanceTimersByTime(60 * 60 * 1000);
    }

    const stored = JSON.parse(
      localStorage.getItem("sb-translation-first-used") as string
    ) as Record<string, number>;

    expect(Object.keys(stored).sort()).toEqual(["T3", "T4", "T5", "T6", "T7"]);
  });

  it("keeps only the five most recent download offers", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-01T09:00:00Z"));

    const ids = ["T1", "T2", "T3", "T4", "T5", "T6"];
    for (const id of ids) {
      // One offer per session, and each translation needs a day of tenure
      // before it can be offered at all (only the very first offer is free).
      const manager = await startSession();
      manager.offline.noteTranslationInUse(id);
      vi.advanceTimersByTime(25 * 60 * 60 * 1000);
      expect(
        manager.offline.offerDownloadPrompt({ ...aabBooks.translation, id })
      ).toBe(true);
      manager.offline.dismissDownloadPrompt();
    }

    const stored = JSON.parse(
      localStorage.getItem("sb-offline-prompt-shown") as string
    ) as Record<string, number>;

    expect(Object.keys(stored).sort()).toEqual(["T2", "T3", "T4", "T5", "T6"]);
  });
});

describe("download size estimates", () => {
  it("estimates a full Bible at a plausible download size", () => {
    const bytes = estimateTranslationSizeBytes(aabBooks.translation);

    // A range rather than the exact figure: the bytes-per-verse calibration is
    // meant to be retuned against real downloads, and pinning it here would
    // only mean editing this test every time. What has to hold is that the
    // units are right — megabytes, not kilobytes or gigabytes.
    expect(bytes).not.toBeNull();
    expect(bytes as number).toBeGreaterThan(1024 * 1024);
    expect(bytes as number).toBeLessThan(20 * 1024 * 1024);
  });

  it("scales the estimate with the number of verses", () => {
    const full = estimateTranslationSizeBytes(aabBooks.translation) as number;
    const half = estimateTranslationSizeBytes({
      ...aabBooks.translation,
      totalNumberOfVerses: aabBooks.translation.totalNumberOfVerses / 2,
    }) as number;

    expect(half).toBeCloseTo(full / 2, 0);
  });

  it("has no estimate when the API reports no verse count", () => {
    expect(
      estimateTranslationSizeBytes({
        ...aabBooks.translation,
        totalNumberOfVerses: 0,
      })
    ).toBeNull();
  });

  it("formats byte counts at each unit boundary", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2 KB");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.0 MB");
  });
});
