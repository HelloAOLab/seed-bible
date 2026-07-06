import { createPanes } from "@packages/seed-bible/seed-bible/managers/PanesManager";
import {
  createTabs,
  type ReaderTab,
} from "@packages/seed-bible/seed-bible/managers/TabsManager";
import { createBibleDataManager } from "@packages/seed-bible/seed-bible/managers/BibleDataManager";
import type { BibleReadingState } from "@packages/seed-bible/seed-bible/managers/BibleReadingManager";
import { FreeUseBibleAPI } from "@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI";
import {
  EXAMPLE_API_ENDPOINT,
  type WebResponseMap,
  createExampleManagerResponseMap,
} from "./testUtils/mockBibleApiData";
import { effect, signal } from "@preact/signals";
import { createNavigationManager } from "@packages/seed-bible/seed-bible/managers/NavigationManager";
import type { Mock } from "vitest";
import { createI18nManager } from "@packages/seed-bible/seed-bible/i18n";

let fetchMock: Mock;
let logSpy: Mock;
const originalFetch = globalThis.fetch;

beforeEach(() => {
  fetchMock = vi.fn();
  logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

  globalThis.fetch = fetchMock;
});

afterEach(() => {
  logSpy.mockRestore();
  globalThis.fetch = originalFetch;
});

function setWebResponses(responses: WebResponseMap): void {
  fetchMock.mockImplementation((url: string) => {
    const response = responses[url];
    if (!response) {
      throw new Error(`No mocked response for ${url}`);
    }
    return Promise.resolve(response);
  });
}

function createApi(): FreeUseBibleAPI {
  return new FreeUseBibleAPI(EXAMPLE_API_ENDPOINT);
}

function createDataManager() {
  return createBibleDataManager(createApi());
}

function createHighlightsManagerMock() {
  return {
    getChapterHighlights: vi.fn().mockReturnValue(signal({ highlights: [] })),
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

async function createManagers(options: { extraTabs?: number } = {}) {
  setWebResponses(createExampleManagerResponseMap());
  const navigation = createNavigationManager();
  const tabsManager = createTabs(
    navigation,
    createDataManager(),
    createHighlightsManagerMock() as any,
    {} as any,
    createI18nManager(navigation, ["en"])
  );
  await waitForTabsToLoad(tabsManager.tabs.value);
  const initialSelectedTabId = tabsManager.selectedTabId.value;
  const extraTabs = options.extraTabs ?? 0;
  for (let i = 0; i < extraTabs; i++) {
    const extraTab = tabsManager.addTab();
    await waitForInitialLoad(extraTab.readingState);
  }
  if (extraTabs > 0) {
    tabsManager.selectTab(initialSelectedTabId);
  }
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
    const { tabsManager, panesManager } = await createManagers({
      extraTabs: 1,
    });

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

  it("redirects setSelectedPaneTab to a tab-backed pane when the selected pane is component-backed", async () => {
    const { panesManager } = await createManagers({ extraTabs: 1 });

    panesManager.setLayout("split-2v");
    const [firstPane, secondPane] = panesManager.panes.value;

    // Make the selected pane component-backed.
    panesManager.openInPane(secondPane!.id, {
      component: () => "Test Component",
    });
    panesManager.selectPane(secondPane!.id);

    panesManager.setSelectedPaneTab("tab-2");

    // The component pane must be left untouched...
    const componentPane = panesManager.panes.value.find(
      (pane) => pane.id === secondPane!.id
    );
    expect(componentPane?.component?.()).toBe("Test Component");
    expect(componentPane?.tab).toBeNull();

    // ...and the tab must land on the other, tab-backed pane instead.
    const tabPane = panesManager.panes.value.find(
      (pane) => pane.id === firstPane!.id
    );
    expect(tabPane?.tab?.id).toBe("tab-2");
  });

  it("replaces the first attached pane when there is no tab-backed pane to redirect to", async () => {
    const { panesManager } = await createManagers({ extraTabs: 1 });

    panesManager.setLayout("split-2v");
    const [firstPane, secondPane] = panesManager.panes.value;

    // Make every attached pane component-backed so there is no tab-backed pane
    // to redirect to.
    panesManager.openInPane(firstPane!.id, {
      component: () => "First Component",
    });
    panesManager.openInPane(secondPane!.id, {
      component: () => "Second Component",
    });
    // Even with the second pane selected, the fallback targets the first
    // attached pane.
    panesManager.selectPane(secondPane!.id);

    panesManager.setSelectedPaneTab("tab-2");

    // The first attached pane is replaced with the tab...
    const replaced = panesManager.panes.value.find(
      (p) => p.id === firstPane!.id
    );
    expect(replaced?.tab?.id).toBe("tab-2");
    expect(replaced?.component).toBeNull();

    // ...and the other component pane is left untouched.
    const untouched = panesManager.panes.value.find(
      (p) => p.id === secondPane!.id
    );
    expect(untouched?.component?.()).toBe("Second Component");
    expect(untouched?.tab).toBeNull();
  });

  it("creates a new attached pane when there are no attached panes to replace", async () => {
    const { panesManager } = await createManagers({ extraTabs: 1 });

    // Construct a state where the only pane is detached and component-backed,
    // so neither a tab-backed pane nor an attached pane exists to reuse.
    const detachedPane = panesManager.openPane({
      type: "detached",
      component: () => "Detached Component",
    })!;
    panesManager.panes.value = panesManager.panes.value.filter(
      (p) => p.detached
    );
    panesManager.selectedPaneId.value = detachedPane.id;

    panesManager.setSelectedPaneTab("tab-2");

    // A brand new attached pane is created to hold the tab.
    const attached = panesManager.panes.value.filter((p) => !p.detached);
    expect(attached).toHaveLength(1);
    expect(attached[0]?.tab?.id).toBe("tab-2");

    // The detached component pane is preserved.
    expect(
      panesManager.panes.value.some(
        (p) => p.detached && p.component?.() === "Detached Component"
      )
    ).toBe(true);
  });

  it("does not cause update cycles when called from inside an effect", async () => {
    const { panesManager } = await createManagers({ extraTabs: 1 });

    const targetTabId = signal("tab-1");
    let runCount = 0;

    // setSelectedPaneTab reads and writes the panes signal; calling it from an
    // effect must not create a self-triggering update cycle.
    const dispose = effect(() => {
      runCount += 1;
      panesManager.setSelectedPaneTab(targetTabId.value);
    });

    expect(() => {
      targetTabId.value = "tab-2";
    }).not.toThrow();

    expect(panesManager.panes.value.some((p) => p.tab?.id === "tab-2")).toBe(
      true
    );
    // The effect must settle after a bounded number of runs rather than loop.
    expect(runCount).toBeLessThan(10);

    dispose();
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
    const { panesManager } = await createManagers({ extraTabs: 1 });

    const result = panesManager.openPane({
      type: "attached",
      tabId: "tab-2",
    });

    expect(result).not.toBeNull();
    expect(result?.tab?.id).toBe("tab-2");
    expect(panesManager.panes.value).toHaveLength(2);
    expect(panesManager.layout.value).toBe("split-2v");
  });

  it("supports opening a tab in a detached pane", async () => {
    const { panesManager } = await createManagers({ extraTabs: 1 });

    const result = panesManager.openPane({
      type: "detached",
      tabId: "tab-2",
    });

    expect(result).not.toBeNull();
    expect(result?.tab?.id).toBe("tab-2");
    expect(result?.detached).toBe(true);
  });

  it("supports opening a detached pane with a component", async () => {
    const { panesManager } = await createManagers();

    const result = panesManager.openPane({
      type: "detached",
      component: () => "Detached Component",
    });

    expect(result).not.toBeNull();
    expect(result?.component?.()).toBe("Detached Component");
    expect(result?.detached).toBe(true);
  });

  it("supports opening a grid portal pane", async () => {
    const { panesManager } = await createManagers();

    const result = panesManager.openPane({
      type: "attached",
      gridPortal: "home",
    });

    expect(result).not.toBeNull();
    expect(result?.gridPortal).toBe("home");
    expect(result?.mapPortal).toBeNull();
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
  });

  it("supports multiple attached panes each with their own grid/map portal", async () => {
    const { panesManager } = await createManagers();

    panesManager.openPane({
      type: "attached",
      gridPortal: "home",
    });
    panesManager.openPane({
      type: "attached",
      mapPortal: "map_portal",
    });

    const portalPanes = panesManager.panes.value.filter(
      (pane) => pane.gridPortal !== null || pane.mapPortal !== null
    );

    // Opening a second portal pane no longer clears the first one.
    expect(
      panesManager.panes.value.some((pane) => pane.gridPortal === "home")
    ).toBe(true);
    expect(
      panesManager.panes.value.some((pane) => pane.mapPortal === "map_portal")
    ).toBe(true);
    expect(portalPanes).toHaveLength(2);
  });

  it("supports changing the layout", async () => {
    const { panesManager } = await createManagers();

    panesManager.setLayout("grid-2x2");

    expect(panesManager.layout.value).toBe("grid-2x2");
    expect(
      panesManager.panes.value.filter((pane) => !pane.detached)
    ).toHaveLength(4);
  });

  it("keeps panes in place when re-applying a layout with a non-first pane selected", async () => {
    const { panesManager } = await createManagers({ extraTabs: 1 });

    panesManager.openPane({ type: "attached", tabId: "tab-2" });
    const attachedBefore = panesManager.panes.value.filter(
      (pane) => !pane.detached
    );
    const firstPaneId = attachedBefore[0]!.id;
    const firstPaneTabId = attachedBefore[0]!.tab?.id;

    // Select the second (right) pane, then re-apply the same layout. The
    // content must not jump to the first slot, otherwise clicking the first
    // pane would select the wrong tab.
    panesManager.selectPane(attachedBefore[1]!.id);
    panesManager.setLayout("split-2v");

    const attachedAfter = panesManager.panes.value.filter(
      (pane) => !pane.detached
    );
    expect(attachedAfter[0]!.id).toBe(firstPaneId);
    expect(attachedAfter[0]!.tab?.id).toBe(firstPaneTabId);
  });

  it("keeps the selected pane's content when shrinking the layout", async () => {
    const { panesManager } = await createManagers({ extraTabs: 1 });

    panesManager.openPane({ type: "attached", tabId: "tab-2" });
    const secondPane = panesManager.panes.value.find(
      (pane) => pane.tab?.id === "tab-2"
    )!;
    panesManager.selectPane(secondPane.id);

    // Collapsing to a single slot should retain the focused pane's tab.
    panesManager.setLayout("single");

    const attached = panesManager.panes.value.filter((pane) => !pane.detached);
    expect(attached).toHaveLength(1);
    expect(attached[0]!.tab?.id).toBe("tab-2");
  });

  it("supports detaching and reattaching a pane", async () => {
    const { panesManager } = await createManagers({ extraTabs: 1 });

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
    const { panesManager } = await createManagers({ extraTabs: 1 });

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

  it("supports positioning detached panes", async () => {
    const { panesManager } = await createManagers();

    panesManager.openPane({
      type: "detached",
      component: () => "Detached Component",
    });
    const detachedPane = panesManager.panes.value.find(
      (pane) => pane.component?.() === "Detached Component"
    )!;

    panesManager.setPanePosition(detachedPane.id, 120, 240);

    const movedPane = panesManager.panes.value.find(
      (pane) => pane.id === detachedPane.id
    );
    expect(movedPane?.x).toBe(120);
    expect(movedPane?.y).toBe(240);
  });

  it("never positions a detached pane above/left of the origin", async () => {
    const { panesManager } = await createManagers();

    panesManager.openPane({
      type: "detached",
      component: () => "Detached Component",
    });
    const detachedPane = panesManager.panes.value.find(
      (pane) => pane.component?.() === "Detached Component"
    )!;

    panesManager.setPanePosition(detachedPane.id, -500, -500);

    const movedPane = panesManager.panes.value.find(
      (pane) => pane.id === detachedPane.id
    )!;
    expect(movedPane.x).toBe(0);
    expect(movedPane.y).toBe(0);
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

    panesManager.resizePane(detachedPane.id, 50, 60, 1);

    const resizedPane = panesManager.panes.value.find(
      (pane) => pane.id === detachedPane.id
    );
    expect(resizedPane?.width).toBe(detachedPane.width + 50);
    expect(resizedPane?.height).toBe(detachedPane.height + 60);
  });

  it("scales the detached-pane min-size floor by the UI text scale", async () => {
    const { panesManager } = await createManagers();

    panesManager.openPane({
      type: "detached",
      component: () => "Detached Component",
    });
    const detachedPane = panesManager.panes.value.find(
      (pane) => pane.component?.() === "Detached Component"
    )!;

    // Shrink well past the minimum at UI scale 1.3 (XL): the floating floor is
    // 280*1.3 wide / 180*1.3 tall, so the pane clamps to the scaled floor.
    panesManager.resizePane(detachedPane.id, -1000, -1000, 1.3);

    const resizedPane = panesManager.panes.value.find(
      (pane) => pane.id === detachedPane.id
    );
    expect(resizedPane?.width).toBe(280 * 1.3);
    expect(resizedPane?.height).toBe(180 * 1.3);
  });

  it("creates an attached pane with a stable custom ID", async () => {
    const { panesManager } = await createManagers();

    const result = panesManager.openPane({
      type: "attached",
      id: "my-custom-pane",
      component: () => "Custom ID Pane",
    });

    expect(result).not.toBeNull();
    expect(result?.id).toBe("my-custom-pane");
    expect(
      panesManager.panes.value.find((pane) => pane.id === "my-custom-pane")
    ).toBeDefined();
  });

  it("creates a detached pane with a stable custom ID", async () => {
    const { panesManager } = await createManagers();

    const result = panesManager.openPane({
      type: "detached",
      id: "my-detached-pane",
      component: () => "Detached Custom ID",
    });

    expect(result).not.toBeNull();
    expect(result?.id).toBe("my-detached-pane");
    expect(result?.detached).toBe(true);
  });

  it("reuses an existing pane when its ID is provided", async () => {
    const { panesManager } = await createManagers();

    panesManager.openPane({
      type: "attached",
      id: "reusable-pane",
      component: () => "First Content",
    });

    const result = panesManager.openPane({
      type: "attached",
      id: "reusable-pane",
      component: () => "Updated Content",
    });

    expect(result?.id).toBe("reusable-pane");
    expect(result?.component?.()).toBe("Updated Content");
    expect(
      panesManager.panes.value.filter((pane) => pane.id === "reusable-pane")
    ).toHaveLength(1);
  });

  it("does not create a duplicate pane when reusing an ID", async () => {
    const { panesManager } = await createManagers({ extraTabs: 1 });
    const initialPaneCount = panesManager.panes.value.length;

    panesManager.openPane({
      type: "attached",
      id: "stable-pane",
      tabId: "tab-2",
    });

    const afterFirst = panesManager.panes.value.length;

    panesManager.openPane({
      type: "attached",
      id: "stable-pane",
      tabId: "tab-1",
    });

    expect(panesManager.panes.value.length).toBe(afterFirst);
    expect(panesManager.panes.value.length).toBeGreaterThan(initialPaneCount);
  });
});
