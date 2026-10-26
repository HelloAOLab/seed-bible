import { signal, type Signal } from "@preact/signals";
import { render } from "preact";
import { act } from "preact/test-utils";
import type { ComponentChild } from "preact";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import {
  setupExtensionContext,
  unregisterExtension,
} from "@packages/seed-bible/seed-bible/managers/ExtensionManager";
import { mockTranslate } from "../seed-bible/testUtils/mockI18n";
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

interface Reading {
  selectedVerses: Signal<SelectedVerse[]>;
  clearSelectedVerses: () => void;
  translationBooks: Signal<null>;
  translationId: Signal<string>;
  bookId: Signal<string>;
  chapterNumber: Signal<number>;
  selectChapter: ReturnType<typeof vi.fn>;
  selectTranslationAndChapter: (
    translationId: string,
    book: string,
    chapter: number
  ) => Promise<void>;
  decorateVerses: ReturnType<typeof vi.fn>;
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

function createReading(
  selectTranslationAndChapter?: Reading["selectTranslationAndChapter"]
): Reading {
  const selectedVerses = signal<SelectedVerse[]>([]);
  const reading: Reading = {
    selectedVerses,
    clearSelectedVerses: () => {
      selectedVerses.value = [];
    },
    translationBooks: signal(null),
    translationId: signal("BSB"),
    bookId: signal("GEN"),
    chapterNumber: signal(1),
    selectChapter: vi.fn(async () => undefined),
    selectTranslationAndChapter:
      selectTranslationAndChapter ??
      (async (_translationId, book, chapter) => {
        reading.bookId.value = book;
        reading.chapterNumber.value = chapter;
      }),
    decorateVerses: vi.fn(),
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

describe("Find the Verse", () => {
  let container: HTMLDivElement;
  let panes: Signal<{ id: string }[]>;
  let paneView: (() => ComponentChild) | null;
  let toolbar: { onSelect?: () => void } | null;
  let verseTool: {
    onSelect?: (context: { readingState: Reading }) => void;
  } | null;
  let reading: Reading;
  let selectedTab: Signal<{ readingState: Reading } | null>;
  let recordData: ReturnType<typeof vi.fn>;

  function install(games: SavedGame[] = [], active: Reading = reading) {
    recordData = vi.fn(async () => ({ success: true }));
    selectedTab = signal({ readingState: active });
    const state = {
      i18n: { t: mockTranslate },
      login: { userId: signal(games.length > 0 ? "user-1" : null) },
      os: {
        getData: vi.fn(async () => ({
          success: true,
          data: { games },
        })),
        recordData,
      },
      app: { selectedTab },
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

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    panes = signal<{ id: string }[]>([]);
    paneView = null;
    toolbar = null;
    verseTool = null;
    reading = createReading();
  });

  afterEach(() => {
    unregisterExtension("find-the-verse-extension");
    render(null, container);
    container.remove();
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

  it("hides the reader bar while the More menu is open, then brings it back", async () => {
    const wrap = document.createElement("div");
    wrap.className = "sb-reader-toolbar-wrap";
    document.body.appendChild(wrap);
    const games = [
      savedGame("one", "JHN", "In the beginning was the Word", "alpha hint"),
    ];
    try {
      await act(async () => {
        install(games);
        await Promise.resolve();
      });
      await openPane();
      await act(async () => {
        clickButton(container, "Play", 0);
      });
      await closePane();
      expect(document.body.textContent).toContain("End game");

      const menu = document.createElement("div");
      menu.className = "sb-mobile-more-menu";
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

  it("returns to the game panel when End game is tapped on the reader bar", async () => {
    const games = [
      savedGame("one", "JHN", "In the beginning was the Word", "alpha hint"),
    ];
    await act(async () => {
      install(games);
      await Promise.resolve();
    });
    await openPane();
    await act(async () => {
      clickButton(container, "Play", 0);
    });
    await closePane();
    expect(panes.value.some((pane) => pane.id === PANE_ID)).toBe(false);

    await act(async () => {
      clickButton(document.body, "End game");
    });

    expect(panes.value.some((pane) => pane.id === PANE_ID)).toBe(true);
    await showPane();
    expect(container.textContent).toContain("Create a game");
    expect(container.textContent).not.toContain("End game");
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
    const stored = recordData.mock.calls[0]?.[2] as {
      games: Array<{ id: string; name: string }>;
    };
    expect(stored.games[0]).toMatchObject({ id: "one", name: "Revised name" });
    expect(panes.value.some((pane) => pane.id === PANE_ID)).toBe(false);
    expect(document.body.textContent).toContain("End game");
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
  });

  it("does not carry an open hint into the next game", async () => {
    const games = [
      savedGame("one", "JHN", "In the beginning was the Word", "alpha hint"),
      savedGame("two", "GEN", "In the beginning God created", "beta hint"),
    ];
    await act(async () => {
      install(games);
      await Promise.resolve();
    });
    await openPane();
    expect(container.textContent).toContain("Play");

    await act(async () => {
      clickButton(container, "Play", 0);
    });
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

  it("does not count a tap on the revealed verse as a win", async () => {
    const games = [
      savedGame("one", "JHN", "In the beginning was the Word", "a hint"),
    ];
    await act(async () => {
      install(games);
      await Promise.resolve();
    });
    await openPane();
    await act(async () => {
      clickButton(container, "Play", 0);
    });
    await showPane();

    // One chance reveals after one guess. Spend it on the wrong verse.
    await act(async () => {
      reading.selectedVerses.value = [
        selectedVerse("GEN", 1, 2, "And the earth"),
      ];
      await Promise.resolve();
    });
    await showPane();
    await act(async () => {
      clickButton(container, "Reveal verse");
    });
    await showPane();
    expect(container.textContent).toContain(
      "Better luck next time — keep going!"
    );

    await act(async () => {
      reading.selectedVerses.value = [
        selectedVerse("JHN", 1, 1, "In the beginning was the Word"),
      ];
      await Promise.resolve();
    });
    await showPane();

    expect(container.textContent).not.toContain("You found it!");
    expect(container.textContent).toContain(
      "Better luck next time — keep going!"
    );
  });

  it("drops a reveal that finishes after the next game has started", async () => {
    let releaseReveal: (() => void) | undefined;
    reading = createReading(
      (_translationId, book, chapter) =>
        new Promise<void>((resolve) => {
          releaseReveal = () => {
            reading.bookId.value = book;
            reading.chapterNumber.value = chapter;
            resolve();
          };
        })
    );
    const games = [
      savedGame("one", "JHN", "In the beginning was the Word", "alpha hint"),
      savedGame("two", "GEN", "In the beginning God created", "beta hint"),
    ];
    await act(async () => {
      install(games, reading);
      await Promise.resolve();
    });
    await openPane();
    await act(async () => {
      clickButton(container, "Play", 0);
    });
    await showPane();
    await act(async () => {
      reading.selectedVerses.value = [
        selectedVerse("GEN", 1, 2, "And the earth"),
      ];
      await Promise.resolve();
    });
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

    expect(reading.decorateVerses).not.toHaveBeenCalled();
    expect(container.textContent).not.toContain(
      "Better luck next time — keep going!"
    );
    expect(container.textContent).toContain(
      "Tap any verse in the reader to guess."
    );
  });
});
