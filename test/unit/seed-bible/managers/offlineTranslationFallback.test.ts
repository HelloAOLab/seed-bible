import { findOfflineTranslationFallbacks } from "@packages/seed-bible/seed-bible/managers/offlineTranslationFallback";
import type { Translation } from "@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI";

function translation(id: string, language: string, name = id): Translation {
  return {
    id,
    name,
    englishName: name,
    website: "https://example.com",
    licenseUrl: "https://example.com/license",
    shortName: id,
    language,
    textDirection: "ltr",
    availableFormats: ["json"],
    listOfBooksApiLink: `/api/${id}/books.json`,
    numberOfBooks: 66,
    totalNumberOfChapters: 1189,
    totalNumberOfVerses: 31102,
  };
}

function downloaded(id: string, language: string, downloadedAt = 1) {
  const item = translation(id, language);
  return { translation: item, downloadedAt };
}

function idsOf(
  params: Parameters<typeof findOfflineTranslationFallbacks>[0]
): string[] {
  return findOfflineTranslationFallbacks(params).map((item) => item.id);
}

describe("findOfflineTranslationFallbacks", () => {
  it("returns nothing when nothing is downloaded", () => {
    expect(
      idsOf({
        currentTranslationId: "BSB",
        currentTranslationLanguage: "eng",
        uiLanguage: "en",
        downloaded: [],
      })
    ).toEqual([]);
  });

  it("returns nothing when the only download is the translation that failed", () => {
    expect(
      idsOf({
        currentTranslationId: "BSB",
        currentTranslationLanguage: "eng",
        uiLanguage: "en",
        downloaded: [downloaded("BSB", "eng")],
      })
    ).toEqual([]);
  });

  it("offers a different downloaded translation in the same language", () => {
    expect(
      idsOf({
        currentTranslationId: "BSB",
        currentTranslationLanguage: "eng",
        uiLanguage: "en",
        downloaded: [downloaded("NIV", "eng")],
      })
    ).toEqual(["NIV"]);
  });

  it("does not offer a download in a different language than the one requested", () => {
    expect(
      idsOf({
        currentTranslationId: "BSB",
        currentTranslationLanguage: "eng",
        uiLanguage: "es",
        downloaded: [downloaded("spa_onbv", "spa")],
      })
    ).toEqual([]);
  });

  it("does not fall back to the UI language when the requested language is known", () => {
    // Spanish is downloaded and the UI is Spanish, but the failed chapter is
    // English — offering Spanish would switch the reader into another language.
    expect(
      idsOf({
        currentTranslationId: "BSB",
        currentTranslationLanguage: "eng",
        uiLanguage: "es",
        downloaded: [downloaded("spa_onbv", "spa")],
      })
    ).toEqual([]);
  });

  it("treats Bible-API language aliases as the same language", () => {
    expect(
      idsOf({
        currentTranslationId: "ARBNAV",
        currentTranslationLanguage: "arb",
        uiLanguage: "en",
        downloaded: [downloaded("ara_svd", "ara")],
      })
    ).toEqual(["ara_svd"]);
  });

  it("uses the UI language when the requested translation's language is unknown", () => {
    expect(
      idsOf({
        currentTranslationId: "UNKNOWN",
        currentTranslationLanguage: null,
        uiLanguage: "es",
        downloaded: [downloaded("spa_onbv", "spa"), downloaded("AAB", "eng")],
      })
    ).toEqual(["spa_onbv"]);
  });

  it("does not offer a download that does not match the UI language when the requested language is unknown", () => {
    expect(
      idsOf({
        currentTranslationId: "UNKNOWN",
        currentTranslationLanguage: "",
        uiLanguage: "es",
        downloaded: [downloaded("AAB", "eng")],
      })
    ).toEqual([]);
  });

  it("returns every same-language download, with the default translation first", () => {
    expect(
      idsOf({
        currentTranslationId: "BSB",
        currentTranslationLanguage: "eng",
        uiLanguage: "en",
        downloaded: [
          downloaded("NIV", "eng", 200),
          downloaded("AAB", "eng", 1),
        ],
      })
    ).toEqual(["AAB", "NIV"]);
  });

  it("orders by most recently saved when the default is not among them", () => {
    expect(
      idsOf({
        currentTranslationId: "BSB",
        currentTranslationLanguage: "eng",
        uiLanguage: "en",
        downloaded: [
          downloaded("NIV", "eng", 10),
          downloaded("KJV", "eng", 50),
        ],
      })
    ).toEqual(["KJV", "NIV"]);
  });

  it("matches a regional UI locale to its primary language", () => {
    expect(
      idsOf({
        currentTranslationId: "UNKNOWN",
        currentTranslationLanguage: null,
        uiLanguage: "es-MX",
        downloaded: [downloaded("spa_onbv", "spa")],
      })
    ).toEqual(["spa_onbv"]);
  });
});
