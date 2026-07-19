import { createTabsLayout } from "@packages/seed-bible/seed-bible/managers/TabsLayoutManager";
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
import { effect, signal, type ReadonlySignal } from "@preact/signals";
import { createNavigationManager } from "@packages/seed-bible/seed-bible/managers/NavigationManager";
import type { Mock } from "vitest";
import { createI18nManager } from "@packages/seed-bible/seed-bible/i18n";
import type { LoginManager } from "@packages/seed-bible/seed-bible/managers";

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
export function createLoginManager(): LoginManager {
  return {
    userId: signal<string | null>(null),
    profile: signal(null),
  } as LoginManager;
}

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

async function createManagers(
  options: {
    extraTabs?: number;
    panelsEnabled?: ReadonlySignal<boolean>;
  } = {}
) {
  setWebResponses(createExampleManagerResponseMap());
  const navigation = createNavigationManager();
  const tabsManager = createTabs(
    createLoginManager(),
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
  const panelsEnabled = options.panelsEnabled ?? signal(true);
  const tabsLayout = createTabsLayout(tabsManager, panelsEnabled);
  return { tabsManager, tabsLayout };
}

describe("createTabsLayout", () => {
  it("initializes with a single slot bound to the selected tab", async () => {
    const { tabsManager, tabsLayout } = await createManagers();

    expect(tabsLayout.layout.value).toBe("single");
    expect(tabsLayout.slots.value).toHaveLength(1);
    expect(tabsLayout.slots.value[0]?.tab?.id).toBe(
      tabsManager.selectedTabId.value
    );
    expect(tabsLayout.selectedSlotId.value).toBe(
      tabsLayout.slots.value[0]?.id ?? null
    );
  });

  describe("setLayout", () => {
    it.each([
      ["split-2v", 2],
      ["split-left-two-right", 3],
      ["split-3v", 3],
      ["grid-2x2", 4],
      ["split-4v", 4],
    ] as const)(
      "creates the right number of slots for the %s preset",
      async (layoutId, slotCount) => {
        const { tabsLayout } = await createManagers();

        tabsLayout.setLayout(layoutId);

        expect(tabsLayout.layout.value).toBe(layoutId);
        expect(tabsLayout.slots.value).toHaveLength(slotCount);
      }
    );

    it("collapses to a single slot for the stacked-2 layout id", async () => {
      // "stacked-2" is intentionally absent from TAB_SLOT_LAYOUT_OPTIONS: it is
      // never a user-selectable preset and is only ever produced by the app's
      // *effective* layout computation for a mobile viewport (which reads
      // `layout`/`slots` but never calls `setLayout("stacked-2")`). Calling
      // setLayout directly with it falls through to the "unknown layout id"
      // slot-count fallback of 1.
      const { tabsLayout } = await createManagers();

      tabsLayout.setLayout("stacked-2");

      expect(tabsLayout.layout.value).toBe("stacked-2");
      expect(tabsLayout.slots.value).toHaveLength(1);
    });

    it("forces the layout to single when panelsEnabled is false", async () => {
      const { tabsLayout } = await createManagers({
        panelsEnabled: signal(false),
      });

      tabsLayout.setLayout("grid-2x2");

      expect(tabsLayout.layout.value).toBe("single");
      expect(tabsLayout.slots.value).toHaveLength(1);
    });

    it("keeps slots in place when re-applying a layout with a non-first slot selected", async () => {
      const { tabsLayout } = await createManagers({ extraTabs: 1 });

      tabsLayout.setLayout("split-2v");
      const before = tabsLayout.slots.value;
      const firstSlotId = before[0]!.id;
      const firstSlotTabId = before[0]!.tab?.id;

      // Select the second (right) slot, then re-apply the same layout. The
      // content must not jump to the first slot, otherwise clicking the first
      // slot would select the wrong tab.
      tabsLayout.selectSlot(before[1]!.id);
      tabsLayout.setLayout("split-2v");

      const after = tabsLayout.slots.value;
      expect(after[0]!.id).toBe(firstSlotId);
      expect(after[0]!.tab?.id).toBe(firstSlotTabId);
    });

    it("keeps the selected slot's tab when shrinking the layout", async () => {
      const { tabsLayout } = await createManagers({ extraTabs: 1 });

      tabsLayout.setLayout("split-2v");
      const secondSlot = tabsLayout.slots.value[1]!;
      // Explicitly show tab-2 in the second slot — setLayout only
      // redistributes tabs that slots already reference, it never pulls in
      // tabs from the tabs list on its own.
      tabsLayout.openTabInSlot(secondSlot.id, "tab-2");
      tabsLayout.selectSlot(secondSlot.id);

      // Collapsing to a single slot should retain the focused slot's tab.
      tabsLayout.setLayout("single");

      expect(tabsLayout.slots.value).toHaveLength(1);
      expect(tabsLayout.slots.value[0]!.tab?.id).toBe("tab-2");
    });

    it("deduplicates a tab that ends up referenced by two slots", async () => {
      const { tabsLayout } = await createManagers();

      tabsLayout.setLayout("split-2v");
      const [firstSlot, secondSlot] = tabsLayout.slots.value;
      const sharedTabId = firstSlot!.tab!.id;

      // openTabInSlot performs no dedup of its own, so this can transiently
      // put the same tab in two slots at once.
      tabsLayout.openTabInSlot(secondSlot!.id, sharedTabId);
      expect(tabsLayout.slots.value[0]!.tab?.id).toBe(sharedTabId);
      expect(tabsLayout.slots.value[1]!.tab?.id).toBe(sharedTabId);

      // Re-applying a layout re-derives slot content and drops duplicates.
      tabsLayout.setLayout("split-2v");

      const tabIds = tabsLayout.slots.value.map((slot) => slot.tab?.id);
      expect(tabIds.filter((id) => id === sharedTabId)).toHaveLength(1);
      expect(tabsLayout.slots.value[1]!.tab).toBeNull();
    });
  });

  describe("selectSlot", () => {
    it("supports selecting a slot", async () => {
      const { tabsLayout } = await createManagers();

      tabsLayout.setLayout("split-2v");
      const secondSlot = tabsLayout.slots.value[1]!;

      tabsLayout.selectSlot(secondSlot.id);

      expect(tabsLayout.selectedSlotId.value).toBe(secondSlot.id);
    });

    it("ignores an unknown slot id", async () => {
      const { tabsLayout } = await createManagers();
      const originalSelectedId = tabsLayout.selectedSlotId.value;

      tabsLayout.selectSlot("does-not-exist");

      expect(tabsLayout.selectedSlotId.value).toBe(originalSelectedId);
    });
  });

  describe("setSelectedSlotTab", () => {
    it("sets tab content on the currently selected slot", async () => {
      const { tabsManager, tabsLayout } = await createManagers({
        extraTabs: 1,
      });

      tabsLayout.setLayout("split-2v");
      const secondSlot = tabsLayout.slots.value[1]!;
      tabsLayout.selectSlot(secondSlot.id);

      tabsLayout.setSelectedSlotTab("tab-2");

      expect(
        tabsLayout.slots.value.find((slot) => slot.id === secondSlot.id)?.tab
          ?.id
      ).toBe("tab-2");
      expect(tabsManager.tabs.value.some((tab) => tab.id === "tab-2")).toBe(
        true
      );
    });

    it("ignores an empty tab id", async () => {
      const { tabsLayout } = await createManagers();
      const before = tabsLayout.slots.value[0]!.tab?.id;

      tabsLayout.setSelectedSlotTab("");

      expect(tabsLayout.slots.value[0]!.tab?.id).toBe(before);
    });

    it("ignores an unknown tab id", async () => {
      const { tabsLayout } = await createManagers();
      const before = tabsLayout.slots.value[0]!.tab?.id;

      tabsLayout.setSelectedSlotTab("does-not-exist");

      expect(tabsLayout.slots.value[0]!.tab?.id).toBe(before);
    });

    it("does not cause update cycles when called from inside an effect", async () => {
      const { tabsLayout } = await createManagers({ extraTabs: 1 });

      const targetTabId = signal("tab-1");
      let runCount = 0;

      // setSelectedSlotTab reads and writes the slots signal; calling it from
      // an effect must not create a self-triggering update cycle.
      const dispose = effect(() => {
        runCount += 1;
        tabsLayout.setSelectedSlotTab(targetTabId.value);
      });

      expect(() => {
        targetTabId.value = "tab-2";
      }).not.toThrow();

      expect(
        tabsLayout.slots.value.some((slot) => slot.tab?.id === "tab-2")
      ).toBe(true);
      // The effect must settle after a bounded number of runs rather than loop.
      expect(runCount).toBeLessThan(10);

      dispose();
    });
  });

  describe("openTabInSlot", () => {
    it("opens an existing tab into an existing slot and selects it", async () => {
      const { tabsManager, tabsLayout } = await createManagers();

      const nextTab = tabsManager.addTab();
      await waitForInitialLoad(nextTab.readingState);
      tabsLayout.setLayout("split-2v");
      const secondSlot = tabsLayout.slots.value[1]!;

      const result = tabsLayout.openTabInSlot(secondSlot.id, nextTab.id);

      expect(result).toBe(true);
      expect(
        tabsLayout.slots.value.find((slot) => slot.id === secondSlot.id)?.tab
          ?.id
      ).toBe(nextTab.id);
      expect(tabsLayout.selectedSlotId.value).toBe(secondSlot.id);
    });

    it("returns false for an unknown tab id", async () => {
      const { tabsLayout } = await createManagers();
      const firstSlot = tabsLayout.slots.value[0]!;

      const result = tabsLayout.openTabInSlot(firstSlot.id, "does-not-exist");

      expect(result).toBe(false);
    });

    it("returns false for an unknown slot id", async () => {
      const { tabsManager, tabsLayout } = await createManagers();

      const result = tabsLayout.openTabInSlot(
        "does-not-exist",
        tabsManager.selectedTabId.value
      );

      expect(result).toBe(false);
    });
  });

  describe("openTabInNewSlot", () => {
    it("opens a tab that isn't currently shown into a new slot without cloning it", async () => {
      const { tabsManager, tabsLayout } = await createManagers({
        extraTabs: 1,
      });
      const tabCountBefore = tabsManager.tabs.value.length;

      const result = tabsLayout.openTabInNewSlot("tab-2");

      expect(result).not.toBeNull();
      expect(result?.tab?.id).toBe("tab-2");
      expect(tabsLayout.slots.value).toHaveLength(2);
      expect(tabsLayout.layout.value).toBe("split-2v");
      expect(tabsLayout.selectedSlotId.value).toBe(result?.id);
      // No clone was necessary since the tab wasn't already shown anywhere.
      expect(tabsManager.tabs.value).toHaveLength(tabCountBefore);
    });

    it("clones the tab into a slot-only tab when the tab is already shown in a slot", async () => {
      const { tabsManager, tabsLayout } = await createManagers();
      const shownTab = tabsLayout.slots.value[0]!.tab!;
      const tabCountBefore = tabsManager.tabs.value.length;

      const result = tabsLayout.openTabInNewSlot(shownTab.id);

      expect(result).not.toBeNull();
      expect(result?.tab?.id).not.toBe(shownTab.id);
      expect(tabsManager.tabs.value).toHaveLength(tabCountBefore + 1);

      const clone = tabsManager.tabs.value.find(
        (tab) => tab.id === result?.tab?.id
      )!;
      await waitForInitialLoad(clone.readingState);
      expect(clone.slotOnly).toBe(true);
      // Seeded at the same reading location as the source tab.
      expect(clone.readingState.translationId.value).toBe(
        shownTab.readingState.translationId.value
      );
      expect(clone.readingState.bookId.value).toBe(
        shownTab.readingState.bookId.value
      );
      expect(clone.readingState.chapterNumber.value).toBe(
        shownTab.readingState.chapterNumber.value
      );
    });

    it("creates an independent clone on every repeated open-in-new-slot call for the same source tab", async () => {
      const { tabsManager, tabsLayout } = await createManagers();
      const shownTab = tabsLayout.slots.value[0]!.tab!;

      const firstClone = tabsLayout.openTabInNewSlot(shownTab.id);
      const secondClone = tabsLayout.openTabInNewSlot(shownTab.id);

      expect(firstClone?.tab?.id).not.toBe(secondClone?.tab?.id);
      expect(tabsLayout.slots.value).toHaveLength(3);
      expect(tabsManager.tabs.value.filter((tab) => tab.slotOnly).length).toBe(
        2
      );
    });

    it("grows the layout to the default preset for the new slot count", async () => {
      const { tabsLayout } = await createManagers();

      tabsLayout.openTabInNewSlot(tabsLayout.slots.value[0]!.tab!.id);
      expect(tabsLayout.layout.value).toBe("split-2v");

      tabsLayout.openTabInNewSlot(tabsLayout.slots.value[0]!.tab!.id);
      expect(tabsLayout.layout.value).toBe("split-left-two-right");

      tabsLayout.openTabInNewSlot(tabsLayout.slots.value[0]!.tab!.id);
      expect(tabsLayout.layout.value).toBe("grid-2x2");
    });

    it("returns null once the 4-slot maximum is reached", async () => {
      const { tabsLayout } = await createManagers();

      tabsLayout.openTabInNewSlot(tabsLayout.slots.value[0]!.tab!.id);
      tabsLayout.openTabInNewSlot(tabsLayout.slots.value[0]!.tab!.id);
      tabsLayout.openTabInNewSlot(tabsLayout.slots.value[0]!.tab!.id);
      expect(tabsLayout.slots.value).toHaveLength(4);

      const result = tabsLayout.openTabInNewSlot(
        tabsLayout.slots.value[0]!.tab!.id
      );

      expect(result).toBeNull();
      expect(tabsLayout.slots.value).toHaveLength(4);
    });

    it("does not surface a new slot when panelsEnabled is false", async () => {
      const { tabsLayout } = await createManagers({
        panelsEnabled: signal(false),
      });

      const result = tabsLayout.openTabInNewSlot(
        tabsLayout.slots.value[0]!.tab!.id
      );

      // A slot is momentarily created, but since panelsEnabled forces the
      // layout to "single", applyLayoutToSlots immediately collapses back
      // down to a single slot and the new one never becomes visible.
      expect(result).not.toBeNull();
      expect(tabsLayout.layout.value).toBe("single");
      expect(tabsLayout.slots.value).toHaveLength(1);
      expect(
        tabsLayout.slots.value.some((slot) => slot.id === result?.id)
      ).toBe(false);
    });
  });

  describe("closeSlot", () => {
    it("closes a slot and shrinks the layout to the next default preset", async () => {
      const { tabsLayout } = await createManagers({ extraTabs: 1 });

      tabsLayout.setLayout("split-2v");
      const secondSlot = tabsLayout.slots.value[1]!;

      const result = tabsLayout.closeSlot(secondSlot.id);

      expect(result).toBe(true);
      expect(tabsLayout.layout.value).toBe("single");
      expect(tabsLayout.slots.value).toHaveLength(1);
    });

    it("rejects closing the only remaining slot", async () => {
      const { tabsLayout } = await createManagers();

      const result = tabsLayout.closeSlot(tabsLayout.slots.value[0]!.id);

      expect(result).toBe(false);
      expect(tabsLayout.slots.value).toHaveLength(1);
    });

    it("returns false for an unknown slot id", async () => {
      const { tabsLayout } = await createManagers();

      tabsLayout.setLayout("split-2v");

      const result = tabsLayout.closeSlot("does-not-exist");

      expect(result).toBe(false);
      expect(tabsLayout.slots.value).toHaveLength(2);
    });

    it("falls back to another slot when the closed slot was selected", async () => {
      const { tabsLayout } = await createManagers({ extraTabs: 1 });

      tabsLayout.setLayout("split-2v");
      const [firstSlot, secondSlot] = tabsLayout.slots.value;
      tabsLayout.selectSlot(secondSlot!.id);

      tabsLayout.closeSlot(secondSlot!.id);

      expect(
        tabsLayout.slots.value.some((slot) => slot.id === firstSlot!.id)
      ).toBe(true);
      expect(tabsLayout.selectedSlotId.value).toBe(
        tabsLayout.slots.value[0]?.id ?? null
      );
    });

    it("disposes a slot-only clone tab once its slot is closed and no slot references it", async () => {
      const { tabsManager, tabsLayout } = await createManagers();
      const shownTab = tabsLayout.slots.value[0]!.tab!;
      const tabCountBefore = tabsManager.tabs.value.length;

      const clonedSlot = tabsLayout.openTabInNewSlot(shownTab.id)!;
      const cloneTabId = clonedSlot.tab!.id;
      expect(tabsManager.tabs.value.some((tab) => tab.id === cloneTabId)).toBe(
        true
      );

      tabsLayout.closeSlot(clonedSlot.id);

      expect(tabsManager.tabs.value.some((tab) => tab.id === cloneTabId)).toBe(
        false
      );
      expect(tabsManager.tabs.value).toHaveLength(tabCountBefore);
    });

    it("keeps a slot-only clone tab alive while another slot still references it", async () => {
      const { tabsManager, tabsLayout } = await createManagers();
      const shownTab = tabsLayout.slots.value[0]!.tab!;

      const clonedSlot = tabsLayout.openTabInNewSlot(shownTab.id)!;
      const cloneTabId = clonedSlot.tab!.id;
      // Put the same clone tab into a second slot too.
      tabsLayout.openTabInNewSlot(shownTab.id);
      tabsLayout.openTabInSlot(tabsLayout.slots.value[2]!.id, cloneTabId);

      tabsLayout.closeSlot(clonedSlot.id);

      expect(tabsManager.tabs.value.some((tab) => tab.id === cloneTabId)).toBe(
        true
      );
    });
  });
});
