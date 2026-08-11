import type { Translation } from "@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI";
import {
  DEFAULT_POPULAR_LANGUAGES,
  filterTranslationGroups,
  groupTranslationsByLanguage,
  translationLanguageLabel,
} from "@packages/seed-bible/seed-bible/managers/translationGrouping";

function translation(overrides: Partial<Translation> & { id: string }) {
  return {
    name: overrides.id,
    englishName: overrides.id,
    shortName: overrides.id.toUpperCase(),
    language: "eng",
    languageEnglishName: "English",
    languageName: "English",
    numberOfBooks: 66,
    textDirection: "ltr",
    website: "",
    licenseUrl: "",
    availableFormats: ["json"],
    listOfBooksApiLink: "",
    ...overrides,
  } as Translation;
}

const KJV = translation({ id: "eng_kjv", name: "King James Version" });
const BSB = translation({ id: "eng_bsb", name: "Berean Standard Bible" });
const RVR = translation({
  id: "spa_rvr",
  name: "Reina Valera",
  language: "spa",
  languageEnglishName: "Spanish",
  languageName: "Español",
});
const PARTIAL = translation({
  id: "swh_partial",
  name: "Partial Swahili",
  language: "swh",
  languageEnglishName: "Swahili",
  languageName: "Kiswahili",
  numberOfBooks: 27,
});

describe("translationLanguageLabel", () => {
  it("prefers the English name, then the native name, then the code", () => {
    expect(translationLanguageLabel(KJV)).toBe("English");
    expect(
      translationLanguageLabel(
        translation({
          id: "x",
          languageEnglishName: "",
          languageName: "Deutsch",
        })
      )
    ).toBe("Deutsch");
    expect(
      translationLanguageLabel(
        translation({
          id: "x",
          language: "zzz",
          languageEnglishName: "",
          languageName: "",
        })
      )
    ).toBe("zzz");
  });
});

describe("groupTranslationsByLanguage", () => {
  it("groups by language code, keeping first-seen order", () => {
    const groups = groupTranslationsByLanguage([KJV, RVR, BSB]);

    expect(groups.map((group) => group.language)).toEqual(["eng", "spa"]);
    expect(groups[0]!.translations.map((entry) => entry.id)).toEqual([
      "eng_kjv",
      "eng_bsb",
    ]);
  });

  it("drops duplicate translation ids", () => {
    const groups = groupTranslationsByLanguage([KJV, KJV]);

    expect(groups[0]!.translations).toHaveLength(1);
  });

  it("carries the native and English language names onto the group", () => {
    const groups = groupTranslationsByLanguage([RVR]);

    expect(groups[0]).toMatchObject({
      language: "spa",
      languageName: "Español",
      languageEnglishName: "Spanish",
    });
  });
});

describe("filterTranslationGroups", () => {
  const groups = groupTranslationsByLanguage([KJV, BSB, RVR, PARTIAL]);

  const filterResult = (
    overrides: Partial<Parameters<typeof filterTranslationGroups>[0]> = {}
  ) =>
    filterTranslationGroups({
      groups,
      query: "",
      viewMode: "all",
      limit: 50,
      ...overrides,
    });

  const filter = (
    overrides: Partial<Parameters<typeof filterTranslationGroups>[0]> = {}
  ) => filterResult(overrides).groups;

  it("returns every language in 'all' mode", () => {
    expect(filter().map((group) => group.language)).toEqual([
      "eng",
      "spa",
      "swh",
    ]);
  });

  it("hides partial translations in 'complete' mode", () => {
    const result = filter({ viewMode: "complete" });

    expect(result.map((group) => group.language)).toEqual(["eng", "spa"]);
  });

  it("keeps the chosen translation visible in 'complete' mode even if partial", () => {
    const result = filter({
      viewMode: "complete",
      selectedTranslation: PARTIAL,
    });

    expect(result.map((group) => group.language)).toContain("swh");
  });

  it("keeps only popular languages in 'popular' mode", () => {
    const result = filter({ viewMode: "popular" });

    expect(result.map((group) => group.language)).toEqual(["eng", "spa"]);
    expect(DEFAULT_POPULAR_LANGUAGES).toContain("spa");
  });

  it("matches a query against the language name", () => {
    expect(filter({ query: "spanish" }).map((group) => group.language)).toEqual(
      ["spa"]
    );
    expect(filter({ query: "español" }).map((group) => group.language)).toEqual(
      ["spa"]
    );
  });

  it("matches a query against a translation's name and abbreviation", () => {
    const byName = filter({ query: "berean" });
    expect(byName).toHaveLength(1);
    expect(byName[0]!.translations.map((entry) => entry.id)).toEqual([
      "eng_bsb",
    ]);

    const byShortName = filter({ query: "eng_kjv" });
    expect(byShortName[0]!.translations.map((entry) => entry.id)).toEqual([
      "eng_kjv",
    ]);
  });

  it("narrows a matched language group to just the matching translations", () => {
    const result = filter({ query: "king james" });

    expect(result[0]!.translations.map((entry) => entry.id)).toEqual([
      "eng_kjv",
    ]);
  });

  it("returns nothing when the query matches neither language nor translation", () => {
    expect(filter({ query: "klingon" })).toEqual([]);
  });

  it("sorts the chosen translation's language first", () => {
    const result = filter({ selectedTranslation: RVR });

    expect(result[0]!.language).toBe("spa");
  });

  it("applies the language-group limit", () => {
    expect(filter({ limit: 1 })).toHaveLength(1);
  });

  it("counts what the filter matched, not the whole catalog", () => {
    // "complete" mode drops the partial Swahili translation, so paging must be
    // judged against 2 languages rather than the catalog's 3. Comparing against
    // the catalog total is what left a dead "show more" control on screen.
    const result = filterResult({ viewMode: "complete", limit: 50 });

    expect(groups).toHaveLength(3);
    expect(result.totalMatching).toBe(2);
    expect(result.groups).toHaveLength(2);
  });

  it("reports a total that a caller can page through to exhaustion", () => {
    const first = filterResult({ limit: 2 });
    expect(first.groups).toHaveLength(2);
    expect(first.totalMatching).toBe(3);

    // Paging past the total yields everything and nothing more to ask for.
    const second = filterResult({ limit: 4 });
    expect(second.groups).toHaveLength(3);
    expect(second.totalMatching).toBe(3);
  });

  it("counts only matches when searching", () => {
    const result = filterResult({ query: "berean" });

    expect(result.totalMatching).toBe(1);
  });

  it("does not mutate the groups it is given", () => {
    const snapshot = JSON.stringify(groups);
    filter({ viewMode: "complete", query: "berean" });

    expect(JSON.stringify(groups)).toBe(snapshot);
  });
});
