/** @jest-environment ./test/env/CasualOSEnvironment.ts */

import { createSeedBibleState } from "@packages/seed-bible-refresh/seed-bible/managers/SeedBibleStateManager";
import { registerExtension } from "seed-bible.app.api";
import type { BibleReadingState } from "@packages/seed-bible-refresh/seed-bible/managers/BibleReadingManager";
import {
  type WebResponseMap,
  createDefaultManagerResponseMap,
} from "./testUtils/mockBibleApiData";

jest.mock("seed-bible.i18n.I18nManager", () => ({
  I18nProvider: ({ children }: { children: unknown }) => children,
}));

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
    ...(globalThis as any).os,
    addBotListener: jest.fn(),
  };
});

afterEach(() => {
  logSpy.mockRestore();
  delete (globalThis as any).web;
  delete (globalThis as any).configBot;
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

async function waitForTabsToLoad(
  state: ReturnType<typeof createSeedBibleState>
) {
  await Promise.all(
    state.tabs.tabs.value.map((tab) => waitForInitialLoad(tab.readingState))
  );
}

async function createState() {
  setWebResponses(createDefaultManagerResponseMap());
  const state = createSeedBibleState();
  await waitForTabsToLoad(state);
  return state;
}

describe("createSeedBibleState", () => {
  it("created with default values", async () => {
    const state = await createState();

    expect(state.config.config.value.disablePanels).toBe(false);
    expect(state.app.panelsEnabled.value).toBe(true);

    expect(state.tabs.tabs.value).toHaveLength(2);
    expect(state.tabs.selectedTabId.value).toBe("tab-1");
    expect(state.app.selectedTab.value?.id).toBe("tab-1");

    expect(state.panes.panes.value).toHaveLength(1);
    expect(state.panes.panes.value[0]?.tab?.id).toBe("tab-1");
    expect(state.panes.selectedPaneId.value).toBe(
      state.panes.panes.value[0]?.id ?? null
    );

    expect(state.selector.isOpen.value).toBe(false);
  });

  it("registered extensions are initialized", async () => {
    const state = await createState();
    const init = jest.fn(() => [] as Array<() => void>);

    const unregister = registerExtension({
      id: "test.seed-bible.extension",
      init,
    });

    expect(init).toHaveBeenCalledTimes(1);
    expect(init).toHaveBeenCalledWith(state);

    unregister();
  });

  it("selecting a tab selects the tab and switches the pane to display the selected tab", async () => {
    const state = await createState();

    state.panes.setLayout("split-2v");
    const firstPane = state.panes.panes.value[0]!;
    const secondPane = state.panes.panes.value[1]!;
    state.panes.openInPane(secondPane.id, {
      tabId: "tab-2",
    });
    state.panes.selectPane(firstPane.id);

    state.app.selectTab("tab-2");

    const selectedPane = state.panes.panes.value.find(
      (pane) => pane.id === state.panes.selectedPaneId.value
    );

    expect(state.tabs.selectedTabId.value).toBe("tab-2");
    expect(selectedPane?.tab?.id).toBe("tab-2");
  });

  it("adding a tab creates the tab, and displays it in the selected pane", async () => {
    const state = await createState();
    const selectedPaneId = state.panes.selectedPaneId.value;
    const previousTabCount = state.tabs.tabs.value.length;

    state.app.addTab();

    const newTab = state.tabs.tabs.value[previousTabCount]!;
    const selectedPane = state.panes.panes.value.find(
      (pane) => pane.id === selectedPaneId
    );

    expect(state.tabs.tabs.value).toHaveLength(previousTabCount + 1);
    expect(state.tabs.selectedTabId.value).toBe(newTab.id);
    expect(selectedPane?.tab?.id).toBe(newTab.id);
  });

  it("tabs can be opened in new panes", async () => {
    const state = await createState();

    state.app.openInNewPane("tab-2");

    expect(state.panes.panes.value).toHaveLength(2);
    expect(
      state.panes.panes.value.some((pane) => pane.tab?.id === "tab-2")
    ).toBe(true);
    expect(state.tabs.selectedTabId.value).toBe("tab-2");
  });

  it("selecting a pane that has a tab also selects the tab for the pane", async () => {
    const state = await createState();

    state.panes.setLayout("split-2v");
    const secondPane = state.panes.panes.value[1]!;
    state.panes.openInPane(secondPane.id, {
      tabId: "tab-2",
    });
    state.app.selectPane(secondPane.id);

    expect(state.panes.selectedPaneId.value).toBe(secondPane.id);
    expect(state.tabs.selectedTabId.value).toBe("tab-2");
  });

  it("selecting a pane that has a grid portal doesn't open the bible selector", async () => {
    const state = await createState();

    state.panes.openPane({
      type: "attached",
      gridPortal: "test_portal",
    });
    const secondPane = state.panes.panes.value[1]!;
    state.app.selectPane(secondPane.id);

    expect(state.panes.selectedPaneId.value).toBe(secondPane.id);
    expect(state.selector.isOpen.value).toBe(false);
  });

  it("selecting a pane that has a map portal doesn't open the bible selector", async () => {
    const state = await createState();

    state.panes.openPane({
      type: "attached",
      mapPortal: "test_portal",
    });
    const secondPane = state.panes.panes.value[1]!;
    state.app.selectPane(secondPane.id);

    expect(state.panes.selectedPaneId.value).toBe(secondPane.id);
    expect(state.selector.isOpen.value).toBe(false);
  });

  it("selecting an empty pane opens the bible selector", async () => {
    const state = await createState();

    state.panes.setLayout("split-2v");
    const emptyPane =
      state.panes.panes.value.find(
        (pane) => pane.tab === null && pane.component === null
      ) ?? null;

    expect(emptyPane).not.toBeNull();

    state.app.selectPane(emptyPane!.id);
    await waitFor(() => state.selector.isOpen.value === true);

    expect(state.selector.isOpen.value).toBe(true);
    expect(state.selector.pane.value?.id).toBe(emptyPane!.id);
  });
});
