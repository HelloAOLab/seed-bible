import { render } from "preact";
import { act } from "preact/test-utils";
import { BibleSelector } from "@packages/seed-bible/seed-bible/components/BibleSelector";
import type { BibleSelectorState } from "@packages/seed-bible/seed-bible/managers/BibleSelectorManager";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import type { Pane } from "@packages/seed-bible/seed-bible/managers/PanesManager";
import type { Translation } from "@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI";
import {
  createTestSeedBibleState,
  waitFor,
} from "../testUtils/createTestSeedBibleState";
import {
  createDefaultManagerResponseMap,
  createResponse,
  makeUrl,
  makeExampleUrl,
  EXAMPLE_API_ENDPOINT,
  makeChapter,
  createDefaultSelectorManagerResponseMap,
  aabBooks,
} from "../managers/testUtils/mockBibleApiData";
import type { Mock } from "vitest";

vi.mock("../i18n/I18nManager", () => ({
  useI18n: () => ({
    t: (key: string, options?: { defaultValue?: string }) =>
      options?.defaultValue ?? key,
  }),
}));

type SelectorFixture = {
  state: SeedBibleState;
  selectorState: BibleSelectorState;
  bibleDataManager: SeedBibleState["bibleData"];
  pane: Pane;
  selectChapter: Mock;
  setSearch: Mock;
};

function setAvailableTranslations(
  translations: Translation[],
  bibleDataManager: SelectorFixture["bibleDataManager"]
) {
  bibleDataManager.availableTranslations.value = translations;
}

async function createSelectorFixture(
  options: { open?: boolean } = {}
): Promise<SelectorFixture> {
  const state = await createTestSeedBibleState({
    responses: createDefaultSelectorManagerResponseMap(),
  });
  const pane = state.panes.panes.value[0] as Pane;
  if (!pane) {
    throw new Error("Expected an initial pane.");
  }

  if (options.open !== false) {
    await state.selector.setOpen(true, pane);
  }

  return {
    state,
    selectorState: state.selector,
    bibleDataManager: state.bibleData,
    pane,
    selectChapter: vi.spyOn(state.selector, "selectChapter"),
    setSearch: vi.spyOn(state.selector, "setSearch"),
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

  it("is not displayed when closed", async () => {
    const { selectorState, bibleDataManager } = await createSelectorFixture({
      open: false,
    });

    act(() => {
      render(
        <BibleSelector
          isOpen={false}
          onClose={vi.fn()}
          selectorState={selectorState}
          bibleDataManager={bibleDataManager}
        />,
        container
      );
    });

    expect(container.querySelector(".sb-selector-overlay.open")).toBeNull();
  });

  it("is displayed when open", async () => {
    const { selectorState, bibleDataManager } = await createSelectorFixture();

    act(() => {
      render(
        <BibleSelector
          isOpen={true}
          onClose={vi.fn()}
          selectorState={selectorState}
          bibleDataManager={bibleDataManager}
        />,
        container
      );
    });

    expect(container.querySelector(".sb-selector-overlay.open")).not.toBeNull();
  });

  it("sets dir to match selected translation text direction", async () => {
    const { selectorState, bibleDataManager } = await createSelectorFixture();

    act(() => {
      if (selectorState.selectedTranslationBooks.value) {
        selectorState.selectedTranslationBooks.value = {
          ...selectorState.selectedTranslationBooks.value,
          translation: {
            ...selectorState.selectedTranslationBooks.value.translation,
            textDirection: "rtl",
          },
        };
      }
    });

    act(() => {
      render(
        <BibleSelector
          isOpen={true}
          onClose={vi.fn()}
          selectorState={selectorState}
          bibleDataManager={bibleDataManager}
        />,
        container
      );
    });

    await waitFor(() => Boolean(container.querySelector(".books-container")));

    const booksContainer = container.querySelector(
      ".books-container"
    ) as HTMLDivElement | null;

    expect(booksContainer).not.toBeNull();
    expect(booksContainer?.getAttribute("dir")).toBe("rtl");
  });

  it("displays all old and new testament books", async () => {
    const { selectorState, bibleDataManager } = await createSelectorFixture();

    act(() => {
      render(
        <BibleSelector
          isOpen={true}
          onClose={vi.fn()}
          selectorState={selectorState}
          bibleDataManager={bibleDataManager}
        />,
        container
      );
    });

    await waitFor(() => Boolean(container.querySelector("#booktab-GEN")));
    await waitFor(() => Boolean(container.querySelector("#booktab-EXO")));
    await waitFor(() => Boolean(container.querySelector("#booktab-MAT")));

    const text = container.textContent ?? "";
    expect(text).toContain("Genesis");
    expect(text).toContain("Exodus");
    expect(text).toContain("Matthew");
  });

  it("clicking a chapter selects it", async () => {
    const { selectorState, selectChapter, bibleDataManager } =
      await createSelectorFixture();

    act(() => {
      render(
        <BibleSelector
          isOpen={true}
          onClose={vi.fn()}
          selectorState={selectorState}
          bibleDataManager={bibleDataManager}
        />,
        container
      );
    });

    await waitFor(() => Boolean(container.querySelector("#booktab-GEN")));

    const genesisButton = Array.from(
      container.querySelectorAll("#booktab-GEN")
    )[0] as HTMLDivElement | undefined;

    expect(genesisButton).toBeDefined();

    act(() => {
      genesisButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    await waitFor(() =>
      Array.from(container.querySelectorAll(".chapter-btn")).some(
        (button) => button.textContent?.trim() === "2"
      )
    );

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

    await waitFor(() => selectChapter.mock.calls.length > 0);
    expect(selectChapter).toHaveBeenCalledWith("GEN", 2);
  });

  it("clicking on a book updates the expanded book state", async () => {
    const { selectorState, bibleDataManager } = await createSelectorFixture();

    act(() => {
      render(
        <BibleSelector
          isOpen={true}
          onClose={vi.fn()}
          selectorState={selectorState}
          bibleDataManager={bibleDataManager}
        />,
        container
      );
    });

    await waitFor(() => Boolean(container.querySelector("#booktab-EXO")));

    const exodusButton = Array.from(
      container.querySelectorAll("#booktab-EXO")
    )[0] as HTMLDivElement | undefined;

    expect(exodusButton).toBeDefined();

    act(() => {
      exodusButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    await waitFor(() => selectorState.bookData.value?.id === "EXO");

    expect(selectorState.bookData.value?.id).toBe("EXO");
    expect(container.querySelectorAll(".chapter-btn").length).toBeGreaterThan(
      0
    );
  });

  it("renders all chapters for the selected book", async () => {
    const { selectorState, bibleDataManager } = await createSelectorFixture();

    act(() => {
      render(
        <BibleSelector
          isOpen={true}
          onClose={vi.fn()}
          selectorState={selectorState}
          bibleDataManager={bibleDataManager}
        />,
        container
      );
    });

    await waitFor(() => Boolean(container.querySelector("#booktab-EXO")));

    const exodusButton = container.querySelector(
      "#booktab-EXO"
    ) as HTMLDivElement | null;
    expect(exodusButton).not.toBeNull();

    act(() => {
      exodusButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    await waitFor(() => selectorState.bookData.value?.id === "EXO");
    await waitFor(
      () => container.querySelectorAll(".chapter-btn").length === 40
    );

    const chapterNumbers = Array.from(
      container.querySelectorAll(".chapter-btn")
    )
      .map((button) => Number(button.textContent?.trim()))
      .filter((chapter) => Number.isFinite(chapter));

    expect(chapterNumbers).toEqual(
      Array.from({ length: 40 }, (_, index) => index + 1)
    );
  });

  it("changing the search input sets the search", async () => {
    const { selectorState, setSearch, bibleDataManager } =
      await createSelectorFixture();

    act(() => {
      render(
        <BibleSelector
          isOpen={true}
          onClose={vi.fn()}
          selectorState={selectorState}
          bibleDataManager={bibleDataManager}
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
    expect(selectorState.search.value).toBe("exo");
  });

  it("entering gen 10 and pressing Enter selects Genesis chapter 10", async () => {
    const responses = {
      ...createDefaultManagerResponseMap(),
      [makeUrl("/api/AAB/GEN/10.json")]: createResponse(
        makeChapter(aabBooks, "GEN", 10)
      ),
    };

    const state = await createTestSeedBibleState({ responses });
    const pane = state.panes.panes.value[0] as Pane;
    if (!pane) {
      throw new Error("Expected an initial pane.");
    }
    await state.selector.setOpen(true, pane);

    const { selectorState, bibleDataManager } = {
      selectorState: state.selector,
      bibleDataManager: state.bibleData,
    };

    act(() => {
      render(
        <BibleSelector
          isOpen={true}
          onClose={vi.fn()}
          selectorState={selectorState}
          bibleDataManager={bibleDataManager}
        />,
        container
      );
    });

    const searchInput = container.querySelector(
      'input[placeholder="Search books..."]'
    ) as HTMLInputElement | null;

    expect(searchInput).not.toBeNull();

    await act(async () => {
      if (!searchInput) {
        return;
      }
      searchInput.value = "gen 10";
      searchInput.dispatchEvent(new Event("input", { bubbles: true }));
      searchInput.dispatchEvent(new Event("change", { bubbles: true }));
      await Promise.resolve();
    });

    await waitFor(() => selectorState.search.value === "gen 10");
    await waitFor(() => selectorState.selectedTranslationId.value === "AAB");
    await waitFor(
      () => selectorState.selectedTestamentData.value?.length === 1
    );

    await act(async () => {
      selectorState.handleEnter();
      await Promise.resolve();
    });

    await waitFor(() => pane.tab?.readingState.bookId.value === "GEN");
    await waitFor(() => pane.tab?.readingState.chapterNumber.value === 10);

    expect(pane.tab?.readingState.bookId.value).toBe("GEN");
    expect(pane.tab?.readingState.chapterNumber.value).toBe(10);
    expect(selectorState.isOpen.value).toBe(false);
  });

  it("entering {bookName} 1 and pressing Enter selects the matching book chapter 1", async () => {
    const responses = {
      ...createDefaultManagerResponseMap(),
      [makeUrl("/api/AAB/EXO/1.json")]: createResponse(
        makeChapter(aabBooks, "EXO", 1)
      ),
      [makeUrl("/api/AAB/MAT/1.json")]: createResponse(
        makeChapter(aabBooks, "MAT", 1)
      ),
    };

    const cases = [
      { bookName: "Genesis", expectedBookId: "GEN" },
      { bookName: "Exodus", expectedBookId: "EXO" },
      { bookName: "Matthew", expectedBookId: "MAT" },
    ];

    for (const testCase of cases) {
      const state = await createTestSeedBibleState({ responses });
      const pane = state.panes.panes.value[0] as Pane;
      if (!pane) {
        throw new Error("Expected an initial pane.");
      }
      await state.selector.setOpen(true, pane);

      const { selectorState, bibleDataManager } = {
        selectorState: state.selector,
        bibleDataManager: state.bibleData,
      };

      act(() => {
        render(
          <BibleSelector
            isOpen={true}
            onClose={vi.fn()}
            selectorState={selectorState}
            bibleDataManager={bibleDataManager}
          />,
          container
        );
      });

      await waitFor(() => Boolean(container.querySelector("#booktab-GEN")));

      const searchInput = container.querySelector(
        'input[placeholder="Search books..."]'
      ) as HTMLInputElement | null;

      expect(searchInput).not.toBeNull();

      await act(async () => {
        if (!searchInput) {
          return;
        }
        searchInput.value = `${testCase.bookName} 1`;
        searchInput.dispatchEvent(new Event("input", { bubbles: true }));
        searchInput.dispatchEvent(new Event("change", { bubbles: true }));
        await Promise.resolve();
      });

      await waitFor(
        () => selectorState.search.value === `${testCase.bookName} 1`
      );
      await waitFor(() => selectorState.selectedTranslationId.value === "AAB");
      await waitFor(
        () => selectorState.selectedTestamentData.value?.length === 1
      );

      await act(async () => {
        selectorState.handleEnter();
        await Promise.resolve();
      });

      await waitFor(
        () => pane.tab?.readingState.bookId.value === testCase.expectedBookId
      );
      await waitFor(() => pane.tab?.readingState.chapterNumber.value === 1);

      expect(pane.tab?.readingState.bookId.value).toBe(testCase.expectedBookId);
      expect(pane.tab?.readingState.chapterNumber.value).toBe(1);
      expect(selectorState.isOpen.value).toBe(false);

      render(null, container);
    }
  });

  it("breaks Psalms into 1 Psalms through 5 Psalms with expected chapter ranges", async () => {
    const psalmsBooks = {
      ...aabBooks,
      books: [
        ...aabBooks.books.filter((book) => book.id !== "MAT"),
        {
          id: "PSA",
          name: "Psalms",
          commonName: "Psalms",
          title: null,
          order: 19,
          numberOfChapters: 150,
          firstChapterNumber: 1,
          firstChapterApiLink: "/api/AAB/PSA/1.json",
          lastChapterNumber: 150,
          lastChapterApiLink: "/api/AAB/PSA/150.json",
          totalNumberOfVerses: 2461,
        },
        ...aabBooks.books.filter((book) => book.id === "MAT"),
      ],
    };

    const responses = {
      ...createDefaultManagerResponseMap(),
      [makeUrl("/api/AAB/books.json")]: createResponse(psalmsBooks),
    };

    const state = await createTestSeedBibleState({ responses });
    const pane = state.panes.panes.value[0] as Pane;
    if (!pane) {
      throw new Error("Expected an initial pane.");
    }
    await state.selector.setOpen(true, pane);

    const { selectorState, bibleDataManager } = {
      selectorState: state.selector,
      bibleDataManager: state.bibleData,
    };

    act(() => {
      render(
        <BibleSelector
          isOpen={true}
          onClose={vi.fn()}
          selectorState={selectorState}
          bibleDataManager={bibleDataManager}
        />,
        container
      );
    });

    await waitFor(() => Boolean(container.querySelector("#booktab-PSA")));

    const psalmsButton = container.querySelector(
      "#booktab-PSA"
    ) as HTMLDivElement | null;
    expect(psalmsButton).not.toBeNull();

    act(() => {
      psalmsButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    await waitFor(() => container.querySelectorAll(".psalms-btn").length === 5);

    const getPsalmSectionButton = (sectionName: string): HTMLButtonElement => {
      const button = Array.from(container.querySelectorAll(".psalms-btn")).find(
        (element) => element.textContent?.trim() === sectionName
      ) as HTMLButtonElement | undefined;

      if (!button) {
        throw new Error(`Could not find Psalms section button: ${sectionName}`);
      }

      return button;
    };

    const isSectionActive = (sectionName: string): boolean =>
      getPsalmSectionButton(sectionName).classList.contains(
        "sidebar-selected-itm"
      );

    const setActiveSectionOnly = async (sectionName: string): Promise<void> => {
      const sections = [
        "1 Psalms",
        "2 Psalms",
        "3 Psalms",
        "4 Psalms",
        "5 Psalms",
      ];

      for (const section of sections) {
        const shouldBeActive = section === sectionName;
        const currentlyActive = isSectionActive(section);
        if (shouldBeActive !== currentlyActive) {
          act(() => {
            getPsalmSectionButton(section).dispatchEvent(
              new MouseEvent("click", { bubbles: true })
            );
          });

          await waitFor(() => isSectionActive(section) === shouldBeActive);
        }
      }

      await waitFor(() =>
        sections.every(
          (section) => isSectionActive(section) === (section === sectionName)
        )
      );
    };

    const getVisibleChapterNumbers = (): number[] => {
      return Array.from(container.querySelectorAll(".chapter-btn"))
        .filter(
          (button) => (button as HTMLButtonElement).style.display !== "none"
        )
        .map((button) => Number(button.textContent?.trim()))
        .filter((chapter) => Number.isFinite(chapter));
    };

    const expectVisibleChapterRange = async (
      sectionName: string,
      startChapter: number,
      endChapter: number
    ): Promise<void> => {
      await setActiveSectionOnly(sectionName);

      const expected = Array.from(
        { length: endChapter - startChapter + 1 },
        (_, index) => startChapter + index
      );
      expect(getVisibleChapterNumbers()).toEqual(expected);
    };

    await expectVisibleChapterRange("1 Psalms", 1, 41);
    await expectVisibleChapterRange("2 Psalms", 42, 72);
    await expectVisibleChapterRange("3 Psalms", 73, 89);
    await expectVisibleChapterRange("4 Psalms", 90, 106);
    await expectVisibleChapterRange("5 Psalms", 107, 150);
  });
});

describe("BibleSelector translation selector", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  function makeTranslation(
    id: string,
    languageEnglishName: string,
    numberOfBooks = 66
  ): Translation {
    return {
      id,
      name: `${id} Bible`,
      englishName: `${id} Bible`,
      languageEnglishName,
      website: "https://example.com",
      licenseUrl: "https://example.com/license",
      shortName: id,
      language: languageEnglishName.slice(0, 3).toLowerCase(),
      textDirection: "ltr",
      availableFormats: ["json"],
      listOfBooksApiLink: `/api/${id}/books.json`,
      numberOfBooks,
      totalNumberOfChapters: 1189,
      totalNumberOfVerses: 31102,
    };
  }

  it("displays translations grouped by language", async () => {
    const { selectorState, bibleDataManager } = await createSelectorFixture();

    act(() => {
      render(
        <BibleSelector
          isOpen={true}
          onClose={vi.fn()}
          selectorState={selectorState}
          bibleDataManager={bibleDataManager}
        />,
        container
      );
    });

    act(() => {
      setAvailableTranslations(
        [
          makeTranslation("AAB", "English"),
          makeTranslation("NIV", "English"),
          makeTranslation("RVR", "Spanish"),
        ],
        bibleDataManager
      );
      selectorState.selectingTranslation.value = true;
    });

    await waitFor(() => Boolean(container.querySelector(".language-list")));

    const items = Array.from(container.querySelectorAll(".item"));
    const labels = items.map((el) => el.textContent?.trim().toLowerCase());
    expect(labels.some((l) => l?.includes("english"))).toBe(true);
    expect(labels.some((l) => l?.includes("spanish"))).toBe(true);
  });

  it("defaults to opening the language group that matches the language of the currently selected translation", async () => {
    const { selectorState, bibleDataManager } = await createSelectorFixture();

    act(() => {
      render(
        <BibleSelector
          isOpen={true}
          onClose={vi.fn()}
          selectorState={selectorState}
          bibleDataManager={bibleDataManager}
        />,
        container
      );
    });

    // Set up two language groups; selected translation (AAB) has language "eng"
    act(() => {
      setAvailableTranslations(
        [makeTranslation("AAB", "English"), makeTranslation("RVR", "Spanish")],
        bibleDataManager
      );
      selectorState.showAllLanguages.value = "all";
      selectorState.selectingTranslation.value = true;
    });

    await waitFor(() => Boolean(container.querySelector(".language-list")));

    // The English group (matching selected translation's language) should be auto-expanded
    const translationOptions = Array.from(
      container.querySelectorAll(".translation-option")
    );
    const optionTexts = translationOptions.map(
      (el) => el.textContent?.toLowerCase() ?? ""
    );
    expect(optionTexts.some((t) => t.includes("aab"))).toBe(true);
    // The Spanish group should remain collapsed
    expect(optionTexts.some((t) => t.includes("rvr"))).toBe(false);
  });

  it("allows opening translation selector and searching translations by name", async () => {
    const { selectorState, bibleDataManager } = await createSelectorFixture();

    act(() => {
      render(
        <BibleSelector
          isOpen={true}
          onClose={vi.fn()}
          selectorState={selectorState}
          bibleDataManager={bibleDataManager}
        />,
        container
      );
    });

    act(() => {
      setAvailableTranslations(
        [
          {
            ...makeTranslation("NIV", "English", 66),
            name: "New International Version",
          },
          {
            ...makeTranslation("BSB", "English", 66),
            name: "Berean Study Bible",
          },
        ],
        bibleDataManager
      );
      selectorState.showAllLanguages.value = "all";
    });

    const openTranslationSelectorButton = container.querySelector(
      ".sidebar-translation-selector"
    ) as HTMLDivElement | null;
    expect(openTranslationSelectorButton).not.toBeNull();

    act(() => {
      openTranslationSelectorButton?.dispatchEvent(
        new MouseEvent("click", { bubbles: true })
      );
    });

    await waitFor(() =>
      Boolean(container.querySelector("#translation-search-input"))
    );

    const translationSearchInput = container.querySelector(
      "#translation-search-input"
    ) as HTMLInputElement | null;
    expect(translationSearchInput).not.toBeNull();

    act(() => {
      if (!translationSearchInput) {
        return;
      }
      translationSearchInput.value = "international";
      translationSearchInput.dispatchEvent(
        new Event("change", { bubbles: true })
      );
    });

    await waitFor(() => selectorState.languageQuery.value === "international");

    const modalText = container.textContent?.toLowerCase() ?? "";
    expect(modalText).toContain("new international version");
    expect(modalText).not.toContain("berean study bible");
  });

  it("allows opening translation selector and searching translations by abbreviation", async () => {
    const { selectorState, bibleDataManager } = await createSelectorFixture();

    act(() => {
      render(
        <BibleSelector
          isOpen={true}
          onClose={vi.fn()}
          selectorState={selectorState}
          bibleDataManager={bibleDataManager}
        />,
        container
      );
    });

    act(() => {
      setAvailableTranslations(
        [
          {
            ...makeTranslation("NIV", "English", 66),
            name: "New International Version",
          },
          {
            ...makeTranslation("RVR", "Spanish", 66),
            name: "Reina Valera",
          },
        ],
        bibleDataManager
      );
      selectorState.showAllLanguages.value = "all";
    });

    const openTranslationSelectorButton = container.querySelector(
      ".sidebar-translation-selector"
    ) as HTMLDivElement | null;
    expect(openTranslationSelectorButton).not.toBeNull();

    act(() => {
      openTranslationSelectorButton?.dispatchEvent(
        new MouseEvent("click", { bubbles: true })
      );
    });

    await waitFor(() =>
      Boolean(container.querySelector("#translation-search-input"))
    );

    const translationSearchInput = container.querySelector(
      "#translation-search-input"
    ) as HTMLInputElement | null;
    expect(translationSearchInput).not.toBeNull();

    act(() => {
      if (!translationSearchInput) {
        return;
      }
      translationSearchInput.value = "rvr";
      translationSearchInput.dispatchEvent(
        new Event("change", { bubbles: true })
      );
    });

    await waitFor(() => selectorState.languageQuery.value === "rvr");

    const modalText = container.textContent?.toLowerCase() ?? "";
    expect(modalText).toContain("reina valera (rvr)");
    expect(modalText).not.toContain("new international version (niv)");
  });

  it("allows opening translation selector and searching translations by language", async () => {
    const { selectorState, bibleDataManager } = await createSelectorFixture();

    act(() => {
      render(
        <BibleSelector
          isOpen={true}
          onClose={vi.fn()}
          selectorState={selectorState}
          bibleDataManager={bibleDataManager}
        />,
        container
      );
    });

    act(() => {
      setAvailableTranslations(
        [
          {
            ...makeTranslation("NIV", "English", 66),
            name: "New International Version",
          },
          {
            ...makeTranslation("RVR", "Spanish", 66),
            name: "Reina Valera",
          },
        ],
        bibleDataManager
      );
      selectorState.showAllLanguages.value = "all";
    });

    const openTranslationSelectorButton = container.querySelector(
      ".sidebar-translation-selector"
    ) as HTMLDivElement | null;
    expect(openTranslationSelectorButton).not.toBeNull();

    act(() => {
      openTranslationSelectorButton?.dispatchEvent(
        new MouseEvent("click", { bubbles: true })
      );
    });

    await waitFor(() =>
      Boolean(container.querySelector("#translation-search-input"))
    );

    const translationSearchInput = container.querySelector(
      "#translation-search-input"
    ) as HTMLInputElement | null;
    expect(translationSearchInput).not.toBeNull();

    act(() => {
      if (!translationSearchInput) {
        return;
      }
      translationSearchInput.value = "spanish";
      translationSearchInput.dispatchEvent(
        new Event("change", { bubbles: true })
      );
    });

    await waitFor(() => selectorState.languageQuery.value === "spanish");

    const items = Array.from(container.querySelectorAll(".item"));
    const labels = items.map((el) => el.textContent?.trim().toLowerCase());
    expect(labels.some((l) => l?.includes("spanish"))).toBe(true);
    expect(labels.some((l) => l?.includes("english"))).toBe(false);
  });

  it("allows opening translation selector and searching translations by native language name", async () => {
    const { selectorState, bibleDataManager } = await createSelectorFixture();

    act(() => {
      render(
        <BibleSelector
          isOpen={true}
          onClose={vi.fn()}
          selectorState={selectorState}
          bibleDataManager={bibleDataManager}
        />,
        container
      );
    });

    act(() => {
      setAvailableTranslations(
        [
          {
            ...makeTranslation("NIV", "English", 66),
            name: "New International Version",
            languageName: "English",
          },
          {
            ...makeTranslation("RVR", "Spanish", 66),
            name: "Reina Valera",
            languageName: "Espanol",
          },
        ],
        bibleDataManager
      );
      selectorState.showAllLanguages.value = "all";
    });

    const openTranslationSelectorButton = container.querySelector(
      ".sidebar-translation-selector"
    ) as HTMLDivElement | null;
    expect(openTranslationSelectorButton).not.toBeNull();

    act(() => {
      openTranslationSelectorButton?.dispatchEvent(
        new MouseEvent("click", { bubbles: true })
      );
    });

    await waitFor(() =>
      Boolean(container.querySelector("#translation-search-input"))
    );

    const translationSearchInput = container.querySelector(
      "#translation-search-input"
    ) as HTMLInputElement | null;
    expect(translationSearchInput).not.toBeNull();

    act(() => {
      if (!translationSearchInput) {
        return;
      }
      translationSearchInput.value = "espanol";
      translationSearchInput.dispatchEvent(
        new Event("change", { bubbles: true })
      );
    });

    await waitFor(() => selectorState.languageQuery.value === "espanol");

    const items = Array.from(container.querySelectorAll(".item"));
    const labels = items.map((el) => el.textContent?.trim().toLowerCase());
    expect(labels.some((l) => l?.includes("spanish"))).toBe(true);
    expect(labels.some((l) => l?.includes("english"))).toBe(false);
  });

  it("selecting a translation selects the current book/chapter in that translation and closes the selector", async () => {
    const { selectorState, bibleDataManager, pane } =
      await createSelectorFixture();

    await pane.tab!.readingState.selectChapter("EXO", 2);

    expect(pane.tab?.readingState.translationId.value).toBe("AAB");

    const initialBookId = pane.tab?.readingState.bookId.value;
    expect(initialBookId).toBe("EXO");

    const initialChapter = pane.tab?.readingState.chapterNumber.value;
    expect(initialChapter).toBe(2);

    act(() => {
      render(
        <BibleSelector
          isOpen={true}
          onClose={vi.fn()}
          selectorState={selectorState}
          bibleDataManager={bibleDataManager}
        />,
        container
      );
    });

    act(() => {
      selectorState.selectingTranslation.value = true;
      selectorState.showAllLanguages.value = "all";
      selectorState.languageQuery.value = "bsb";
    });

    await waitFor(() =>
      Boolean(container.querySelector(".translation-option"))
    );

    const bsbOption = Array.from(
      container.querySelectorAll(".translation-option")
    ).find((option) =>
      (option.textContent ?? "").toLowerCase().includes("(bsb)")
    ) as HTMLDivElement | undefined;

    expect(bsbOption).toBeDefined();

    act(() => {
      bsbOption?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    await waitFor(() => selectorState.selectedTranslationId.value === "BSB");

    await waitFor(() => pane.tab?.readingState.translationId.value === "BSB");
    await waitFor(() => selectorState.isOpen.value === false);

    expect(selectorState.selectingTranslation.value).toBe(false);
    expect(selectorState.isOpen.value).toBe(false);
    expect(pane.tab?.readingState.translationId.value).toBe("BSB");
    expect(pane.tab?.readingState.bookId.value).toBe(initialBookId);
    expect(pane.tab?.readingState.chapterNumber.value).toBe(initialChapter);
  });

  it("selecting a translation falls back to the first book and its first available chapter when the current book is unavailable", async () => {
    const altTranslation: Translation = {
      ...makeTranslation("ALT", "English", 1),
      name: "Alternate Translation",
      englishName: "Alternate Translation",
      listOfBooksApiLink: "/api/ALT/books.json",
    };

    const altBooks = {
      translation: altTranslation,
      books: [
        {
          id: "MAT",
          name: "Matthew",
          commonName: "Matthew",
          title: null,
          order: 40,
          numberOfChapters: 28,
          firstChapterNumber: 3,
          firstChapterApiLink: "/api/ALT/MAT/3.json",
          lastChapterNumber: 30,
          lastChapterApiLink: "/api/ALT/MAT/30.json",
          totalNumberOfVerses: 1071,
        },
      ],
    };

    const state = await createTestSeedBibleState({
      responses: {
        ...createDefaultSelectorManagerResponseMap(),
        [makeUrl("/api/available_translations.json")]: createResponse({
          translations: [
            {
              ...makeTranslation("AAB", "English", 66),
              listOfBooksApiLink: "/api/AAB/books.json",
            },
            altTranslation,
          ],
        }),
        [makeUrl("/api/ALT/books.json")]: createResponse(altBooks),
        [makeUrl("/api/ALT/MAT/3.json")]: createResponse(
          makeChapter(altBooks, "MAT", 3)
        ),
      },
    });

    const pane = state.panes.panes.value[0] as Pane;
    if (!pane) {
      throw new Error("Expected an initial pane.");
    }

    await pane.tab!.readingState.selectChapter("EXO", 2);
    await state.selector.setOpen(true, pane);

    const { selectorState, bibleDataManager } = {
      selectorState: state.selector,
      bibleDataManager: state.bibleData,
    };

    act(() => {
      render(
        <BibleSelector
          isOpen={true}
          onClose={vi.fn()}
          selectorState={selectorState}
          bibleDataManager={bibleDataManager}
        />,
        container
      );
    });

    act(() => {
      selectorState.selectingTranslation.value = true;
      selectorState.showAllLanguages.value = "all";
      selectorState.languageQuery.value = "alt";
    });

    await waitFor(() =>
      Boolean(container.querySelector(".translation-option"))
    );

    const altOption = Array.from(
      container.querySelectorAll(".translation-option")
    ).find((option) =>
      (option.textContent ?? "").toLowerCase().includes("(alt)")
    ) as HTMLDivElement | undefined;

    expect(altOption).toBeDefined();

    act(() => {
      altOption?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    await waitFor(() => selectorState.selectedTranslationId.value === "ALT");
    await waitFor(() => pane.tab?.readingState.translationId.value === "ALT");
    await waitFor(() => pane.tab?.readingState.bookId.value === "MAT");
    await waitFor(() => pane.tab?.readingState.chapterNumber.value === 3);
    await waitFor(() => selectorState.isOpen.value === false);

    expect(selectorState.selectingTranslation.value).toBe(false);
    expect(selectorState.isOpen.value).toBe(false);
    expect(pane.tab?.readingState.translationId.value).toBe("ALT");
    expect(pane.tab?.readingState.bookId.value).toBe("MAT");
    expect(pane.tab?.readingState.chapterNumber.value).toBe(3);
  });

  it("displays only complete translations when in complete mode", async () => {
    const { selectorState, bibleDataManager } = await createSelectorFixture();

    act(() => {
      render(
        <BibleSelector
          isOpen={true}
          onClose={vi.fn()}
          selectorState={selectorState}
          bibleDataManager={bibleDataManager}
        />,
        container
      );
    });

    act(() => {
      setAvailableTranslations(
        [
          makeTranslation("AAB", "English", 66),
          makeTranslation("INC", "English", 27),
          makeTranslation("FLS", "French", 27),
        ],
        bibleDataManager
      );
      selectorState.showAllLanguages.value = "complete";
      selectorState.selectingTranslation.value = true;
    });

    await waitFor(() => Boolean(container.querySelector(".language-list")));

    const items = Array.from(container.querySelectorAll(".item"));
    const labels = items.map((el) => el.textContent?.trim().toLowerCase());

    // English group is visible because it contains at least one complete translation
    expect(labels.some((l) => l?.includes("english"))).toBe(true);
    // French group is hidden because all its translations are incomplete
    expect(labels.some((l) => l?.includes("french"))).toBe(false);
  });

  it("displays all translations across all languages when in all mode", async () => {
    const { selectorState, bibleDataManager } = await createSelectorFixture();

    act(() => {
      render(
        <BibleSelector
          isOpen={true}
          onClose={vi.fn()}
          selectorState={selectorState}
          bibleDataManager={bibleDataManager}
        />,
        container
      );
    });

    act(() => {
      setAvailableTranslations(
        [
          makeTranslation("AAB", "English", 66),
          makeTranslation("FLS", "French", 27),
          makeTranslation("KLG", "Klingon", 10),
        ],
        bibleDataManager
      );
      selectorState.showAllLanguages.value = "all";
      selectorState.selectingTranslation.value = true;
    });

    await waitFor(() => Boolean(container.querySelector(".language-list")));

    const items = Array.from(container.querySelectorAll(".item"));
    const labels = items.map((el) => el.textContent?.trim().toLowerCase());

    expect(labels.some((l) => l?.includes("english"))).toBe(true);
    expect(labels.some((l) => l?.includes("french"))).toBe(true);
    expect(labels.some((l) => l?.includes("klingon"))).toBe(true);
  });

  it("displays only popular languages when in popular mode", async () => {
    const { selectorState, bibleDataManager } = await createSelectorFixture();

    act(() => {
      render(
        <BibleSelector
          isOpen={true}
          onClose={vi.fn()}
          selectorState={selectorState}
          bibleDataManager={bibleDataManager}
        />,
        container
      );
    });

    act(() => {
      setAvailableTranslations(
        [
          makeTranslation("AAB", "English", 66),
          makeTranslation("KLG", "Klingon", 10),
        ],
        bibleDataManager
      );
      selectorState.showAllLanguages.value = "popular";
      selectorState.selectingTranslation.value = true;
    });

    await waitFor(() => Boolean(container.querySelector(".language-list")));

    const items = Array.from(container.querySelectorAll(".item"));
    const labels = items.map((el) => el.textContent?.trim().toLowerCase());

    // English is a popular language and should be visible
    expect(labels.some((l) => l?.includes("english"))).toBe(true);
    // Klingon is not a popular language and should be hidden
    expect(labels.some((l) => l?.includes("klingon"))).toBe(false);
  });

  it("displays percentage complete indicator circles with conic-gradient in all and popular modes but not in complete mode", async () => {
    const { selectorState, bibleDataManager } = await createSelectorFixture();

    act(() => {
      render(
        <BibleSelector
          isOpen={true}
          onClose={vi.fn()}
          selectorState={selectorState}
          bibleDataManager={bibleDataManager}
        />,
        container
      );
    });

    // "all" mode: incomplete non-selected translation shows circle with conic-gradient
    act(() => {
      setAvailableTranslations(
        [makeTranslation("INC", "English", 27)],
        bibleDataManager
      );
      selectorState.showAllLanguages.value = "all";
      selectorState.selectingTranslation.value = true;
      selectorState.languageQuery.value = "inc";
    });

    await waitFor(() => Boolean(container.querySelector(".emptyCircle")));

    const circleAll = container.querySelector(
      ".emptyCircle"
    ) as HTMLElement | null;
    expect(circleAll).not.toBeNull();
    expect(circleAll?.style.background).toContain("conic-gradient");

    // "popular" mode: same incomplete translation (english is a popular language)
    act(() => {
      selectorState.showAllLanguages.value = "popular";
    });

    await waitFor(() => Boolean(container.querySelector(".emptyCircle")));

    const circlePopular = container.querySelector(
      ".emptyCircle"
    ) as HTMLElement | null;
    expect(circlePopular).not.toBeNull();
    expect(circlePopular?.style.background).toContain("conic-gradient");

    // "complete" mode: only complete translations shown; their circles have no conic-gradient
    act(() => {
      setAvailableTranslations(
        [makeTranslation("BSB", "English", 66)],
        bibleDataManager
      );
      selectorState.showAllLanguages.value = "complete";
      selectorState.languageQuery.value = "bsb";
    });

    await waitFor(() => Boolean(container.querySelector(".emptyCircle")));

    const circleComplete = container.querySelector(
      ".emptyCircle"
    ) as HTMLElement | null;
    expect(circleComplete).not.toBeNull();
    expect(circleComplete?.style.background).not.toContain("conic-gradient");
  });

  it("entering a custom translation URL and clicking Import loads the translations", async () => {
    const customTranslation = makeTranslation("CST", "Klingon", 66);
    const responses = {
      ...createDefaultManagerResponseMap(),
      [makeExampleUrl("/api/available_translations.json")]: createResponse({
        translations: [customTranslation],
      }),
      [makeExampleUrl("/api/CST/books.json")]: createResponse({
        translation: customTranslation,
        books: [],
      }),
    };

    const state = await createTestSeedBibleState({ responses });
    const pane = state.panes.panes.value[0] as Pane;
    if (!pane) throw new Error("Expected an initial pane.");
    await state.selector.setOpen(true, pane);

    const { selectorState, bibleDataManager } = {
      selectorState: state.selector,
      bibleDataManager: state.bibleData,
    };

    act(() => {
      render(
        <BibleSelector
          isOpen={true}
          onClose={vi.fn()}
          selectorState={selectorState}
          bibleDataManager={bibleDataManager}
        />,
        container
      );
    });

    // Open the translation modal and expand the custom translation panel
    act(() => {
      selectorState.selectingTranslation.value = true;
      selectorState.showCustomTranslation.value = true;
    });

    await waitFor(() => Boolean(container.querySelector("input.custom-tr-in")));

    const urlInput = container.querySelector(
      "input.custom-tr-in"
    ) as HTMLInputElement;
    expect(urlInput).not.toBeNull();

    act(() => {
      urlInput.value = EXAMPLE_API_ENDPOINT;
      urlInput.dispatchEvent(new Event("change", { bubbles: true }));
    });

    expect(selectorState.inputValue.value).toBe(EXAMPLE_API_ENDPOINT);

    const importButton = Array.from(container.querySelectorAll("button")).find(
      (btn) => btn.textContent?.trim() === "Import"
    ) as HTMLButtonElement | undefined;
    expect(importButton).toBeDefined();

    act(() => {
      importButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    // After import the custom translation should appear in apiTranslations
    await waitFor(() =>
      selectorState.apiTranslations.value.some((group) =>
        group.translations.some((t) => t.id === "CST")
      )
    );

    const allTranslations = selectorState.apiTranslations.value.flatMap(
      (group) => group.translations
    );
    expect(allTranslations.some((t) => t.id === "CST")).toBe(true);
  });
});

describe("BibleSelector sharing translations", () => {
  let container: HTMLDivElement;

  type TestGlobalScope = typeof globalThis & {
    os?: Record<string, unknown>;
    configBot?: { tags: Record<string, unknown> };
  };

  function makeTranslation(
    id: string,
    languageEnglishName: string,
    numberOfBooks = 66
  ): Translation {
    return {
      id,
      name: `${id} Bible`,
      englishName: `${id} Bible`,
      languageEnglishName,
      website: "https://example.com",
      licenseUrl: "https://example.com/license",
      shortName: id,
      language: languageEnglishName.slice(0, 3).toLowerCase(),
      textDirection: "ltr",
      availableFormats: ["json"],
      listOfBooksApiLink: `/api/${id}/books.json`,
      numberOfBooks,
      totalNumberOfChapters: 1189,
      totalNumberOfVerses: 31102,
    };
  }

  let setClipboard: Mock;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);

    setClipboard = vi.fn();
    const scope = globalThis as TestGlobalScope;
    scope.os = { ...(scope.os ?? {}), setClipboard, toast: vi.fn() };
    scope.configBot = { tags: { pattern: "SeedBible" } };
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  async function openTranslationModalWithGroup(
    translationId: string,
    languageEnglishName: string,
    endpointInfoOverride?: {
      endpoint: string;
      isDefault: boolean;
    }
  ) {
    const translation = makeTranslation(translationId, languageEnglishName);
    const { selectorState, bibleDataManager } = await createSelectorFixture();

    if (endpointInfoOverride) {
      vi.spyOn(bibleDataManager, "getTranslationEndpointInfo").mockReturnValue({
        translationId,
        endpoint: endpointInfoOverride.endpoint,
        isDefault: endpointInfoOverride.isDefault,
      });
    }

    act(() => {
      render(
        <BibleSelector
          isOpen={true}
          onClose={vi.fn()}
          selectorState={selectorState}
          bibleDataManager={bibleDataManager}
        />,
        container
      );
    });

    act(() => {
      setAvailableTranslations([translation], bibleDataManager);
      selectorState.showAllLanguages.value = "all";
      selectorState.selectingTranslation.value = true;
      // Setting a query causes the language group to auto-expand
      selectorState.languageQuery.value = translationId.toLowerCase();
    });

    await waitFor(() => Boolean(container.querySelector(".share-btn")));

    return { selectorState, bibleDataManager };
  }

  it("clicking share on a default-endpoint translation copies a URL with just the translation ID", async () => {
    await openTranslationModalWithGroup("AAB", "English");

    const shareButton = container.querySelector(
      ".share-btn"
    ) as HTMLButtonElement | null;
    expect(shareButton).not.toBeNull();

    act(() => {
      shareButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    await waitFor(() => setClipboard.mock.calls.length > 0);

    const copiedUrl = new URL(setClipboard.mock.calls[0]![0] as string);
    expect(copiedUrl.hostname).toBe("ao.bot");
    expect(copiedUrl.searchParams.get("translation")).toBe("AAB");
  });

  it("clicking share on a non-default-endpoint translation copies a URL with the full books.json URL", async () => {
    const customEndpoint = `${EXAMPLE_API_ENDPOINT}/`;
    await openTranslationModalWithGroup("CST", "Klingon", {
      endpoint: customEndpoint,
      isDefault: false,
    });

    const shareButton = container.querySelector(
      ".share-btn"
    ) as HTMLButtonElement | null;
    expect(shareButton).not.toBeNull();

    act(() => {
      shareButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    await waitFor(() => setClipboard.mock.calls.length > 0);

    const copiedUrl = new URL(setClipboard.mock.calls[0]![0] as string);
    expect(copiedUrl.hostname).toBe("ao.bot");
    const translationParam = copiedUrl.searchParams.get("translation")!;
    expect(translationParam).toContain("example.test");
    expect(translationParam).toContain("CST");
    expect(translationParam).toContain("books.json");
  });
});
