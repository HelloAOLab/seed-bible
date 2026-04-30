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
  makeExampleUrl,
  EXAMPLE_API_ENDPOINT,
  translations as mockTranslations,
  bsbBooks,
  nivBooks,
  makeChapter,
} from "../managers/testUtils/mockBibleApiData";

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
          onClose={jest.fn()}
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
      Object.values(selectorState.apiTranslations.value).some((group) =>
        Object.values(group).some((t) => t.id === "CST")
      )
    );

    const allTranslations = Object.values(
      selectorState.apiTranslations.value
    ).flatMap((group) => Object.values(group));
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

  let setClipboard: jest.Mock;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);

    setClipboard = jest.fn();
    const scope = globalThis as TestGlobalScope;
    scope.os = { ...(scope.os ?? {}), setClipboard, toast: jest.fn() };
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
      jest
        .spyOn(bibleDataManager, "getTranslationEndpointInfo")
        .mockReturnValue({
          translationId,
          endpoint: endpointInfoOverride.endpoint,
          isDefault: endpointInfoOverride.isDefault,
        });
    }

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
        [languageEnglishName.toLowerCase()]: {
          [translationId.toLowerCase()]: translation,
        },
      };
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

    const copiedUrl = new URL(setClipboard.mock.calls[0][0] as string);
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

    const copiedUrl = new URL(setClipboard.mock.calls[0][0] as string);
    expect(copiedUrl.hostname).toBe("ao.bot");
    const translationParam = copiedUrl.searchParams.get("translation")!;
    expect(translationParam).toContain("example.test");
    expect(translationParam).toContain("CST");
    expect(translationParam).toContain("books.json");
  });
});
