import type { Mock } from "vitest";
import { render } from "preact";
import { act } from "preact/test-utils";
import { signal, type Signal } from "@preact/signals";
import { YourContentPane } from "@packages/seed-bible/seed-bible/components/YourContentPane/YourContentPane";
import { highlightKey } from "@packages/seed-bible/seed-bible/managers/YourContentManager";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import type { Annotation } from "@packages/seed-bible/seed-bible/managers/AnnotationsManager";
import type { StoredHighlight } from "@packages/seed-bible/seed-bible/managers/HighlightsManager";
import type { Bookmark } from "@packages/seed-bible/seed-bible/managers/BookmarksManager";
import type { Playlist } from "@packages/seed-bible/seed-bible/managers/PlaylistManager";
import type { ContentLoadStatus } from "@packages/seed-bible/seed-bible/managers/YourContentManager";

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const { mockI18nManager } = await import("../testUtils/mockI18n");
  return mockI18nManager();
});

function annotation(id: string, html: string, verse = 1): Annotation {
  return {
    id,
    bookId: "GEN",
    chapterNumber: 1,
    verseNumber: verse,
    data: { type: "comment", html, createdAtMs: 1762041600000 },
  } as unknown as Annotation;
}

function highlight(
  bookId: string,
  colorId = "green",
  chapterNumber = 1,
  verse: number | [number, number] = 1
): StoredHighlight {
  return {
    translationId: "BSB",
    bookId,
    chapterNumber,
    highlight: { colorId, verse },
  };
}

function bookmark(id: string, verse?: number): Bookmark {
  return {
    id,
    translationId: "BSB",
    bookId: "PSA",
    chapterNumber: 23,
    verse,
    createdAt: 1761955200000,
    category: "My Bookmarks",
  } as unknown as Bookmark;
}

function playlist(id: string, title: string, items = 3): Playlist {
  return {
    id,
    recordName: "rec",
    authorUserId: "user-1",
    title,
    description: null,
    items: Array.from({ length: items }, () => ({ type: "text", text: "x" })),
    createdAtMs: 1761868800000,
    updatedAtMs: 1761868800000,
  } as unknown as Playlist;
}

interface StateOptions {
  annotations?: Annotation[];
  highlights?: StoredHighlight[];
  bookmarks?: Bookmark[];
  playlists?: Playlist[];
  unhighlightError?: Error;
  /** Verse wording per highlight key, as the manager would have read it back. */
  highlightVerseText?: Record<string, string>;
  isReadingHighlightVerseText?: boolean;
  status?: ContentLoadStatus;
  /** Makes the server delete fail, so the optimistic removal has to roll back. */
  deleteError?: Error;
}

function createState(options: StateOptions = {}) {
  const load = vi.fn(async () => {});
  const removeAnnotation = vi.fn(() => {});
  const restoreAnnotation = vi.fn(() => {});
  const removeBookmark = vi.fn(async (_id: string) => {});
  const removeHighlight = vi.fn((_highlight: StoredHighlight) => {});
  const highlightVerseText = signal<ReadonlyMap<string, string>>(
    new Map(Object.entries(options.highlightVerseText ?? {}))
  );
  const isReadingHighlightVerseText = signal(
    options.isReadingHighlightVerseText ?? false
  );
  const readHighlightVerseText = vi.fn(async () => {});
  const restoreHighlight = vi.fn((_highlight: StoredHighlight) => {});
  const unhighlightVerse = vi.fn(async () => {
    if (options.unhighlightError) {
      throw options.unhighlightError;
    }
  });
  const deleteAnnotationAndRefresh = vi.fn(async () => {
    if (options.deleteError) {
      throw options.deleteError;
    }
  });
  const query = signal("");
  const filter = signal("all");

  const state = {
    yourContent: {
      query,
      filter,
      annotations: signal(options.annotations ?? []),
      highlights: signal(options.highlights ?? []),
      status: signal(options.status ?? "ready"),
      load,
      removeAnnotation,
      restoreAnnotation,
      resetFilters: vi.fn(() => {}),
      removeHighlight,
      restoreHighlight,
      highlightVerseText,
      isReadingHighlightVerseText,
      readHighlightVerseText,
    },
    highlights: { unhighlightVerse },
    bookmarks: {
      bookmarks: signal(options.bookmarks ?? []),
      categories: signal([{ name: "My Bookmarks" }]),
      expandedCategories: signal([]),
      removeBookmark: removeBookmark,
    },
    playlists: {
      userPlaylists: signal(options.playlists ?? []),
      startPlaying: vi.fn(),
      editPlaylist: vi.fn(),
      getPlaylistUrl: vi.fn(() => "https://example.com/playlist"),
      deletePlaylist: vi.fn(async () => {}),
    },
    modals: { openModal: vi.fn(), closeModal: vi.fn() },
    app: { toast: vi.fn() },
    annotations: { deleteAnnotationAndRefresh },
    today: {
      bookNames: signal(
        new Map([
          ["GEN", "Genesis"],
          ["JHN", "John"],
          ["PSA", "Psalm"],
        ])
      ),
      // No verse text in these tests: the cards fall back to the reference,
      // which is what a chapter that isn't downloaded does in the app too.
      getVerseText: vi.fn(async () => undefined),
      getDefaultTranslation: () => "BSB",
    },
  } as unknown as SeedBibleState;

  return {
    state,
    removeBookmark,
    readHighlightVerseText,
    highlightVerseText,
    removeHighlight,
    restoreHighlight,
    unhighlightVerse,
    load,
    removeAnnotation,
    restoreAnnotation,
    deleteAnnotationAndRefresh,
    query,
    filter,
  };
}

describe("YourContentPane", () => {
  let container: HTMLDivElement;
  let onOpenPassage: Mock<(target: unknown) => void>;
  let onPlayPlaylist: Mock<(playlist: unknown) => void>;
  let onEditPlaylist: Mock<(playlist: unknown) => void>;
  let onEditAnnotation: Mock<(annotation: unknown) => void>;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    onOpenPassage = vi.fn((_target: unknown) => {});
    onPlayPlaylist = vi.fn((_playlist: unknown) => {});
    onEditPlaylist = vi.fn((_playlist: unknown) => {});
    onEditAnnotation = vi.fn((_annotation: unknown) => {});
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  function renderPane(state: SeedBibleState) {
    act(() => {
      render(
        <YourContentPane
          state={state}
          onOpenPassage={onOpenPassage}
          onPlayPlaylist={onPlayPlaylist}
          onEditPlaylist={onEditPlaylist}
          onEditAnnotation={onEditAnnotation}
        />,
        container
      );
    });
  }

  const sectionTitles = () =>
    Array.from(container.querySelectorAll(".sb-content-section-title")).map(
      (el) => el.textContent
    );

  it("asks for the content when it opens", () => {
    const { state, load } = createState();
    renderPane(state);

    expect(load).toHaveBeenCalledTimes(1);
  });

  it("shows every section that has something in it", () => {
    const { state } = createState({
      annotations: [annotation("a", "<p>note</p>")],
      highlights: [highlight("JHN")],
      bookmarks: [bookmark("b1")],
      playlists: [playlist("p1", "Morning devotions")],
    });
    renderPane(state);

    expect(sectionTitles()).toEqual([
      "Annotations",
      "Highlights",
      "Bookmarks",
      "Playlists",
    ]);
  });

  it("leaves out sections the user has nothing in", () => {
    const { state } = createState({ bookmarks: [bookmark("b1")] });
    renderPane(state);

    expect(sectionTitles()).toEqual(["Bookmarks"]);
  });

  it("tells a user with nothing yet what will show up here", () => {
    const { state } = createState();
    renderPane(state);

    expect(
      container.querySelector(".sb-content-status")?.textContent
    ).toContain("will show up here");
  });

  it("says a failed load failed, rather than showing an empty screen", () => {
    const { state } = createState({ status: "error" });
    renderPane(state);

    const status = container.querySelector(".sb-content-status");
    expect(status?.textContent).toContain("couldn't be loaded");
    expect(container.querySelector(".sb-content-retry")).not.toBeNull();
  });

  it("retries a failed load from the button", () => {
    const { state, load } = createState({ status: "error" });
    renderPane(state);

    act(() => {
      (
        container.querySelector(".sb-content-retry") as HTMLButtonElement
      ).click();
    });

    expect(load).toHaveBeenLastCalledWith({ force: true });
  });

  it("narrows to one section when a chip is picked", () => {
    const { state, filter } = createState({
      annotations: [annotation("a", "<p>note</p>")],
      bookmarks: [bookmark("b1")],
    });
    renderPane(state);

    const chips = Array.from(
      container.querySelectorAll(".sb-content-chip")
    ) as HTMLButtonElement[];
    const bookmarksChip = chips.find((c) => c.textContent === "Bookmarks")!;
    act(() => {
      bookmarksChip.click();
    });

    expect(filter.value).toBe("bookmarks");
    expect(sectionTitles()).toEqual(["Bookmarks"]);
  });

  it("previews only the first few of a section until See all", () => {
    const { state, filter } = createState({
      bookmarks: [
        bookmark("b1"),
        bookmark("b2"),
        bookmark("b3"),
        bookmark("b4"),
      ],
    });
    renderPane(state);

    expect(container.querySelectorAll(".sb-content-bookmark")).toHaveLength(3);

    act(() => {
      (
        container.querySelector(".sb-content-see-all") as HTMLButtonElement
      ).click();
    });

    expect(filter.value).toBe("bookmarks");
    expect(container.querySelectorAll(".sb-content-bookmark")).toHaveLength(4);
  });

  it("offers no See all when a section already shows everything", () => {
    const { state } = createState({ bookmarks: [bookmark("b1")] });
    renderPane(state);

    expect(container.querySelector(".sb-content-see-all")).toBeNull();
  });

  it("filters by search text across sections", () => {
    const { state, query } = createState({
      annotations: [annotation("a", "<p>a note about light</p>")],
      highlights: [highlight("JHN")],
    });
    renderPane(state);
    expect(sectionTitles()).toEqual(["Annotations", "Highlights"]);

    act(() => {
      query.value = "light";
    });

    expect(sectionTitles()).toEqual(["Annotations"]);
  });

  it("says so when a search matches nothing", () => {
    const { state, query } = createState({
      bookmarks: [bookmark("b1")],
    });
    renderPane(state);

    act(() => {
      query.value = "nothing here";
    });

    expect(
      container.querySelector(".sb-content-status")?.textContent
    ).toContain("Nothing matches");
  });

  /**
   * Highlights and bookmarks carry no text of their own, so their reference is
   * all there is to search. It used to be matched as the bare book name, which
   * meant the reference printed on the row — "John 3:16" — found nothing when
   * typed back in.
   */
  describe("searching by reference", () => {
    const highlightRows = () =>
      container.querySelectorAll(".sb-content-highlight-row").length;

    const search = (
      state: SeedBibleState,
      query: Signal<string>,
      text: string
    ) => {
      renderPane(state);
      act(() => {
        query.value = text;
      });
    };

    const johnThree = () =>
      createState({ highlights: [highlight("JHN", "green", 3, 16)] });

    it.each([
      ["the book name alone", "John"],
      ["the book and chapter", "John 3"],
      ["the whole reference", "John 3:16"],
      ["a lowercase reference", "john 3:16"],
      ["the book id, as a row shows before names load", "JHN"],
    ])("finds a highlight by %s", (_label, text) => {
      const { state, query } = johnThree();
      search(state, query, text);

      expect(highlightRows()).toBe(1);
    });

    it("does not match a different chapter of the same book", () => {
      const { state, query } = johnThree();
      search(state, query, "John 4");

      expect(highlightRows()).toBe(0);
    });

    it("does not match a different book", () => {
      const { state, query } = johnThree();
      search(state, query, "Genesis");

      expect(highlightRows()).toBe(0);
    });

    it("matches a verse range by either end", () => {
      const { state, query } = createState({
        highlights: [highlight("JHN", "green", 3, [16, 18])],
      });
      search(state, query, "John 3:16-18");

      expect(highlightRows()).toBe(1);
    });

    it("finds a bookmark by its reference", () => {
      const { state, query } = createState({ bookmarks: [bookmark("b1", 1)] });
      search(state, query, "Psalm 23:1");

      expect(
        container.querySelectorAll(".sb-content-bookmark-row")
      ).toHaveLength(1);
    });

    it("finds an annotation by its reference, not only its text", () => {
      const { state, query } = createState({
        annotations: [annotation("a", "<p>a note about light</p>")],
      });
      search(state, query, "Genesis 1");

      expect(sectionTitles()).toEqual(["Annotations"]);
    });

    it("finds a highlight by the words of the verse itself", () => {
      // The row quotes the verse, so the words on screen have to be typable.
      const stored = highlight("JHN", "green", 3, 16);
      const { state, query } = createState({
        highlights: [stored],
        highlightVerseText: {
          [highlightKey(stored)]: "For God so loved the world",
        },
      });
      search(state, query, "so loved");

      expect(highlightRows()).toBe(1);
    });

    it("asks for the verse text on the first search, not on open", () => {
      const { state, query, readHighlightVerseText } = createState({
        highlights: [highlight("JHN", "green", 3, 16)],
      });
      renderPane(state);

      expect(readHighlightVerseText).not.toHaveBeenCalled();

      act(() => {
        query.value = "loved";
      });

      expect(readHighlightVerseText).toHaveBeenCalled();
    });

    it("does not claim nothing matches while the verses are still being read", () => {
      // Otherwise a search shows "Nothing matches that search." and then
      // sprouts results a moment later.
      const { state, query } = createState({
        highlights: [highlight("JHN", "green", 3, 16)],
        isReadingHighlightVerseText: true,
      });
      search(state, query, "so loved");

      expect(
        container.querySelector(".sb-content-status")?.textContent
      ).not.toContain("Nothing matches");
    });

    it("says nothing matches once the read has finished", () => {
      const { state, query } = createState({
        highlights: [highlight("JHN", "green", 3, 16)],
        isReadingHighlightVerseText: false,
      });
      search(state, query, "nothing like this");

      expect(
        container.querySelector(".sb-content-status")?.textContent
      ).toContain("Nothing matches");
    });

    it("matches as a substring, so Psalm 2 also reaches Psalm 23", () => {
      // Pinned deliberately: this box searches text, it does not parse the
      // query as a reference.
      const { state, query } = createState({ bookmarks: [bookmark("b1", 1)] });
      search(state, query, "Psalm 2");

      expect(
        container.querySelectorAll(".sb-content-bookmark-row")
      ).toHaveLength(1);
    });
  });

  it("labels a verse bookmark and a chapter bookmark differently", () => {
    const { state } = createState({
      bookmarks: [bookmark("verse", 3), bookmark("chapter")],
    });
    renderPane(state);

    const kinds = Array.from(
      container.querySelectorAll(".sb-content-bookmark-kind")
    ).map((el) => el.textContent);
    expect(kinds).toEqual(["Verse", "Chapter"]);
    expect(
      container.querySelector(".sb-content-bookmark-kind-verse")?.textContent
    ).toBe("Verse");
  });

  it("names bookmarks by book, chapter and verse", () => {
    const { state } = createState({ bookmarks: [bookmark("b1", 3)] });
    renderPane(state);

    expect(
      container.querySelector(".sb-content-bookmark-name")?.textContent
    ).toBe("Psalm 23:3");
  });

  it("opens the passage behind a bookmark", () => {
    const { state } = createState({ bookmarks: [bookmark("b1", 3)] });
    renderPane(state);

    act(() => {
      (
        container.querySelector(".sb-content-bookmark") as HTMLButtonElement
      ).click();
    });

    expect(onOpenPassage).toHaveBeenCalledWith({
      bookId: "PSA",
      chapter: 23,
      verse: 3,
      translationId: "BSB",
    });
  });

  it("opens the passage behind a highlight", () => {
    const { state } = createState({ highlights: [highlight("JHN")] });
    renderPane(state);

    act(() => {
      (
        container.querySelector(".sb-content-highlight") as HTMLButtonElement
      ).click();
    });

    expect(onOpenPassage).toHaveBeenCalledWith({
      bookId: "JHN",
      chapter: 1,
      verse: 1,
      translationId: "BSB",
    });
  });

  it("shows a highlight's reference by book name", () => {
    const { state } = createState({ highlights: [highlight("JHN")] });
    renderPane(state);

    expect(
      container.querySelector(".sb-content-highlight-ref")?.textContent
    ).toBe("John 1:1");
  });

  it("plays a playlist from its play button", () => {
    const list = playlist("p1", "Morning devotions");
    const { state } = createState({ playlists: [list] });
    renderPane(state);

    act(() => {
      container
        .querySelector<HTMLButtonElement>(".sb-discover-item-play")!
        .click();
    });

    expect(onPlayPlaylist).toHaveBeenCalledWith(list);
  });

  // The menu renders through a portal into `document.body`, not inside the
  // pane, so it is looked up there.
  const openPlaylistMenu = () => {
    const trigger = container.querySelector<HTMLButtonElement>(
      ".sb-discover-item-menu"
    );
    if (!trigger)
      throw new Error("The playlist options button did not render.");
    act(() => {
      trigger.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
  };

  const menuItems = () =>
    Array.from(
      document.body.querySelectorAll<HTMLElement>(".sb-context-menu-item")
    );

  it("edits a playlist from its options menu", () => {
    const list = playlist("p1", "Morning devotions");
    const { state } = createState({ playlists: [list] });
    renderPane(state);
    openPlaylistMenu();

    const edit = menuItems().find((item) =>
      item.textContent?.includes("Edit playlist")
    );
    if (!edit) throw new Error("Edit playlist was not in the options menu.");
    act(() => {
      edit.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(onEditPlaylist).toHaveBeenCalledWith(list);
    // Editing must not also start playback, which the row's own click does.
    expect(onPlayPlaylist).not.toHaveBeenCalled();
  });

  it("offers share, edit and delete, the same as the Discover list", () => {
    const { state } = createState({
      playlists: [playlist("p1", "Morning devotions")],
    });
    renderPane(state);
    openPlaylistMenu();

    // Each label is preceded by its icon's ligature text.
    expect(menuItems().map((item) => item.textContent)).toEqual([
      "shareShare playlist",
      "editEdit playlist",
      "deleteDelete",
    ]);
  });

  it("renders a playlist as a Discover row, with its title", () => {
    const { state } = createState({
      playlists: [playlist("p1", "Morning devotions", 12)],
    });
    renderPane(state);

    const row = container.querySelector(".sb-playlist-item");
    expect(row).not.toBeNull();
    expect(row?.querySelector(".sb-discover-item-title")?.textContent).toBe(
      "Morning devotions"
    );
  });

  it("opens the passage an annotation is about", () => {
    const { state } = createState({
      annotations: [annotation("a", "<p>note</p>", 5)],
    });
    renderPane(state);

    act(() => {
      (
        container.querySelector(".sb-content-quote") as HTMLButtonElement
      ).click();
    });

    expect(onOpenPassage).toHaveBeenCalledWith({
      bookId: "GEN",
      chapter: 1,
      verse: 5,
    });
  });

  // Deleting hides the card immediately rather than waiting on the server —
  // a note that stays on screen after "Delete" reads as a failure.
  it("removes a deleted annotation from the list and from the record", () => {
    const target = annotation("a", "<p>note</p>");
    const { state, removeAnnotation, deleteAnnotationAndRefresh } = createState(
      {
        annotations: [target],
      }
    );
    renderPane(state);

    act(() => {
      (
        container.querySelector(".sb-content-kebab") as HTMLButtonElement
      ).click();
    });
    const deleteItem = Array.from(
      document.querySelectorAll(".sb-context-menu-item")
    ).find((el) => el.textContent?.includes("Delete")) as HTMLButtonElement;
    act(() => {
      deleteItem.click();
    });

    expect(removeAnnotation).toHaveBeenCalledWith("a");
    expect(deleteAnnotationAndRefresh).toHaveBeenCalledWith(target);
  });

  // A chip for a section with nothing in it used to render nothing at all:
  // the empty message counted every section, and the other sections still
  // had content.
  it("says a chosen section is empty even when other sections aren't", () => {
    const { state, filter } = createState({
      annotations: [annotation("a", "<p>note</p>")],
    });
    renderPane(state);

    act(() => {
      filter.value = "playlists";
    });

    expect(container.querySelector(".sb-content-section")).toBeNull();
    expect(
      container.querySelector(".sb-content-status")?.textContent
    ).toContain("Playlists you create will show up here.");
  });

  it("keeps a search's 'no matches' message when a section is chosen", () => {
    const { state, filter, query } = createState({
      annotations: [annotation("a", "<p>note about light</p>")],
    });
    renderPane(state);

    act(() => {
      filter.value = "annotations";
      query.value = "nothing here";
    });

    expect(
      container.querySelector(".sb-content-status")?.textContent
    ).toContain("Nothing matches");
  });

  // Without the rollback the note vanished from the screen while still
  // sitting in the record.
  it("puts an annotation back when the server delete fails", async () => {
    const target = annotation("a", "<p>note</p>");
    const { state, removeAnnotation, restoreAnnotation } = createState({
      annotations: [target],
      deleteError: new Error("nope"),
    });
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    renderPane(state);

    act(() => {
      (
        container.querySelector(".sb-content-kebab") as HTMLButtonElement
      ).click();
    });
    const deleteItem = Array.from(
      document.querySelectorAll(".sb-context-menu-item")
    ).find((el) => el.textContent?.includes("Delete")) as HTMLButtonElement;
    act(() => {
      deleteItem.click();
    });

    expect(removeAnnotation).toHaveBeenCalledWith("a");
    await vi.waitFor(() => {
      expect(restoreAnnotation).toHaveBeenCalledWith(target);
    });
    consoleError.mockRestore();
  });

  it("hands an annotation to the editor from the menu", () => {
    const target = annotation("a", "<p>note</p>");
    const { state } = createState({ annotations: [target] });
    renderPane(state);

    act(() => {
      (
        container.querySelector(".sb-content-kebab") as HTMLButtonElement
      ).click();
    });
    const editItem = Array.from(
      document.querySelectorAll(".sb-context-menu-item")
    ).find((el) => el.textContent?.includes("Edit")) as HTMLButtonElement;
    act(() => {
      editItem.click();
    });

    expect(onEditAnnotation).toHaveBeenCalledWith(target);
  });
});

/**
 * The pills carry the same options menu the bookmarks sidebar gives each
 * bookmark. Remove is not folder-scoped here as it is there: this list is
 * flat, so there is no folder to remove from, and it removes the bookmark
 * outright — the same thing the edit modal's "Remove from all folders" does.
 */
describe("YourContentPane bookmark options", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
    document.body.innerHTML = "";
  });

  const renderWithBookmark = () => {
    const created = createState({ bookmarks: [bookmark("b1")] });
    act(() => {
      render(
        <YourContentPane
          state={created.state}
          onOpenPassage={vi.fn()}
          onPlayPlaylist={vi.fn()}
          onEditPlaylist={vi.fn()}
          onEditAnnotation={vi.fn()}
        />,
        container
      );
    });
    return created;
  };

  // The menu portals into `document.body`, not the pane.
  const openMenu = () => {
    const trigger = container.querySelector<HTMLButtonElement>(
      ".sb-content-bookmark-menu"
    );
    if (!trigger)
      throw new Error("The bookmark options button did not render.");
    act(() => {
      trigger.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
  };

  const menuItems = () =>
    Array.from(
      document.body.querySelectorAll<HTMLElement>(".sb-context-menu-item")
    );

  it("gives every bookmark an options button", () => {
    renderWithBookmark();

    expect(
      container.querySelectorAll(".sb-content-bookmark-menu")
    ).toHaveLength(1);
  });

  it("offers edit and remove, like the bookmarks sidebar", () => {
    renderWithBookmark();
    openMenu();

    expect(menuItems().map((item) => item.textContent)).toEqual([
      "Edit bookmark",
      "Remove bookmark",
    ]);
  });

  it("removes the bookmark from the remove entry", () => {
    const { removeBookmark } = renderWithBookmark();
    openMenu();

    const remove = menuItems().find(
      (item) => item.textContent === "Remove bookmark"
    );
    if (!remove) throw new Error("Remove bookmark was not in the menu.");
    act(() => {
      remove.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(removeBookmark).toHaveBeenCalledWith("b1");
  });

  it("does not open the passage when the options button is used", () => {
    // The pill and the menu are siblings, so the menu must not fall through
    // to the pill's own click.
    const onOpenPassage = vi.fn();
    const created = createState({ bookmarks: [bookmark("b1")] });
    act(() => {
      render(
        <YourContentPane
          state={created.state}
          onOpenPassage={onOpenPassage}
          onPlayPlaylist={vi.fn()}
          onEditPlaylist={vi.fn()}
          onEditAnnotation={vi.fn()}
        />,
        container
      );
    });
    openMenu();

    expect(onOpenPassage).not.toHaveBeenCalled();
  });
});

/**
 * Clearing a highlight follows the same optimistic pattern as deleting an
 * annotation on this screen: drop it from the list at once, then put it back
 * if the server call fails.
 */
describe("YourContentPane clearing a highlight", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
    document.body.innerHTML = "";
  });

  const renderWithHighlight = (options: StateOptions = {}) => {
    const created = createState({ highlights: [highlight("JHN")], ...options });
    act(() => {
      render(
        <YourContentPane
          state={created.state}
          onOpenPassage={vi.fn()}
          onPlayPlaylist={vi.fn()}
          onEditPlaylist={vi.fn()}
          onEditAnnotation={vi.fn()}
        />,
        container
      );
    });
    return created;
  };

  const openMenu = () => {
    const trigger = container.querySelector<HTMLButtonElement>(
      ".sb-content-highlight-row .sb-content-kebab"
    );
    if (!trigger)
      throw new Error("The highlight's menu button did not render.");
    act(() => {
      trigger.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
  };

  const clearItem = () => {
    const item = Array.from(
      document.body.querySelectorAll<HTMLElement>(".sb-context-menu-item")
    ).find((candidate) => candidate.textContent?.includes("Clear highlight"));
    if (!item) throw new Error("Clear highlight was not in the menu.");
    return item;
  };

  it("gives every highlight a menu offering Clear highlight", () => {
    renderWithHighlight();
    openMenu();

    expect(clearItem()).not.toBeUndefined();
  });

  it("clears the highlight from the list and on the server", async () => {
    const { removeHighlight, unhighlightVerse, restoreHighlight } =
      renderWithHighlight();
    openMenu();

    await act(async () => {
      clearItem().dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(removeHighlight).toHaveBeenCalledWith(highlight("JHN"));
    expect(unhighlightVerse).toHaveBeenCalledWith("BSB", "JHN", 1, 1);
    expect(restoreHighlight).not.toHaveBeenCalled();
  });

  it("puts the highlight back when the server call fails", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const { removeHighlight, restoreHighlight } = renderWithHighlight({
      unhighlightError: new Error("offline"),
    });
    openMenu();

    await act(async () => {
      clearItem().dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(removeHighlight).toHaveBeenCalled();
    expect(restoreHighlight).toHaveBeenCalledWith(highlight("JHN"));
    expect(consoleError).toHaveBeenCalled();
  });

  it("does not open the passage when the menu is used", () => {
    const onOpenPassage = vi.fn();
    const created = createState({ highlights: [highlight("JHN")] });
    act(() => {
      render(
        <YourContentPane
          state={created.state}
          onOpenPassage={onOpenPassage}
          onPlayPlaylist={vi.fn()}
          onEditPlaylist={vi.fn()}
          onEditAnnotation={vi.fn()}
        />,
        container
      );
    });
    openMenu();

    expect(onOpenPassage).not.toHaveBeenCalled();
  });
});
