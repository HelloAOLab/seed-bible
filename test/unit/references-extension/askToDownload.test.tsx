import { render } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import { createModalManager } from "@packages/seed-bible/seed-bible/managers/ModalManager";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import type { Translation } from "@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI";

vi.mock("axios", () => ({
  default: { get: vi.fn() },
}));

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const { mockI18nManager } = await import("../seed-bible/testUtils/mockI18n");
  return mockI18nManager();
});

const axios = (await import("axios")).default;
const get = vi.mocked(axios.get);

const { mockI18nTranslations, mockTranslate, resetMockI18n } =
  await import("../seed-bible/testUtils/mockI18n");
const shippedEnglish: Record<string, string> = (
  await import("@packages/references-extension/extension.json")
).default.translations.en;
const { offerReferenceDownload } =
  await import("@packages/references-extension/references/manager/askToDownload");

/** One book, one chapter, so a full download is a single request. */
const ONE_CHAPTER_DATASET = {
  data: {
    books: [
      { id: "GEN", numberOfChapters: 1, totalNumberOfReferences: 344_799 },
    ],
  },
  status: 200,
};

function translation(overrides: Partial<Translation> = {}): Translation {
  return {
    id: "WEB",
    shortName: "WEB",
    name: "World English Bible",
    totalNumberOfVerses: 31_102,
    ...overrides,
  } as Translation;
}

interface TestState {
  state: SeedBibleState;
  toasts: string[];
  /** Every download the offer started, in the order it started them. */
  order: string[];
}

function createTestState(options?: {
  translation?: Translation | null;
  downloadedIds?: string[];
  offlineSupported?: boolean;
  translationDownloadSucceeds?: boolean;
}): TestState {
  const toasts: string[] = [];
  const order: string[] = [];
  const downloaded = new Set(options?.downloadedIds ?? []);

  const readingTranslation = signal<Translation | null>(
    options?.translation ?? null
  );

  const state = {
    modals: createModalManager(),
    app: {
      toast: (message: string) => toasts.push(message),
      currentReadingState: signal({
        tab: { readingState: { translation: readingTranslation } },
      }),
    },
    bibleData: {
      offline: {
        supported: options?.offlineSupported ?? true,
        isDownloaded: (id: string) => downloaded.has(id),
        downloadTranslation: async (id: string) => {
          order.push(`translation:${id}`);
          return options?.translationDownloadSucceeds ?? true;
        },
      },
    },
  } as unknown as SeedBibleState;

  return { state, toasts, order };
}

/** Renders whatever the modal manager is currently showing. */
function renderOffer(state: SeedBibleState): HTMLElement {
  const modal = state.modals.modals.value[0];
  if (!modal) {
    throw new Error("No modal is open");
  }
  const container = document.createElement("div");
  document.body.appendChild(container);
  act(() => {
    render(modal.content({ t: mockTranslate }), container);
  });
  return container;
}

function clickButton(container: HTMLElement, label: string): void {
  const button = [...container.querySelectorAll("button")].find(
    (candidate) => candidate.textContent?.trim() === label
  );
  if (!button) {
    throw new Error(`No "${label}" button in: ${container.textContent}`);
  }
  act(() => {
    button.click();
  });
}

async function waitForCondition(
  check: () => boolean,
  timeoutMs = 1000
): Promise<void> {
  const start = Date.now();
  while (!check()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error("waitForCondition timed out");
    }
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}

function setOnline(online: boolean): void {
  Object.defineProperty(navigator, "onLine", {
    value: online,
    configurable: true,
  });
}

beforeEach(() => {
  get.mockReset();
  get.mockResolvedValue(ONE_CHAPTER_DATASET);
  window.localStorage.clear();
  setOnline(true);
  document.body.innerHTML = "";
  resetMockI18n();
});

/** Renders the offer as it reads once the shipped English is loaded. */
function withShippedEnglish<T>(run: () => T): T {
  Object.assign(mockI18nTranslations, shippedEnglish);
  try {
    return run();
  } finally {
    resetMockI18n();
  }
}

describe("offerReferenceDownload()", () => {
  it("makes the offer when the extension first runs", () => {
    const { state } = createTestState();

    offerReferenceDownload(state);

    expect(state.modals.modals.value).toHaveLength(1);
  });

  it("doesn't offer again once the device has been asked", () => {
    const first = createTestState();
    offerReferenceDownload(first.state);
    expect(first.state.modals.modals.value).toHaveLength(1);

    // A later page load: same device, same storage, fresh app state.
    const second = createTestState();
    offerReferenceDownload(second.state);

    expect(second.state.modals.modals.value).toHaveLength(0);
  });

  it("waits for a connection instead of offering a download that can't run", () => {
    setOnline(false);
    const offlineVisit = createTestState();

    offerReferenceDownload(offlineVisit.state);

    expect(offlineVisit.state.modals.modals.value).toHaveLength(0);

    // The offer wasn't spent, so the next visit online still gets it.
    setOnline(true);
    const laterVisit = createTestState();
    offerReferenceDownload(laterVisit.state);

    expect(laterVisit.state.modals.modals.value).toHaveLength(1);
  });

  it("takes the offer down when the extension is uninstalled", () => {
    const { state } = createTestState();

    const cleanup = offerReferenceDownload(state);
    cleanup();

    expect(state.modals.modals.value).toHaveLength(0);
  });
});

describe("what the offer says", () => {
  it("covers the cross-references alone when nothing is being read", () => {
    const { state } = createTestState({ translation: null });
    offerReferenceDownload(state);

    const container = renderOffer(state);

    expect(container.textContent).toContain("Keep every cross-reference");
    expect(container.textContent).not.toContain("along with");
  });

  it("names the translation being read", () => {
    const { state } = createTestState({ translation: translation() });
    offerReferenceDownload(state);

    const container = renderOffer(state);

    expect(container.textContent).toContain("along with WEB");
  });

  it("leaves out a translation that is already saved", () => {
    const { state } = createTestState({
      translation: translation(),
      downloadedIds: ["WEB"],
    });
    offerReferenceDownload(state);

    const container = renderOffer(state);

    expect(container.textContent).not.toContain("along with");
  });

  it("leaves out the translation where the device can't store downloads", () => {
    const { state } = createTestState({
      translation: translation(),
      offlineSupported: false,
    });
    offerReferenceDownload(state);

    const container = renderOffer(state);

    expect(container.textContent).not.toContain("along with");
  });

  it("adds both sizes once the dataset index arrives", async () => {
    const { state } = createTestState({ translation: translation() });
    offerReferenceDownload(state);

    const container = renderOffer(state);
    // The dialog opens before the size is known, then fills it in.
    expect(container.textContent).not.toContain("About");

    await waitForCondition(() => !!container.textContent?.includes("About"));

    // 344,799 references ≈ 17.8 MB; 31,102 verses ≈ 7.1 MB.
    expect(container.textContent).toContain("17.8 MB of cross-references");
    expect(container.textContent).toContain("7.1 MB for WEB");
  });

  it("still opens when the size can't be worked out", async () => {
    get.mockRejectedValue(new Error("no network"));
    const { state } = createTestState();
    offerReferenceDownload(state);

    const container = renderOffer(state);
    await waitForCondition(() => get.mock.calls.length > 0);

    expect(container.textContent).toContain("Keep every cross-reference");
    expect(container.textContent).not.toContain("About");
  });
});

describe("the shipped English", () => {
  // The `defaultValue` at each call site is what users see if the translation
  // bundle doesn't load, so it has to say the same thing as the shipped string.
  // These caught the download-started toast still saying "cross-references"
  // after the run grew to cover the translation as well.

  it("says the same as the wording the code falls back on", () => {
    const fallback = createTestState({ translation: translation() });
    offerReferenceDownload(fallback.state);
    const fallbackText = renderOffer(fallback.state).textContent;

    window.localStorage.clear();
    const shipped = createTestState({ translation: translation() });
    const shippedText = withShippedEnglish(() => {
      offerReferenceDownload(shipped.state);
      return renderOffer(shipped.state).textContent;
    });

    expect(shippedText).toBe(fallbackText);
  });

  it("says the same in its toasts as the wording the code falls back on", async () => {
    const fallback = createTestState({ translation: translation() });
    offerReferenceDownload(fallback.state);
    clickButton(renderOffer(fallback.state), "Download");
    await waitForCondition(() => fallback.toasts.length > 1);
    // Let the run release its in-flight guard before the second one starts.
    await new Promise((resolve) => setTimeout(resolve, 0));

    window.localStorage.clear();
    // Assigned rather than scoped to a callback: the toasts are raised after
    // the click returns, so the strings have to stay loaded until the run ends.
    Object.assign(mockI18nTranslations, shippedEnglish);
    const shipped = createTestState({ translation: translation() });
    offerReferenceDownload(shipped.state);
    clickButton(
      renderOffer(shipped.state),
      shippedEnglish["download-confirm"]!
    );
    await waitForCondition(() => shipped.toasts.length > 1);

    expect(shipped.toasts).toEqual(fallback.toasts);
  });
});

describe("accepting the offer", () => {
  it("closes the dialog and downloads in the background", async () => {
    const { state, toasts } = createTestState();
    offerReferenceDownload(state);
    const container = renderOffer(state);

    clickButton(container, "Download");

    expect(state.modals.modals.value).toHaveLength(0);
    expect(toasts[0]).toBe("Downloading in the background…");
  });

  it("saves the translation before the cross-references", async () => {
    const { state, order, toasts } = createTestState({
      translation: translation(),
    });
    offerReferenceDownload(state);
    const container = renderOffer(state);

    clickButton(container, "Download");
    await waitForCondition(() => toasts.length > 1);

    expect(order[0]).toBe("translation:WEB");
    expect(toasts.at(-1)).toBe(
      "Cross-references and WEB are now available offline"
    );
  });

  it("reports success on the cross-references alone when no translation is offered", async () => {
    const { state, order, toasts } = createTestState({ translation: null });
    offerReferenceDownload(state);
    const container = renderOffer(state);

    clickButton(container, "Download");
    await waitForCondition(() => toasts.length > 1);

    expect(order).toEqual([]);
    expect(toasts.at(-1)).toBe("Cross-references are now available offline");
  });

  it("keeps the cross-references when the translation won't download", async () => {
    const { state, toasts } = createTestState({
      translation: translation(),
      translationDownloadSucceeds: false,
    });
    offerReferenceDownload(state);
    const container = renderOffer(state);

    clickButton(container, "Download");
    await waitForCondition(() => toasts.length > 1);

    expect(toasts.at(-1)).toBe(
      "Saved the cross-references, but WEB couldn't be downloaded."
    );
  });

  it("says how much landed when some chapters fail", async () => {
    get.mockImplementation(async (url: string) => {
      if (url.endsWith("/books.json")) {
        return {
          data: {
            books: [
              { id: "GEN", numberOfChapters: 2, totalNumberOfReferences: 10 },
            ],
          },
          status: 200,
        };
      }
      if (url.endsWith("/GEN/2.json")) {
        throw new Error("500");
      }
      return { data: { chapter: { content: [] } }, status: 200 };
    });

    const { state, toasts } = createTestState({ translation: null });
    offerReferenceDownload(state);
    const container = renderOffer(state);

    clickButton(container, "Download");
    await waitForCondition(() => toasts.length > 1);

    expect(toasts.at(-1)).toBe(
      "Saved 1 of 2 chapters. 1 couldn't be downloaded."
    );
  });

  it("says so when the download can't start at all", async () => {
    const { state, toasts } = createTestState({ translation: null });
    offerReferenceDownload(state);
    const container = renderOffer(state);
    get.mockRejectedValue(new Error("no network"));

    clickButton(container, "Download");
    await waitForCondition(() => toasts.length > 1);

    expect(toasts.at(-1)).toBe(
      "Couldn't download the cross-references. Check your connection and try again."
    );
  });

  it("declining downloads nothing", () => {
    const { state, toasts, order } = createTestState({
      translation: translation(),
    });
    offerReferenceDownload(state);
    const container = renderOffer(state);

    clickButton(container, "Not now");

    expect(state.modals.modals.value).toHaveLength(0);
    expect(toasts).toEqual([]);
    expect(order).toEqual([]);
  });
});
