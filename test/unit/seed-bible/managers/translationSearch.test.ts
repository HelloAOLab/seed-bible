import { signal } from "@preact/signals";
import type { Translation } from "@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI";
import type { BibleReadingState } from "@packages/seed-bible/seed-bible/managers/BibleReadingManager";
import {
  createTranslationAgentTools,
  formatAvailableTranslationsNote,
  resolveSuggestedTranslations,
  searchTranslationCatalog,
  switchReaderToTranslation,
} from "@packages/seed-bible/seed-bible/managers/translationSearch";

function makeTranslation(
  overrides: Pick<Translation, "id" | "shortName" | "language"> &
    Partial<Translation>
): Translation {
  return {
    name: overrides.englishName ?? overrides.shortName,
    englishName: overrides.shortName,
    website: "https://example.com",
    licenseUrl: "https://example.com/license",
    textDirection: "ltr",
    availableFormats: ["json"],
    listOfBooksApiLink: `/api/${overrides.id}/books.json`,
    numberOfBooks: 66,
    totalNumberOfChapters: 1189,
    totalNumberOfVerses: 31102,
    ...overrides,
  };
}

const FRENCH = [
  makeTranslation({
    id: "fra_jnd",
    shortName: "JND",
    language: "fra",
    languageEnglishName: "French",
    englishName: "J.N. Darby",
  }),
  makeTranslation({
    id: "fra_lsg",
    shortName: "LSG",
    language: "fra",
    languageEnglishName: "French",
    englishName: "Louis Segond",
    name: "Louis Segond",
  }),
  makeTranslation({
    id: "fra_ncl",
    shortName: "NCL",
    language: "fra",
    languageEnglishName: "French",
    englishName: "Néo-Crampon Libre",
  }),
  makeTranslation({
    id: "fra_ost",
    shortName: "OST",
    language: "fra",
    languageEnglishName: "French",
    englishName: "Ostervald",
  }),
];

const CATALOG: Translation[] = [
  ...FRENCH,
  makeTranslation({
    id: "tha_kjv",
    shortName: "KJV",
    language: "tha",
    languageEnglishName: "Thai",
    englishName: "Thai King James",
  }),
  makeTranslation({
    id: "eng_kjav",
    shortName: "KJAV",
    language: "eng",
    languageEnglishName: "English",
    englishName: "King James Version",
  }),
  makeTranslation({
    id: "eng_bsb",
    shortName: "BSB",
    language: "eng",
    languageEnglishName: "English",
    englishName: "Berean Standard Bible",
  }),
  makeTranslation({
    id: "wbt_fra",
    shortName: "WBT",
    language: "fra",
    languageEnglishName: "French",
    englishName: "French WBT",
    numberOfBooks: 27,
  }),
  makeTranslation({
    id: "wbt_eng",
    shortName: "WBT",
    language: "eng",
    languageEnglishName: "English",
    englishName: "English WBT",
  }),
  makeTranslation({
    id: "wbt_spa",
    shortName: "WBT",
    language: "spa",
    languageEnglishName: "Spanish",
    englishName: "Spanish WBT",
  }),
];

describe("searchTranslationCatalog", () => {
  it("finds every translation in a language by its English name", () => {
    const result = searchTranslationCatalog(CATALOG, "French");
    const ids = result.translations.map((hit) => hit.id);
    expect(ids).toEqual(
      expect.arrayContaining(["fra_jnd", "fra_lsg", "fra_ncl", "fra_ost"])
    );
    expect(result.total).toBeGreaterThanOrEqual(4);
    expect(ids).not.toContain("eng_bsb");
  });

  it("treats a UI language code and a Bible-API code as the same language", () => {
    const byUi = searchTranslationCatalog(CATALOG, "fr").translations.map(
      (hit) => hit.id
    );
    const byApi = searchTranslationCatalog(CATALOG, "fra").translations.map(
      (hit) => hit.id
    );
    expect(byUi).toEqual(expect.arrayContaining(["fra_lsg"]));
    expect(byApi).toEqual(expect.arrayContaining(["fra_lsg"]));
  });

  it("returns the catalog's KJV, which is Thai, and not an English Bible we do not have", () => {
    const result = searchTranslationCatalog(CATALOG, "KJV");
    expect(result.translations.map((hit) => hit.id)).toEqual(["tha_kjv"]);
    expect(result.translations[0]?.languageEnglishName).toBe("Thai");
    expect(result.translations.map((hit) => hit.id)).not.toContain("eng_kjav");
  });

  it("keeps a shared short name as separate hits so the agent can see the language", () => {
    const result = searchTranslationCatalog(CATALOG, "WBT");
    expect(result.total).toBe(3);
    expect(result.translations.map((hit) => hit.language).sort()).toEqual([
      "eng",
      "fra",
      "spa",
    ]);
  });

  it("returns nothing for a translation that is not in the catalog", () => {
    expect(searchTranslationCatalog(CATALOG, "NIV")).toEqual({
      query: "NIV",
      total: 0,
      translations: [],
    });
  });

  it("returns nothing for a query too short to mean a name", () => {
    expect(searchTranslationCatalog(CATALOG, "a").total).toBe(0);
    expect(searchTranslationCatalog(CATALOG, "  ").total).toBe(0);
  });

  it("reports how many matches were left off the page", () => {
    const result = searchTranslationCatalog(CATALOG, "French", 2);
    expect(result.translations).toHaveLength(2);
    expect(result.total).toBeGreaterThan(2);
  });

  it("prefers the default translation, then a complete Bible, when scores tie", () => {
    const catalog = [
      makeTranslation({
        id: "eng_aaa",
        shortName: "AAA",
        language: "eng",
        languageEnglishName: "English",
        numberOfBooks: 27,
      }),
      makeTranslation({
        id: "eng_zzz",
        shortName: "ZZZ",
        language: "eng",
        languageEnglishName: "English",
        numberOfBooks: 66,
      }),
      makeTranslation({
        id: "AAB",
        shortName: "AAB",
        language: "eng",
        languageEnglishName: "English",
        numberOfBooks: 66,
      }),
    ];

    expect(
      searchTranslationCatalog(catalog, "English").translations.map(
        (hit) => hit.id
      )
    ).toEqual(["AAB", "eng_zzz", "eng_aaa"]);
  });
});

describe("resolveSuggestedTranslations", () => {
  it("keeps catalog ids and drops ones the app cannot open", () => {
    const { shown, rejected } = resolveSuggestedTranslations(CATALOG, [
      "fra_lsg",
      "NIV",
      "fra_lsg",
    ]);
    expect(shown.map((translation) => translation.id)).toEqual(["fra_lsg"]);
    expect(rejected).toEqual(["NIV"]);
  });

  it("accepts a short name only when one translation uses it", () => {
    const unique = resolveSuggestedTranslations(CATALOG, ["LSG"]);
    expect(unique.shown.map((translation) => translation.id)).toEqual([
      "fra_lsg",
    ]);
    expect(unique.rejected).toEqual([]);

    const shared = resolveSuggestedTranslations(CATALOG, ["WBT"]);
    expect(shared.shown).toEqual([]);
    expect(shared.rejected).toEqual(["WBT"]);
  });
});

describe("formatAvailableTranslationsNote", () => {
  it("lists the reader's language and refuses translations outside that list", () => {
    const note = formatAvailableTranslationsNote(FRENCH, "fr");
    expect(note).toContain("JND (fra_jnd)");
    expect(note).toContain("LSG (fra_lsg)");
    expect(note).toContain("NCL (fra_ncl)");
    expect(note).toContain("OST (fra_ost)");
    expect(note).toContain("Only recommend translations from this list.");
  });

  it("adds the open tab's language when it is not the UI language", () => {
    const note = formatAvailableTranslationsNote(CATALOG, "fr", "eng");
    expect(note).toContain("French");
    expect(note).toContain("the open tab");
    expect(note).toContain("BSB (eng_bsb)");
  });

  it("returns null when the catalog has nothing in that language", () => {
    expect(formatAvailableTranslationsNote(FRENCH, "ja")).toBeNull();
  });
});

describe("switchReaderToTranslation", () => {
  it("stays on the current chapter when the translation includes that book", async () => {
    const translationId = signal("eng_bsb");
    const selectTranslationAndChapter = vi.fn(async () => {
      translationId.value = "fra_lsg";
    });
    const selectTranslation = vi.fn();
    const readingState = {
      translationId,
      bookId: signal("JHN"),
      chapterNumber: signal(3),
      selectTranslation,
      selectTranslationAndChapter,
    } as unknown as BibleReadingState;

    const switched = await switchReaderToTranslation({
      readingState,
      getTranslationBooks: async () =>
        ({
          books: [{ id: "JHN" }],
        }) as never,
      translationId: "fra_lsg",
    });

    expect(switched).toBe(true);
    expect(selectTranslationAndChapter).toHaveBeenCalledWith(
      "fra_lsg",
      "JHN",
      3
    );
    expect(selectTranslation).not.toHaveBeenCalled();
  });

  it("opens the first book when the current book is missing, such as an Old Testament chapter in a New Testament translation", async () => {
    const translationId = signal("eng_bsb");
    const selectTranslation = vi.fn(async () => {
      translationId.value = "fra_nt";
    });
    const selectTranslationAndChapter = vi.fn();
    const readingState = {
      translationId,
      bookId: signal("GEN"),
      chapterNumber: signal(1),
      selectTranslation,
      selectTranslationAndChapter,
    } as unknown as BibleReadingState;

    const switched = await switchReaderToTranslation({
      readingState,
      getTranslationBooks: async () =>
        ({
          books: [{ id: "MAT" }],
        }) as never,
      translationId: "fra_nt",
    });

    expect(switched).toBe(true);
    expect(selectTranslation).toHaveBeenCalledWith("fra_nt");
    expect(selectTranslationAndChapter).not.toHaveBeenCalled();
  });

  it("does not switch when the book list cannot be loaded", async () => {
    const selectTranslation = vi.fn();
    const selectTranslationAndChapter = vi.fn();
    const readingState = {
      translationId: signal("eng_bsb"),
      bookId: signal("JHN"),
      chapterNumber: signal(3),
      selectTranslation,
      selectTranslationAndChapter,
    } as unknown as BibleReadingState;

    const switched = await switchReaderToTranslation({
      readingState,
      getTranslationBooks: async () => {
        throw new Error("offline");
      },
      translationId: "fra_lsg",
    });

    expect(switched).toBe(false);
    expect(selectTranslation).not.toHaveBeenCalled();
    expect(selectTranslationAndChapter).not.toHaveBeenCalled();
  });
});

describe("createTranslationAgentTools", () => {
  it("searchTranslations returns catalog hits and never a translation that is absent", async () => {
    const tools = createTranslationAgentTools({
      loadCatalog: async () => CATALOG,
      postTranslationChoices: () => {
        throw new Error("search should not post a card");
      },
    });
    const search = tools.find((tool) => tool.name === "searchTranslations")!;

    const result = (await search.function({ query: "French" })) as {
      translations: { id: string }[];
    };
    expect(result.translations.map((hit) => hit.id)).toEqual(
      expect.arrayContaining(["fra_lsg"])
    );
    expect(result.translations.map((hit) => hit.id)).not.toContain("NIV");
  });

  it("suggestTranslations posts only catalog translations as choice buttons", async () => {
    const posted: { id: string; label: string }[][] = [];
    const tools = createTranslationAgentTools({
      loadCatalog: async () => CATALOG,
      postTranslationChoices: (choices) => {
        posted.push(choices);
      },
    });
    const suggest = tools.find((tool) => tool.name === "suggestTranslations")!;

    const result = (await suggest.function({
      translationIds: ["fra_lsg", "NIV", "LSG"],
    })) as { shown: { id: string }[]; rejected: string[] };

    expect(posted).toEqual([[{ id: "fra_lsg", label: "LSG (Louis Segond)" }]]);
    expect(result.shown).toEqual([
      { id: "fra_lsg", label: "LSG (Louis Segond)" },
    ]);
    expect(result.rejected).toEqual(["NIV"]);
  });

  it("suggestTranslations does not post a card when nothing matched", async () => {
    const post = vi.fn();
    const tools = createTranslationAgentTools({
      loadCatalog: async () => CATALOG,
      postTranslationChoices: post,
    });
    const suggest = tools.find((tool) => tool.name === "suggestTranslations")!;

    const result = (await suggest.function({
      translationIds: ["NIV"],
    })) as { shown: unknown[]; error: string };

    expect(post).not.toHaveBeenCalled();
    expect(result.shown).toEqual([]);
    expect(result.error).toMatch(/searchTranslations/);
  });
});
