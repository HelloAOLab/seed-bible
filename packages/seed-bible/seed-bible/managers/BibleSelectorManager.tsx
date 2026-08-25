import type {
  Translation,
  TranslationBook,
  TranslationBooks,
} from "../managers/FreeUseBibleAPI";
import { safeLocalStorage } from "../app/ssrEnv";
import type { BibleDataManager } from "../managers/BibleDataManager";
import { type BibleReadingState } from "../managers/BibleReadingManager";
import type { TabSlot, TabsLayoutManager } from "../managers/TabsLayoutManager";
import {
  PROFILE_TRANSLATION_ID,
  type TabsManager,
} from "../managers/TabsManager";
import type { LoginManager } from "../managers/LoginManager";
import { saveProfileConfigValue } from "../managers/ProfileConfigSync";
import {
  DEFAULT_POPULAR_LANGUAGES,
  filterTranslationGroups,
  groupTranslationsByLanguage,
  type TranslationLanguageGroup,
  type TranslationViewMode,
} from "../managers/translationGrouping";
import type {
  BookOrientation,
  SettingsManager,
} from "../managers/SettingsManager";
import { createSidebar } from "../managers/SidebarManager";
import type { NavigationManager } from "../managers/NavigationManager";
import type { I18nManager } from "../i18n/I18nManager";
import { type BookmarksManager } from "../managers/BookmarksManager";
import {
  computed,
  effect,
  signal,
  Signal,
  type ReadonlySignal,
} from "@preact/signals";

type SidebarManager = ReturnType<typeof createSidebar>;

/** Optional options used when opening the selector. */
export interface BibleSelectorOptions {
  /** Slot context to bind selector actions to. */
  slot?: TabSlot;
}

/** Options passed to `setOpen` to control selector behavior on open. */
export interface BibleSelectorSetOpenOptions {
  /**
   * When true, the next chapter selection always creates a new tab and binds
   * it to the target slot, even if the slot already has a tab.
   * Cleared automatically when the selector closes.
   */
  forNewTab?: boolean;
}

export interface GhostBook {
  ghost?: boolean;
}

export type BibleSelectorBookItem = TranslationBook | GhostBook;

export type BibleSelectorPsalmsGroups =
  | "1-psalms"
  | "2-psalms"
  | "3-psalms"
  | "4-psalms"
  | "5-psalms";

/**
 * Reactive state + actions for the Bible selector overlay.
 *
 * The selector is slot-aware: chapter selections are applied to the bound
 * slot (or a new tab may be created if the slot has no tab content yet).
 */
export interface BibleSelectorState {
  /** Whether the selector overlay is currently open. */
  isOpen: Signal<boolean>;
  /** Slot currently targeted by selector actions. */
  slot: Signal<TabSlot | null>;
  /** Reading state for the active slot (null when slot has no tab). */
  readingState: ReadonlySignal<BibleReadingState | null>;
  /** Active slot translation ID snapshot. */
  currentTranslationId: ReadonlySignal<string | null>;
  /** Active slot book ID snapshot. */
  currentBookId: ReadonlySignal<string | null>;
  /** Active slot chapter number snapshot. */
  currentChapterNumber: ReadonlySignal<number | null>;

  /** Current book-arrangement orientation (used for section labelling). */
  orientation: ReadonlySignal<BookOrientation>;

  /** Available translations loaded by the data manager. */
  availableTranslations: ReadonlySignal<Translation[]>;

  /** True while selector is loading translation/book data. */
  loading: Signal<boolean>;
  /** Last selector error message, if any. */
  error: Signal<string | null>;

  /** Translation currently selected in the selector UI. */
  selectedTranslationId: Signal<string | null>;
  /** Translation metadata for `selectedTranslationId`. */
  selectedTranslation: Signal<Translation | null>;
  /** Expanded book ID in selector accordions/lists. */
  expandedBookId: Signal<string | null>;
  /** Loaded book metadata for selected translation. */
  selectedTranslationBooks: Signal<TranslationBooks | null>;

  groupedBooks: ReadonlySignal<{
    oldTestament: TranslationBook[];
    newTestament: TranslationBook[];
    apocrypha: TranslationBook[];
  }>;

  search: Signal<string>;

  /**
   * True while the selector is in "create a new tab" mode — chapter
   * selections create a brand new tab and bind it to the target slot
   * instead of reusing the slot's existing tab.
   */
  forceNewTab: Signal<boolean>;

  /** All slots available as targets for the selector. */
  availableSlots: ReadonlySignal<TabSlot[]>;

  /**
   * Opens/closes selector.
   * When opening, optionally rebinds selector to a slot and synchronizes data.
   */
  setOpen: (
    open: boolean,
    slot?: TabSlot,
    options?: BibleSelectorSetOpenOptions
  ) => Promise<void>;

  /** Switches the target slot while the selector is open. */
  setTargetSlot: (slotId: string) => void;

  /** Sets the current selector search query. */
  setSearch: (value: string) => void;

  /** Toggles expanded state for a given book ID. */
  setExpandedBook: (bookId: string) => void;

  /** Loads books for a selected translation in selector UI. */
  selectTranslation: (translationId: string) => Promise<void>;

  /**
   * Explicit user pick from the translation list in the selector UI. Behaves
   * like `selectTranslation`, but also persists the choice to the user's
   * profile so it's restored the next time they open the app. Programmatic
   * translation changes (selector sync on open, language-driven translation
   * switch, custom translation URL addition) should keep using
   * `selectTranslation` instead, since those aren't a deliberate pick from
   * the list.
   */
  pickTranslation: (translationId: string) => Promise<void>;

  /**
   * Applies chapter selection to the bound slot/tab and closes selector.
   * Creates a new tab if needed when the bound slot has no tab content,
   * or when `forceNewTab` is true.
   */
  selectChapter: (bookId: string, chapterNumber: number) => void;

  selectedTestament: Signal<number>;
  apocryphaAvailable: Signal<boolean>;
  selectingTranslation: Signal<boolean>;
  lastBookClicked: Signal<number>;
  bookData: Signal<TranslationBook | null>;
  chT: Signal<number>;
  localSelectedTestament: Signal<number>;
  highLightedButtonsID: Signal<Record<number, boolean>>;
  currentPsalms: Signal<BibleSelectorPsalmsGroups[]>;
  selectedTestamentData: Signal<TranslationBook[] | null>;
  handleChapterClick: (props: { book: TranslationBook }) => void;
  calcChapterPos: (index: number, separator: number) => number;
  isBook: (book: BibleSelectorBookItem) => book is TranslationBook;
  ghostArray: (
    booksArray: TranslationBook[],
    allowedRows: number
  ) => BibleSelectorBookItem[];
  handleEnter: () => void;
  languageQuery: Signal<string>;
  showCustomTranslation: Signal<boolean>;
  allowedTranslationLimit: Signal<number>;
  apiTranslations: ReadonlySignal<TranslationLanguageGroup[]>;
  showAllLanguages: Signal<TranslationViewMode>;
  showTranslationSettings: Signal<boolean>;
  showTranslationInfo: Signal<{
    translation: Translation;
    position: { x: number; y: number };
  } | null>;
  /**
   * The translation whose offline download the user is being asked to confirm
   * removing, or null when no confirmation is pending.
   */
  pendingOfflineDelete: Signal<Translation | null>;
  inputValue: Signal<string>;
  filteredApiTranslations: ReadonlySignal<TranslationLanguageGroup[]>;

  /**
   * How many language groups match the current search and view mode before the
   * `allowedTranslationLimit` page size is applied. What "show more" is judged
   * against — the unfiltered catalog total would keep the control on screen
   * long after paging can reveal anything.
   */
  matchingTranslationGroupCount: ReadonlySignal<number>;
  handleTranslationAddition: () => void;
  openTabs: () => void;
  bookmarks: BookmarksManager;
  showApocryphaInfo: Signal<boolean>;
}

function groupBooks(translationBooks: TranslationBooks | null, search: string) {
  if (!translationBooks) {
    return {
      oldTestament: [] as TranslationBook[],
      newTestament: [] as TranslationBook[],
      apocrypha: [] as TranslationBook[],
    };
  }

  const actualSearch = search.replace(/\d+$/, "");
  const loweredSearch = actualSearch.trim().toLowerCase();
  const filteredBooks = loweredSearch
    ? translationBooks.books.filter(
        (book) =>
          book.name.toLowerCase().includes(loweredSearch) ||
          book.commonName.toLowerCase().includes(loweredSearch)
      )
    : translationBooks.books;

  return {
    oldTestament: filteredBooks.filter((book) => book.order <= 39),
    newTestament: filteredBooks.filter(
      (book) => book.order > 39 && book.order <= 66
    ),
    apocrypha: filteredBooks.filter((book) => book.order > 66),
  };
}

/**
 * Creates the Bible selector manager.
 *
 * Behavior summary:
 * - Maintains selector open/close state and slot binding.
 * - Synchronizes selector translation/book context from active slot reading state.
 * - Mirrors open/close state to the `?selector=open` URL param via the
 *   NavigationManager, giving back-button / shareable-URL support.
 * - Computes responsive Old/New Testament rows based on viewport width.
 * - Routes chapter selection into the bound slot/tab reading state.
 */
export function createBibleSelectorState(
  dataManager: BibleDataManager,
  tabsManager: TabsManager,
  tabsLayoutManager: TabsLayoutManager,
  settings: SettingsManager,
  sidebar: SidebarManager,
  bookmarks: BookmarksManager,
  navigation: NavigationManager,
  login: LoginManager,
  i18n: I18nManager
): BibleSelectorState {
  const isOpen = signal(false);
  const slot = signal<TabSlot | null>(null);
  const forceNewTab = signal(false);
  const showApocryphaInfo = signal(false);
  const availableSlots = computed(() => tabsLayoutManager.slots.value);
  const availableTranslations = computed(
    () => dataManager.availableTranslations.value
  );
  const readingState = computed(() => slot.value?.tab?.readingState ?? null);
  const currentTranslationId = computed(
    () => readingState.value?.translationId.value ?? null
  );
  const currentBookId = computed<string | null>(
    () => readingState.value?.bookId.value ?? null
  );
  const currentChapterNumber = computed<number | null>(
    () => readingState.value?.chapterNumber.value ?? null
  );

  const orientation = computed<BookOrientation>(
    () => settings?.settings.value.bookOrientation ?? "traditional"
  );

  const loading = signal(false);
  const error = signal<string | null>(null);

  const search = signal("");
  const selectedTranslationId = signal<string | null>(null);
  const selectedTranslationBooks = signal<TranslationBooks | null>(null);
  const selectedTranslation = computed(
    () => selectedTranslationBooks.value?.translation ?? null
  );
  const expandedBookId = signal<string | null>(null);

  const syncStateFromSlot = async () => {
    loading.value = true;
    error.value = null;

    try {
      if (dataManager.availableTranslations.value.length === 0) {
        await dataManager.getTranslations();
      }

      const nextTranslationId =
        readingState.value?.translationId.value ??
        // Find the first slot with a translation ID in its reading state
        tabsLayoutManager.slots.value.find(
          (s) => s.tab?.readingState.translationId.value
        )?.tab?.readingState.translationId.value ??
        // Fall back to default translation or first available translation
        dataManager.availableTranslations.value.find(
          (t) => t.id === tabsManager.defaultTranslation.id
        )?.id ??
        dataManager.availableTranslations.value[0]?.id ??
        null;

      if (!nextTranslationId) {
        throw new Error("No available translations found.");
      }

      await selectTranslation(nextTranslationId);

      if (currentBookId.value) {
        expandedBookId.value = currentBookId.value;
      }
    } catch (err) {
      error.value =
        err instanceof Error
          ? err.message
          : "Failed to load selector translation data.";
      if (typeof process === "object" && process.env.NODE_ENV === "test") {
        console.error("Error syncing Bible selector state from slot:", err);
      }
    } finally {
      loading.value = false;
    }
  };

  const setOpen = async (
    open: boolean,
    nextSlot?: TabSlot,
    options?: BibleSelectorSetOpenOptions
  ) => {
    if (open) {
      if (nextSlot) {
        slot.value = nextSlot;
      }

      const effectiveSlot = nextSlot ?? slot.value;
      if (!effectiveSlot) {
        console.warn("No slot available to open Bible selector with.");
        return;
      }

      slot.value = effectiveSlot;
      forceNewTab.value = options?.forNewTab === true;

      await syncStateFromSlot();
    } else {
      forceNewTab.value = false;
    }

    isOpen.value = open;
  };

  const setTargetSlot = (slotId: string) => {
    const nextSlot =
      tabsLayoutManager.slots.value.find((s) => s.id === slotId) ?? null;
    if (!nextSlot) {
      return;
    }
    slot.value = nextSlot;
  };

  const openTabs = () => {
    if (sidebar.isMobileOpen.value) {
      console.log("No open tabs");
      return;
    }
    console.log("Open tabs");
    // Both of these are mirrored to the URL by the NavigationManager bindings
    // (`?selector=open` here, `?sidebar=open` in SidebarManager), so closing
    // the selector and opening the drawer is just two query-param updates — no
    // direct history manipulation, and no back-navigation racing the push.
    void setOpen(false);
    // Reached from the book selector, so the tabs header should show a Back
    // arrow that returns here (not a plain Close).
    sidebar.tabsOpenedFromToolbar.value = false;
    sidebar.openSidebar();
  };

  // Mirror the selector's open state to the `?selector=open` query param so the
  // browser back/forward buttons (and shared/bookmarked URLs) drive it, the
  // same way SidebarManager binds `sidebar`. The setter routes through
  // `setOpen` rather than writing `isOpen` directly so opening still binds the
  // slot and loads translation data via `syncStateFromSlot()`.
  navigation.syncSignalsToUrl({
    selector: {
      get value() {
        return isOpen.value ? "open" : null;
      },
      set value(newValue) {
        const shouldOpen = newValue === "open";
        if (shouldOpen !== isOpen.value) {
          void setOpen(shouldOpen);
        }
      },
    },
  });

  effect(() => {
    if (isOpen.value) {
      expandedBookId.value = currentBookId.value;
    }
  });

  const groupedBooks = computed(() =>
    groupBooks(selectedTranslationBooks.value, search.value)
  );

  const setSearch = (value: string) => {
    search.value = value;
  };

  const setExpandedBook = (nextBookId: string) => {
    expandedBookId.value =
      expandedBookId.value === nextBookId ? null : nextBookId;
  };

  const handleChapterSelect = async (
    selectedBookId: string,
    chapter: number
  ) => {
    if (!slot.value) {
      return;
    }

    // const selectedTranslationId =
    //   translationId.value ?? activeReadingState.value.translationId.value;
    if (!selectedTranslationId.value) {
      return;
    }

    // Ensure selected-tab synchronization targets this slot, not a stale selection.
    tabsLayoutManager.selectSlot(slot.value.id);

    if (slot.value.tab && !forceNewTab.value) {
      await slot.value.tab.readingState.selectTranslationAndChapter(
        selectedTranslationId.value,
        selectedBookId,
        chapter
      );
      setOpen(false);
      return;
    }

    const newTab = tabsManager.addTab(undefined, {
      initialTranslationId: selectedTranslationId.value,
      initialBookId: selectedBookId,
      initialChapterNumber: chapter,
    });
    tabsLayoutManager.openTabInSlot(slot.value.id, newTab.id);
    setOpen(false);
  };

  const handleTranslationSelect = async (nextTranslationId: string) => {
    if (nextTranslationId === selectedTranslationId.value) {
      return;
    }

    loading.value = true;
    error.value = null;

    try {
      const books = await dataManager.getTranslationBooks(nextTranslationId);
      const firstBook = books.books[0] ?? null;

      selectedTranslationBooks.value = books;

      if (expandedBookId.value) {
        const hasCurrentBook = books.books.some(
          (book) => book.id === expandedBookId.value
        );
        if (!hasCurrentBook) {
          expandedBookId.value = firstBook?.id ?? null;
        }
      } else if (firstBook) {
        expandedBookId.value = firstBook.id;
      }

      const previousTranslation = selectedTranslation.value;
      selectedTranslationId.value = nextTranslationId;
      search.value = "";
      languageQuery.value = "";
      selectingTranslation.value = false;
      if (previousTranslation && isOpen.value) {
        const currentBook = books.books.find(
          (b) => b.id === currentBookId.value
        );
        if (currentBook) {
          await handleChapterSelect(
            currentBook.id,
            currentChapterNumber.value ?? 1
          );
        } else {
          await handleChapterSelect(firstBook?.id ?? "GEN", 1);
        }
      }
    } catch (err) {
      error.value =
        err instanceof Error
          ? err.message
          : "Failed to load translation books.";
      return;
    } finally {
      loading.value = false;
    }
  };

  const selectTranslation = async (nextTranslationId: string) => {
    await handleTranslationSelect(nextTranslationId);
  };

  // The only entry point that should persist to the profile: a deliberate
  // click on a translation in the selector's list (BibleSelector.tsx). Other
  // callers of `selectTranslation` (selector-open sync, language-driven
  // translation switch, custom translation URL addition) are programmatic,
  // not a user pick, and stay unpersisted.
  const pickTranslation = async (nextTranslationId: string) => {
    await selectTranslation(nextTranslationId);
    void saveProfileConfigValue(
      login,
      PROFILE_TRANSLATION_ID,
      nextTranslationId
    );

    // Only this deliberate-pick path offers to move the UI to the
    // translation's language. Programmatic changes (selector sync on open, a
    // deep link, the language-driven translation switch) aren't the user
    // saying "I want to read in this language", so they shouldn't ask.
    const picked = availableTranslations.value.find(
      (translation) => translation.id === nextTranslationId
    );
    i18n.maybePromptUiLanguageSwitch(picked?.language);
  };

  const languageQuery = signal<string>("");

  const selectedTestament = signal<number>(2);

  const apocryphaAvailable = signal<boolean>(false);

  const defaultTranslations = signal<string[]>([...DEFAULT_POPULAR_LANGUAGES]);

  const apiTranslations = computed<Array<TranslationLanguageGroup>>(() =>
    groupTranslationsByLanguage(availableTranslations.value)
  );

  const allowedTranslationLimit = signal<number>(50);

  const showCustomTranslation = signal<boolean>(false);

  const selectingTranslation = signal<boolean>(false);

  // ─── SideBarBooks State ───────────────────────────────────────────────────────
  // NOTE: These signals are logically local to the single SideBarBooks instance
  // that exists at any given time.  If multiple instances were ever mounted
  // simultaneously they would share state — that matches the original behaviour
  // since the state lived in the single SearchBar render tree.

  const lastBookClicked = signal<number>(-1);

  const bookData = signal<TranslationBook | null>(null);

  const chT = signal<number>(0);

  const localSelectedTestament = signal<number>(2);

  // ─── SideBarChapters State ────────────────────────────────────────────────────
  // NOTE: Same single-instance assumption as SideBarBooks above.

  const highLightedButtonsID = signal<Record<number, boolean>>({});

  const currentPsalms = signal<BibleSelectorPsalmsGroups[]>([
    "1-psalms",
    "2-psalms",
    "3-psalms",
    "4-psalms",
    "5-psalms",
  ]);

  // ─── TranslationModal State ───────────────────────────────────────────────────

  const showAllLanguages = signal<TranslationViewMode>(
    (safeLocalStorage.getItem(
      "showAllLanguages"
    ) as TranslationViewMode | null) || "complete"
  );

  const showTranslationSettings = signal<boolean>(false);

  const showTranslationInfo = signal<{
    translation: Translation;
    position: { x: number; y: number };
  } | null>(null);

  const pendingOfflineDelete = signal<Translation | null>(null);

  const inputValue = signal<string>("");

  const selectedTestamentData = computed<TranslationBook[]>(() => {
    const grouped = groupedBooks.value;
    if (selectedTestament.value === 0) return grouped.oldTestament;
    if (selectedTestament.value === 1) return grouped.newTestament;
    if (selectedTestament.value === 2)
      return [...grouped.oldTestament, ...grouped.newTestament];
    return grouped.apocrypha;
  });

  // Keep apocryphaAvailable in sync with the computed book data.
  effect(() => {
    const { apocrypha } = groupedBooks.value;
    apocryphaAvailable.value = apocrypha.length > 0;
  });

  /**
   * Adds a custom translation by ID or URL.
   * Reads & writes multiple signals.
   * Formerly an inline async function in SearchBar (not useCallback).
   */
  const handleTranslationAddition = async (): Promise<void> => {
    let inputUrl = inputValue.value;
    if (inputUrl.includes("api/available_translations.json")) {
      inputUrl = inputUrl.replace("api/available_translations.json", "");
    }
    const translations = await dataManager.getTranslations(inputUrl);
    const firstTranslation = translations[0];
    if (firstTranslation) {
      selectTranslation(firstTranslation.id);
    }
  };

  /**
   * Navigates to the first match / a specific chapter.
   * Reads `query.value` and `selectedTestamentData.value`.
   * Formerly `useCallback(fn, [query])`.
   */
  const focusOnBook = (props: { chapterNo: number }): void => {
    const { chapterNo } = props;
    const testamentData = selectedTestamentData.value;
    if (testamentData && testamentData[0]) {
      handleChapterSelect(testamentData[0].id, chapterNo || 1);
    }
    isOpen.value = false;
    search.value = "";
  };

  /**
   * Handles Enter key press in the search input.
   * Reads `search.value` and `selectedTestamentData.value`.
   */
  const handleEnter = (): void => {
    const testamentData = selectedTestamentData.value;
    const chapterQueryMatch = search.value.match(/(\d+)$/)?.[0];

    if (!isNaN(Number(chapterQueryMatch)) && testamentData.length === 1) {
      const chapterNo = Number(chapterQueryMatch);
      focusOnBook({ chapterNo });
      return;
    } else if (testamentData[0]) {
      search.value = testamentData[0].name;
      console.log("Auto-filled search with book name:", testamentData[0].name);
      return;
    }
  };

  /**
   * Maps `expandedBookId` onto the SideBarBooks accordion signals
   * (`bookData` / `lastBookClicked` / `chT`) so the open book is actually
   * expanded in the grid. Returns false when the book isn't in the current
   * filtered testament list (e.g. search hid it).
   */
  const applyExpandedBookToSidebar = (bookId: string | null): boolean => {
    if (!bookId) {
      lastBookClicked.value = -1;
      bookData.value = null;
      chT.value = 0;
      return true;
    }

    const { oldTestament, newTestament, apocrypha } = groupedBooks.value;
    const lst = localSelectedTestament.value;

    const findIn = (
      books: TranslationBook[],
      testamentHint = 0
    ): { book: TranslationBook; index: number; cht: number } | null => {
      const index = books.findIndex((book) => book.id === bookId);
      const book = index >= 0 ? books[index] : undefined;
      if (!book) return null;
      return { book, index, cht: testamentHint };
    };

    let match: { book: TranslationBook; index: number; cht: number } | null =
      null;
    if (lst === 0) {
      match = findIn(oldTestament);
    } else if (lst === 1) {
      match = findIn(newTestament);
    } else if (lst === 3) {
      match = findIn(apocrypha);
    } else {
      // All Books view: OT/NT/AP grids render together, so each needs its own
      // hint (0/1/2) — that's how a book's chapter panel opens under the
      // right grid instead of colliding with a different testament's.
      // Single-testament views above never pass a chapterHint at render time,
      // so `cht` is inert there; the default 0 is just a placeholder.
      match =
        findIn(oldTestament, 0) ??
        findIn(newTestament, 1) ??
        findIn(apocrypha, 2);
    }

    if (!match) {
      lastBookClicked.value = -1;
      bookData.value = null;
      chT.value = 0;
      return false;
    }

    bookData.value = match.book;
    lastBookClicked.value = match.index;
    chT.value = match.cht;
    return true;
  };

  // Delegates the toggle to `setExpandedBook` — the `applyExpandedBookToSidebar`
  // effect above is the single place that derives `bookData` / `lastBookClicked`
  // / `chT` from `expandedBookId`, so writing those signals here too would just
  // be a second, immediately-overwritten source of truth.
  const handleChapterClick = (props: { book: TranslationBook }): void => {
    setExpandedBook(props.book.id);
  };

  const calcChapterPos = (index: number, separator: number): number =>
    Math.floor(index / separator) * separator + separator - 1;

  const isBook = (book: BibleSelectorBookItem): book is TranslationBook =>
    typeof book === "object" && !("ghost" in book);

  const ghostArray = (
    booksArray: TranslationBook[],
    allowedRows: number
  ): BibleSelectorBookItem[] => {
    if (allowedRows === 1) return booksArray;
    const booksLength = booksArray.length;
    const additionalElements =
      allowedRows -
      (booksLength % allowedRows === 0
        ? allowedRows
        : booksLength % allowedRows);
    const tempBooksArray: BibleSelectorBookItem[] = [...booksArray];
    for (let i = 0; i < additionalElements; i++) {
      tempBooksArray.push({ ghost: true });
    }
    return [...tempBooksArray];
  };

  effect(() => {
    const tr = selectedTranslation.value;
    const dtr = defaultTranslations.value;
    if (tr) {
      const langCode = tr.language?.toLowerCase();
      const langName =
        tr.languageEnglishName?.toLowerCase() || tr.englishName.toLowerCase();
      const nextDefaults = [...dtr];

      if (langCode && !nextDefaults.includes(langCode)) {
        nextDefaults.push(langCode);
      }

      if (!nextDefaults.includes(langName)) {
        nextDefaults.push(langName);
      }

      if (nextDefaults.length !== dtr.length) {
        defaultTranslations.value = nextDefaults;
      }
    }
  });

  // Keep the chapter accordion in sync with expandedBookId while open.
  // localSelectedTestament / groupedBooks are dependencies so a testament
  // filter or search that still includes the book re-applies the correct index.
  effect(() => {
    if (!isOpen.value) return;
    const bookId = expandedBookId.value;
    // Touch filtered lists so testament/search changes re-run this effect.
    void localSelectedTestament.value;
    void groupedBooks.value;
    applyExpandedBookToSidebar(bookId);
  });

  // When search narrows to a single book, expand it. Do not clear expansion
  // when multiple books are visible — that used to wipe the current book on open.
  effect(() => {
    if (!isOpen.value) return;
    const bd = selectedTestamentData.value;
    if (bd && bd.length === 1 && bd[0]) {
      expandedBookId.value = bd[0].id;
    }
  });

  // Mark the reading-position chapter while its book is expanded.
  effect(() => {
    if (!isOpen.value) return;
    const chapter = currentChapterNumber.value;
    const readingBookId = currentBookId.value;
    const expandedId = bookData.value?.id ?? null;
    if (
      chapter != null &&
      readingBookId != null &&
      expandedId === readingBookId
    ) {
      highLightedButtonsID.value = { [chapter]: true };
    } else {
      highLightedButtonsID.value = {};
    }
  });
  effect(() => {
    const st = selectedTestament.value;
    const bd = selectedTranslationBooks.value?.books;
    const q = search.value;
    if (!bd) return;
    const { oldTestament, newTestament } = groupedBooks.value;
    if (st === 2 || q.length > 0) {
      if (oldTestament.length > 0 && newTestament.length === 0) {
        localSelectedTestament.value = 0;
      } else if (newTestament.length > 0 && oldTestament.length === 0) {
        localSelectedTestament.value = 1;
      } else if (q.length > 0) {
        localSelectedTestament.value = 2;
      } else {
        localSelectedTestament.value = st;
      }
    } else {
      localSelectedTestament.value = st;
    }
  });

  const pagedApiTranslations = computed(() =>
    filterTranslationGroups({
      groups: apiTranslations.value,
      query: languageQuery.value,
      viewMode: showAllLanguages.value,
      limit: allowedTranslationLimit.value,
      selectedTranslation: selectedTranslation.value,
      popularLanguages: defaultTranslations.value,
    })
  );

  const filteredApiTranslations = computed<Array<TranslationLanguageGroup>>(
    () => pagedApiTranslations.value.groups
  );

  const matchingTranslationGroupCount = computed(
    () => pagedApiTranslations.value.totalMatching
  );

  effect(() => {
    safeLocalStorage.setItem("showAllLanguages", showAllLanguages.value);
  });

  return {
    isOpen,
    slot,
    readingState,
    groupedBooks,
    availableTranslations,
    currentTranslationId,
    currentBookId,
    currentChapterNumber,
    orientation,
    loading,
    error,
    search,
    selectedTranslationId,
    selectedTranslation,
    selectedTranslationBooks,
    expandedBookId,
    forceNewTab,
    availableSlots,
    setOpen,
    setTargetSlot,
    setSearch,
    setExpandedBook,
    selectTranslation,
    pickTranslation,
    selectChapter: handleChapterSelect,
    selectedTestament,
    apocryphaAvailable,
    selectingTranslation,
    lastBookClicked,
    bookData,
    chT,
    localSelectedTestament,
    highLightedButtonsID,
    currentPsalms,
    selectedTestamentData,
    handleChapterClick,
    calcChapterPos,
    isBook,
    ghostArray,
    handleEnter,
    languageQuery,
    showCustomTranslation,
    allowedTranslationLimit,
    apiTranslations,
    showAllLanguages,
    showTranslationSettings,
    showTranslationInfo,
    pendingOfflineDelete,
    inputValue,
    filteredApiTranslations,
    matchingTranslationGroupCount,
    handleTranslationAddition,
    openTabs,
    bookmarks,
    showApocryphaInfo,
  };
}
