import { createPanes } from "@packages/seed-bible-refresh/seed-bible/managers/PanesManager";
import {
  createTabs,
  type ReaderTab,
} from "@packages/seed-bible-refresh/seed-bible/managers/TabsManager";
import { createBibleDataManager } from "@packages/seed-bible-refresh/seed-bible/managers/BibleDataManager";
import type { BibleReadingState } from "@packages/seed-bible-refresh/seed-bible/managers/BibleReadingManager";
import { FreeUseBibleAPI } from "@packages/seed-bible-refresh/seed-bible/managers/FreeUseBibleAPI";
import {
  API_ENDPOINT,
  type WebResponseMap,
  createDefaultManagerResponseMap,
} from "./testUtils/mockBibleApiData";

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
  const tabsManager = createTabs(createDataManager());
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
