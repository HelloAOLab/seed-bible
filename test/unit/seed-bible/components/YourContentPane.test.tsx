import type { Mock } from "vitest";
import { render } from "preact";
import { act } from "preact/test-utils";
import { signal, type Signal } from "@preact/signals";
import { YourContentPane } from "@packages/seed-bible/seed-bible/components/YourContentPane/YourContentPane";
import { highlightKey } from "@packages/seed-bible/seed-bible/managers/YourContentManager";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import type { Annotation } from "@packages/seed-bible/seed-bible/managers/AnnotationsManager";
import type { StoredHighlight } from "@packages/seed-bible/seed-bible/managers/HighlightsManager";
import type { Save } from "@packages/seed-bible/seed-bible/managers/SavesManager";
import {
  createBookmarksManager,
  type Bookmark,
} from "@packages/seed-bible/seed-bible/managers/BookmarksManager";
import type { CasualOSManager } from "@packages/seed-bible/seed-bible/managers/OsManager";
import type { LoginManager } from "@packages/seed-bible/seed-bible/managers/LoginManager";
import type { Playlist } from "@packages/seed-bible/seed-bible/managers/PlaylistManager";
import type { ContentLoadStatus } from "@packages/seed-bible/seed-bible/managers/YourContentManager";
import type { GalleryPhoto } from "@packages/seed-bible/seed-bible/managers/UserGalleryManager";
import type { SeedBibleCustomization } from "@packages/seed-bible/seed-bible/managers/CustomizationsManager";
import type { Translation } from "@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI";
import { LIGHT_THEME } from "@packages/seed-bible/seed-bible/managers/ThemeManager";
import {
  createReadingPlan,
  createReadingPlanProgress,
  type ReadingPlan,
  type ReadingPlanProgress,
} from "@packages/seed-bible/seed-bible/managers/ReadingPlansManager";

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

function save(id: string, verse?: number): Save {
  return {
    id,
    translationId: "BSB",
    bookId: "PSA",
    chapterNumber: 23,
    verse,
    createdAt: 1761955200000,
    categories: ["My Saves"],
  } as unknown as Save;
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

const PLAN_CREATED_MS = 1761868800000;

/**
 * A plan of the user's own, one chapter to read per session. Built with the
 * real factory so it is a plan the calendar maths accept.
 */
function readingPlan(
  address: string,
  title: string | null,
  options: {
    status?: "draft" | "complete";
    sessions?: number;
    description?: string | null;
    createdAtMs?: number;
  } = {}
): ReadingPlan {
  return createReadingPlan(
    "user-1",
    "user-1",
    address,
    options.createdAtMs ?? PLAN_CREATED_MS,
    {
      title,
      description: options.description ?? null,
      status: options.status,
      sessions: Array.from({ length: options.sessions ?? 0 }, (_, i) => ({
        id: `${address}-session-${i + 1}`,
        readings: [
          {
            id: `${address}-reading-${i + 1}`,
            item: {
              type: "bible-verse",
              ref: { bookId: "GEN", chapter: i + 1 },
            },
          },
        ],
      })),
    }
  );
}

/** Progress for a plan the user started the day it was made and has not read from. */
function startedProgress(plan: ReadingPlan): ReadingPlanProgress {
  return createReadingPlanProgress(
    plan,
    "user-1",
    `${plan.address}-progress`,
    PLAN_CREATED_MS
  );
}

/** Progress on a plan with its first `done` sessions read. */
function progressWithSessionsDone(
  plan: ReadingPlan,
  done: number,
  options: { selfPaced?: boolean } = {}
): ReadingPlanProgress {
  const progress = createReadingPlanProgress(
    plan,
    "user-1",
    `${plan.address}-progress`,
    PLAN_CREATED_MS,
    options
  );
  return {
    ...progress,
    sessions: plan.sessions.slice(0, done).map((session, i) => ({
      sessionId: session.id,
      completedReadingIds: session.readings.map((r) => r.id),
      partialChapters: [],
      completedAtMs: PLAN_CREATED_MS + (i + 1) * 1000,
    })),
  };
}

function bookmark(
  id: string,
  name: string,
  overrides: Partial<Bookmark> = {}
): Bookmark {
  return {
    id,
    name,
    colorId: "blue",
    translationId: "BSB",
    bookId: "JHN",
    chapterNumber: 3,
    createdAt: 1761955200000,
    updatedAt: 1761955200000,
    ...overrides,
  };
}

interface StateOptions {
  annotations?: Annotation[];
  highlights?: StoredHighlight[];
  saves?: Save[];
  /** The bookmarks the records server holds when the screen's user signs in. */
  bookmarks?: Bookmark[];
  /** How many reads of the bookmarks record fail with a server error first. */
  bookmarkReadFailures?: number;
  /** Holds every read of the bookmarks record until `releaseBookmarkReads`. */
  holdBookmarkReads?: boolean;
  /** Makes every write of the bookmarks record fail. */
  bookmarkWriteError?: Error;
  playlists?: Playlist[];
  photos?: GalleryPhoto[];
  customizations?: SeedBibleCustomization[];
  /** `null` for a signed-out reader. */
  userId?: string | null;
  unhighlightError?: Error;
  /** Verse wording per highlight key, as the manager would have read it back. */
  highlightVerseText?: Record<string, string>;
  isReadingHighlightVerseText?: boolean;
  status?: ContentLoadStatus;
  /** Makes the server delete fail, so the optimistic removal has to roll back. */
  deleteError?: Error;
  /** Full plans; the screen reads them as the list and as the loaded plans. */
  readingPlans?: ReadingPlan[];
  readingPlanProgresses?: ReadingPlanProgress[];
  /** Plans whose contents have loaded; defaults to every plan in `readingPlans`. */
  fullReadingPlans?: ReadingPlan[];
  /** Makes deleting a plan fail, so the screen has to say so. */
  deleteReadingPlanError?: Error;
  /** Makes deleting a customization fail, so the screen has to say so. */
  removeCustomizationError?: Error;
  /** The customization open in the editor, if any. */
  editingCustomization?: SeedBibleCustomization;
  /** Translations whose book lists are already loaded. */
  translations?: Translation[];
  /** Translations the server has, whose book lists load when asked for. */
  serverTranslations?: Translation[];
  /** Book names in a translation's own language, by translation id then book id. */
  bookNamesByTranslation?: Record<string, Record<string, string>>;
}

/** Renders the modal the screen last asked to open, as the modal host would. */
function renderOpenedModal(openModal: ReturnType<typeof vi.fn>) {
  const modal = openModal.mock.calls.at(-1)![0] as {
    content: () => preact.ComponentChildren;
  };
  const dialog = document.createElement("div");
  act(() => render(<>{modal.content()}</>, dialog));
  return dialog;
}

/** Presses a confirmation's Delete button and waits for the delete to settle. */
async function confirmDelete(dialog: HTMLElement) {
  await act(async () => {
    dialog
      .querySelector<HTMLButtonElement>(".sb-session-settings-end")!
      .click();
  });
}

function createState(options: StateOptions = {}) {
  const load = vi.fn(async () => {});
  const removeAnnotation = vi.fn(() => {});
  const restoreAnnotation = vi.fn(() => {});
  const removeSave = vi.fn(async (_id: string) => {});
  const login = {
    userId: signal(options.userId === undefined ? "user-1" : options.userId),
  };
  // Bookmarks run on the real manager; the records server under it is the
  // one boundary faked.
  let savedBookmarks: Bookmark[] | null = options.bookmarks ?? null;
  let bookmarkReadFailures = options.bookmarkReadFailures ?? 0;
  let releaseBookmarkReads = () => {};
  const bookmarkReadsReleased = options.holdBookmarkReads
    ? new Promise<void>((resolve) => {
        releaseBookmarkReads = resolve;
      })
    : Promise.resolve();
  const getBookmarksRecord = vi.fn(async () => {
    await bookmarkReadsReleased;
    if (bookmarkReadFailures > 0) {
      bookmarkReadFailures--;
      return {
        success: false,
        errorCode: "server_error",
        errorMessage: "Server error",
      };
    }
    return savedBookmarks
      ? { success: true, data: { bookmarks: savedBookmarks } }
      : {
          success: false,
          errorCode: "data_not_found",
          errorMessage: "Data not found",
        };
  });
  const writeBookmarksRecord = vi.fn(
    async (
      _userId: string,
      _address: string,
      data: { bookmarks: Bookmark[] }
    ) => {
      if (options.bookmarkWriteError) {
        throw options.bookmarkWriteError;
      }
      savedBookmarks = data.bookmarks;
      return { success: true };
    }
  );
  const bookmarks = createBookmarksManager(
    {
      getData: getBookmarksRecord,
      recordData: writeBookmarksRecord,
    } as unknown as CasualOSManager,
    login as unknown as LoginManager
  );
  const closeModal = vi.fn();
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
  const deleteReadingPlan = vi.fn(async (_plan: unknown) => {
    if (options.deleteReadingPlanError) {
      throw options.deleteReadingPlanError;
    }
  });
  const openModal = vi.fn();
  const toast = vi.fn();
  const query = signal("");
  const filter = signal("all");
  const syncPhotos = vi.fn(async () => {});
  const loadCustomizations = vi.fn(async () => {});
  const booksOf = (translation: Translation) => ({
    translation,
    books: Object.entries(
      options.bookNamesByTranslation?.[translation.id] ?? {}
    ).map(([id, name]) => ({ id, name })),
  });
  const translationBooks = signal(
    new Map(
      (options.translations ?? []).map((translation) => [
        translation.id,
        booksOf(translation),
      ])
    )
  );
  // Like the real manager: loading a translation's book list caches it.
  const getTranslationBooks = vi.fn(async (translationId: string) => {
    const found = options.serverTranslations?.find(
      (translation) => translation.id === translationId
    );
    if (!found) throw new Error("not found");
    translationBooks.value = new Map(translationBooks.value).set(
      translationId,
      booksOf(found)
    );
    return booksOf(found);
  });
  const editingCustomization = signal(options.editingCustomization ?? null);
  // As the manager does: deleting the one being edited clears the draft.
  const removeCustomization = vi.fn(async (id: string) => {
    if (options.removeCustomizationError) {
      throw options.removeCustomizationError;
    }
    if (editingCustomization.value?.id === id) {
      editingCustomization.value = null;
    }
  });
  const closePane = vi.fn();

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
    login,
    gallery: { photos: signal(options.photos ?? []), syncPhotos },
    customizations: {
      customizations: signal(options.customizations ?? []),
      load: loadCustomizations,
      remove: removeCustomization,
      editingCustomization,
      resolveEditingVariantTheme: () => LIGHT_THEME,
      getShareLink: (c: SeedBibleCustomization) =>
        `https://example.com/?customization=${c.id}`,
    },
    bibleData: {
      availableTranslations: signal([]),
      translationBooks,
      getTranslationBooks,
    },
    saves: {
      saves: signal(options.saves ?? []),
      categories: signal([{ name: "My Saves" }]),
      expandedCategories: signal([]),
      removeSave: removeSave,
    },
    bookmarks,
    playlists: {
      userPlaylists: signal(options.playlists ?? []),
      startPlaying: vi.fn(),
      editPlaylist: vi.fn(),
      getPlaylistUrl: vi.fn(() => "https://example.com/playlist"),
      deletePlaylist: vi.fn(async () => {}),
    },
    modals: { openModal, closeModal },
    app: { toast },
    annotations: { deleteAnnotationAndRefresh },
    readingPlans: {
      userReadingPlans: signal(options.readingPlans ?? []),
      fullReadingPlans: signal(
        options.fullReadingPlans ?? options.readingPlans ?? []
      ),
      userReadingPlanProgresses: signal(options.readingPlanProgresses ?? []),
      deleteReadingPlan,
    },
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
    panes: { closePane },
  } as unknown as SeedBibleState;

  return {
    state,
    closePane,
    removeSave,
    getBookmarksRecord,
    releaseBookmarkReads: () => releaseBookmarkReads(),
    /** What the records server holds now: the last list written, or the first. */
    savedBookmarks: () => savedBookmarks,
    closeModal,
    readHighlightVerseText,
    highlightVerseText,
    removeHighlight,
    restoreHighlight,
    unhighlightVerse,
    load,
    removeAnnotation,
    restoreAnnotation,
    deleteAnnotationAndRefresh,
    deleteReadingPlan,
    openModal,
    toast,
    query,
    filter,
    syncPhotos,
    loadCustomizations,
    removeCustomization,
    getTranslationBooks,
  };
}

function customization(id: string, name: string): SeedBibleCustomization {
  return {
    id,
    name,
    variants: [{ id: `${id}-light`, name: "Light", base: "light" }],
    defaultVariantId: `${id}-light`,
    createdAt: 1_762_041_600_000,
    updatedAt: 1_762_041_600_000,
    extensionSettings: {},
    extensionSettingDefaults: {},
    extensionSensitiveProxies: {},
  } as unknown as SeedBibleCustomization;
}

function photo(id: string): GalleryPhoto {
  return {
    id,
    url: `https://example.com/${id}.jpg`,
    createdAtMs: 1_762_041_600_000,
  };
}

describe("YourContentPane", () => {
  let container: HTMLDivElement;
  let onOpenPassage: Mock<(target: unknown) => void>;
  let onPlayPlaylist: Mock<(playlist: unknown) => void>;
  let onEditPlaylist: Mock<(playlist: unknown) => void>;
  let onEditAnnotation: Mock<(annotation: unknown) => void>;
  let onCreatePlaylist: Mock<() => void>;
  let onOpenReadingPlan: Mock<(plan: unknown) => void>;
  let onEditReadingPlan: Mock<(plan: unknown) => void>;
  let onEditCustomization: Mock<(customizationId: string) => void>;
  let onCreateCustomization: Mock<() => void>;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    onOpenPassage = vi.fn((_target: unknown) => {});
    onPlayPlaylist = vi.fn((_playlist: unknown) => {});
    onEditPlaylist = vi.fn((_playlist: unknown) => {});
    onEditAnnotation = vi.fn((_annotation: unknown) => {});
    onCreatePlaylist = vi.fn(() => {});
    onOpenReadingPlan = vi.fn((_plan: unknown) => {});
    onEditReadingPlan = vi.fn((_plan: unknown) => {});
    onEditCustomization = vi.fn((_customizationId: string) => {});
    onCreateCustomization = vi.fn(() => {});
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
          onCreatePlaylist={onCreatePlaylist}
          onOpenReadingPlan={onOpenReadingPlan}
          onEditReadingPlan={onEditReadingPlan}
          onEditCustomization={onEditCustomization}
          onCreateCustomization={onCreateCustomization}
        />,
        container
      );
    });
  }

  /**
   * Renders once the bookmarks manager has finished its sign-in load, so the
   * stored bookmarks are on screen from the first frame.
   */
  async function renderWithBookmarks(state: SeedBibleState) {
    await act(async () => {
      await state.bookmarks.ensureLoaded();
    });
    renderPane(state);
  }

  const sectionTitles = () =>
    Array.from(container.querySelectorAll(".sb-content-section-title")).map(
      (el) => el.textContent
    );

  // Forced, not just asked for: a verse highlighted or annotated in the
  // reader after the first visit would otherwise never appear here, because
  // an already-loaded manager skips an unforced load.
  it("refreshes the content when it opens", () => {
    const { state, load } = createState();
    renderPane(state);

    expect(load).toHaveBeenCalledTimes(1);
    expect(load).toHaveBeenCalledWith({ force: true });
  });

  it("clears the search with the ×, which shows only once something is typed", () => {
    const { state, query } = createState();
    renderPane(state);
    const clear = () =>
      container.querySelector<HTMLButtonElement>(
        'button[aria-label="Clear search"]'
      );
    expect(clear()).toBeNull();

    act(() => {
      query.value = "psalm";
    });
    act(() => clear()!.click());

    expect(query.value).toBe("");
    expect(clear()).toBeNull();
    expect(document.activeElement).toBe(
      container.querySelector(".sb-content-search input")
    );
  });

  it("shows every section that has something in it", async () => {
    const { state } = createState({
      annotations: [annotation("a", "<p>note</p>")],
      highlights: [highlight("JHN")],
      saves: [save("b1")],
      bookmarks: [bookmark("bm1", "Reading plan")],
      playlists: [playlist("p1", "Morning devotions")],
      readingPlans: [readingPlan("plan-1", "Psalms in a month")],
      customizations: [customization("c1", "Grace Church")],
      photos: [photo("i1")],
    });
    await renderWithBookmarks(state);

    expect(sectionTitles()).toEqual([
      "Annotations",
      "Highlights",
      "Bookmarks",
      "Saves",
      "Playlists",
      "Reading plans",
      "Branding",
      "Images",
    ]);
  });

  describe("branding", () => {
    const cardTitles = () =>
      Array.from(container.querySelectorAll(".sb-cz-card-title")).map(
        (el) => el.textContent
      );

    it("loads the user's customizations when it opens", () => {
      const { state, loadCustomizations } = createState();
      renderPane(state);

      expect(loadCustomizations).toHaveBeenCalledTimes(1);
    });

    it("does not load or show branding for a signed-out reader", () => {
      const { state, loadCustomizations } = createState({
        userId: null,
        customizations: [customization("c1", "Grace Church")],
      });
      renderPane(state);

      expect(loadCustomizations).not.toHaveBeenCalled();
      expect(sectionTitles()).not.toContain("Branding");
    });

    it("previews the first few customizations until See all", () => {
      const { state, filter } = createState({
        customizations: [
          customization("c1", "Grace Church"),
          customization("c2", "Youth group"),
          customization("c3", "Small group"),
          customization("c4", "Family"),
        ],
      });
      renderPane(state);

      expect(cardTitles()).toEqual([
        "Grace Church",
        "Youth group",
        "Small group",
      ]);

      act(() => {
        (
          container.querySelector(".sb-content-see-all") as HTMLButtonElement
        ).click();
      });

      expect(filter.value).toBe("branding");
      expect(cardTitles()).toHaveLength(4);
    });

    it("opens a customization in its editor when its card is clicked", () => {
      const { state } = createState({
        customizations: [customization("c1", "Grace Church")],
      });
      renderPane(state);

      act(() => {
        (
          container.querySelector(".sb-cz-card-open") as HTMLButtonElement
        ).click();
      });

      expect(onEditCustomization).toHaveBeenCalledWith("c1");
    });

    it("matches a search against the customization's name", () => {
      const { state, query } = createState({
        customizations: [
          customization("c1", "Grace Church"),
          customization("c2", "Youth group"),
        ],
      });
      query.value = "youth";
      renderPane(state);

      expect(cardTitles()).toEqual(["Youth group"]);
    });

    /** Opens a card's menu, which portals into `document.body`. */
    const openCardMenu = () => {
      act(() => {
        container
          .querySelector<HTMLButtonElement>(".sb-cz-card-menu button")!
          .dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });
      return Array.from(
        document.body.querySelectorAll<HTMLElement>(".sb-context-menu-item")
      );
    };

    /** Picks Delete from the card's menu and renders the confirmation. */
    const chooseDelete = (openModal: ReturnType<typeof vi.fn>) => {
      const remove = openCardMenu().find((item) =>
        item.textContent?.includes("Delete")
      );
      if (!remove) throw new Error("Delete was not in the menu.");
      act(() => {
        remove.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });
      expect(openModal).toHaveBeenCalledTimes(1);
      const modal = openModal.mock.calls[0]![0] as {
        content: () => preact.ComponentChildren;
      };
      const dialog = document.createElement("div");
      act(() => render(<>{modal.content()}</>, dialog));
      return dialog;
    };

    const confirm = async (dialog: HTMLElement) => {
      await act(async () => {
        dialog
          .querySelector<HTMLButtonElement>(".sb-session-settings-end")!
          .click();
      });
    };

    it("offers share and delete in a customization's menu", () => {
      const { state } = createState({
        customizations: [customization("c1", "Grace Church")],
      });
      renderPane(state);

      expect(
        openCardMenu().map(
          (item) =>
            item.querySelector(".sb-context-menu-item-icon")?.textContent
        )
      ).toEqual(["share", "delete"]);
    });

    it("asks before deleting a customization, then deletes it", async () => {
      const { state, openModal, removeCustomization } = createState({
        customizations: [customization("c1", "Grace Church")],
      });
      renderPane(state);

      const dialog = chooseDelete(openModal);
      expect(removeCustomization).not.toHaveBeenCalled();
      expect(dialog.textContent).toContain(
        'Delete Custom Branding "Grace Church"? This can\'t be undone.'
      );

      await confirm(dialog);

      expect(removeCustomization).toHaveBeenCalledWith("c1");
    });

    it("closes the editor when deleting the customization open in it", async () => {
      const grace = customization("c1", "Grace Church");
      const { state, openModal, closePane } = createState({
        customizations: [grace, customization("c2", "Hope Chapel")],
        editingCustomization: grace,
      });
      renderPane(state);

      await confirm(chooseDelete(openModal));

      expect(closePane).toHaveBeenCalledWith("customization-edit-pane");
    });

    it("leaves the editor open when deleting a different customization", async () => {
      const { state, openModal, closePane } = createState({
        customizations: [customization("c1", "Grace Church")],
        editingCustomization: customization("c2", "Hope Chapel"),
      });
      renderPane(state);

      await confirm(chooseDelete(openModal));

      expect(closePane).not.toHaveBeenCalled();
    });

    it("says so when a customization can't be deleted", async () => {
      vi.spyOn(console, "error").mockImplementation(() => undefined);
      const { state, openModal, toast } = createState({
        customizations: [customization("c1", "Grace Church")],
        removeCustomizationError: new Error("server_error"),
      });
      renderPane(state);

      await confirm(chooseDelete(openModal));

      expect(toast).toHaveBeenCalledWith(
        "Couldn't delete the Custom Branding."
      );
    });

    it("says what will show up under the Branding chip when there is none", () => {
      const { state, filter } = createState({ saves: [save("b1")] });
      filter.value = "branding";
      renderPane(state);

      expect(
        container.querySelector(".sb-content-status")?.textContent
      ).toContain("Custom Branding you create");
    });
  });

  describe("bookmarks", () => {
    afterEach(() => {
      // Menus portal into the body, outside the pane's container.
      document.body.innerHTML = "";
    });

    const rows = () =>
      Array.from(
        container.querySelectorAll<HTMLElement>(".sb-content-bookmark-row")
      );
    const names = () =>
      rows().map(
        (row) => row.querySelector(".sb-content-bookmark-name")?.textContent
      );

    /** Opens a bookmark's options menu and picks the item labelled `label`. */
    const choose = (row: HTMLElement, label: string) => {
      act(() => {
        row
          .querySelector<HTMLButtonElement>(".sb-content-save-menu")!
          .dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });
      const item = Array.from(
        document.body.querySelectorAll<HTMLElement>(".sb-context-menu-item")
      ).find(
        (el) =>
          el.querySelector(":scope > span:not(.sb-context-menu-item-icon)")
            ?.textContent === label
      );
      if (!item) throw new Error(`${label} was not in the menu.`);
      act(() => {
        item.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });
    };

    const type = (input: HTMLInputElement, value: string) => {
      act(() => {
        input.value = value;
        input.dispatchEvent(new Event("input", { bubbles: true }));
      });
    };

    it("shows each bookmark's name, chapter and translation", async () => {
      const { state } = createState({
        bookmarks: [bookmark("bm1", "Sermon prep")],
        translations: [
          { id: "BSB", shortName: "BSB" } as unknown as Translation,
        ],
        bookNamesByTranslation: { BSB: { JHN: "John" } },
      });
      await renderWithBookmarks(state);

      const row = rows()[0]!;
      expect(row.querySelector(".sb-content-bookmark-name")?.textContent).toBe(
        "Sermon prep"
      );
      expect(
        row.querySelector(".sb-content-bookmark-chapter")?.textContent
      ).toBe("John 3");
      expect(
        row.querySelector(".sb-content-bookmark-translation")?.textContent
      ).toBe("BSB");
    });

    it("lists the most recently moved bookmark first", async () => {
      const { state } = createState({
        bookmarks: [
          bookmark("old", "Older", { updatedAt: 1000 }),
          bookmark("new", "Newer", { updatedAt: 2000 }),
        ],
      });
      await renderWithBookmarks(state);

      expect(names()).toEqual(["Newer", "Older"]);
    });

    // The reader is on an English translation (today's book names say
    // "John"), but the bookmark was placed in a Spanish one. The sidebar and
    // Today both call it "Juan 3", so this screen must too.
    it("names the book in the bookmark's own translation, not the reader's", async () => {
      const { state, query } = createState({
        bookmarks: [bookmark("bm1", "Estudio", { translationId: "RVR" })],
        translations: [
          { id: "RVR", shortName: "RVR" } as unknown as Translation,
        ],
        bookNamesByTranslation: { RVR: { JHN: "Juan" } },
      });
      await renderWithBookmarks(state);

      expect(
        rows()[0]!.querySelector(".sb-content-bookmark-chapter")?.textContent
      ).toBe("Juan 3");

      act(() => {
        query.value = "juan 3";
      });
      expect(names()).toEqual(["Estudio"]);
    });

    it("loads a translation it doesn't have yet to name a bookmark's book", async () => {
      const { state, getTranslationBooks } = createState({
        bookmarks: [bookmark("bm1", "Estudio", { translationId: "RVR" })],
        serverTranslations: [
          { id: "RVR", shortName: "RVR" } as unknown as Translation,
        ],
        bookNamesByTranslation: { RVR: { JHN: "Juan" } },
      });
      await renderWithBookmarks(state);

      expect(getTranslationBooks).toHaveBeenCalledWith("RVR");
      await vi.waitFor(() =>
        expect(
          rows()[0]!.querySelector(".sb-content-bookmark-chapter")?.textContent
        ).toBe("Juan 3")
      );
    });

    it("opens the bookmarked chapter, in the bookmark's translation", async () => {
      const { state } = createState({
        bookmarks: [bookmark("bm1", "Sermon prep", { translationId: "KJV" })],
      });
      await renderWithBookmarks(state);

      act(() => {
        rows()[0]!
          .querySelector<HTMLButtonElement>(".sb-content-bookmark")!
          .click();
      });

      expect(onOpenPassage).toHaveBeenCalledWith({
        bookId: "JHN",
        chapter: 3,
        translationId: "KJV",
      });
    });

    it("finds a bookmark by its name or by its chapter", async () => {
      const { state, query } = createState({
        bookmarks: [
          bookmark("bm1", "Sermon prep"),
          bookmark("bm2", "Morning", { bookId: "PSA", chapterNumber: 23 }),
        ],
        translations: [
          { id: "BSB", shortName: "BSB" } as unknown as Translation,
        ],
        bookNamesByTranslation: { BSB: { JHN: "John", PSA: "Psalm" } },
      });
      await renderWithBookmarks(state);

      act(() => {
        query.value = "sermon";
      });
      expect(names()).toEqual(["Sermon prep"]);

      act(() => {
        query.value = "psalm 23";
      });
      expect(names()).toEqual(["Morning"]);
    });

    it("previews the first few bookmarks until See all", async () => {
      const { state, filter } = createState({
        bookmarks: ["A", "B", "C", "D"].map((name, i) =>
          bookmark(name, name, { updatedAt: 4000 - i })
        ),
      });
      await renderWithBookmarks(state);
      expect(names()).toEqual(["A", "B", "C"]);

      act(() => {
        container
          .querySelector<HTMLButtonElement>(".sb-content-see-all")!
          .click();
      });

      expect(filter.value).toBe("bookmarks");
      expect(names()).toEqual(["A", "B", "C", "D"]);
    });

    const statusText = () =>
      Array.from(container.querySelectorAll(".sb-content-status"))
        .map((el) => el.textContent)
        .join(" | ");

    it("says how to place one when the Bookmarks chip has none", async () => {
      const { state, filter } = createState({ saves: [save("s1")] });
      filter.value = "bookmarks";
      await renderWithBookmarks(state);

      await vi.waitFor(() =>
        expect(statusText()).toBe(
          "No bookmarks yet. Use the bookmark button above a chapter to place one."
        )
      );
    });

    it("says it's still loading, not that there are none, while bookmarks load", async () => {
      const { state, filter, releaseBookmarkReads } = createState({
        bookmarks: [bookmark("bm1", "Sermon prep")],
        holdBookmarkReads: true,
      });
      filter.value = "bookmarks";
      renderPane(state);

      expect(statusText()).toContain("Gathering your content…");
      expect(statusText()).not.toContain("No bookmarks yet");

      await act(async () => {
        releaseBookmarkReads();
      });

      await vi.waitFor(() => expect(names()).toEqual(["Sermon prep"]));
      expect(statusText()).toBe("");
    });

    it("says bookmarks couldn't load, and loads them on Try again", async () => {
      vi.spyOn(console, "warn").mockImplementation(() => {});
      const { state, filter } = createState({
        bookmarks: [bookmark("bm1", "Sermon prep")],
        // The sign-in load and the screen's own retry both fail.
        bookmarkReadFailures: 2,
      });
      filter.value = "bookmarks";
      renderPane(state);

      await vi.waitFor(() =>
        expect(statusText()).toBe(
          "Couldn't load your bookmarks. Please try again.Try again"
        )
      );
      expect(statusText()).not.toContain("No bookmarks yet");

      act(() => {
        container
          .querySelector<HTMLButtonElement>(".sb-content-retry")!
          .click();
      });

      await vi.waitFor(() => expect(names()).toEqual(["Sermon prep"]));
      expect(statusText()).toBe("");
    });

    // Bookmarks load on sign-in; a load that failed then would otherwise
    // leave this section empty for the rest of the session.
    it("shows bookmarks whose load failed at sign-in, by loading them again on open", async () => {
      vi.spyOn(console, "warn").mockImplementation(() => {});
      const { state, getBookmarksRecord } = createState({
        bookmarks: [bookmark("bm1", "Sermon prep")],
        bookmarkReadFailures: 1,
      });
      // The sign-in load fails, so there is nothing to show yet.
      await vi.waitFor(() =>
        expect(getBookmarksRecord).toHaveBeenCalledTimes(1)
      );
      expect(state.bookmarks.bookmarks.value).toEqual([]);

      renderPane(state);

      await vi.waitFor(() => expect(names()).toEqual(["Sermon prep"]));
    });

    it("doesn't ask for bookmarks when signed out", async () => {
      const { state, getBookmarksRecord } = createState({
        userId: null,
        bookmarks: [bookmark("bm1", "Sermon prep")],
      });
      await renderWithBookmarks(state);

      expect(getBookmarksRecord).not.toHaveBeenCalled();
      expect(rows()).toHaveLength(0);
    });

    it("asks before deleting a bookmark, then deletes it", async () => {
      const { state, openModal, savedBookmarks } = createState({
        bookmarks: [
          bookmark("bm1", "Sermon prep"),
          bookmark("bm2", "Morning", { updatedAt: 0 }),
        ],
      });
      await renderWithBookmarks(state);

      choose(rows()[0]!, "Delete");
      const dialog = renderOpenedModal(openModal);
      expect(dialog.textContent).toContain(
        'Delete "Sermon prep"? This can\'t be undone.'
      );
      expect(names()).toEqual(["Sermon prep", "Morning"]);

      await confirmDelete(dialog);

      expect(names()).toEqual(["Morning"]);
      expect(savedBookmarks()!.map((b) => b.name)).toEqual(["Morning"]);
    });

    it("does not open the chapter when the options menu is used", async () => {
      const { state } = createState({
        bookmarks: [bookmark("bm1", "Sermon prep")],
      });
      await renderWithBookmarks(state);

      choose(rows()[0]!, "Edit");

      expect(onOpenPassage).not.toHaveBeenCalled();
    });

    it("renames and recolors a bookmark from Edit, then closes", async () => {
      const { state, openModal, closeModal, savedBookmarks } = createState({
        bookmarks: [bookmark("bm1", "Sermon prep")],
      });
      await renderWithBookmarks(state);

      choose(rows()[0]!, "Edit");
      const dialog = renderOpenedModal(openModal);
      const nameInput = dialog.querySelector<HTMLInputElement>(
        ".sb-bookmark-form-name"
      )!;
      expect(nameInput.value).toBe("Sermon prep");

      type(nameInput, "Advent");
      act(() => {
        dialog
          .querySelector<HTMLButtonElement>(
            ".sb-bookmark-form-color[aria-label='Purple']"
          )!
          .click();
      });
      await act(async () => {
        dialog
          .querySelector<HTMLButtonElement>(".sb-bookmark-picker-save")!
          .click();
      });

      await vi.waitFor(() =>
        expect(closeModal).toHaveBeenCalledWith("edit-bookmark-bm1")
      );
      expect(names()).toEqual(["Advent"]);
      expect(savedBookmarks()).toEqual([
        bookmark("bm1", "Advent", { colorId: "purple" }),
      ]);
    });

    it("keeps the editor open and says so when an edit can't be saved", async () => {
      const { state, openModal, closeModal, toast, savedBookmarks } =
        createState({
          bookmarks: [bookmark("bm1", "Sermon prep")],
          bookmarkWriteError: new Error("offline"),
        });
      vi.spyOn(console, "warn").mockImplementation(() => {});
      await renderWithBookmarks(state);

      choose(rows()[0]!, "Edit");
      const dialog = renderOpenedModal(openModal);
      type(
        dialog.querySelector<HTMLInputElement>(".sb-bookmark-form-name")!,
        "Advent"
      );
      await act(async () => {
        dialog
          .querySelector<HTMLButtonElement>(".sb-bookmark-picker-save")!
          .click();
      });

      await vi.waitFor(() =>
        expect(toast).toHaveBeenCalledWith(
          "Couldn't save your bookmark. Please try again."
        )
      );
      expect(closeModal).not.toHaveBeenCalled();
      expect(
        dialog.querySelector<HTMLInputElement>(".sb-bookmark-form-name")!.value
      ).toBe("Advent");
      // The manager put the old name back when the write failed.
      expect(names()).toEqual(["Sermon prep"]);
      expect(savedBookmarks()!.map((b) => b.name)).toEqual(["Sermon prep"]);
    });
  });

  describe("images", () => {
    const tileSrcs = () =>
      Array.from(
        container.querySelectorAll<HTMLImageElement>(".sb-images-tile img")
      ).map((img) => img.src);

    it("refreshes the uploaded images when it opens", () => {
      const { state, syncPhotos } = createState();
      renderPane(state);

      expect(syncPhotos).toHaveBeenCalledTimes(1);
    });

    it("does not fetch or show images for a signed-out reader", () => {
      const { state, syncPhotos } = createState({
        userId: null,
        photos: [photo("i1")],
      });
      renderPane(state);

      expect(syncPhotos).not.toHaveBeenCalled();
      expect(sectionTitles()).not.toContain("Images");
    });

    it("previews the first few images, in gallery order, until See all", () => {
      const { state, filter } = createState({
        photos: [photo("i1"), photo("i2"), photo("i3"), photo("i4")],
      });
      renderPane(state);

      expect(tileSrcs()).toEqual([
        "https://example.com/i1.jpg",
        "https://example.com/i2.jpg",
        "https://example.com/i3.jpg",
      ]);

      act(() => {
        (
          container.querySelector(".sb-content-see-all") as HTMLButtonElement
        ).click();
      });

      expect(filter.value).toBe("images");
      expect(tileSrcs()).toHaveLength(4);
    });

    it("says what will show up under the Images chip when there are none", () => {
      const { state, filter } = createState({ saves: [save("b1")] });
      filter.value = "images";
      renderPane(state);

      expect(
        container.querySelector(".sb-content-status")?.textContent
      ).toContain("Images you upload");
    });

    it("hides images during a search, since they have no text to match", () => {
      const { state, query } = createState({
        photos: [photo("i1")],
        saves: [save("b1")],
      });
      query.value = "Genesis";
      renderPane(state);

      expect(sectionTitles()).not.toContain("Images");
    });
  });

  it("leaves out sections the user has nothing in", () => {
    const { state } = createState({ saves: [save("b1")] });
    renderPane(state);

    expect(sectionTitles()).toEqual(["Saves"]);
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
      saves: [save("b1")],
    });
    renderPane(state);

    const chips = Array.from(
      container.querySelectorAll(".sb-content-chip")
    ) as HTMLButtonElement[];
    const savesChip = chips.find((c) => c.textContent === "Saves")!;
    act(() => {
      savesChip.click();
    });

    expect(filter.value).toBe("saves");
    expect(sectionTitles()).toEqual(["Saves"]);
  });

  it("previews only the first few of a section until See all", () => {
    const { state, filter } = createState({
      saves: [save("b1"), save("b2"), save("b3"), save("b4")],
    });
    renderPane(state);

    expect(container.querySelectorAll(".sb-content-save")).toHaveLength(3);

    act(() => {
      (
        container.querySelector(".sb-content-see-all") as HTMLButtonElement
      ).click();
    });

    expect(filter.value).toBe("saves");
    expect(container.querySelectorAll(".sb-content-save")).toHaveLength(4);
  });

  it("offers no See all when a section already shows everything", () => {
    const { state } = createState({ saves: [save("b1")] });
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
      saves: [save("b1")],
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
   * Highlights and saves carry no text of their own, so their reference is
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

    it("finds a save by its reference", () => {
      const { state, query } = createState({ saves: [save("b1", 1)] });
      search(state, query, "Psalm 23:1");

      expect(container.querySelectorAll(".sb-content-save-row")).toHaveLength(
        1
      );
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
      const { state, query } = createState({ saves: [save("b1", 1)] });
      search(state, query, "Psalm 2");

      expect(container.querySelectorAll(".sb-content-save-row")).toHaveLength(
        1
      );
    });
  });

  it("shows each save's translation, like the sidebar", () => {
    const { state } = createState({
      saves: [save("verse", 3), { ...save("chapter"), translationId: "AAB" }],
    });
    renderPane(state);

    const translations = Array.from(
      container.querySelectorAll(".sb-content-save-translation")
    ).map((el) => el.textContent);
    // The whole chapter comes before a verse in it.
    expect(translations).toEqual(["AAB", "BSB"]);
    expect(container.textContent).not.toContain("Verse");
    expect(container.textContent).not.toContain("Chapter");
  });

  it("lists saves in Bible order, not the order they were made", () => {
    const { state } = createState({
      saves: [
        { ...save("john"), bookId: "JHN", chapterNumber: 3 },
        { ...save("psalm"), chapterNumber: 23 },
        { ...save("genesis"), bookId: "GEN", chapterNumber: 1 },
      ],
    });
    renderPane(state);

    expect(
      Array.from(container.querySelectorAll(".sb-content-save-name")).map(
        (el) => el.textContent
      )
    ).toEqual(["Genesis 1", "Psalm 23", "John 3"]);
  });

  it("names a verse range in full, so two that start together don't look alike", () => {
    const { state } = createState({
      saves: [
        save("one", 4),
        { ...save("range"), verse: [4, 6] } as unknown as Save,
      ],
    });
    renderPane(state);

    expect(
      Array.from(container.querySelectorAll(".sb-content-save-name")).map(
        (el) => el.textContent
      )
    ).toEqual(["Psalm 23:4", "Psalm 23:4-6"]);
  });

  it("puts a dot between a save's details, with none left over when there's no folder count", () => {
    const { state } = createState({
      saves: [
        save("one-folder", 1),
        { ...save("two-folders", 2), categories: ["My Saves", "Sermon prep"] },
      ],
    });
    renderPane(state);

    const dots = Array.from(
      container.querySelectorAll(".sb-content-save-meta")
    ).map((meta) => meta.querySelectorAll(".sb-content-meta-sep").length);
    // Translation • date, then • folder count on the second.
    expect(dots).toEqual([1, 2]);
  });

  it("counts folders only on a save that's in more than one", () => {
    const { state } = createState({
      saves: [
        save("one-folder", 1),
        { ...save("two-folders", 2), categories: ["My Saves", "Sermon prep"] },
      ],
    });
    renderPane(state);

    const counts = container.querySelectorAll(".sb-content-save-folders");
    expect(counts).toHaveLength(1);
    expect(
      counts[0]!.querySelector(".sb-content-save-folder-count")?.textContent
    ).toBe("2");
  });

  it("names saves by book, chapter and verse", () => {
    const { state } = createState({ saves: [save("b1", 3)] });
    renderPane(state);

    expect(container.querySelector(".sb-content-save-name")?.textContent).toBe(
      "Psalm 23:3"
    );
  });

  it("opens the passage behind a save", () => {
    const { state } = createState({ saves: [save("b1", 3)] });
    renderPane(state);

    act(() => {
      (
        container.querySelector(".sb-content-save") as HTMLButtonElement
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

  const translation = (id: string, shortName: string) =>
    ({ id, shortName, name: shortName }) as Translation;

  it("shows the short name of the translation a highlight was made in", () => {
    const { state } = createState({
      highlights: [{ ...highlight("JHN"), translationId: "arb_vdv" }],
      translations: [translation("arb_vdv", "VDV")],
    });
    renderPane(state);

    expect(
      container.querySelector(".sb-content-highlight-translation")?.textContent
    ).toBe("VDV");
  });

  it("loads a translation it doesn't know yet to show a save's short name", async () => {
    const { state, getTranslationBooks } = createState({
      saves: [{ ...save("b1"), translationId: "arb_vdv" }],
      serverTranslations: [translation("arb_vdv", "VDV")],
    });
    renderPane(state);

    await act(async () => {
      await Promise.resolve();
    });

    expect(getTranslationBooks).toHaveBeenCalledWith("arb_vdv");
    expect(
      container.querySelector(".sb-content-save-translation")?.textContent
    ).toBe("VDV");
  });

  it("keeps showing the id when the translation can't be loaded", async () => {
    const { state } = createState({
      highlights: [{ ...highlight("JHN"), translationId: "gone" }],
    });
    renderPane(state);
    await act(async () => {
      await Promise.resolve();
    });

    expect(
      container.querySelector(".sb-content-highlight-translation")?.textContent
    ).toBe("gone");
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

  const openCreateMenu = () => {
    const trigger =
      container.querySelector<HTMLButtonElement>(".sb-content-create");
    if (!trigger) throw new Error("The Create button did not render.");
    act(() => {
      trigger.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
  };

  it("puts the Create button ahead of the filter chips", () => {
    const { state } = createState();
    renderPane(state);

    const create = container.querySelector(".sb-content-create");
    const chips = container.querySelector(".sb-content-chips");
    if (!create || !chips) throw new Error("The toolbar did not render.");
    expect(create.textContent).toBe("+ Create");
    expect(
      create.compareDocumentPosition(chips) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it("offers Playlist and Custom Branding from the Create menu", () => {
    const { state } = createState();
    renderPane(state);
    openCreateMenu();

    expect(menuItems().map((item) => item.textContent)).toEqual([
      "queue_musicPlaylist",
      "paletteCustom Branding",
    ]);
  });

  it("leaves Custom Branding out of the Create menu when signed out", () => {
    const { state } = createState({ userId: null });
    renderPane(state);
    openCreateMenu();

    expect(menuItems().map((item) => item.textContent)).toEqual([
      "queue_musicPlaylist",
    ]);
  });

  it("starts new custom branding from the Create menu", () => {
    const { state } = createState();
    renderPane(state);
    openCreateMenu();

    const item = menuItems()[1];
    if (!item) throw new Error("Custom Branding was not in the menu.");
    act(() => {
      item.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(onCreateCustomization).toHaveBeenCalledTimes(1);
  });

  it("starts a new playlist from the Create menu", () => {
    const { state } = createState();
    renderPane(state);
    openCreateMenu();

    const item = menuItems()[0];
    if (!item) throw new Error("The Create menu had no items.");
    act(() => {
      item.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(onCreatePlaylist).toHaveBeenCalledTimes(1);
  });

  it("edits a playlist from its options menu", () => {
    const list = playlist("p1", "Morning devotions");
    const { state } = createState({ playlists: [list] });
    renderPane(state);
    openPlaylistMenu();

    const edit = menuItems().find((item) => item.textContent?.includes("Edit"));
    if (!edit) throw new Error("Edit was not in the options menu.");
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
      "shareShare",
      "editEdit",
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
    expect(row?.querySelector(".sb-hero-thumb")).toBeNull();
    expect(row?.textContent).not.toContain("No image");
  });

  it("shows a cover thumbnail when the playlist has an image", () => {
    const list = playlist("p1", "Morning devotions");
    list.heroImageUrl = "https://example.com/cover.jpg";
    const { state } = createState({ playlists: [list] });
    renderPane(state);

    const thumb = container.querySelector(
      ".sb-playlist-item .sb-hero-thumb"
    ) as HTMLImageElement;
    expect(thumb).not.toBeNull();
    expect(thumb.tagName).toBe("IMG");
    expect(thumb.src).toBe("https://example.com/cover.jpg");
    expect(container.querySelector(".sb-hero-thumb--empty")).toBeNull();
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

  // Once confirmed, deleting hides the card immediately rather than waiting
  // on the server — a note that stays on screen after "Delete" reads as a
  // failure.
  it("asks before deleting an annotation, then removes it from the list and the record", async () => {
    const target = annotation("a", "<p>note</p>");
    const { state, removeAnnotation, deleteAnnotationAndRefresh, openModal } =
      createState({
        annotations: [target],
      });
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

    expect(removeAnnotation).not.toHaveBeenCalled();
    const dialog = renderOpenedModal(openModal);
    expect(dialog.textContent).toContain(
      "Delete the annotation on Genesis 1:1? This can't be undone."
    );

    await confirmDelete(dialog);

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
  it("puts an annotation back and says so when the server delete fails", async () => {
    const target = annotation("a", "<p>note</p>");
    const { state, removeAnnotation, restoreAnnotation, openModal, toast } =
      createState({
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
    await confirmDelete(renderOpenedModal(openModal));

    expect(removeAnnotation).toHaveBeenCalledWith("a");
    expect(restoreAnnotation).toHaveBeenCalledWith(target);
    expect(toast).toHaveBeenCalledWith("Couldn't delete the annotation.");
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

  /**
   * Reading plans (issue #1798) sit beside playlists and read the same way: a
   * Discover row that opens the plan, with a menu for edit and delete.
   */
  describe("reading plans", () => {
    const planRows = () =>
      Array.from(container.querySelectorAll<HTMLElement>(".sb-content-plan"));
    const planTitles = () =>
      planRows().map(
        (row) => row.querySelector(".sb-discover-item-title")?.textContent
      );
    const planStatuses = () =>
      planRows().map(
        (row) =>
          row.querySelector(".sb-content-plan-status")?.textContent ?? null
      );

    const openPlanMenu = () => {
      const trigger = container.querySelector<HTMLButtonElement>(
        ".sb-content-plan .sb-discover-item-menu"
      );
      if (!trigger) throw new Error("The plan options button did not render.");
      act(() => {
        trigger.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });
    };

    const clickMenuItem = (label: string) => {
      const item = menuItems().find((el) => el.textContent?.includes(label));
      if (!item) throw new Error(`${label} was not in the options menu.`);
      act(() => {
        item.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });
    };

    it("lists the user's plans newest first, with where each one is up to", () => {
      const older = readingPlan("plan-1", "Psalms in a month", {
        createdAtMs: PLAN_CREATED_MS - 1000,
      });
      const draft = readingPlan("plan-2", "Gospels", { status: "draft" });
      const { state } = createState({ readingPlans: [older, draft] });
      renderPane(state);

      expect(sectionTitles()).toEqual(["Reading plans"]);
      expect(planTitles()).toEqual(["Gospels", "Psalms in a month"]);
      expect(planStatuses()).toEqual(["Draft", "Not started"]);
    });

    it("shows how far along a started plan is", () => {
      const plan = readingPlan("plan-1", "Genesis", { sessions: 3 });
      const { state } = createState({
        readingPlans: [plan],
        readingPlanProgresses: [startedProgress(plan)],
      });
      renderPane(state);

      expect(planStatuses()).toEqual(["Day 1 of 3"]);
    });

    describe("with the clock a week after the plan began", () => {
      beforeEach(() => {
        vi.useFakeTimers({ toFake: ["Date"] });
        vi.setSystemTime(PLAN_CREATED_MS + 7 * 24 * 60 * 60 * 1000);
      });
      afterEach(() => {
        vi.useRealTimers();
      });

      it("marks a plan with every session read as completed", () => {
        const plan = readingPlan("plan-1", "Genesis", { sessions: 3 });
        const { state } = createState({
          readingPlans: [plan],
          readingPlanProgresses: [progressWithSessionsDone(plan, 3)],
        });
        renderPane(state);

        expect(planStatuses()).toEqual(["Completed"]);
      });

      it("counts sessions read for a self-paced plan", () => {
        const plan = readingPlan("plan-1", "Genesis", { sessions: 3 });
        const { state } = createState({
          readingPlans: [plan],
          readingPlanProgresses: [
            progressWithSessionsDone(plan, 1, { selfPaced: true }),
          ],
        });
        renderPane(state);

        expect(planStatuses()).toEqual(["1/3 sessions"]);
      });
    });

    it("leaves out the status of a started plan whose contents haven't loaded", () => {
      const plan = readingPlan("plan-1", "Genesis", { sessions: 3 });
      const { state } = createState({
        readingPlans: [plan],
        readingPlanProgresses: [startedProgress(plan)],
        fullReadingPlans: [],
      });
      renderPane(state);

      expect(planTitles()).toEqual(["Genesis"]);
      expect(planStatuses()).toEqual([null]);
    });

    it("names an untitled plan", () => {
      const { state } = createState({
        readingPlans: [readingPlan("plan-1", null)],
      });
      renderPane(state);

      expect(planTitles()).toEqual(["Untitled plan"]);
    });

    it("opens a plan from its row", () => {
      const plan = readingPlan("plan-1", "Genesis");
      const { state } = createState({ readingPlans: [plan] });
      renderPane(state);

      act(() => {
        planRows()[0]!.click();
      });

      expect(onOpenReadingPlan).toHaveBeenCalledWith(plan);
    });

    it("edits a plan from its options menu, without also opening it", () => {
      const plan = readingPlan("plan-1", "Genesis");
      const { state } = createState({ readingPlans: [plan] });
      renderPane(state);
      openPlanMenu();
      clickMenuItem("Edit");

      expect(onEditReadingPlan).toHaveBeenCalledWith(plan);
      expect(onOpenReadingPlan).not.toHaveBeenCalled();
    });

    it("offers the same menu as the Plans pane, with no Share on a draft", () => {
      const { state } = createState({
        readingPlans: [readingPlan("plan-1", "Genesis")],
      });
      renderPane(state);
      openPlanMenu();

      expect(menuItems().map((item) => item.textContent)).toEqual([
        "shareShare",
        "editEdit",
        "deleteDelete",
      ]);

      act(() => {
        render(null, container);
      });
      const { state: draftState } = createState({
        readingPlans: [readingPlan("plan-2", "Gospels", { status: "draft" })],
      });
      renderPane(draftState);
      openPlanMenu();

      expect(menuItems().map((item) => item.textContent)).toEqual([
        "editEdit",
        "deleteDelete",
      ]);
    });

    /**
     * Renders the confirmation the modal host would show for the last modal
     * opened. Returns the element to click through and a way to clean it up.
     */
    const renderLastModal = (openModal: Mock) => {
      const registration = openModal.mock.calls.at(-1)![0] as {
        content: () => Parameters<typeof render>[0];
      };
      const host = document.createElement("div");
      document.body.appendChild(host);
      act(() => {
        render(registration.content(), host);
      });
      return {
        host,
        cleanup: () => {
          render(null, host);
          host.remove();
        },
      };
    };

    // Deleting erases the plan and the user's progress through it for good,
    // so the menu item alone must not be enough.
    it("asks before deleting a plan, then deletes it", async () => {
      const plan = readingPlan("plan-1", "Genesis");
      const { state, openModal, deleteReadingPlan } = createState({
        readingPlans: [plan],
      });
      renderPane(state);
      openPlanMenu();
      clickMenuItem("Delete");

      expect(deleteReadingPlan).not.toHaveBeenCalled();
      expect(openModal).toHaveBeenCalledTimes(1);

      const modal = renderLastModal(openModal);
      expect(modal.host.textContent).toContain('Delete "Genesis"?');
      act(() => {
        modal.host
          .querySelector<HTMLButtonElement>(".sb-session-settings-end")!
          .click();
      });

      await vi.waitFor(() => {
        expect(deleteReadingPlan).toHaveBeenCalledWith(plan);
      });
      modal.cleanup();
    });

    it("says so when a plan could not be deleted", async () => {
      const plan = readingPlan("plan-1", "Genesis");
      const { state, openModal, toast } = createState({
        readingPlans: [plan],
        deleteReadingPlanError: new Error("nope"),
      });
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      renderPane(state);
      openPlanMenu();
      clickMenuItem("Delete");

      const modal = renderLastModal(openModal);
      act(() => {
        modal.host
          .querySelector<HTMLButtonElement>(".sb-session-settings-end")!
          .click();
      });

      await vi.waitFor(() => {
        expect(toast).toHaveBeenCalledWith("Couldn't delete the reading plan.");
      });
      modal.cleanup();
      consoleError.mockRestore();
    });

    it("finds a plan by its title or description", () => {
      const { state, query } = createState({
        readingPlans: [
          readingPlan("plan-1", "Genesis", { description: "the beginning" }),
          readingPlan("plan-2", "Psalms"),
        ],
      });
      renderPane(state);

      act(() => {
        query.value = "beginning";
      });

      expect(planTitles()).toEqual(["Genesis"]);
    });

    it("previews only the first few plans until See all", () => {
      const { state, filter } = createState({
        readingPlans: ["a", "b", "c", "d"].map((n) =>
          readingPlan(`plan-${n}`, `Plan ${n}`)
        ),
      });
      renderPane(state);

      expect(planRows()).toHaveLength(3);

      act(() => {
        container
          .querySelector<HTMLButtonElement>(".sb-content-see-all")!
          .click();
      });

      expect(filter.value).toBe("reading-plans");
      expect(planRows()).toHaveLength(4);
    });

    it("says the plans section is empty when that chip is chosen", () => {
      const { state, filter } = createState({ saves: [save("b1")] });
      renderPane(state);

      act(() => {
        filter.value = "reading-plans";
      });

      expect(
        container.querySelector(".sb-content-status")?.textContent
      ).toContain("Reading plans you create will show up here.");
    });
  });
});

/**
 * The pills carry the same options menu the saves sidebar gives each
 * save. Remove is not folder-scoped here as it is there: this list is
 * flat, so there is no folder to remove from, and it removes the save
 * outright — the same thing the edit modal's "Remove from all folders" does.
 */
describe("YourContentPane save options", () => {
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

  const renderWithSave = () => {
    const created = createState({ saves: [save("b1")] });
    act(() => {
      render(
        <YourContentPane
          state={created.state}
          onOpenPassage={vi.fn()}
          onPlayPlaylist={vi.fn()}
          onEditPlaylist={vi.fn()}
          onEditAnnotation={vi.fn()}
          onCreatePlaylist={vi.fn()}
          onOpenReadingPlan={vi.fn()}
          onEditReadingPlan={vi.fn()}
          onEditCustomization={vi.fn()}
          onCreateCustomization={vi.fn()}
        />,
        container
      );
    });
    return created;
  };

  // The menu portals into `document.body`, not the pane.
  const openMenu = () => {
    const trigger = container.querySelector<HTMLButtonElement>(
      ".sb-content-save-menu"
    );
    if (!trigger) throw new Error("The save options button did not render.");
    act(() => {
      trigger.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
  };

  const menuItems = () =>
    Array.from(
      document.body.querySelectorAll<HTMLElement>(".sb-context-menu-item")
    );
  /** An item's words, without its icon's ligature name. */
  const itemLabel = (item: HTMLElement) =>
    item.querySelector(":scope > span:not(.sb-context-menu-item-icon)")
      ?.textContent;

  it("gives every save an options button", () => {
    renderWithSave();

    expect(container.querySelectorAll(".sb-content-save-menu")).toHaveLength(1);
  });

  it("offers edit and delete, each with an icon", () => {
    renderWithSave();
    openMenu();

    expect(menuItems().map(itemLabel)).toEqual(["Edit", "Delete"]);
    expect(
      menuItems().map(
        (item) => item.querySelector(".sb-context-menu-item-icon")?.textContent
      )
    ).toEqual(["edit", "delete"]);
  });

  /** Picks Delete from the save's menu and renders the confirmation. */
  const chooseDelete = (openModal: ReturnType<typeof vi.fn>) => {
    openMenu();
    const remove = menuItems().find((item) => itemLabel(item) === "Delete");
    if (!remove) throw new Error("Delete was not in the menu.");
    act(() => {
      remove.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(openModal).toHaveBeenCalledTimes(1);
    const modal = openModal.mock.calls[0]![0] as {
      content: () => preact.ComponentChildren;
    };
    const dialog = document.createElement("div");
    act(() => render(<>{modal.content()}</>, dialog));
    return dialog;
  };

  it("asks before deleting a save, then deletes it", async () => {
    const { removeSave, openModal } = renderWithSave();

    const dialog = chooseDelete(openModal);
    expect(removeSave).not.toHaveBeenCalled();
    expect(dialog.textContent).toContain(
      "Delete save for Psalm 23? This can't be undone."
    );

    await act(async () => {
      dialog
        .querySelector<HTMLButtonElement>(".sb-session-settings-end")!
        .click();
    });

    expect(removeSave).toHaveBeenCalledWith("b1");
  });

  it("names every folder a save will be deleted from", () => {
    const created = createState({
      saves: [{ ...save("b1"), categories: ["My Saves", "Sermon prep"] }],
    });
    act(() => {
      render(
        <YourContentPane
          state={created.state}
          onOpenPassage={vi.fn()}
          onPlayPlaylist={vi.fn()}
          onEditPlaylist={vi.fn()}
          onEditAnnotation={vi.fn()}
          onCreatePlaylist={vi.fn()}
          onOpenReadingPlan={vi.fn()}
          onEditReadingPlan={vi.fn()}
          onEditCustomization={vi.fn()}
          onCreateCustomization={vi.fn()}
        />,
        container
      );
    });

    const dialog = chooseDelete(created.openModal);

    expect(dialog.textContent).toContain(
      "Delete save for Psalm 23 from My Saves and Sermon prep?"
    );
  });

  it("shows how many folders a save is in, naming them on hover", () => {
    const created = createState({
      saves: [{ ...save("b1"), categories: ["My Saves", "Sermon prep"] }],
    });
    act(() => {
      render(
        <YourContentPane
          state={created.state}
          onOpenPassage={vi.fn()}
          onPlayPlaylist={vi.fn()}
          onEditPlaylist={vi.fn()}
          onEditAnnotation={vi.fn()}
          onCreatePlaylist={vi.fn()}
          onOpenReadingPlan={vi.fn()}
          onEditReadingPlan={vi.fn()}
          onEditCustomization={vi.fn()}
          onCreateCustomization={vi.fn()}
        />,
        container
      );
    });

    const folders = container.querySelector(".sb-content-save-folders")!;
    expect(
      folders.querySelector(".sb-content-save-folder-count")?.textContent
    ).toBe("2");
    expect(folders.getAttribute("title")).toBe("My Saves and Sermon prep");
    expect(folders.getAttribute("aria-label")).toBe(
      "In My Saves and Sermon prep"
    );
  });

  it("does not open the passage when the options button is used", () => {
    // The pill and the menu are siblings, so the menu must not fall through
    // to the pill's own click.
    const onOpenPassage = vi.fn();
    const created = createState({ saves: [save("b1")] });
    act(() => {
      render(
        <YourContentPane
          state={created.state}
          onOpenPassage={onOpenPassage}
          onPlayPlaylist={vi.fn()}
          onEditPlaylist={vi.fn()}
          onEditAnnotation={vi.fn()}
          onCreatePlaylist={vi.fn()}
          onOpenReadingPlan={vi.fn()}
          onEditReadingPlan={vi.fn()}
          onEditCustomization={vi.fn()}
          onCreateCustomization={vi.fn()}
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
          onCreatePlaylist={vi.fn()}
          onOpenReadingPlan={vi.fn()}
          onEditReadingPlan={vi.fn()}
          onEditCustomization={vi.fn()}
          onCreateCustomization={vi.fn()}
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

  const deleteItem = () => {
    const item = Array.from(
      document.body.querySelectorAll<HTMLElement>(".sb-context-menu-item")
    ).find((candidate) => candidate.textContent?.includes("Delete"));
    if (!item) throw new Error("Delete was not in the menu.");
    return item;
  };

  /** Picks Delete from the highlight's menu and renders the confirmation. */
  const chooseDelete = (openModal: ReturnType<typeof vi.fn>) => {
    openMenu();
    act(() => {
      deleteItem().dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    return renderOpenedModal(openModal);
  };

  it("gives every highlight a menu offering Delete, with an icon", () => {
    renderWithHighlight();
    openMenu();

    expect(
      deleteItem().querySelector(".sb-context-menu-item-icon")?.textContent
    ).toBe("delete");
  });

  it("asks before deleting a highlight, then clears it from the list and on the server", async () => {
    const { removeHighlight, unhighlightVerse, restoreHighlight, openModal } =
      renderWithHighlight();

    const dialog = chooseDelete(openModal);
    expect(removeHighlight).not.toHaveBeenCalled();
    expect(dialog.textContent).toContain(
      "Delete the highlight on John 1:1? This can't be undone."
    );

    await confirmDelete(dialog);

    expect(removeHighlight).toHaveBeenCalledWith(highlight("JHN"));
    expect(unhighlightVerse).toHaveBeenCalledWith("BSB", "JHN", 1, 1);
    expect(restoreHighlight).not.toHaveBeenCalled();
  });

  it("puts the highlight back and says so when the server call fails", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const { removeHighlight, restoreHighlight, openModal, toast } =
      renderWithHighlight({
        unhighlightError: new Error("offline"),
      });

    await confirmDelete(chooseDelete(openModal));

    expect(removeHighlight).toHaveBeenCalled();
    expect(restoreHighlight).toHaveBeenCalledWith(highlight("JHN"));
    expect(toast).toHaveBeenCalledWith("Couldn't delete the highlight.");
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
          onCreatePlaylist={vi.fn()}
          onOpenReadingPlan={vi.fn()}
          onEditReadingPlan={vi.fn()}
          onEditCustomization={vi.fn()}
          onCreateCustomization={vi.fn()}
        />,
        container
      );
    });
    openMenu();

    expect(onOpenPassage).not.toHaveBeenCalled();
  });
});
