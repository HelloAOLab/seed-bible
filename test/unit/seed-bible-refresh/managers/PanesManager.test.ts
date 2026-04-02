import { createPanes } from "@packages/seed-bible/seed-bible/managers/PanesManager";
import {
  createTabs,
  type ReaderTab,
} from "@packages/seed-bible/seed-bible/managers/TabsManager";
import { createBibleDataManager } from "@packages/seed-bible/seed-bible/managers/BibleDataManager";
import type { BibleReadingState } from "@packages/seed-bible/seed-bible/managers/BibleReadingManager";
import { FreeUseBibleAPI } from "@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI";
import {
  API_ENDPOINT,
  type WebResponseMap,
  createDefaultManagerResponseMap,
} from "./testUtils/mockBibleApiData";
import { signal } from "@preact/signals";

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

function createHighlightsManagerMock() {
  return {
    getChapterHighlights: jest.fn().mockReturnValue(signal({ highlights: [] })),
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
  setWebResponses(createDefaultManagerResponseMap());
  const tabsManager = createTabs(
    createDataManager(),
    createHighlightsManagerMock() as any
  );
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

  it("supports opening content in an existing pane", async () => {
    const { tabsManager, panesManager } = await createManagers();

    const nextTab = tabsManager.addTab();
    await waitForInitialLoad(nextTab.readingState);
    panesManager.setLayout("split-2v");
    const secondPane = panesManager.panes.value[1]!;

    const result = panesManager.openInPane(secondPane.id, {
      tabId: nextTab.id,
    });

    expect(result).toBe(true);
    expect(
      panesManager.panes.value.find((pane) => pane.id === secondPane.id)?.tab
        ?.id
    ).toBe(nextTab.id);
  });

  it("supports opening a component in an existing pane", async () => {
    const { panesManager } = await createManagers();

    const selectedPaneId = panesManager.selectedPaneId.value!;
    const result = panesManager.openInPane(selectedPaneId, {
      component: () => "Test Component",
    });

    expect(result).toBe(true);
    const selectedPane = panesManager.panes.value.find(
      (pane) => pane.id === selectedPaneId
    );
    expect(selectedPane?.component?.()).toBe("Test Component");
    expect(selectedPane?.tab).toBeNull();
  });

  it("rejects detaching the only attached pane", async () => {
    const { panesManager } = await createManagers();

    const result = panesManager.setDetached(
      panesManager.panes.value[0]!.id,
      true
    );

    expect(result).toBe(false);
    expect(panesManager.panes.value[0]?.detached).toBe(false);
  });

  it("supports opening a tab in a new attached pane", async () => {
    const { panesManager } = await createManagers();

    const result = panesManager.openPane({
      type: "attached",
      tabId: "tab-2",
    });

    expect(result).toBe(true);
    expect(panesManager.panes.value).toHaveLength(2);
    expect(panesManager.layout.value).toBe("split-2v");
    expect(
      panesManager.panes.value.some((pane) => pane.tab?.id === "tab-2")
    ).toBe(true);
  });

  it("supports opening a tab in a detached pane", async () => {
    const { panesManager } = await createManagers();

    const result = panesManager.openPane({
      type: "detached",
      tabId: "tab-2",
    });

    expect(result).toBe(true);
    const detachedPane = panesManager.panes.value.find(
      (pane) => pane.tab?.id === "tab-2"
    );
    expect(detachedPane?.detached).toBe(true);
  });

  it("supports opening a detached pane with a component", async () => {
    const { panesManager } = await createManagers();

    const result = panesManager.openPane({
      type: "detached",
      component: () => "Detached Component",
    });

    expect(result).toBe(true);
    const detachedPane = panesManager.panes.value.find(
      (pane) => pane.component?.() === "Detached Component"
    );
    expect(detachedPane).toBeDefined();
    expect(detachedPane?.detached).toBe(true);
  });

  it("supports opening a grid portal pane and syncing config tags", async () => {
    const { panesManager } = await createManagers();

    const result = panesManager.openPane({
      type: "attached",
      gridPortal: "home",
    });

    expect(result).toBe(true);
    const portalPane = panesManager.panes.value.find(
      (pane) => pane.gridPortal === "home"
    );
    expect(portalPane).toBeDefined();
    expect((globalThis as any).configBot.tags.gridPortal).toBe("home");
    expect((globalThis as any).configBot.tags.mapPortal ?? null).toBeNull();
  });

  it("supports replacing a grid portal pane with a map portal pane", async () => {
    const { panesManager } = await createManagers();

    panesManager.openPane({
      type: "attached",
      gridPortal: "home",
    });
    const gridPane = panesManager.panes.value.find(
      (pane) => pane.gridPortal === "home"
    )!;

    const result = panesManager.openInPane(gridPane.id, {
      mapPortal: "map_portal",
    });

    expect(result).toBe(true);
    expect(
      panesManager.panes.value.some((pane) => pane.gridPortal !== null)
    ).toBe(false);
    expect(
      panesManager.panes.value.some((pane) => pane.mapPortal === "map_portal")
    ).toBe(true);
    expect((globalThis as any).configBot.tags.gridPortal ?? null).toBeNull();
    expect((globalThis as any).configBot.tags.mapPortal).toBe("map_portal");
  });

  it("supports changing the layout", async () => {
    const { panesManager } = await createManagers();

    panesManager.setLayout("grid-2x2");

    expect(panesManager.layout.value).toBe("grid-2x2");
    expect(
      panesManager.panes.value.filter((pane) => !pane.detached)
    ).toHaveLength(4);
  });

  it("supports detaching and reattaching a pane", async () => {
    const { panesManager } = await createManagers();

    panesManager.openPane({
      type: "attached",
      tabId: "tab-2",
    });
    const secondPane = panesManager.panes.value.find(
      (pane) => pane.tab?.id === "tab-2"
    )!;

    const detachResult = panesManager.setDetached(secondPane.id, true);

    expect(detachResult).toBe(true);
    expect(
      panesManager.panes.value.find((pane) => pane.id === secondPane.id)
        ?.detached
    ).toBe(true);
    expect(panesManager.layout.value).toBe("single");

    const attachResult = panesManager.setDetached(secondPane.id, false);

    expect(attachResult).toBe(true);
    expect(
      panesManager.panes.value.find((pane) => pane.id === secondPane.id)
        ?.detached
    ).toBe(false);
    expect(panesManager.layout.value).toBe("split-2v");
  });

  it("supports closing detached panes", async () => {
    const { panesManager } = await createManagers();

    panesManager.openPane({
      type: "detached",
      component: () => "Detached Component",
    });
    const detachedPane = panesManager.panes.value.find(
      (pane) => pane.component?.() === "Detached Component"
    )!;

    const result = panesManager.closePane(detachedPane.id);

    expect(result).toBe(true);
    expect(
      panesManager.panes.value.some((pane) => pane.id === detachedPane.id)
    ).toBe(false);
  });

  it("supports closing attached panes by shrinking the layout", async () => {
    const { panesManager } = await createManagers();

    panesManager.openPane({
      type: "attached",
      tabId: "tab-2",
    });
    const secondPane = panesManager.panes.value.find(
      (pane) => pane.tab?.id === "tab-2"
    )!;

    const result = panesManager.closePane(secondPane.id);

    expect(result).toBe(true);
    expect(panesManager.layout.value).toBe("single");
    expect(
      panesManager.panes.value.filter((pane) => !pane.detached)
    ).toHaveLength(1);
  });

  it("rejects closing the only attached pane", async () => {
    const { panesManager } = await createManagers();

    const result = panesManager.closePane(panesManager.panes.value[0]!.id);

    expect(result).toBe(false);
    expect(
      panesManager.panes.value.filter((pane) => !pane.detached)
    ).toHaveLength(1);
  });

  it("supports moving detached panes", async () => {
    const { panesManager } = await createManagers();

    panesManager.openPane({
      type: "detached",
      component: () => "Detached Component",
    });
    const detachedPane = panesManager.panes.value.find(
      (pane) => pane.component?.() === "Detached Component"
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

    panesManager.openPane({
      type: "detached",
      component: () => "Detached Component",
    });
    const detachedPane = panesManager.panes.value.find(
      (pane) => pane.component?.() === "Detached Component"
    )!;

    panesManager.resizePane(detachedPane.id, 50, 60);

    const resizedPane = panesManager.panes.value.find(
      (pane) => pane.id === detachedPane.id
    );
    expect(resizedPane?.width).toBe(detachedPane.width + 50);
    expect(resizedPane?.height).toBe(detachedPane.height + 60);
  });
});
