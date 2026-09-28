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
  // Clear persisted tab state and any query params written by the tab/URL sync
  // effects so a restore test can't leak into the next test.
  window.localStorage.clear();
  window.history.replaceState(null, "", window.location.pathname);
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

function createLoginManagerMock() {
  return {
    userId: signal<string | null>(null),
    profile: signal(null),
    profilePromise: null,
    updateProfile: vi.fn(),
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
    /**
     * Seeds `localStorage["sb-tabs-state"]`, then runs the deferred restore so
     * these tests see the restored arrangement. Deliberately untyped: these
     * tests also feed it corrupt blobs that `PersistedTabsState` would reject.
     */
    storedTabsState?: unknown;
    /**
     * Skips the deferred restore even though `storedTabsState` is set, to assert
     * what construction alone produces (which has to match SSR).
     */
    skipStorageHydration?: boolean;
    /** URL to open the app with, e.g. "/?translation=NIV&book=MAT&chapter=1". */
    url?: string;
  } = {}
) {
  setWebResponses(createExampleManagerResponseMap());
  if (options.storedTabsState !== undefined) {
    window.localStorage.setItem(
      "sb-tabs-state",
      JSON.stringify(options.storedTabsState)
    );
  }
  // NavigationManager freezes `initialUrl` at construction and TabsManager
  // reconciles against that snapshot, so the URL must be in place first.
  window.history.replaceState(null, "", options.url ?? "/");
  const navigation = createNavigationManager();
  const tabsManager = createTabs(
    navigation,
    createDataManager(),
    createHighlightsManagerMock() as any,
    {} as any,
    createI18nManager(navigation, ["en"]),
    createLoginManagerMock() as any
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

  // Both managers seed from the URL alone so the client's first render matches
  // the SSR HTML; the stored tabs and slot arrangement are applied afterwards.
  // `app.hydrateFromStorage` sequences these two in exactly this order — slots
  // are bound to tab objects by id, so the tabs have to land first.
  if (options.storedTabsState !== undefined && !options.skipStorageHydration) {
    tabsManager.hydrateStoredTabs();
    tabsLayout.hydrateStoredLayout();
    await waitForTabsToLoad(tabsManager.tabs.value);
  }

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

  describe("restoring a stored layout", () => {
    // Only chapters mocked by createExampleManagerResponseMap can be used here
    // (AAB GEN 1, AAB EXO 2, NIV MAT 1) — the fetch mock throws on anything else.
    const GEN_1 = {
      translationId: "AAB",
      bookId: "GEN",
      chapterNumber: 1,
    };
    const EXO_2 = {
      translationId: "AAB",
      bookId: "EXO",
      chapterNumber: 2,
    };
    const MAT_1 = {
      translationId: "NIV",
      bookId: "MAT",
      chapterNumber: 1,
    };

    it("starts from a single slot at construction, ignoring a stored split", async () => {
      const { tabsLayout } = await createManagers({
        skipStorageHydration: true,
        storedTabsState: {
          version: 1,
          tabs: [
            { id: "tab-1", ...GEN_1 },
            { id: "tab-2", ...EXO_2 },
          ],
          selectedTabId: "tab-1",
          layout: "split-2v",
          slotTabIds: ["tab-1", "tab-2"],
          selectedSlotIndex: 0,
        },
      });

      // A restored split would mount a second pane the SSR HTML never had, which
      // is the one hydration divergence Preact reports instead of patching.
      expect(tabsLayout.layout.value).toBe("single");
      expect(tabsLayout.slots.value).toHaveLength(1);
    });

    it("keeps the selected slot's id across hydrateStoredLayout", async () => {
      const { tabsManager, tabsLayout } = await createManagers({
        skipStorageHydration: true,
        storedTabsState: {
          version: 1,
          tabs: [
            { id: "tab-1", ...GEN_1 },
            { id: "tab-2", ...EXO_2 },
          ],
          selectedTabId: "tab-1",
          layout: "split-2v",
          slotTabIds: ["tab-1", "tab-2"],
          selectedSlotIndex: 0,
        },
      });
      const bootSlotId = tabsLayout.slots.value[0]!.id;

      tabsManager.hydrateStoredTabs();
      tabsLayout.hydrateStoredLayout();
      await waitForTabsToLoad(tabsManager.tabs.value);

      // `TabsLayout` keys each pane on `slot.id`. Handing the selected slot a new
      // id would unmount and remount that pane, discarding the scripture that
      // just hydrated into it.
      expect(tabsLayout.slots.value).toHaveLength(2);
      expect(tabsLayout.slots.value[0]!.id).toBe(bootSlotId);
      expect(tabsLayout.selectedSlotId.value).toBe(bootSlotId);
    });

    it("rebuilds the stored slots, layout preset, and selected slot", async () => {
      const { tabsManager, tabsLayout } = await createManagers({
        storedTabsState: {
          version: 1,
          tabs: [
            { id: "tab-1", ...GEN_1 },
            { id: "tab-2", ...EXO_2 },
          ],
          selectedTabId: "tab-2",
          layout: "split-2v",
          slotTabIds: ["tab-1", "tab-2"],
          selectedSlotIndex: 1,
        },
      });

      expect(tabsLayout.layout.value).toBe("split-2v");
      expect(tabsLayout.slots.value.map((slot) => slot.tab?.id)).toEqual([
        "tab-1",
        "tab-2",
      ]);
      // The stored selectedSlotIndex (1) picks the second slot, not the first.
      expect(tabsLayout.selectedSlotId.value).toBe(
        tabsLayout.slots.value[1]!.id
      );
      expect(tabsManager.selectedTabId.value).toBe("tab-2");
    });

    it("falls back to a single slot when the stored layout's slot count disagrees with slotTabIds", async () => {
      const { tabsManager, tabsLayout } = await createManagers({
        storedTabsState: {
          version: 1,
          tabs: [
            { id: "tab-1", ...GEN_1 },
            { id: "tab-2", ...EXO_2 },
            { id: "tab-3", ...MAT_1, slotOnly: true },
          ],
          selectedTabId: "tab-1",
          // Corrupt: "split-2v" has two slots but only one slot was stored.
          layout: "split-2v",
          slotTabIds: ["tab-1"],
          selectedSlotIndex: 0,
        },
      });

      expect(tabsLayout.layout.value).toBe("single");
      expect(tabsLayout.slots.value).toHaveLength(1);
      expect(tabsLayout.slots.value[0]!.tab?.id).toBe("tab-1");
      // Only the layout falls back — the stored visible tabs still restore.
      // The hidden clone does not: with no split to back, it would be an
      // invisible tab holding a live reading state forever.
      expect(tabsManager.tabs.value.map((tab) => tab.id)).toEqual([
        "tab-1",
        "tab-2",
      ]);
    });

    it("treats an unrecognized stored layout id as a single slot", async () => {
      const { tabsLayout } = await createManagers({
        storedTabsState: {
          version: 1,
          tabs: [{ id: "tab-1", ...GEN_1 }],
          selectedTabId: "tab-1",
          // Not a real preset. The stored-state validator only checks that
          // `layout` is a string, so this reaches the restore path: the
          // unknown id resolves to a slot count of 1, which matches the single
          // stored slot, and the layout id is then normalized to "single".
          layout: "not-a-real-layout",
          slotTabIds: ["tab-1"],
          selectedSlotIndex: 0,
        },
      });

      expect(tabsLayout.layout.value).toBe("single");
      expect(tabsLayout.slots.value).toHaveLength(1);
      expect(tabsLayout.slots.value[0]!.tab?.id).toBe("tab-1");
    });

    it("keeps a restored split intact when panels are disabled, leaving the clamp to the view layer", async () => {
      const { tabsManager, tabsLayout } = await createManagers({
        panelsEnabled: signal(false),
        storedTabsState: {
          version: 1,
          tabs: [
            { id: "tab-1", ...GEN_1 },
            { id: "tab-2", ...EXO_2, slotOnly: true },
          ],
          selectedTabId: "tab-1",
          layout: "split-2v",
          slotTabIds: ["tab-1", "tab-2"],
          selectedSlotIndex: 0,
        },
      });

      // Collapsing here would be written straight back by the persistence
      // effect, permanently destroying a split the user built with panels on.
      // SeedBibleStateManager's effectiveSlots/effectiveSlotLayout render a
      // single pane instead, so the split survives to be shown again when
      // panels come back.
      expect(tabsLayout.layout.value).toBe("split-2v");
      expect(tabsLayout.slots.value.map((slot) => slot.tab?.id)).toEqual([
        "tab-1",
        "tab-2",
      ]);
      // The hidden clone backing the second pane has to stay alive with it.
      expect(tabsManager.tabs.value.map((tab) => tab.id)).toEqual([
        "tab-1",
        "tab-2",
      ]);
    });

    it("keeps a restored slot-only clone a slot references and drops one nothing references", async () => {
      const { tabsManager, tabsLayout } = await createManagers({
        storedTabsState: {
          version: 1,
          tabs: [
            { id: "tab-1", ...GEN_1 },
            { id: "tab-2", ...EXO_2, slotOnly: true },
            // Stale: no slot points at this one.
            { id: "tab-3", ...MAT_1, slotOnly: true },
          ],
          selectedTabId: "tab-1",
          layout: "split-2v",
          slotTabIds: ["tab-1", "tab-2"],
          selectedSlotIndex: 0,
        },
      });

      expect(tabsLayout.slots.value.map((slot) => slot.tab?.id)).toEqual([
        "tab-1",
        "tab-2",
      ]);
      expect(tabsManager.tabs.value.map((tab) => tab.id)).toEqual([
        "tab-1",
        "tab-2",
      ]);
    });

    it("shows a tab appended by a deep link in the restored selected slot", async () => {
      const { tabsManager, tabsLayout } = await createManagers({
        url: "/?translation=NIV&book=MAT&chapter=1",
        storedTabsState: {
          version: 1,
          tabs: [
            { id: "tab-1", ...GEN_1 },
            { id: "tab-2", ...EXO_2 },
          ],
          selectedTabId: "tab-1",
          layout: "split-2v",
          slotTabIds: ["tab-1", "tab-2"],
          selectedSlotIndex: 1,
        },
      });

      // No stored tab is on NIV and there is more than one visible tab, so
      // reconcile appends tab-3 for the link. It occupies none of the restored
      // slots, so it has to take over the restored selected slot (the second)
      // — otherwise the tab the user just followed a link to would be invisible.
      expect(tabsManager.selectedTabId.value).toBe("tab-3");
      expect(tabsLayout.slots.value.map((slot) => slot.tab?.id)).toEqual([
        "tab-1",
        "tab-3",
      ]);
      expect(tabsLayout.selectedSlotId.value).toBe(
        tabsLayout.slots.value[1]!.id
      );
    });
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
