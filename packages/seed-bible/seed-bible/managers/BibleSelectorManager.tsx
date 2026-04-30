import type {
  Translation,
  TranslationBook,
  TranslationBooks,
} from "seed-bible.managers.FreeUseBibleAPI";
import type { BibleDataManager } from "seed-bible.managers.BibleDataManager";
import {
  type BibleReadingState,
  DEFAULT_TRANSLATION_ID,
} from "seed-bible.managers.BibleReadingManager";
import type { Pane, PanesManager } from "seed-bible.managers.PanesManager";
import type { TabsManager } from "seed-bible.managers.TabsManager";
import type {
  BookOrientation,
  SettingsManager,
} from "seed-bible.managers.SettingsManager";
import {
  computed,
  effect,
  signal,
  Signal,
  type ReadonlySignal,
} from "@preact/signals";

/** Optional options used when opening the selector. */
export interface BibleSelectorOptions {
  /** Pane context to bind selector actions to. */
  pane?: Pane;
}

/** Options passed to `setOpen` to control selector behavior on open. */
export interface BibleSelectorSetOpenOptions {
  /**
   * When true, the next chapter selection always creates a new tab and binds
   * it to the target pane, even if the pane already has a tab.
   * Cleared automatically when the selector closes.
   */
  forNewTab?: boolean;
}

export interface GhostBook {
  ghost?: boolean;
}

export type BibleSelectorBookItem = TranslationBook | GhostBook;

/**
 * Reactive state + actions for the Bible selector overlay.
 *
 * The selector is pane-aware: chapter selections are applied to the bound pane
 * (or a new tab may be created if the pane has no tab content yet).
 */
export interface BibleSelectorState {
  /** Whether the selector overlay is currently open. */
  isOpen: Signal<boolean>;
  /** Pane currently targeted by selector actions. */
  pane: Signal<Pane | null>;
  /** Reading state for the active pane (null when pane has no tab). */
  readingState: ReadonlySignal<BibleReadingState | null>;
  /** Active pane translation ID snapshot. */
  currentTranslationId: ReadonlySignal<string | null>;
  /** Active pane book ID snapshot. */
  currentBookId: ReadonlySignal<string | null>;
  /** Active pane chapter number snapshot. */
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

  viewportWidth: Signal<number>;

  /**
   * True while the selector is in "create a new tab" mode — chapter
   * selections create a brand new tab and bind it to the target pane
   * instead of reusing the pane's existing tab.
   */
  forceNewTab: ReadonlySignal<boolean>;

  /** All panes available as targets for the selector. */
  availablePanes: ReadonlySignal<Pane[]>;

  /**
   * Opens/closes selector.
   * When opening, optionally rebinds selector to a pane and synchronizes data.
   */
  setOpen: (
    open: boolean,
    pane?: Pane,
    options?: BibleSelectorSetOpenOptions
  ) => Promise<void>;

  /** Switches the target pane while the selector is open. */
  setTargetPane: (paneId: string) => void;

  /** Sets the current selector search query. */
  setSearch: (value: string) => void;

  /** Toggles expanded state for a given book ID. */
  setExpandedBook: (bookId: string) => void;

  /** Loads books for a selected translation in selector UI. */
  selectTranslation: (translationId: string) => Promise<void>;

  /**
   * Applies chapter selection to the bound pane/tab and closes selector.
   * Creates a new tab if needed when the bound pane has no tab content,
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
  currentPsalms: Signal<string[]>;
  selectedTestamentData: Signal<TranslationBook[] | null>;
  handleClick: (props: {
    index: number;
    book: TranslationBook;
    cht?: number;
  }) => void;
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
  apiTranslations: Signal<Record<string, Record<string, Translation>>>;
  showAllLanguages: Signal<"complete" | "all" | "popular">;
  showTranslationSettings: Signal<boolean>;
  showTranslationInfo: Signal<{
    translation: Translation;
    position: { x: number; y: number };
  } | null>;
  inputValue: Signal<string>;
  filteredApiTranslations: ReadonlySignal<
    [string, Record<string, Translation>][]
  >;
  handleTranslationAddition: () => void;
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
 * - Maintains selector open/close state and pane binding.
 * - Synchronizes selector translation/book context from active pane reading state.
 * - Supports browser history integration (`bibleSelectorOpen`) for back-button UX.
 * - Computes responsive Old/New Testament rows based on viewport width.
 * - Routes chapter selection into the bound pane/tab reading state.
 */
export function createBibleSelectorState(
  dataManager: BibleDataManager,
  tabsManager: TabsManager,
  panesManager: PanesManager,
  settings?: SettingsManager
): BibleSelectorState {
  const isOpen = signal(false);
  const pane = signal<Pane | null>(null);
  const forceNewTab = signal(false);
  const availablePanes = computed(() => panesManager.panes.value);
  const availableTranslations = computed(
    () => dataManager.availableTranslations.value
  );
  const readingState = computed(() => pane.value?.tab?.readingState ?? null);
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
  const viewportWidth = signal(
    typeof window === "undefined" ? 0 : window.innerWidth
  );
  let wasOpen = isOpen.value;
  let isHandlingPopState = false;

  const syncStateFromPane = async () => {
    loading.value = true;
    error.value = null;

    try {
      if (dataManager.availableTranslations.value.length === 0) {
        await dataManager.getTranslations();
      }

      const nextTranslationId =
        readingState.value?.translationId.value ??
        // Find the first pane with a translation ID in its reading state
        panesManager.panes.value.find(
          (p) => p.tab?.readingState.translationId.value
        )?.tab?.readingState.translationId.value ??
        // Fall back to default translation or first available translation
        dataManager.availableTranslations.value.find(
          (t) => t.id === DEFAULT_TRANSLATION_ID
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
        console.error("Error syncing Bible selector state from pane:", err);
      }
    } finally {
      loading.value = false;
    }
  };

  const setOpen = async (
    open: boolean,
    nextPane?: Pane,
    options?: BibleSelectorSetOpenOptions
  ) => {
    if (open) {
      console.log("Opening Bible selector with pane:", nextPane, options);
      if (nextPane) {
        pane.value = nextPane;
      }

      const effectivePane = nextPane ?? pane.value;
      if (!effectivePane) {
        console.warn("No pane available to open Bible selector with.");
        return;
      }

      pane.value = effectivePane;
      forceNewTab.value = options?.forNewTab === true;

      await syncStateFromPane();
    } else {
      forceNewTab.value = false;
    }

    isOpen.value = open;
  };

  const setTargetPane = (paneId: string) => {
    const nextPane =
      panesManager.panes.value.find((p) => p.id === paneId) ?? null;
    if (!nextPane) {
      return;
    }
    pane.value = nextPane;
  };

  const getHistoryState = () => {
    return history.state && typeof history.state === "object"
      ? (history.state as Record<string, unknown>)
      : {};
  };

  const isSelectorOpenInHistory = () => {
    const state = getHistoryState();
    return state.bibleSelectorOpen === true;
  };

  effect(() => {
    if (isOpen.value) {
      expandedBookId.value = currentBookId.value;
    }
  });

  effect(() => {
    const onResize = () => {
      viewportWidth.value = window.innerWidth;
    };

    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
    };
  });

  effect(() => {
    const onPopState = () => {
      const shouldBeOpen = isSelectorOpenInHistory();
      isHandlingPopState = true;

      if (shouldBeOpen && !isOpen.value) {
        setOpen(true);
      } else if (!shouldBeOpen && isOpen.value) {
        setOpen(false);
      }

      setTimeout(() => {
        isHandlingPopState = false;
      }, 0);
    };

    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
    };
  });

  effect(() => {
    const nextIsOpen = isOpen.value;

    if (!wasOpen && nextIsOpen && !isSelectorOpenInHistory()) {
      history.pushState({ ...getHistoryState(), bibleSelectorOpen: true }, "");
    }

    if (wasOpen && !nextIsOpen) {
      const shouldNavigateBack =
        !isHandlingPopState && isSelectorOpenInHistory();
      if (shouldNavigateBack) {
        history.back();
      }
    }

    wasOpen = nextIsOpen;
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
    if (!pane.value) {
      return;
    }

    // const selectedTranslationId =
    //   translationId.value ?? activeReadingState.value.translationId.value;
    if (!selectedTranslationId.value) {
      return;
    }

    // Ensure selected-tab synchronization targets this pane, not a stale selection.
    panesManager.selectPane(pane.value.id);

    if (pane.value.tab && !forceNewTab.value) {
      await pane.value.tab.readingState.selectTranslationAndChapter(
        selectedTranslationId.value,
        selectedBookId,
        chapter
      );
      setOpen(false);
      return;
    }

    const newTab = tabsManager.addTab();
    panesManager.openInPane(pane.value.id, {
      tabId: newTab.id,
    });

    await newTab.readingState.selectTranslationAndChapter(
      selectedTranslationId.value,
      selectedBookId,
      chapter
    );
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

      selectedTranslationId.value = nextTranslationId;
      search.value = "";
      languageQuery.value = "";
      selectingTranslation.value = false;
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

  const languageQuery = signal<string>("");

  const selectedTestament = signal<number>(2);

  const apocryphaAvailable = signal<boolean>(false);

  const defaultTranslations = signal<string[]>([
    "english",
    "spanish",
    "arabic",
    "hindi",
    "hebrew",
    "ancient greek",
  ]);

  const apiTranslations = signal<Record<string, Record<string, Translation>>>({
    english: {},
    spanish: {},
    arabic: {},
    hindi: {},
    hebrew: {},
    "ancient greek": {},
  });

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

  const currentPsalms = signal<string[]>([
    "1 Psalms",
    "2 Psalms",
    "3 Psalms",
    "4 Psalms",
    "5 Psalms",
  ]);

  // ─── TranslationModal State ───────────────────────────────────────────────────

  const showAllLanguages = signal<"complete" | "all" | "popular">(
    window.localStorage.showAllLanguages || "complete"
  );

  const showTranslationSettings = signal<boolean>(false);

  const showTranslationInfo = signal<{
    translation: Translation;
    position: { x: number; y: number };
  } | null>(null);

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

  const handleClick = (props: {
    index: number;
    book: TranslationBook;
    cht?: number;
  }): void => {
    const { index, book, cht = 0 } = props;
    if (bookData?.value?.id === book.id) {
      bookData.value = null;
      chT.value = 0;
      lastBookClicked.value = -1;
    } else {
      bookData.value = book;
      chT.value = cht;
      lastBookClicked.value = index;
    }
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
      const langName =
        tr.languageEnglishName?.toLowerCase() || tr.englishName.toLowerCase();
      if (!dtr.includes(langName)) {
        defaultTranslations.value = [...dtr, langName];
      }
    }
  });

  effect(() => {
    const allTranslations = availableTranslations.value;

    const normalized = allTranslations.map((item: Translation) => ({
      ...item,
      languageEnglishName: item?.languageEnglishName || item.englishName,
    }));
    const translations = {} as Record<string, Record<string, Translation>>;

    normalized.forEach((translation: Translation) => {
      const englishName =
        translation.languageEnglishName?.toLowerCase() ||
        translation.englishName.toLowerCase();
      const shortName = translation.shortName.toLowerCase();
      if (translations[englishName]) {
        if (!translations[englishName][shortName]) {
          translations[englishName][shortName] = translation;
        }
      } else {
        translations[englishName] = { [shortName]: translation };
      }
    });
    apiTranslations.value = translations;
  });

  effect(() => {
    const bd = selectedTestamentData.value;
    if (bd && bd.length === 1 && bd[0]) {
      lastBookClicked.value = 0;
      bookData.value = bd[0];
      chT.value = bd[0].order > 39 ? 1 : 0;
    } else {
      lastBookClicked.value = -1;
      bookData.value = null;
      chT.value = 0;
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

  const filteredApiTranslations = computed<
    Array<[string, Record<string, Translation>]>
  >(() => {
    const lq = languageQuery.value;
    const apiTr = apiTranslations.value;
    const limit = allowedTranslationLimit.value;
    const selTr = selectedTranslation.value;
    const sal = showAllLanguages.value;
    const dtr = defaultTranslations.value;

    const cloneTranslations = (
      translations: Record<string, Record<string, Translation>>
    ): Record<string, Record<string, Translation>> =>
      JSON.parse(JSON.stringify(translations));

    const filterByMode = (
      translations: Record<string, Record<string, Translation>>
    ): Record<string, Record<string, Translation>> => {
      if (sal === "all") {
        return cloneTranslations(translations);
      }

      const next: Record<string, Record<string, Translation>> = {};

      Object.entries(translations).forEach(([englishName, group]) => {
        if (sal === "popular" && !dtr.includes(englishName)) {
          return;
        }

        if (sal === "complete") {
          const filteredGroup: Record<string, Translation> = {};
          Object.entries(group).forEach(([shortName, translation]) => {
            const hideForComplete =
              translation.numberOfBooks < 66 && translation.id !== selTr?.id;
            if (!hideForComplete) {
              filteredGroup[shortName] = translation;
            }
          });
          if (Object.keys(filteredGroup).length > 0) {
            next[englishName] = filteredGroup;
          }
          return;
        }

        next[englishName] = { ...group };
      });

      return next;
    };

    const filterByQuery = (
      translations: Record<string, Record<string, Translation>>,
      lowercaseQuery: string
    ): Record<string, Record<string, Translation>> => {
      const next: Record<string, Record<string, Translation>> = {};

      Object.entries(translations).forEach(([englishName, group]) => {
        if (englishName.includes(lowercaseQuery)) {
          next[englishName] = { ...group };
          return;
        }

        const matchedGroup: Record<string, Translation> = {};
        Object.entries(group).forEach(([shortName, translation]) => {
          if (
            shortName.includes(lowercaseQuery) ||
            translation?.name?.toLowerCase().includes(lowercaseQuery) ||
            translation?.languageName?.toLowerCase().includes(lowercaseQuery)
          ) {
            matchedGroup[shortName] = translation;
          }
        });

        if (Object.keys(matchedGroup).length > 0) {
          next[englishName] = matchedGroup;
        }
      });

      return next;
    };

    const sortFn = (
      [a]: [string, Record<string, Translation>],
      [b]: [string, Record<string, Translation>]
    ): number => {
      if (a === selTr?.languageEnglishName?.toLowerCase()) return -1;
      if (b === selTr?.languageEnglishName?.toLowerCase()) return 1;
      return a.localeCompare(b);
    };

    if (lq !== "") {
      const lowercaseQuery = lq.toLowerCase();
      const queryFiltered = filterByQuery(apiTr, lowercaseQuery);
      const modeFiltered = filterByMode(queryFiltered);

      return Object.entries(modeFiltered).slice(0, limit).sort(sortFn);
    } else {
      const modeFiltered = filterByMode(apiTr);
      return Object.entries(modeFiltered).sort(sortFn).slice(0, limit);
    }
  });

  effect(() => {
    window.localStorage.setItem("showAllLanguages", showAllLanguages.value);
  });

  return {
    isOpen,
    pane,
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
    viewportWidth,
    forceNewTab,
    availablePanes,
    setOpen,
    setTargetPane,
    setSearch,
    setExpandedBook,
    selectTranslation,
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
    handleClick,
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
    inputValue,
    filteredApiTranslations,
    handleTranslationAddition,
  };
}
