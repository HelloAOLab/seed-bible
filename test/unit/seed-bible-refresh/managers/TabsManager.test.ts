import {
  createTabs,
  type ReaderTab,
} from "@packages/seed-bible/seed-bible/managers/TabsManager";
import { createBibleDataManager } from "@packages/seed-bible/seed-bible/managers/BibleDataManager";
import {
  createBibleReadingState,
  type BibleReadingState,
} from "@packages/seed-bible/seed-bible/managers/BibleReadingManager";
import type { BibleReadingSession } from "@packages/seed-bible/seed-bible/managers/SessionsManager";
import { FreeUseBibleAPI } from "@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI";
import {
  API_ENDPOINT,
  type WebResponseMap,
  createDefaultManagerResponseMap,
} from "./testUtils/mockBibleApiData";

let webGetMock: jest.Mock;
let botChangedListener: ((that: unknown) => Promise<void> | void) | null;
let logSpy: jest.SpyInstance;

beforeEach(() => {
  webGetMock = jest.fn();
  botChangedListener = null;
  logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);

  (globalThis as any).web = {
    get: webGetMock,
  };

  (globalThis as any).configBot = {
    tags: {},
  };

  (globalThis as any).os = {
    addBotListener: jest.fn(
      (_bot: unknown, event: string, listener: typeof botChangedListener) => {
        if (event === "onBotChanged") {
          botChangedListener = listener;
        }
      }
    ),
  };
});

afterEach(() => {
  logSpy.mockRestore();
  delete (globalThis as any).web;
  delete (globalThis as any).configBot;
  delete (globalThis as any).os;
});

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

function createDataManager() {
  return createBibleDataManager(createApi());
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

describe("createTabs", () => {
  it("addTab() creates a new tab with new reading state", async () => {
    setWebResponses(createDefaultManagerResponseMap());
    const manager = createTabs(createDataManager());
    await waitForTabsToLoad(manager.tabs.value);

    const existingReadingStates = manager.tabs.value.map(
      (tab) => tab.readingState
    );

    const nextTab = manager.addTab();
    await waitForInitialLoad(nextTab.readingState);

    expect(manager.tabs.value).toHaveLength(3);
    expect(manager.tabs.value[2]).toBe(nextTab);
    expect(existingReadingStates).not.toContain(nextTab.readingState);
    expect(nextTab.id).toBe("tab-3");
    expect(nextTab.title).toBe("Tab 3");
    expect(nextTab.sharedSession).toBeNull();
    expect(manager.selectedTabId.value).toBe(nextTab.id);
  });

  it("addTab() accepts a shared reading session for the new tab", async () => {
    setWebResponses(createDefaultManagerResponseMap());
    const manager = createTabs(createDataManager());
    await waitForTabsToLoad(manager.tabs.value);

    const sharedSession = {
      id: "session-123",
      readingState: manager.tabs.value[0]!.readingState,
      document: {} as SharedDocument,
      dispose: jest.fn(),
    } as BibleReadingSession;

    const nextTab = manager.addTab(sharedSession);

    expect(nextTab.readingState).toBe(sharedSession.readingState);
    expect(nextTab.sharedSession).toBe(sharedSession);
    expect(manager.selectedTabId.value).toBe(nextTab.id);
  });

  it("addTab() accepts a reading state for the new tab", async () => {
    setWebResponses(createDefaultManagerResponseMap());
    const dataManager = createDataManager();
    const manager = createTabs(dataManager);
    await waitForTabsToLoad(manager.tabs.value);

    const readingState = createBibleReadingState(dataManager);

    const nextTab = manager.addTab(readingState);

    expect(nextTab.readingState).toBe(readingState);
    expect(nextTab.sharedSession).toBeNull();
    expect(manager.selectedTabId.value).toBe(nextTab.id);
  });

  it("removeTab() removes the given tab", async () => {
    setWebResponses(createDefaultManagerResponseMap());
    const manager = createTabs(createDataManager());
    await waitForTabsToLoad(manager.tabs.value);

    manager.removeTab("tab-2");

    expect(manager.tabs.value).toHaveLength(1);
    expect(manager.tabs.value.some((tab) => tab.id === "tab-2")).toBe(false);
  });

  it("selectTab() sets the selected tab", async () => {
    setWebResponses(createDefaultManagerResponseMap());
    const manager = createTabs(createDataManager());
    await waitForTabsToLoad(manager.tabs.value);

    manager.selectTab("tab-2");

    expect(manager.selectedTabId.value).toBe("tab-2");
  });

  it("syncs the selected tab to match configBot", async () => {
    setWebResponses(createDefaultManagerResponseMap());
    const manager = createTabs(createDataManager());
    await waitForTabsToLoad(manager.tabs.value);
    manager.selectTab("tab-2");

    (globalThis as any).configBot.tags.translation = "NIV";
    (globalThis as any).configBot.tags.book = "MAT";
    (globalThis as any).configBot.tags.chapter = 1;

    await botChangedListener?.({
      tags: ["translation", "book", "chapter"],
    });

    const selectedTab = manager.tabs.value.find(
      (tab) => tab.id === manager.selectedTabId.value
    );
    expect(selectedTab).toBeDefined();
    await waitForInitialLoad(selectedTab!.readingState);

    expect(selectedTab!.readingState.translationId.value).toBe("NIV");
    expect(selectedTab!.readingState.bookId.value).toBe("MAT");
    expect(selectedTab!.readingState.chapterNumber.value).toBe(1);
  });
});
