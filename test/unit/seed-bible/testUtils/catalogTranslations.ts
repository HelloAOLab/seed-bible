import type { Translation } from "@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI";

/**
 * Real entries from https://vmfnri.helloao.org/api/available_translations.json
 * (the app's default endpoint, a superset of bible.helloao.org that adds e.g.
 * NASB95 and AAB), trimmed to the fields AI chat reads. Tests should use these
 * rather than invented ids: the real catalog has surprises (the English KJV's
 * short name is `KJAV`, while `KJV` belongs to a Thai translation) that made-up
 * fixtures hide.
 */
export type CatalogTranslation = Pick<
  Translation,
  "id" | "name" | "englishName" | "shortName" | "language"
>;

export const BSB: CatalogTranslation = {
  id: "BSB",
  name: "Berean Standard Bible",
  englishName: "Berean Standard Bible",
  shortName: "BSB",
  language: "eng",
};

export const ENG_KJV: CatalogTranslation = {
  id: "eng_kjv",
  name: "King James (Authorized) Version",
  englishName: "King James Version",
  shortName: "KJAV",
  language: "eng",
};

export const ENG_KJA: CatalogTranslation = {
  id: "eng_kja",
  name: "King James Version + Apocrypha",
  englishName: "King James Version + Apocrypha",
  shortName: "KJVA",
  language: "eng",
};

export const ENG_CPB: CatalogTranslation = {
  id: "eng_cpb",
  name: "KJV Cambridge Paragraph Bible",
  englishName: "KJV Cambridge Paragraph",
  shortName: "KJVCP",
  language: "eng",
};

export const ENGWEBP: CatalogTranslation = {
  id: "ENGWEBP",
  name: "World English Bible",
  englishName: "World English Bible",
  shortName: "WEB",
  language: "eng",
};

export const ENG_WEB: CatalogTranslation = {
  id: "eng_web",
  name: "World English Bible Classic",
  englishName: "World English Bible Classic",
  shortName: "WEBC",
  language: "eng",
};

export const ENG_WEBU: CatalogTranslation = {
  id: "eng_webu",
  name: "World English Bible Updated",
  englishName: "World English Bible Updated",
  shortName: "WEBU",
  language: "eng",
};

export const ENG_NET: CatalogTranslation = {
  id: "eng_net",
  name: "NET Bible",
  englishName: "NET Bible",
  shortName: "NETB",
  language: "eng",
};

export const NASB95: CatalogTranslation = {
  id: "NASB95",
  name: "New American Standard Bible (1995)",
  englishName: "English",
  shortName: "NASB95",
  language: "eng",
};

export const NASB2020: CatalogTranslation = {
  id: "NASB2020",
  name: "New American Standard Bible (2020)",
  englishName: "English",
  shortName: "NASB2020",
  language: "eng",
};

export const AAB: CatalogTranslation = {
  id: "AAB",
  name: "Accessible Ancients Bible",
  englishName: "Accessible Ancients Bible",
  shortName: "AAB",
  language: "eng",
};

export const FRA_LSG: CatalogTranslation = {
  id: "fra_lsg",
  name: "Louis Segond 1910",
  englishName: "French Louis Segond 1910 Bible",
  shortName: "LSG",
  language: "fra",
};

export const HIN_CVB: CatalogTranslation = {
  id: "hin_cvb",
  name: "Biblica® हिंदी समकालीन संस्करण-स्वतंत्र उपलब्धि",
  englishName: "Hindi Contemporary Version Bible",
  shortName: "CVB",
  language: "hin",
};

export const GUJ_IRV: CatalogTranslation = {
  id: "guj_irv",
  name: "ઇન્ડિયન રીવાઇઝ્ડ વર્ઝન ગુજરાતી - 2019",
  englishName: "Gujarati Indian Revised Version Bible",
  shortName: "IRV",
  language: "guj",
};
