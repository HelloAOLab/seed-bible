import { createPanes } from "@packages/seed-bible-refresh/seed-bible/managers/PanesManager";
import {
  createTabs,
  type ReaderTab,
} from "@packages/seed-bible-refresh/seed-bible/managers/TabsManager";
import type { BibleReadingState } from "@packages/seed-bible-refresh/seed-bible/managers/BibleReadingManager";
import {
  FreeUseBibleAPI,
  type AvailableTranslations,
  type TranslationBookChapter,
  type TranslationBooks,
} from "@packages/seed-bible-refresh/seed-bible/managers/FreeUseBibleAPI";

type WebResponse<T> = {
  status: number;
  statusText: string;
  data: Promise<T>;
};

type WebResponseMap = Record<string, WebResponse<unknown>>;

const API_ENDPOINT = "https://example.test";

const translations: AvailableTranslations = {
  translations: [
    {
      id: "BSB",
      name: "Berean Standard Bible",
      englishName: "Berean Standard Bible",
      website: "https://example.com",
      licenseUrl: "https://example.com/license",
      shortName: "BSB",
      language: "eng",
      textDirection: "ltr",
      availableFormats: ["json"],
      listOfBooksApiLink: "/api/BSB/books.json",
      numberOfBooks: 66,
      totalNumberOfChapters: 1189,
      totalNumberOfVerses: 31102,
    },
    {
      id: "NIV",
      name: "New International Version",
      englishName: "New International Version",
      website: "https://example.com",
      licenseUrl: "https://example.com/license",
      shortName: "NIV",
      language: "eng",
      textDirection: "ltr",
      availableFormats: ["json"],
      listOfBooksApiLink: "/api/NIV/books.json",
      numberOfBooks: 66,
      totalNumberOfChapters: 1189,
      totalNumberOfVerses: 31102,
    },
  ],
};

const bsbBooks: TranslationBooks = {
  translation: translations.translations[0]!,
  books: [
    {
      id: "GEN",
      name: "Genesis",
      commonName: "Genesis",
      title: null,
      order: 1,
      numberOfChapters: 50,
      firstChapterNumber: 1,
      firstChapterApiLink: "/api/BSB/GEN/1.json",
      lastChapterNumber: 50,
      lastChapterApiLink: "/api/BSB/GEN/50.json",
      totalNumberOfVerses: 1533,
    },
    {
      id: "EXO",
      name: "Exodus",
      commonName: "Exodus",
      title: null,
      order: 2,
      numberOfChapters: 40,
      firstChapterNumber: 1,
      firstChapterApiLink: "/api/BSB/EXO/1.json",
      lastChapterNumber: 40,
      lastChapterApiLink: "/api/BSB/EXO/40.json",
      totalNumberOfVerses: 1213,
    },
  ],
};

const nivBooks: TranslationBooks = {
  translation: translations.translations[1]!,
  books: [
    {
      id: "MAT",
      name: "Matthew",
      commonName: "Matthew",
      title: null,
      order: 40,
      numberOfChapters: 28,
      firstChapterNumber: 1,
      firstChapterApiLink: "/api/NIV/MAT/1.json",
      lastChapterNumber: 28,
      lastChapterApiLink: "/api/NIV/MAT/28.json",
      totalNumberOfVerses: 1071,
    },
  ],
};

let webGetMock: jest.Mock;
let logSpy: jest.SpyInstance;

beforeEach(() => {
  webGetMock = jest.fn();
  logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);

  (globalThis as any).web = {
    get: webGetMock,
  };

  (globalThis as any).configBot = {
    tags: {},
  };

  (globalThis as any).os = {
    addBotListener: jest.fn(),
  };
});

afterEach(() => {
  logSpy.mockRestore();
  delete (globalThis as any).web;
  delete (globalThis as any).configBot;
  delete (globalThis as any).os;
});

function createResponse<T>(
  payload: T,
  status: number = 200,
  statusText: string = "OK"
): WebResponse<T> {
  return {
    status,
    statusText,
    data: Promise.resolve(payload),
  };
}

function setWebResponses(responses: WebResponseMap): void {
  webGetMock.mockImplementation((url: string) => {
    const response = responses[url];
    if (!response) {
      throw new Error(`No mocked response for ${url}`);
    }
    return Promise.resolve(response);
  });
}

function createApi(): FreeUseBibleAPI {
  return new FreeUseBibleAPI(API_ENDPOINT);
}

function makeUrl(path: string): string {
  return `${API_ENDPOINT}${path}`;
}

function makeChapter(
  translationBooks: TranslationBooks,
  book: string,
  chapter: number
): TranslationBookChapter {
  const selectedBook =
    translationBooks.books.find((entry) => entry.id === book) ??
    translationBooks.books[0]!;

  return {
    translation: translationBooks.translation,
    book: selectedBook,
    thisChapterLink: `/api/${translationBooks.translation.id}/${book}/${chapter}.json`,
    thisChapterAudioLinks: {},
    nextChapterApiLink: `/api/${translationBooks.translation.id}/${book}/${chapter + 1}.json`,
    nextChapterAudioLinks: {},
    previousChapterApiLink:
      chapter > 1
        ? `/api/${translationBooks.translation.id}/${book}/${chapter - 1}.json`
        : null,
    previousChapterAudioLinks: chapter > 1 ? {} : null,
    numberOfVerses: 2,
    chapter: {
      number: chapter,
      content: [
        { type: "verse", number: 1, content: ["Verse 1"] },
        { type: "verse", number: 2, content: ["Verse 2"] },
      ],
      footnotes: [],
    },
  };
}

function createDefaultResponseMap(): WebResponseMap {
  return {
    [makeUrl("/api/available_translations.json")]: createResponse(translations),
    [makeUrl("/api/BSB/books.json")]: createResponse(bsbBooks),
    [makeUrl("/api/NIV/books.json")]: createResponse(nivBooks),
    [makeUrl("/api/BSB/GEN/1.json")]: createResponse(
      makeChapter(bsbBooks, "GEN", 1)
    ),
    [makeUrl("/api/NIV/MAT/1.json")]: createResponse(
      makeChapter(nivBooks, "MAT", 1)
    ),
  };
}

async function waitFor(
  condition: () => boolean,
  timeoutMs = 1000
): Promise<void> {
  const start = Date.now();
  while (!condition()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error("Timed out waiting for condition.");
    }
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

async function waitForInitialLoad(state: BibleReadingState): Promise<void> {
  await waitFor(() => state.loading.value === false);
}

async function waitForTabsToLoad(tabs: ReaderTab[]): Promise<void> {
  await Promise.all(tabs.map((tab) => waitForInitialLoad(tab.readingState)));
}

async function createManagers() {
  setWebResponses(createDefaultResponseMap());
  const tabsManager = createTabs(createApi());
  await waitForTabsToLoad(tabsManager.tabs.value);
  const panesManager = createPanes(tabsManager, tabsManager.selectedTabId);
  return { tabsManager, panesManager };
}

describe("createPanes", () => {
  it("automatically creates a pane for the initial tab", async () => {
    const { tabsManager, panesManager } = await createManagers();

    expect(panesManager.panes.value).toHaveLength(1);
    expect(panesManager.panes.value[0]?.tab?.id).toBe(
      tabsManager.selectedTabId.value
    );
    expect(panesManager.selectedPaneId.value).toBe(
      panesManager.panes.value[0]?.id ?? null
    );
  });

  it("supports selecting a pane", async () => {
    const { panesManager } = await createManagers();

    panesManager.setLayout("split-2v");
    const secondPane = panesManager.panes.value[1]!;

    panesManager.selectPane(secondPane.id);

    expect(panesManager.selectedPaneId.value).toBe(secondPane.id);
  });

  it("supports selecting a pane by tab id", async () => {
    const { tabsManager, panesManager } = await createManagers();

    panesManager.setLayout("split-2v");
    const secondPane = panesManager.panes.value[1]!;
    panesManager.selectPane(secondPane.id);
    panesManager.setSelectedPaneTab("tab-2");

    expect(
      panesManager.panes.value.find((pane) => pane.id === secondPane.id)?.tab
        ?.id
    ).toBe("tab-2");
    expect(tabsManager.tabs.value.some((tab) => tab.id === "tab-2")).toBe(true);
  });

  it("supports changing the tab for a pane", async () => {
    const { tabsManager, panesManager } = await createManagers();

    const nextTab = tabsManager.addTab();
    await waitForInitialLoad(nextTab.readingState);
    panesManager.setLayout("split-2v");
    const secondPane = panesManager.panes.value[1]!;

    panesManager.setPaneTab(secondPane.id, nextTab.id);

    expect(
      panesManager.panes.value.find((pane) => pane.id === secondPane.id)?.tab
        ?.id
    ).toBe(nextTab.id);
  });

  it("supports changing a pane to display an arbitrary component", async () => {
    const { panesManager } = await createManagers();

    panesManager.setSelectedPaneComponent("Test Component");

    const selectedPane = panesManager.panes.value.find(
      (pane) => pane.id === panesManager.selectedPaneId.value
    );
    expect(selectedPane?.component).toBe("Test Component");
    expect(selectedPane?.tab).toBeNull();
  });

  it("supports detaching a pane from the layout", async () => {
    const { panesManager } = await createManagers();

    panesManager.setSelectedPaneDetached(true);

    expect(panesManager.panes.value[0]?.detached).toBe(true);
  });

  it("supports opening a tab in a new pane", async () => {
    const { panesManager } = await createManagers();

    panesManager.openInNewPane("tab-2");

    expect(panesManager.panes.value).toHaveLength(2);
    expect(panesManager.layout.value).toBe("split-2v");
    expect(
      panesManager.panes.value.some((pane) => pane.tab?.id === "tab-2")
    ).toBe(true);
  });

  it("supports opening a tab in a detached pane", async () => {
    const { panesManager } = await createManagers();

    panesManager.openInDetachedPane("tab-2");

    const detachedPane = panesManager.panes.value.find(
      (pane) => pane.tab?.id === "tab-2"
    );
    expect(detachedPane?.detached).toBe(true);
  });

  it("supports opening a detached pane with a component", async () => {
    const { panesManager } = await createManagers();

    panesManager.openDetachedPane("Detached Component");

    const detachedPane = panesManager.panes.value.find(
      (pane) => pane.component === "Detached Component"
    );
    expect(detachedPane).toBeDefined();
    expect(detachedPane?.detached).toBe(true);
  });

  it("supports changing the layout", async () => {
    const { panesManager } = await createManagers();

    panesManager.setLayout("grid-2x2");

    expect(panesManager.layout.value).toBe("grid-2x2");
    expect(
      panesManager.panes.value.filter((pane) => !pane.detached)
    ).toHaveLength(4);
  });

  it("supports closing detached panes", async () => {
    const { panesManager } = await createManagers();

    const close = panesManager.openDetachedPane("Detached Component");
    const detachedPane = panesManager.panes.value.find(
      (pane) => pane.component === "Detached Component"
    );

    close?.();

    expect(detachedPane).toBeDefined();
    expect(
      panesManager.panes.value.some((pane) => pane.id === detachedPane!.id)
    ).toBe(false);
  });

  it("supports moving detached panes", async () => {
    const { panesManager } = await createManagers();

    panesManager.openDetachedPane("Detached Component");
    const detachedPane = panesManager.panes.value.find(
      (pane) => pane.component === "Detached Component"
    )!;

    panesManager.movePane(detachedPane.id, 10, 20);

    const movedPane = panesManager.panes.value.find(
      (pane) => pane.id === detachedPane.id
    );
    expect(movedPane?.x).toBe(detachedPane.x + 10);
    expect(movedPane?.y).toBe(detachedPane.y + 20);
  });

  it("supports resizing detached panes", async () => {
    const { panesManager } = await createManagers();

    panesManager.openDetachedPane("Detached Component");
    const detachedPane = panesManager.panes.value.find(
      (pane) => pane.component === "Detached Component"
    )!;

    panesManager.resizePane(detachedPane.id, 50, 60);

    const resizedPane = panesManager.panes.value.find(
      (pane) => pane.id === detachedPane.id
    );
    expect(resizedPane?.width).toBe(detachedPane.width + 50);
    expect(resizedPane?.height).toBe(detachedPane.height + 60);
  });
});
