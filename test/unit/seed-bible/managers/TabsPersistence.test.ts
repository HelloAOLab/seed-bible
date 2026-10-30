import {
  normalizeStoredTabsState,
  readQueryReadingParams,
  readStoredTabsState,
  reconcileStoredTabs,
  writeStoredTabsState,
  type PersistedTabsState,
} from "@packages/seed-bible/seed-bible/managers/TabsPersistence";
import {
  DEFAULT_BOOK_ID,
  DEFAULT_CHAPTER_NUMBER,
} from "@packages/seed-bible/seed-bible/managers/BibleReadingManager";
import type { TabSlotLayoutId } from "@packages/seed-bible/seed-bible/managers/TabsLayoutManager";

const STORAGE_KEY = "sb-tabs-state";
const DEFAULT_TRANSLATION = "AAB";

function makeState(
  overrides: Partial<PersistedTabsState> = {}
): PersistedTabsState {
  return {
    version: 1,
    tabs: [
      { id: "tab-1", translationId: "AAB", bookId: "GEN", chapterNumber: 1 },
    ],
    selectedTabId: "tab-1",
    layout: "single",
    slotTabIds: ["tab-1"],
    selectedSlotIndex: 0,
    ...overrides,
  };
}

beforeEach(() => {
  window.localStorage.clear();
});

describe("readQueryReadingParams", () => {
  it("reports no params for a bare URL", () => {
    const params = readQueryReadingParams(new URL("https://x.test/"));
    expect(params).toEqual({
      translationId: null,
      bookId: null,
      chapter: null,
      specified: false,
      languageOnly: false,
    });
  });

  it("reads translation/book/chapter and flags specified", () => {
    const params = readQueryReadingParams(
      new URL("https://x.test/?translation=spa_onbv&book=JHN&chapter=3")
    );
    expect(params).toEqual({
      translationId: "spa_onbv",
      bookId: "JHN",
      chapter: 3,
      specified: true,
      languageOnly: false,
    });
  });

  it("prefers translationId over translation and marks specified", () => {
    const params = readQueryReadingParams(
      new URL("https://x.test/?translationId=abc&translation=def")
    );
    expect(params.translationId).toBe("abc");
    expect(params.specified).toBe(true);
  });

  it("flags a lone ?lang= as specified without naming a translation", () => {
    const params = readQueryReadingParams(new URL("https://x.test/?lang=es"));
    expect(params).toEqual({
      translationId: null,
      bookId: null,
      chapter: null,
      specified: true,
      languageOnly: true,
    });
  });

  it("ignores an empty ?lang=, which changes no language", () => {
    const params = readQueryReadingParams(new URL("https://x.test/?lang="));
    expect(params.specified).toBe(false);
    expect(params.languageOnly).toBe(false);
  });

  it("lets an explicit translation win over ?lang=", () => {
    const params = readQueryReadingParams(
      new URL("https://x.test/?lang=es&translation=AAB")
    );
    expect(params.translationId).toBe("AAB");
    expect(params.specified).toBe(true);
    expect(params.languageOnly).toBe(false);
  });

  it("treats an invalid chapter as absent but still specified", () => {
    const params = readQueryReadingParams(
      new URL("https://x.test/?book=JHN&chapter=0")
    );
    expect(params.chapter).toBeNull();
    expect(params.specified).toBe(true);
  });
});

describe("normalizeStoredTabsState", () => {
  it("returns null for null input", () => {
    expect(normalizeStoredTabsState(null)).toBeNull();
  });

  it("renames ids to a gap-free tab-1..N and remaps references", () => {
    const normalized = normalizeStoredTabsState(
      makeState({
        tabs: [
          {
            id: "tab-1",
            translationId: "AAB",
            bookId: "GEN",
            chapterNumber: 1,
          },
          {
            id: "tab-3",
            translationId: "AAB",
            bookId: "JHN",
            chapterNumber: 3,
          },
        ],
        selectedTabId: "tab-3",
        layout: "split-2v",
        slotTabIds: ["tab-1", "tab-3"],
        selectedSlotIndex: 1,
      })
    );

    expect(normalized?.tabs.map((t) => t.id)).toEqual(["tab-1", "tab-2"]);
    expect(normalized?.selectedTabId).toBe("tab-2");
    expect(normalized?.slotTabIds).toEqual(["tab-1", "tab-2"]);
  });

  it("keeps null slot entries and falls back for an unknown selection", () => {
    const normalized = normalizeStoredTabsState(
      makeState({
        tabs: [
          {
            id: "tab-9",
            translationId: "AAB",
            bookId: "GEN",
            chapterNumber: 1,
          },
        ],
        selectedTabId: "does-not-exist",
        slotTabIds: [null, "tab-9"],
      })
    );
    expect(normalized?.selectedTabId).toBe("tab-1");
    expect(normalized?.slotTabIds).toEqual([null, "tab-1"]);
  });
});

describe("reconcileStoredTabs", () => {
  it("keeps stored tabs and selection when no query params are present", () => {
    const state = makeState({
      tabs: [
        { id: "tab-1", translationId: "AAB", bookId: "GEN", chapterNumber: 1 },
        { id: "tab-2", translationId: "AAB", bookId: "JHN", chapterNumber: 3 },
      ],
      selectedTabId: "tab-2",
    });

    const result = reconcileStoredTabs(
      state,
      {
        translationId: null,
        bookId: null,
        chapter: null,
        specified: false,
        languageOnly: false,
      },
      DEFAULT_TRANSLATION
    );

    expect(result.selectedTabId).toBe("tab-2");
    expect(result.tabs).toHaveLength(2);
    expect(result.tabs[1]).toMatchObject({ bookId: "JHN", chapterNumber: 3 });
  });

  it("prefers the selected tab when several share the query translation", () => {
    const state = makeState({
      tabs: [
        { id: "tab-1", translationId: "AAB", bookId: "GEN", chapterNumber: 1 },
        { id: "tab-2", translationId: "AAB", bookId: "MAT", chapterNumber: 5 },
      ],
      selectedTabId: "tab-2",
    });

    const result = reconcileStoredTabs(
      state,
      {
        translationId: "AAB",
        bookId: "JHN",
        chapter: 3,
        specified: true,
        languageOnly: false,
      },
      DEFAULT_TRANSLATION
    );

    // tab-2 (the selected one) is updated and stays selected; tab-1 untouched.
    expect(result.selectedTabId).toBe("tab-2");
    expect(result.tabs[0]).toMatchObject({ bookId: "GEN", chapterNumber: 1 });
    expect(result.tabs[1]).toMatchObject({
      translationId: "AAB",
      bookId: "JHN",
      chapterNumber: 3,
    });
  });

  it("falls back to the first match when the selected tab's translation differs", () => {
    const state = makeState({
      tabs: [
        { id: "tab-1", translationId: "AAB", bookId: "GEN", chapterNumber: 1 },
        {
          id: "tab-2",
          translationId: "spa_onbv",
          bookId: "MAT",
          chapterNumber: 5,
        },
      ],
      selectedTabId: "tab-2",
    });

    const result = reconcileStoredTabs(
      state,
      {
        translationId: "AAB",
        bookId: "JHN",
        chapter: 3,
        specified: true,
        languageOnly: false,
      },
      DEFAULT_TRANSLATION
    );

    expect(result.selectedTabId).toBe("tab-1");
    expect(result.tabs[0]).toMatchObject({ bookId: "JHN", chapterNumber: 3 });
  });

  it("uses the default translation when the query omits one", () => {
    const state = makeState({
      tabs: [
        { id: "tab-1", translationId: "AAB", bookId: "GEN", chapterNumber: 1 },
      ],
    });

    const result = reconcileStoredTabs(
      state,
      {
        translationId: null,
        bookId: "JHN",
        chapter: 3,
        specified: true,
        languageOnly: false,
      },
      DEFAULT_TRANSLATION
    );

    expect(result.selectedTabId).toBe("tab-1");
    expect(result.tabs[0]).toMatchObject({
      translationId: "AAB",
      bookId: "JHN",
      chapterNumber: 3,
    });
  });

  it("updates the single tab when nothing matches the query translation", () => {
    const state = makeState({
      tabs: [
        { id: "tab-1", translationId: "AAB", bookId: "GEN", chapterNumber: 1 },
      ],
    });

    const result = reconcileStoredTabs(
      state,
      {
        translationId: "spa_onbv",
        bookId: "JHN",
        chapter: 3,
        specified: true,
        languageOnly: false,
      },
      DEFAULT_TRANSLATION
    );

    expect(result.tabs).toHaveLength(1);
    expect(result.tabs[0]).toMatchObject({
      translationId: "spa_onbv",
      bookId: "JHN",
      chapterNumber: 3,
    });
  });

  it("creates and selects a new tab when many tabs but none match", () => {
    const state = makeState({
      tabs: [
        { id: "tab-1", translationId: "AAB", bookId: "GEN", chapterNumber: 1 },
        { id: "tab-2", translationId: "AAB", bookId: "MAT", chapterNumber: 5 },
      ],
      selectedTabId: "tab-1",
    });

    const result = reconcileStoredTabs(
      state,
      {
        translationId: "spa_onbv",
        bookId: "JHN",
        chapter: 3,
        specified: true,
        languageOnly: false,
      },
      DEFAULT_TRANSLATION
    );

    expect(result.tabs).toHaveLength(3);
    expect(result.selectedTabId).toBe("tab-3");
    expect(result.tabs[2]).toMatchObject({
      id: "tab-3",
      translationId: "spa_onbv",
      bookId: "JHN",
      chapterNumber: 3,
    });
  });

  it("defaults missing book/chapter to GEN/1", () => {
    const state = makeState({
      tabs: [
        { id: "tab-1", translationId: "AAB", bookId: "JHN", chapterNumber: 3 },
      ],
    });

    const result = reconcileStoredTabs(
      state,
      {
        translationId: "spa_onbv",
        bookId: null,
        chapter: null,
        specified: true,
        languageOnly: false,
      },
      DEFAULT_TRANSLATION
    );

    expect(result.tabs[0]).toMatchObject({
      translationId: "spa_onbv",
      bookId: DEFAULT_BOOK_ID,
      chapterNumber: DEFAULT_CHAPTER_NUMBER,
    });
  });

  describe("for a language-only link", () => {
    const languageOnlyQuery = {
      translationId: null,
      bookId: null,
      chapter: null,
      specified: true,
      languageOnly: true,
    };

    it("switches the single tab's translation and keeps its place", () => {
      const state = makeState({
        tabs: [
          {
            id: "tab-1",
            translationId: "AAB",
            bookId: "JHN",
            chapterNumber: 3,
          },
        ],
      });

      const result = reconcileStoredTabs(state, languageOnlyQuery, "spa_onbv");

      expect(result.tabs).toEqual([
        {
          id: "tab-1",
          translationId: "spa_onbv",
          bookId: "JHN",
          chapterNumber: 3,
        },
      ]);
    });

    it("leaves a tab already on the language's translation where it was", () => {
      const state = makeState({
        tabs: [
          {
            id: "tab-1",
            translationId: "AAB",
            bookId: "JHN",
            chapterNumber: 3,
          },
        ],
      });

      const result = reconcileStoredTabs(state, languageOnlyQuery, "AAB");

      expect(result.selectedTabId).toBe("tab-1");
      expect(result.tabs).toEqual(state.tabs);
    });

    it("opens a new tab at the selected tab's place when several tabs but none match", () => {
      const state = makeState({
        tabs: [
          {
            id: "tab-1",
            translationId: "AAB",
            bookId: "GEN",
            chapterNumber: 1,
          },
          {
            id: "tab-2",
            translationId: "AAB",
            bookId: "PSA",
            chapterNumber: 23,
          },
        ],
        selectedTabId: "tab-2",
      });

      const result = reconcileStoredTabs(state, languageOnlyQuery, "spa_onbv");

      expect(result.tabs).toHaveLength(3);
      expect(result.selectedTabId).toBe("tab-3");
      expect(result.tabs[2]).toEqual({
        id: "tab-3",
        translationId: "spa_onbv",
        bookId: "PSA",
        chapterNumber: 23,
      });
      // Opening the same link again matches that tab instead of adding another.
      const again = reconcileStoredTabs(
        { ...state, tabs: result.tabs, selectedTabId: result.selectedTabId },
        languageOnlyQuery,
        "spa_onbv"
      );
      expect(again.tabs).toHaveLength(3);
      expect(again.selectedTabId).toBe("tab-3");
    });
  });

  it("ignores hidden slot-only clones when matching/counting", () => {
    const state = makeState({
      tabs: [
        { id: "tab-1", translationId: "AAB", bookId: "GEN", chapterNumber: 1 },
        {
          id: "tab-2",
          translationId: "spa_onbv",
          bookId: "MAT",
          chapterNumber: 5,
          slotOnly: true,
        },
      ],
      selectedTabId: "tab-1",
    });

    // Only one *visible* tab, so a non-matching translation updates it in place
    // (rather than appending a new tab).
    const result = reconcileStoredTabs(
      state,
      {
        translationId: "spa_onbv",
        bookId: "JHN",
        chapter: 3,
        specified: true,
        languageOnly: false,
      },
      DEFAULT_TRANSLATION
    );

    expect(result.tabs).toHaveLength(2);
    expect(result.selectedTabId).toBe("tab-1");
    expect(result.tabs[0]).toMatchObject({
      translationId: "spa_onbv",
      bookId: "JHN",
      chapterNumber: 3,
    });
    // The slot-only clone is carried through untouched.
    expect(result.tabs[1]).toMatchObject({ id: "tab-2", slotOnly: true });
  });
});

describe("read/write round-trip", () => {
  it("returns null when nothing is stored", () => {
    expect(readStoredTabsState()).toBeNull();
  });

  it("persists and reads back an equivalent state (stamping version)", () => {
    const state = makeState({
      tabs: [
        { id: "tab-1", translationId: "AAB", bookId: "JHN", chapterNumber: 3 },
      ],
      selectedTabId: "tab-1",
    });
    writeStoredTabsState({
      tabs: state.tabs,
      selectedTabId: state.selectedTabId,
      layout: state.layout,
      slotTabIds: state.slotTabIds,
      selectedSlotIndex: state.selectedSlotIndex,
    });

    const read = readStoredTabsState();
    expect(read).toEqual(state);
  });

  it("returns null for malformed JSON", () => {
    window.localStorage.setItem(STORAGE_KEY, "{not json");
    expect(readStoredTabsState()).toBeNull();
  });

  it("returns null for a mismatched version", () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...makeState(), version: 999 })
    );
    expect(readStoredTabsState()).toBeNull();
  });

  it("returns null when required fields are missing or malformed", () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 1, tabs: "nope" })
    );
    expect(readStoredTabsState()).toBeNull();
  });

  it("returns null for a tab with a non-positive chapter number", () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(
        makeState({
          tabs: [
            {
              id: "tab-1",
              translationId: "AAB",
              bookId: "GEN",
              chapterNumber: 0,
            },
          ],
        })
      )
    );
    expect(readStoredTabsState()).toBeNull();
  });

  // Guards against a new TabSlotLayoutId being added without adding it to
  // TAB_SLOT_LAYOUT_IDS in TabsPersistence, which would silently drop that
  // layout on restore. The Record makes an unlisted id a compile error; the
  // loop then proves the schema actually accepts each one.
  it("accepts every supported layout id and rejects an unknown one", () => {
    const allLayoutIds: Record<TabSlotLayoutId, true> = {
      single: true,
      "split-2v": true,
      "split-left-two-right": true,
      "split-3v": true,
      "grid-2x2": true,
      "split-4v": true,
      "stacked-2": true,
    };

    for (const layout of Object.keys(allLayoutIds) as TabSlotLayoutId[]) {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(makeState({ layout }))
      );
      expect(readStoredTabsState()?.layout).toBe(layout);
    }

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...makeState(), layout: "split-9v" })
    );
    expect(readStoredTabsState()).toBeNull();
  });
});
