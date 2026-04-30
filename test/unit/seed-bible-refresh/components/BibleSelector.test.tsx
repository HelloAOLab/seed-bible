import { render } from "preact";
import { act } from "preact/test-utils";
import { computed, signal, type Signal } from "@preact/signals";
import { BibleSelector } from "@packages/seed-bible/seed-bible/components/BibleSelector";
import type {
  BibleSelectorBookItem,
  BibleSelectorState,
} from "@packages/seed-bible/seed-bible/managers/BibleSelectorManager";
import type { BibleReadingState } from "@packages/seed-bible/seed-bible/managers/BibleReadingManager";
import type { Pane } from "@packages/seed-bible/seed-bible/managers/PanesManager";
import type {
  AvailableTranslations,
  Translation,
  TranslationBook,
  TranslationBooks,
} from "@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI";

jest.mock("seed-bible.i18n.I18nManager", () => ({
  useI18n: () => ({
    t: (key: string, options?: { defaultValue?: string }) =>
      options?.defaultValue ?? key,
  }),
}));

function createBook(
  id: string,
  name: string,
  order: number,
  chapters: number
): TranslationBook {
  return {
    id,
    name,
    commonName: name,
    title: null,
    order,
    numberOfChapters: chapters,
    firstChapterNumber: 1,
    firstChapterApiLink: `/api/BSB/${id}/1.json`,
    lastChapterNumber: chapters,
    lastChapterApiLink: `/api/BSB/${id}/${chapters}.json`,
    totalNumberOfVerses: chapters * 10,
  };
}

type SelectorFixture = {
  selectorState: BibleSelectorState;
  search: Signal<string>;
  selectChapter: jest.Mock;
  setSearch: jest.Mock;
  handleClick: jest.Mock;
};

function createSelectorFixture(): SelectorFixture {
  const availableTranslations: AvailableTranslations = {
    translations: [
      {
        id: "BSB",
        name: "Berean Standard Bible",
        englishName: "Berean Standard Bible",
        website: "https://example.com",
        licenseUrl: "https://example.com/license",
        shortName: "BSB",
        language: "eng",
        textDirection: "ltr",
        availableFormats: ["json"],
        listOfBooksApiLink: "/api/BSB/books.json",
        numberOfBooks: 66,
        totalNumberOfChapters: 1189,
        totalNumberOfVerses: 31102,
      },
    ],
  };

  const oldBooks = [
    createBook("GEN", "Genesis", 1, 3),
    createBook("EXO", "Exodus", 2, 2),
  ];
  const newBooks = [
    createBook("MAT", "Matthew", 40, 2),
    createBook("MRK", "Mark", 41, 1),
  ];

  const search = signal("");
  const expandedBookId = signal<string | null>("GEN");
  const selectedTranslationId = signal<string | null>("BSB");
  const currentTranslationId = signal<string | null>("BSB");
  const currentBookId = signal<string | null>("GEN");
  const currentChapterNumber = signal<number | null>(1);
  const selectedTestament = signal(2);
  const apocryphaAvailable = signal(false);
  const selectingTranslation = signal(false);
  const viewportWidth = signal(1024);
  const lastBookClicked = signal(-1);
  const bookData = signal<TranslationBook | null>(null);
  const chT = signal(0);
  const localSelectedTestament = signal(2);
  const highLightedButtonsID = signal<Record<number, boolean>>({});
  const currentPsalms = signal<string[]>([
    "1 Psalms",
    "2 Psalms",
    "3 Psalms",
    "4 Psalms",
    "5 Psalms",
  ]);
  const languageQuery = signal("");
  const showCustomTranslation = signal(false);
  const allowedTranslationLimit = signal(50);
  const showAllLanguages = signal<"complete" | "all" | "popular">("complete");
  const showTranslationSettings = signal(false);
  const showTranslationInfo = signal<{
    translation: Translation;
    position: { x: number; y: number };
  } | null>(null);
  const inputValue = signal("");
  const availableTranslationsSignal = signal<Translation[]>(
    availableTranslations.translations
  );
  const loading = signal(false);
  const error = signal<string | null>(null);
  const selectedTranslationBooks = signal<TranslationBooks | null>({
    translation: availableTranslations.translations[0]!,
    books: [...oldBooks, ...newBooks],
  });

  const selectedTranslation = computed(
    () => selectedTranslationBooks.value?.translation ?? null
  );

  const groupedBooks = computed(() => ({
    oldTestament: oldBooks,
    newTestament: newBooks,
    apocrypha: [],
  }));

  const selectedTestamentData = computed<TranslationBook[]>(() => {
    const grouped = groupedBooks.value;
    if (selectedTestament.value === 0) return grouped.oldTestament;
    if (selectedTestament.value === 1) return grouped.newTestament;
    if (selectedTestament.value === 2) {
      return [...grouped.oldTestament, ...grouped.newTestament];
    }
    return grouped.apocrypha;
  });

  const apiTranslations = signal<Record<string, Record<string, Translation>>>({
    english: {
      bsb: availableTranslations.translations[0]!,
    },
  });

  const filteredApiTranslations = computed<
    Array<[string, Record<string, Translation>]>
  >(() => Object.entries(apiTranslations.value));

  const setSearch = jest.fn((value: string) => {
    search.value = value;
  });
  const setExpandedBook = jest.fn((bookId: string) => {
    expandedBookId.value = bookId;
  });
  const selectChapter = jest.fn();
  const handleClick = jest.fn(
    (props: { index: number; book: TranslationBook; cht?: number }) => {
      const { index, book, cht = 0 } = props;
      if (bookData.value?.id === book.id) {
        bookData.value = null;
        chT.value = 0;
        lastBookClicked.value = -1;
        return;
      }

      bookData.value = book;
      chT.value = cht;
      lastBookClicked.value = index;
    }
  );

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
    return tempBooksArray;
  };

  const selectorState: BibleSelectorState = {
    isOpen: signal(false),
    pane: signal(null),
    readingState: signal<BibleReadingState | null>(null),
    currentTranslationId,
    currentBookId,
    currentChapterNumber,
    groupedBooks,
    orientation: signal("traditional"),
    selectedTranslationId,
    selectedTranslation,
    selectedTranslationBooks,
    availableTranslations: availableTranslationsSignal,
    loading,
    error,
    search,
    viewportWidth,
    expandedBookId,
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
    calcChapterPos,
    isBook,
    ghostArray,
    handleEnter: jest.fn(),
    languageQuery,
    showCustomTranslation,
    allowedTranslationLimit,
    apiTranslations,
    showAllLanguages,
    showTranslationSettings,
    showTranslationInfo,
    inputValue,
    filteredApiTranslations,
    handleTranslationAddition: jest.fn(async () => undefined),
    forceNewTab: signal(false),
    availablePanes: signal<Pane[]>([]),
    setOpen: jest.fn(),
    setTargetPane: jest.fn(),
    setSearch,
    setExpandedBook,
    selectTranslation: jest.fn(async () => undefined),
    selectChapter,
    handleClick,
  };

  return {
    selectorState,
    search,
    selectChapter,
    setSearch,
    handleClick,
  };
}

describe("BibleSelector", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  it("is not displayed when closed", () => {
    const { selectorState } = createSelectorFixture();

    act(() => {
      render(
        <BibleSelector
          isOpen={false}
          onClose={jest.fn()}
          selectorState={selectorState}
        />,
        container
      );
    });

    expect(container.querySelector(".sb-selector-overlay.open")).toBeNull();
  });

  it("is displayed when open", () => {
    const { selectorState } = createSelectorFixture();

    act(() => {
      render(
        <BibleSelector
          isOpen={true}
          onClose={jest.fn()}
          selectorState={selectorState}
        />,
        container
      );
    });

    expect(container.querySelector(".sb-selector-overlay.open")).not.toBeNull();
  });

  it("displays all old and new testament books", () => {
    const { selectorState } = createSelectorFixture();

    act(() => {
      render(
        <BibleSelector
          isOpen={true}
          onClose={jest.fn()}
          selectorState={selectorState}
        />,
        container
      );
    });

    const text = container.textContent ?? "";
    expect(text).toContain("Genesis");
    expect(text).toContain("Exodus");
    expect(text).toContain("Matthew");
    expect(text).toContain("Mark");
  });

  it("clicking a chapter selects it", () => {
    const { selectorState, selectChapter } = createSelectorFixture();

    act(() => {
      render(
        <BibleSelector
          isOpen={true}
          onClose={jest.fn()}
          selectorState={selectorState}
        />,
        container
      );
    });

    const genesisButton = Array.from(
      container.querySelectorAll("#booktab-GEN")
    )[0] as HTMLDivElement | undefined;

    expect(genesisButton).toBeDefined();

    act(() => {
      genesisButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const chapterTwoButton = Array.from(
      container.querySelectorAll(".chapter-btn")
    ).find((button) => button.textContent?.trim() === "2") as
      | HTMLButtonElement
      | undefined;

    expect(chapterTwoButton).toBeDefined();

    act(() => {
      chapterTwoButton?.dispatchEvent(
        new MouseEvent("click", { bubbles: true })
      );
    });

    expect(selectChapter).toHaveBeenCalledWith("GEN", 2);
  });

  it("clicking on a book updates the expanded book state", () => {
    const { selectorState, handleClick } = createSelectorFixture();

    act(() => {
      render(
        <BibleSelector
          isOpen={true}
          onClose={jest.fn()}
          selectorState={selectorState}
        />,
        container
      );
    });

    const exodusButton = Array.from(
      container.querySelectorAll("#booktab-EXO")
    )[0] as HTMLDivElement | undefined;

    expect(exodusButton).toBeDefined();

    act(() => {
      exodusButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(handleClick).toHaveBeenCalledWith(
      expect.objectContaining({
        index: 1,
        book: expect.objectContaining({ id: "EXO" }),
      })
    );
    expect(container.textContent ?? "").toContain("1");
    expect(container.textContent ?? "").toContain("2");
  });

  it("changing the search input sets the search", () => {
    const { selectorState, setSearch, search } = createSelectorFixture();

    act(() => {
      render(
        <BibleSelector
          isOpen={true}
          onClose={jest.fn()}
          selectorState={selectorState}
        />,
        container
      );
    });

    const searchInput = container.querySelector(
      'input[placeholder="Search books..."]'
    ) as HTMLInputElement | null;

    expect(searchInput).not.toBeNull();

    act(() => {
      if (!searchInput) {
        return;
      }
      searchInput.value = "exo";
      searchInput.dispatchEvent(new Event("input", { bubbles: true }));
      searchInput.dispatchEvent(new Event("change", { bubbles: true }));
    });

    expect(setSearch).toHaveBeenCalledWith("exo");
    expect(search.value).toBe("exo");
  });
});
