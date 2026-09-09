import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { signal } from "@preact/signals";
import {
  APOLOGIST_DEFAULT_BIBLE,
  dismissApologistBibleFallbackWarning,
  FALLBACK_DISMISS_STORAGE_KEY,
  mapSeedTranslationToApologist,
  pauseChatWhileModalOpen,
  resetApologistBibleFallbackWarnCacheForTests,
  resolveApologistBible,
  resolveApologistLanguage,
  shouldWarnApologistBibleFallback,
  SHOW_APOLOGIST_BIBLE_FALLBACK_WARNING,
} from "@packages/apologist-extension/ext_Apologist/main/apologistBible";
import type { Translation } from "@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI";

function translation(
  partial: Pick<Translation, "id" | "language" | "shortName">
): Translation {
  return {
    id: partial.id,
    language: partial.language,
    shortName: partial.shortName,
    name: partial.shortName,
    englishName: partial.shortName,
    website: "",
    licenseUrl: "",
    textDirection: "ltr",
    availableFormats: ["json"],
    listOfBooksApiLink: "",
    numberOfBooks: 66,
    totalNumberOfChapters: 1189,
    totalNumberOfVerses: 31102,
  };
}

describe("apologistBible", () => {
  beforeEach(() => {
    resetApologistBibleFallbackWarnCacheForTests();
    localStorage.removeItem(FALLBACK_DISMISS_STORAGE_KEY);
  });

  afterEach(() => {
    resetApologistBibleFallbackWarnCacheForTests();
    localStorage.removeItem(FALLBACK_DISMISS_STORAGE_KEY);
  });

  describe("mapSeedTranslationToApologist", () => {
    it("maps known Seed ids to Apologist codes", () => {
      expect(mapSeedTranslationToApologist("BSB")).toBe("bsb");
      expect(mapSeedTranslationToApologist("KJAV")).toBe("kjv");
      expect(mapSeedTranslationToApologist("bsb")).toBe("bsb");
    });

    it("treats empty, blank, and null ids as unsupported", () => {
      expect(mapSeedTranslationToApologist(null)).toBeNull();
      expect(mapSeedTranslationToApologist(undefined)).toBeNull();
      expect(mapSeedTranslationToApologist("")).toBeNull();
      expect(mapSeedTranslationToApologist("   ")).toBeNull();
    });

    it("accepts lowercase Apologist codes passed as Seed ids", () => {
      expect(mapSeedTranslationToApologist("esv")).toBe("esv");
      expect(mapSeedTranslationToApologist("NASB1995")).toBe("nasb1995");
    });

    it("returns null for Seed ids with no Apologist mapping", () => {
      expect(mapSeedTranslationToApologist("AAB")).toBeNull();
      expect(mapSeedTranslationToApologist("hin_cvb")).toBeNull();
    });
  });

  describe("resolveApologistBible", () => {
    it("uses a direct mapping without fallback", () => {
      const result = resolveApologistBible({ seedTranslationId: "BSB" });
      expect(result).toEqual({
        bible: "bsb",
        requestedSeedId: "BSB",
        usedFallback: false,
        reason: "mapped",
      });
    });

    it("trims whitespace around Seed ids before mapping", () => {
      expect(resolveApologistBible({ seedTranslationId: "  BSB  " })).toEqual({
        bible: "bsb",
        requestedSeedId: "BSB",
        usedFallback: false,
        reason: "mapped",
      });
    });

    it("falls back to nearest same-language supported translation", () => {
      const catalog = [
        translation({ id: "AAB", language: "eng", shortName: "AAB" }),
        translation({ id: "BSB", language: "eng", shortName: "BSB" }),
      ];
      const result = resolveApologistBible({
        seedTranslationId: "AAB",
        catalog,
      });
      expect(result.bible).toBe("bsb");
      expect(result.usedFallback).toBe(true);
      expect(result.reason).toBe("nearest-same-language");
    });

    it("matches catalog entries case-insensitively for nearest-language lookup", () => {
      const catalog = [
        translation({ id: "aab", language: "eng", shortName: "AAB" }),
        translation({ id: "BSB", language: "eng", shortName: "BSB" }),
      ];
      const result = resolveApologistBible({
        seedTranslationId: "AAB",
        catalog,
      });
      expect(result.reason).toBe("nearest-same-language");
      expect(result.bible).toBe("bsb");
    });

    it("falls back to English BSB when no same-language support exists", () => {
      const catalog = [
        translation({ id: "hin_cvb", language: "hin", shortName: "HCVB" }),
      ];
      const result = resolveApologistBible({
        seedTranslationId: "hin_cvb",
        catalog,
      });
      expect(result).toMatchObject({
        bible: APOLOGIST_DEFAULT_BIBLE,
        usedFallback: true,
        reason: "default-english",
      });
    });

    it("falls back to English BSB when the catalog is missing or empty", () => {
      expect(
        resolveApologistBible({
          seedTranslationId: "AAB",
          catalog: null,
        })
      ).toMatchObject({
        bible: APOLOGIST_DEFAULT_BIBLE,
        usedFallback: true,
        reason: "default-english",
      });
      expect(
        resolveApologistBible({
          seedTranslationId: "AAB",
          catalog: [],
        })
      ).toMatchObject({
        reason: "default-english",
      });
    });

    it("falls back to English BSB when no Seed id is provided", () => {
      expect(resolveApologistBible({ seedTranslationId: null })).toEqual({
        bible: APOLOGIST_DEFAULT_BIBLE,
        requestedSeedId: null,
        usedFallback: true,
        reason: "default-english",
      });
      expect(resolveApologistBible({ seedTranslationId: "   " })).toEqual({
        bible: APOLOGIST_DEFAULT_BIBLE,
        requestedSeedId: null,
        usedFallback: true,
        reason: "default-english",
      });
    });

    it("does not pick a supported translation from a different language", () => {
      const catalog = [
        translation({ id: "hin_cvb", language: "hin", shortName: "HCVB" }),
        translation({ id: "BSB", language: "eng", shortName: "BSB" }),
      ];
      const result = resolveApologistBible({
        seedTranslationId: "hin_cvb",
        catalog,
      });
      expect(result.reason).toBe("default-english");
      expect(result.bible).toBe("bsb");
    });
  });

  describe("shouldWarnApologistBibleFallback", () => {
    it("is enabled by the removable warning gate", () => {
      expect(SHOW_APOLOGIST_BIBLE_FALLBACK_WARNING).toBe(true);
    });

    it("warns once per requested→fallback pair", () => {
      const resolution = resolveApologistBible({
        seedTranslationId: "hin_cvb",
        catalog: [
          translation({ id: "hin_cvb", language: "hin", shortName: "HCVB" }),
        ],
      });
      expect(shouldWarnApologistBibleFallback(resolution)).toBe(true);
      expect(shouldWarnApologistBibleFallback(resolution)).toBe(false);
    });

    it("warns separately for distinct fallback pairs", () => {
      const hindi = resolveApologistBible({
        seedTranslationId: "hin_cvb",
        catalog: [
          translation({ id: "hin_cvb", language: "hin", shortName: "HCVB" }),
        ],
      });
      const aab = resolveApologistBible({
        seedTranslationId: "AAB",
        catalog: [
          translation({ id: "AAB", language: "eng", shortName: "AAB" }),
          translation({ id: "BSB", language: "eng", shortName: "BSB" }),
        ],
      });
      expect(shouldWarnApologistBibleFallback(hindi)).toBe(true);
      expect(shouldWarnApologistBibleFallback(aab)).toBe(true);
    });

    it("does not warn when the mapping was direct", () => {
      const resolution = resolveApologistBible({ seedTranslationId: "BSB" });
      expect(shouldWarnApologistBibleFallback(resolution)).toBe(false);
    });

    it("does not warn after a permanent dismiss", () => {
      dismissApologistBibleFallbackWarning();
      const resolution = resolveApologistBible({
        seedTranslationId: "hin_cvb",
        catalog: [
          translation({ id: "hin_cvb", language: "hin", shortName: "HCVB" }),
        ],
      });
      expect(shouldWarnApologistBibleFallback(resolution)).toBe(false);
    });
  });

  describe("resolveApologistLanguage", () => {
    it("uses the primary subtag of the UI locale", () => {
      expect(resolveApologistLanguage("gu")).toBe("gu");
      expect(resolveApologistLanguage("hi")).toBe("hi");
      expect(resolveApologistLanguage("zh-TW")).toBe("zh");
      expect(resolveApologistLanguage("en_US")).toBe("en");
    });

    it("falls back to English for blank values", () => {
      expect(resolveApologistLanguage(null)).toBe("en");
      expect(resolveApologistLanguage("")).toBe("en");
      expect(resolveApologistLanguage("   ")).toBe("en");
    });
  });

  describe("pauseChatWhileModalOpen", () => {
    it("closes chat immediately when it was open, then reopens when the modal closes", async () => {
      const modalOpen = signal(true);
      const closeChat = vi.fn();
      const openChat = vi.fn();

      const closed = pauseChatWhileModalOpen({
        wasChatOpen: true,
        closeChat,
        openChat,
        isModalOpen: () => modalOpen.value,
      });

      expect(closeChat).toHaveBeenCalledTimes(1);
      expect(openChat).not.toHaveBeenCalled();

      modalOpen.value = false;
      await closed;

      expect(openChat).toHaveBeenCalledTimes(1);
    });

    it("does not open chat on modal close when chat was already closed", async () => {
      const modalOpen = signal(true);
      const closeChat = vi.fn();
      const openChat = vi.fn();

      const closed = pauseChatWhileModalOpen({
        wasChatOpen: false,
        closeChat,
        openChat,
        isModalOpen: () => modalOpen.value,
      });

      expect(closeChat).not.toHaveBeenCalled();
      modalOpen.value = false;
      await closed;
      expect(openChat).not.toHaveBeenCalled();
    });

    it("reopens chat only once even if the modal signal flaps after settle", async () => {
      const modalOpen = signal(true);
      const closeChat = vi.fn();
      const openChat = vi.fn();

      const closed = pauseChatWhileModalOpen({
        wasChatOpen: true,
        closeChat,
        openChat,
        isModalOpen: () => modalOpen.value,
      });

      modalOpen.value = false;
      await closed;
      modalOpen.value = true;
      modalOpen.value = false;

      expect(closeChat).toHaveBeenCalledTimes(1);
      expect(openChat).toHaveBeenCalledTimes(1);
    });

    it("reopens chat if the modal is already gone when watching starts", async () => {
      const closeChat = vi.fn();
      const openChat = vi.fn();

      await pauseChatWhileModalOpen({
        wasChatOpen: true,
        closeChat,
        openChat,
        isModalOpen: () => false,
      });

      expect(closeChat).toHaveBeenCalledTimes(1);
      expect(openChat).toHaveBeenCalledTimes(1);
    });
  });
});
