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
import { createDefaultManagerResponseMap } from "../managers/testUtils/mockBibleApiData";

jest.mock("seed-bible.i18n.I18nManager", () => ({
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
  selectChapter: jest.SpyInstance;
  setSearch: jest.SpyInstance;
};

async function createSelectorFixture(
  options: { open?: boolean } = {}
): Promise<SelectorFixture> {
  const state = await createTestSeedBibleState({
    responses: createDefaultManagerResponseMap(),
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
    selectChapter: jest.spyOn(state.selector, "selectChapter"),
    setSearch: jest.spyOn(state.selector, "setSearch"),
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
          onClose={jest.fn()}
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
          onClose={jest.fn()}
          selectorState={selectorState}
          bibleDataManager={bibleDataManager}
        />,
        container
      );
    });

    expect(container.querySelector(".sb-selector-overlay.open")).not.toBeNull();
  });

  it("displays all old and new testament books", async () => {
    const { selectorState, bibleDataManager } = await createSelectorFixture();

    act(() => {
      render(
        <BibleSelector
          isOpen={true}
          onClose={jest.fn()}
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
          onClose={jest.fn()}
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
          onClose={jest.fn()}
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

  it("changing the search input sets the search", async () => {
    const { selectorState, setSearch, bibleDataManager } =
      await createSelectorFixture();

    act(() => {
      render(
        <BibleSelector
          isOpen={true}
          onClose={jest.fn()}
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
          onClose={jest.fn()}
          selectorState={selectorState}
          bibleDataManager={bibleDataManager}
        />,
        container
      );
    });

    act(() => {
      selectorState.apiTranslations.value = {
        english: {
          aab: makeTranslation("AAB", "English"),
          niv: makeTranslation("NIV", "English"),
        },
        spanish: {
          rvr: makeTranslation("RVR", "Spanish"),
        },
      };
      selectorState.selectingTranslation.value = true;
    });

    await waitFor(() => Boolean(container.querySelector(".language-list")));

    const items = Array.from(container.querySelectorAll(".item"));
    const labels = items.map((el) => el.textContent?.trim().toLowerCase());
    expect(labels.some((l) => l?.includes("english"))).toBe(true);
    expect(labels.some((l) => l?.includes("spanish"))).toBe(true);
  });

  it("displays only complete translations when in complete mode", async () => {
    const { selectorState, bibleDataManager } = await createSelectorFixture();

    act(() => {
      render(
        <BibleSelector
          isOpen={true}
          onClose={jest.fn()}
          selectorState={selectorState}
          bibleDataManager={bibleDataManager}
        />,
        container
      );
    });

    act(() => {
      selectorState.apiTranslations.value = {
        // english has one complete and one incomplete translation
        english: {
          aab: makeTranslation("AAB", "English", 66),
          inc: makeTranslation("INC", "English", 27),
        },
        // french has only incomplete translations – the whole group should be hidden
        french: {
          fls: makeTranslation("FLS", "French", 27),
        },
      };
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
          onClose={jest.fn()}
          selectorState={selectorState}
          bibleDataManager={bibleDataManager}
        />,
        container
      );
    });

    act(() => {
      selectorState.apiTranslations.value = {
        english: {
          aab: makeTranslation("AAB", "English", 66),
        },
        // french is not in the popular list and is incomplete
        french: {
          fls: makeTranslation("FLS", "French", 27),
        },
        // klingon is not in the popular list
        klingon: {
          klg: makeTranslation("KLG", "Klingon", 10),
        },
      };
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
          onClose={jest.fn()}
          selectorState={selectorState}
          bibleDataManager={bibleDataManager}
        />,
        container
      );
    });

    act(() => {
      selectorState.apiTranslations.value = {
        // english is in the default popular list
        english: {
          aab: makeTranslation("AAB", "English", 66),
        },
        // klingon is not a popular language
        klingon: {
          klg: makeTranslation("KLG", "Klingon", 10),
        },
      };
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
});
