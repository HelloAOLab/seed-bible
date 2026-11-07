import { computed, signal, type Signal } from "@preact/signals";
import { render } from "preact";
import { act } from "preact/test-utils";
import type { ComponentChild } from "preact";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import {
  setupExtensionContext,
  unregisterExtension,
} from "@packages/seed-bible/seed-bible/managers/ExtensionManager";
import { mockTranslate } from "../seed-bible/testUtils/mockI18n";
import { gameAddress } from "@packages/find-the-verse-extension/ext_FindTheVerse/gamesStore";
import type { SavedGame } from "@packages/find-the-verse-extension/ext_FindTheVerse/types";

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const { mockI18nManager } = await import("../seed-bible/testUtils/mockI18n");
  return mockI18nManager();
});

const { default: initFindTheVerse } =
  await import("@packages/find-the-verse-extension/ext_FindTheVerse/init");

const PANE_ID = "find-the-verse-pane";

interface SelectedVerse {
  bookId: string;
  chapterNumber: number;
  verse: { type: "verse"; number: number; content: string[] };
  translationId: string;
}

interface Decoration {
  id: string;
  bookId: string;
  chapterNumber: number;
  verses: number | number[];
  options: Record<string, unknown>;
}

interface Reading {
  selectedVerses: Signal<SelectedVerse[]>;
  clearSelectedVerses: () => void;
  translationBooks: Signal<null>;
  translationId: Signal<string>;
  bookId: Signal<string>;
  chapterNumber: Signal<number>;
  chapterData: Signal<null>;
  isChapterContentStale: Signal<boolean>;
  selectChapter: ReturnType<typeof vi.fn>;
  selectTranslationAndChapter: (
    translationId: string,
    book: string,
    chapter: number
  ) => Promise<void>;
  /** Live decorations, as the reader would draw them. */
  decorations: Signal<Decoration[]>;
  decorateVerses: ReturnType<typeof vi.fn>;
  removeDecoration: (id: string) => void;
}

interface Tab {
  id: string;
  readingState: Reading;
  sharedSession: object | null;
}

function selectedVerse(
  bookId: string,
  chapterNumber: number,
  number: number,
  text: string
): SelectedVerse {
  return {
    bookId,
    chapterNumber,
    verse: { type: "verse", number, content: [text] },
    translationId: "BSB",
  };
}

let decorationCount = 0;

function createReading(
  selectTranslationAndChapter?: Reading["selectTranslationAndChapter"]
): Reading {
  const selectedVerses = signal<SelectedVerse[]>([]);
  const decorations = signal<Decoration[]>([]);
  const reading: Reading = {
    selectedVerses,
    clearSelectedVerses: () => {
      selectedVerses.value = [];
    },
    translationBooks: signal(null),
    translationId: signal("BSB"),
    bookId: signal("GEN"),
    chapterNumber: signal(1),
    chapterData: signal(null),
    isChapterContentStale: signal(false),
    selectChapter: vi.fn(async () => undefined),
    selectTranslationAndChapter:
      selectTranslationAndChapter ??
      (async (_translationId, book, chapter) => {
        reading.bookId.value = book;
        reading.chapterNumber.value = chapter;
      }),
    decorations,
    decorateVerses: vi.fn(
      (
        bookId: string,
        chapterNumber: number,
        verses: number | number[],
        options: Record<string, unknown>,
        id = `decoration-${++decorationCount}`
      ) => {
        decorations.value = [
          ...decorations.peek().filter((d) => d.id !== id),
          { id, bookId, chapterNumber, verses, options },
        ];
        return id;
      }
    ),
    removeDecoration: (id: string) => {
      decorations.value = decorations.peek().filter((d) => d.id !== id);
    },
  };
  return reading;
}

function savedGame(
  id: string,
  bookId: string,
  verseText: string,
  hint: string
): SavedGame {
  return {
    id,
    name: "Youth group",
    targetVerse: {
      bookId,
      chapterNumber: 1,
      verseNumber: 1,
      verseText,
    },
    steps: [{ hint }],
    createdAtMs: 1,
  };
}

function buttonsNamed(root: ParentNode, name: string): HTMLButtonElement[] {
  return [...root.querySelectorAll("button")].filter(
    (button) => button.textContent?.trim() === name
  );
}

function clickButton(root: ParentNode, name: string, index = 0) {
  const button = buttonsNamed(root, name)[index];
  if (!button) throw new Error(`No button named ${name}`);
  button.click();
}

function bar(): HTMLElement | null {
  return document.body.querySelector(".ftv-bar");
}

describe("Find the Verse", () => {
  let container: HTMLDivElement;
  let panes: Signal<{ id: string }[]>;
  let paneView: (() => ComponentChild) | null;
  let toolbar: { onSelect?: () => void } | null;
  let verseTool: {
    onSelect?: (context: { readingState: Reading }) => void;
  } | null;
  let reading: Reading;
  let tabs: Signal<Tab[]>;
  let selectedTabId: Signal<string>;
  let newTabReading: () => Reading;
  let recordData: ReturnType<typeof vi.fn>;

  function install(games: SavedGame[] = [], active: Reading = reading) {
    recordData = vi.fn(async () => ({ success: true }));
    tabs = signal<Tab[]>([
      { id: "tab-1", readingState: active, sharedSession: null },
    ]);
    selectedTabId = signal("tab-1");
    let tabCount = 1;
    const selectedTab = computed(
      () => tabs.value.find((tab) => tab.id === selectedTabId.value) ?? null
    );
    const state = {
      i18n: { t: mockTranslate },
      login: { userId: signal(games.length > 0 ? "user-1" : null) },
      os: {
        listDataByMarker: vi.fn(async () => ({
          success: true,
          items: games.map((game) => ({
            address: gameAddress(game.id),
            data: game,
          })),
          totalCount: games.length,
        })),
        getData: vi.fn(async (_record: string, address: string) => {
          const game = games.find((g) => gameAddress(g.id) === address);
          return game
            ? { success: true, data: game }
            : { success: false, errorCode: "data_not_found" };
        }),
        recordData,
      },
      app: {
        selectedTab,
        selectTab: (id: string) => {
          selectedTabId.value = id;
        },
      },
      tabs: {
        tabs,
        addTab: (
          _source: unknown,
          options?: { initialBookId?: string; initialChapterNumber?: number }
        ) => {
          const tabReading = newTabReading();
          tabReading.bookId.value = options?.initialBookId ?? "GEN";
          tabReading.chapterNumber.value = options?.initialChapterNumber ?? 1;
          tabCount += 1;
          const tab = {
            id: `tab-${tabCount}`,
            readingState: tabReading,
            sharedSession: null,
          };
          tabs.value = [...tabs.peek(), tab];
          selectedTabId.value = tab.id;
          return tab;
        },
        removeTab: (id: string) => {
          const next = tabs.peek().filter((tab) => tab.id !== id);
          tabs.value = next;
          if (selectedTabId.peek() === id) {
            selectedTabId.value = next[0]?.id ?? "";
          }
        },
      },
      panes: {
        panes,
        openPane: (options: {
          id: string;
          component: () => ComponentChild;
        }) => {
          paneView = options.component;
          const without = panes.peek().filter((pane) => pane.id !== options.id);
          panes.value = [...without, { id: options.id }];
        },
        closePane: (id: string) => {
          panes.value = panes.peek().filter((pane) => pane.id !== id);
        },
      },
      tools: {
        registerToolbarTool: (tool: { id: string; onSelect?: () => void }) => {
          if (tool.id === "find-the-verse") toolbar = tool;
          return () => undefined;
        },
        registerVerseToolbarTool: (tool: {
          id: string;
          onSelect?: (context: { readingState: Reading }) => void;
        }) => {
          if (tool.id === "find-the-verse-set-target") verseTool = tool;
          return () => undefined;
        },
      },
    } as unknown as SeedBibleState;

    setupExtensionContext(state);
    initFindTheVerse();
  }

  function roundTab(): Tab {
    const tab = tabs.value.find((t) => t.id !== "tab-1");
    if (!tab) throw new Error("No round tab");
    return tab;
  }

  async function showPane() {
    await act(async () => {
      render(paneView ? paneView() : null, container);
    });
  }

  async function openPane() {
    await act(async () => {
      toolbar?.onSelect?.();
    });
    await showPane();
  }

  async function closePane() {
    await act(async () => {
      panes.value = panes.peek().filter((pane) => pane.id !== PANE_ID);
      render(null, container);
    });
  }

  async function tap(target: Reading, verse: SelectedVerse) {
    await act(async () => {
      target.selectedVerses.value = [verse];
      await Promise.resolve();
    });
  }

  async function installAndPlay(games: SavedGame[], index = 0) {
    await act(async () => {
      install(games);
      await Promise.resolve();
    });
    await openPane();
    await act(async () => {
      clickButton(container, "Play", index);
    });
  }

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    panes = signal<{ id: string }[]>([]);
    paneView = null;
    toolbar = null;
    verseTool = null;
    reading = createReading();
    newTabReading = () => createReading();
  });

  afterEach(() => {
    unregisterExtension("find-the-verse-extension");
    render(null, container);
    container.remove();
    vi.restoreAllMocks();
  });

  it("reopens the panel when Set as target cannot use the verse", async () => {
    await act(async () => {
      install();
    });
    await openPane();
    await act(async () => {
      clickButton(container, "Create a game");
    });
    await act(async () => {
      clickButton(container, "Select from reader…");
    });
    await closePane();
    expect(panes.value.some((pane) => pane.id === PANE_ID)).toBe(false);

    reading.selectedVerses.value = [
      selectedVerse("NOPE", 1, 1, "not a book the game knows"),
    ];
    await act(async () => {
      verseTool?.onSelect?.({ readingState: reading });
    });

    expect(panes.value.some((pane) => pane.id === PANE_ID)).toBe(true);
    await showPane();
    expect(container.textContent).toContain(
      "Couldn't recognise that reference. Try “John 1:1”."
    );
  });

  it("sets the target from the reader the toolbar belongs to", async () => {
    const other = createReading();
    await act(async () => {
      install([], reading);
    });
    await openPane();
    await act(async () => {
      clickButton(container, "Create a game");
    });

    reading.selectedVerses.value = [
      selectedVerse("GEN", 1, 1, "Wrong reader text"),
    ];
    other.selectedVerses.value = [
      selectedVerse("JHN", 1, 1, "Right reader text"),
    ];
    await act(async () => {
      verseTool?.onSelect?.({ readingState: other });
    });
    await showPane();

    expect(container.textContent).toContain("Right reader text");
    expect(container.textContent).not.toContain("Wrong reader text");
  });

  it("closes its panel when the extension is uninstalled", async () => {
    await act(async () => {
      install();
    });
    await openPane();
    expect(panes.value.some((pane) => pane.id === PANE_ID)).toBe(true);

    unregisterExtension("find-the-verse-extension");

    expect(panes.value.some((pane) => pane.id === PANE_ID)).toBe(false);
  });

  it("plays in a new tab and leaves the tab the player was on alone", async () => {
    await installAndPlay([
      savedGame("one", "JHN", "In the beginning was the Word", "a hint"),
    ]);

    expect(tabs.value).toHaveLength(2);
    const round = roundTab();
    expect(selectedTabId.value).toBe(round.id);
    expect(round.readingState.bookId.value).toBe("GEN");
    // The original tab (a shared session, say) is not moved to Genesis 1.
    expect(reading.selectChapter).not.toHaveBeenCalled();

    // A tap in the original tab is not a guess, and keeps its toolbar.
    await act(async () => {
      selectedTabId.value = "tab-1";
    });
    await tap(reading, selectedVerse("GEN", 1, 2, "And the earth"));
    expect(reading.selectedVerses.value).toHaveLength(1);
    expect(reading.decorateVerses).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain("Return to game");
    expect(document.body.textContent).toContain("1 / 1 left");

    // A tap in the round's tab is.
    await tap(round.readingState, selectedVerse("GEN", 1, 2, "And the earth"));
    expect(round.readingState.selectedVerses.value).toHaveLength(0);
    expect(document.body.textContent).toContain("Out of chances");
  });

  it("keeps everything the round draws local to this device", async () => {
    await installAndPlay([
      savedGame("one", "JHN", "In the beginning was the Word", "a hint"),
    ]);
    const round = roundTab().readingState;
    await tap(round, selectedVerse("EXO", 1, 1, "Now these are"));

    expect(round.decorations.value.length).toBeGreaterThan(0);
    for (const decoration of round.decorations.value) {
      expect(decoration.options.localOnly).toBe(true);
    }
  });

  it("closes the round's tab when the game ends, and returns to the first tab", async () => {
    await installAndPlay([
      savedGame("one", "JHN", "In the beginning was the Word", "alpha hint"),
    ]);
    await closePane();
    expect(tabs.value).toHaveLength(2);

    await act(async () => {
      clickButton(document.body, "End game");
    });

    expect(tabs.value.map((tab) => tab.id)).toEqual(["tab-1"]);
    expect(selectedTabId.value).toBe("tab-1");
    expect(panes.value.some((pane) => pane.id === PANE_ID)).toBe(true);
    await showPane();
    expect(container.textContent).toContain("Create a game");
    expect(container.textContent).not.toContain("End game");
  });

  it("ends the round when the player closes its tab", async () => {
    await installAndPlay([
      savedGame("one", "JHN", "In the beginning was the Word", "alpha hint"),
    ]);
    await closePane();
    expect(bar()).not.toBeNull();

    await act(async () => {
      tabs.value = tabs.peek().filter((tab) => tab.id === "tab-1");
      selectedTabId.value = "tab-1";
    });

    expect(bar()).toBeNull();
    await openPane();
    expect(container.textContent).toContain("Create a game");
  });

  it("hides the reader bar while the More menu is open, then brings it back", async () => {
    const wrap = document.createElement("div");
    wrap.className = "sb-reader-toolbar-wrap";
    document.body.appendChild(wrap);
    try {
      await installAndPlay([
        savedGame("one", "JHN", "In the beginning was the Word", "alpha hint"),
      ]);
      await closePane();
      expect(document.body.textContent).toContain("End game");

      const menu = document.createElement("div");
      menu.className = "sb-more-menu";
      await act(async () => {
        wrap.appendChild(menu);
      });
      expect(document.body.textContent).not.toContain("End game");

      await act(async () => {
        menu.remove();
      });
      expect(document.body.textContent).toContain("End game");
    } finally {
      wrap.remove();
    }
  });

  it("finds the More menu in a toolbar that replaced the first one", async () => {
    const first = document.createElement("div");
    first.className = "sb-reader-toolbar-wrap";
    const shell = document.createElement("div");
    shell.appendChild(first);
    document.body.appendChild(shell);
    try {
      await installAndPlay([
        savedGame("one", "JHN", "In the beginning was the Word", "alpha hint"),
      ]);
      await closePane();

      const second = document.createElement("div");
      second.className = "sb-reader-toolbar-wrap";
      await act(async () => {
        first.replaceWith(second);
      });
      const menu = document.createElement("div");
      menu.className = "sb-more-menu";
      await act(async () => {
        second.appendChild(menu);
      });

      expect(document.body.textContent).not.toContain("End game");
    } finally {
      shell.remove();
    }
  });

  it("does not watch the page while no game is on", async () => {
    const observe = vi.spyOn(MutationObserver.prototype, "observe");
    await act(async () => {
      install();
    });

    expect(bar()).toBeNull();
    expect(observe).not.toHaveBeenCalled();
  });

  function playableGame(): SavedGame {
    const game = savedGame(
      "one",
      "JHN",
      "In the beginning was the Word",
      "alpha hint"
    );
    game.steps = [
      { hint: "alpha hint" },
      { hint: "beta hint" },
      { hint: "gamma hint" },
    ];
    return game;
  }

  async function openEditor(game: SavedGame) {
    await act(async () => {
      install([game]);
      await Promise.resolve();
    });
    await openPane();
    const menu = container.querySelector(".sb-context-menu-button");
    if (!(menu instanceof HTMLButtonElement)) {
      throw new Error("No game menu");
    }
    await act(async () => {
      menu.click();
    });
    await act(async () => {
      const edit = [...document.body.querySelectorAll("button")].find(
        (button) => button.textContent?.includes("Edit")
      );
      if (!edit) throw new Error("No Edit item");
      edit.click();
    });
  }

  async function flushSave() {
    for (let i = 0; i < 8; i += 1) await Promise.resolve();
  }

  it("saves an edited game before starting it", async () => {
    await act(async () => {
      install([playableGame()]);
      await Promise.resolve();
    });
    await openPane();
    await act(async () => {
      clickButton(container, "Create a game");
    });
    expect(container.textContent).toContain("Start game");
    expect(container.textContent).not.toContain("Save & Start");

    await act(async () => {
      clickButton(container, "Cancel");
    });
    const menu = container.querySelector(".sb-context-menu-button");
    if (!(menu instanceof HTMLButtonElement)) throw new Error("No game menu");
    await act(async () => {
      menu.click();
    });
    await act(async () => {
      const edit = [...document.body.querySelectorAll("button")].find(
        (button) => button.textContent?.includes("Edit")
      );
      if (!edit) throw new Error("No Edit item");
      edit.click();
    });
    expect(container.textContent).toContain("Save & Start");

    const nameInput = container.querySelector("input");
    if (!(nameInput instanceof HTMLInputElement)) {
      throw new Error("No name field");
    }
    await act(async () => {
      nameInput.value = "Revised name";
      nameInput.dispatchEvent(new InputEvent("input", { bubbles: true }));
      clickButton(container, "Save & Start");
      await flushSave();
    });

    expect(recordData).toHaveBeenCalled();
    expect(recordData.mock.calls[0]?.[1]).toBe(gameAddress("one"));
    expect(recordData.mock.calls[0]?.[2]).toMatchObject({
      id: "one",
      name: "Revised name",
      createdAtMs: 1,
    });
    expect(panes.value.some((pane) => pane.id === PANE_ID)).toBe(false);
    expect(document.body.textContent).toContain("End game");
  });

  it("won't save or start while a chance has an empty hint", async () => {
    await openEditor(playableGame());
    await act(async () => {
      clickButton(container, "+ Add chance");
    });

    for (const name of ["Save game", "Save & Start"]) {
      await act(async () => {
        clickButton(container, name);
        await flushSave();
      });
      expect(container.textContent).toContain(
        "Fill in every hint, or remove the empty chances."
      );
    }
    expect(recordData).not.toHaveBeenCalled();
    expect(tabs.value).toHaveLength(1);
    const hints = [...container.querySelectorAll("textarea")];
    expect(hints.map((hint) => hint.getAttribute("aria-invalid"))).toEqual([
      "false",
      "false",
      "false",
      "true",
    ]);

    await act(async () => {
      buttonsNamed(container, "×")[3]!.click();
    });
    expect(container.textContent).not.toContain(
      "Fill in every hint, or remove the empty chances."
    );
    await act(async () => {
      clickButton(container, "Save game");
      await flushSave();
    });
    expect(recordData).toHaveBeenCalledTimes(1);
  });

  it("stays on the editor when saving an edit fails", async () => {
    await openEditor(playableGame());
    recordData.mockResolvedValue({ success: false });

    await act(async () => {
      clickButton(container, "Save & Start");
      await flushSave();
    });

    expect(panes.value.some((pane) => pane.id === PANE_ID)).toBe(true);
    expect(container.textContent).toContain(
      "Couldn't save that game. Try again."
    );
    expect(container.textContent).toContain("Save & Start");
    expect(document.body.textContent).not.toContain("End game");
    expect(tabs.value).toHaveLength(1);
  });

  it("does not carry an open hint into the next game", async () => {
    const games = [
      savedGame("one", "JHN", "In the beginning was the Word", "alpha hint"),
      savedGame("two", "GEN", "In the beginning God created", "beta hint"),
    ];
    await installAndPlay(games, 0);
    await showPane();
    await act(async () => {
      clickButton(container, "?");
    });
    expect(container.textContent).toContain("alpha hint");

    await closePane();
    expect(document.body.textContent).toContain("alpha hint");

    await act(async () => {
      clickButton(document.body, "End game");
    });
    await openPane();
    await act(async () => {
      clickButton(container, "Play", 1);
    });
    await closePane();

    expect(document.body.textContent).not.toContain("beta hint");
    expect(
      document.body.querySelector('button[aria-label="Show hint"]')
    ).not.toBeNull();
  });

  it("puts Reveal verse on the reader bar once it unlocks", async () => {
    await installAndPlay([
      savedGame("one", "JHN", "In the beginning was the Word", "a hint"),
    ]);
    await closePane();
    expect(buttonsNamed(document.body, "Reveal verse")).toHaveLength(0);

    await tap(roundTab().readingState, selectedVerse("GEN", 1, 2, "x"));

    expect(buttonsNamed(document.body, "Reveal hint")).toHaveLength(1);
    expect(buttonsNamed(document.body, "Reveal verse")).toHaveLength(1);
  });

  it("keeps the revealed verse lit until the round ends", async () => {
    await installAndPlay([
      savedGame("one", "JHN", "In the beginning was the Word", "a hint"),
    ]);
    await closePane();
    const round = roundTab().readingState;
    await tap(round, selectedVerse("GEN", 1, 2, "And the earth"));

    await act(async () => {
      clickButton(document.body, "Reveal verse");
      await Promise.resolve();
    });

    const reveal = round.decorations.value.find(
      (d) => d.options.className === "sb-verse-decoration-diminish"
    );
    expect(reveal).toMatchObject({ bookId: "JHN", chapterNumber: 1 });
    expect(reveal?.options.removeAfterMs).toBeUndefined();
    expect(reveal?.options.localOnly).toBe(true);
    expect(document.body.textContent).toContain(
      "Better luck next time — keep going!"
    );
  });

  it("does not count a tap on the revealed verse as a win", async () => {
    await installAndPlay([
      savedGame("one", "JHN", "In the beginning was the Word", "a hint"),
    ]);
    await showPane();
    const round = roundTab().readingState;

    // One chance reveals after one guess. Spend it on the wrong verse.
    await tap(round, selectedVerse("GEN", 1, 2, "And the earth"));
    await showPane();
    await act(async () => {
      clickButton(container, "Reveal verse");
    });
    await showPane();
    expect(container.textContent).toContain(
      "Better luck next time — keep going!"
    );

    await tap(
      round,
      selectedVerse("JHN", 1, 1, "In the beginning was the Word")
    );
    await showPane();

    expect(container.textContent).not.toContain("You found it!");
    expect(container.textContent).toContain(
      "Better luck next time — keep going!"
    );
  });

  it("drops a reveal that finishes after the next game has started", async () => {
    let releaseReveal: (() => void) | undefined;
    newTabReading = () => {
      const slow: Reading = createReading(
        (_translationId, book, chapter) =>
          new Promise<void>((resolve) => {
            releaseReveal = () => {
              slow.bookId.value = book;
              slow.chapterNumber.value = chapter;
              resolve();
            };
          })
      );
      return slow;
    };
    const games = [
      savedGame("one", "JHN", "In the beginning was the Word", "alpha hint"),
      savedGame("two", "GEN", "In the beginning God created", "beta hint"),
    ];
    await installAndPlay(games, 0);
    await showPane();
    const firstRound = roundTab().readingState;
    await tap(firstRound, selectedVerse("GEN", 1, 2, "And the earth"));
    await showPane();
    await act(async () => {
      clickButton(container, "Reveal verse");
    });
    expect(releaseReveal).toBeTypeOf("function");

    await act(async () => {
      clickButton(container, "End game");
    });
    await showPane();
    await act(async () => {
      clickButton(container, "Play", 1);
    });
    await showPane();

    await act(async () => {
      releaseReveal?.();
      await Promise.resolve();
    });
    await showPane();

    expect(
      firstRound.decorations.value.some(
        (d) => d.options.className === "sb-verse-decoration-diminish"
      )
    ).toBe(false);
    expect(container.textContent).not.toContain(
      "Better luck next time — keep going!"
    );
    expect(container.textContent).toContain(
      "Tap any verse in the reader to guess."
    );
  });

  it("celebrates a win over the reader with the panel closed, and marks the verse", async () => {
    await installAndPlay([
      savedGame("one", "JHN", "In the beginning was the Word", "a hint"),
    ]);
    await closePane();
    const round = roundTab().readingState;

    await tap(
      round,
      selectedVerse("JHN", 1, 1, "In the beginning was the Word")
    );
    await act(async () => {
      await vi.dynamicImportSettled();
    });
    await vi.waitFor(() => {
      expect(document.body.querySelector(".ftv-celebration")).not.toBeNull();
    });

    expect(panes.value.some((pane) => pane.id === PANE_ID)).toBe(false);
    const celebration = document.body.querySelector(".ftv-celebration");
    expect(celebration?.textContent).toContain("You found it!");
    expect(celebration?.textContent).toContain("John 1:1");
    const found = round.decorations.value.find(
      (d) => d.options.className === "ftv-found-verse"
    );
    expect(found).toMatchObject({ bookId: "JHN", chapterNumber: 1, verses: 1 });
    expect(found?.options.localOnly).toBe(true);

    await act(async () => {
      clickButton(celebration!, "Keep reading");
    });
    expect(document.body.querySelector(".ftv-celebration")).toBeNull();
    expect(bar()?.textContent).toContain("You found it!");

    await act(async () => {
      clickButton(document.body, "Back to games");
    });
    expect(tabs.value).toHaveLength(1);
    expect(round.decorations.value).toEqual([]);
  });
});
