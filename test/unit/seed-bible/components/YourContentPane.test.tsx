import type { Mock } from "vitest";
import { render } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import { YourContentPane } from "@packages/seed-bible/seed-bible/components/YourContentPane/YourContentPane";
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

function highlight(bookId: string, colorId = "green"): StoredHighlight {
  return {
    translationId: "BSB",
    bookId,
    chapterNumber: 1,
    highlight: { colorId, verse: 1 },
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
  status?: ContentLoadStatus;
  /** Makes the server delete fail, so the optimistic removal has to roll back. */
  deleteError?: Error;
}

function createState(options: StateOptions = {}) {
  const load = vi.fn(async () => {});
  const removeAnnotation = vi.fn(() => {});
  const restoreAnnotation = vi.fn(() => {});
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
    },
    bookmarks: { bookmarks: signal(options.bookmarks ?? []) },
    playlists: { userPlaylists: signal(options.playlists ?? []) },
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
  let onEditAnnotation: Mock<(annotation: unknown) => void>;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    onOpenPassage = vi.fn((_target: unknown) => {});
    onPlayPlaylist = vi.fn((_playlist: unknown) => {});
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

  it("plays a playlist from its tile", () => {
    const list = playlist("p1", "Morning devotions");
    const { state } = createState({ playlists: [list] });
    renderPane(state);

    act(() => {
      (
        container.querySelector(".sb-content-playlist") as HTMLButtonElement
      ).click();
    });

    expect(onPlayPlaylist).toHaveBeenCalledWith(list);
  });

  it("shows a playlist's title and item count", () => {
    const { state } = createState({
      playlists: [playlist("p1", "Morning devotions", 12)],
    });
    renderPane(state);

    expect(
      container.querySelector(".sb-content-playlist-title")?.textContent
    ).toBe("Morning devotions");
    expect(
      container.querySelector(".sb-content-playlist-meta")?.textContent
    ).toContain("12 items");
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
