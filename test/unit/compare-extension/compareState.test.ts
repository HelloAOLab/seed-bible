import { signal } from "@preact/signals";
import type {
  LoginManager,
  UserProfile,
} from "@packages/seed-bible/seed-bible/managers/LoginManager";
import type {
  BibleReadingState,
  BibleSelectedVerse,
} from "@packages/seed-bible/seed-bible/managers/BibleReadingManager";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import type {
  ChapterVerse,
  Translation,
  TranslationBookChapter,
} from "@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI";
import {
  addId,
  chapterCacheKey,
  COMPARE_TRANSLATIONS_KEY,
  createCompareState,
  defaultSelectionForLanguage,
  formatSnapshotReference,
  formatVerseNumberRanges,
  parseCompareTranslationIds,
  removeId,
  reorderIds,
  resolveCompareOrder,
  selectedVersesForChapter,
  snapshotSelection,
  versesFromChapter,
} from "@packages/compare-extension/ext_Compare/compareState";

/**
 * Minimal LoginManager stub, mirroring the one in ProfileConfigSync.test.ts —
 * including the real `updateProfile` merge so the profile/local branching in
 * `saveProfileConfigValue` is exercised rather than mocked away.
 */
function createTestLogin(initial?: {
  userId?: string | null;
  profile?: UserProfile | null;
  localConfig?: Record<string, unknown>;
  isProfileLoading?: boolean;
}): LoginManager {
  const userId = signal<string | null>(initial?.userId ?? null);
  const profile = signal<UserProfile | null>(initial?.profile ?? null);
  const localConfig = signal<Record<string, unknown>>(
    initial?.localConfig ?? {}
  );
  const isProfileLoading = signal(initial?.isProfileLoading ?? false);
  const updateProfile = (newData: Partial<UserProfile>) => {
    profile.value = {
      ...(profile.value ?? { name: "" }),
      ...newData,
    } as UserProfile;
  };
  return {
    userId,
    profile,
    localConfig,
    isProfileLoading,
    profilePromise: null,
    updateProfile,
  } as unknown as LoginManager;
}

function verse(number: number, text: string): ChapterVerse {
  return { type: "verse", number, content: [text] };
}

function selectedVerse(
  bookId: string,
  chapterNumber: number,
  number: number
): BibleSelectedVerse {
  return {
    bookId,
    chapterNumber,
    verse: verse(number, `verse ${number}`),
    translationId: "eng_kjv",
  };
}

function chapterWith(verses: ChapterVerse[]): TranslationBookChapter {
  return {
    chapter: { number: 1, content: verses, footnotes: [] },
  } as unknown as TranslationBookChapter;
}

function createTestContext(options?: {
  login?: LoginManager;
  availableTranslations?: unknown[];
  getTranslationBookChapter?: (
    translationId: string,
    book: string,
    chapter: number | string
  ) => Promise<TranslationBookChapter>;
}): { context: SeedBibleState; login: LoginManager } {
  const login = options?.login ?? createTestLogin();
  const context = {
    login,
    bibleData: {
      availableTranslations: signal(options?.availableTranslations ?? []),
      getTranslationBookChapter:
        options?.getTranslationBookChapter ??
        (() => Promise.resolve(chapterWith([]))),
    },
  } as unknown as SeedBibleState;
  return { context, login };
}

function translation(
  id: string,
  language: string,
  shortName: string = id
): Translation {
  return { id, language, shortName } as unknown as Translation;
}

const flushPromises = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

describe("snapshotSelection", () => {
  it("groups a single chapter's verses in ascending order", () => {
    const snapshot = snapshotSelection([
      selectedVerse("JHN", 1, 3),
      selectedVerse("JHN", 1, 1),
      selectedVerse("JHN", 1, 2),
    ]);

    expect(snapshot.groups).toEqual([
      { bookId: "JHN", chapterNumber: 1, verseNumbers: [1, 2, 3] },
    ]);
  });

  it("splits a selection that spans two chapters", () => {
    const snapshot = snapshotSelection([
      selectedVerse("JHN", 1, 51),
      selectedVerse("JHN", 2, 1),
    ]);

    expect(snapshot.groups).toEqual([
      { bookId: "JHN", chapterNumber: 1, verseNumbers: [51] },
      { bookId: "JHN", chapterNumber: 2, verseNumbers: [1] },
    ]);
  });

  it("returns no groups for an empty selection", () => {
    expect(snapshotSelection([]).groups).toEqual([]);
  });
});

describe("parseCompareTranslationIds", () => {
  it("reads a plain array", () => {
    expect(parseCompareTranslationIds(["a", "b"])).toEqual(["a", "b"]);
  });

  it("reads a JSON string, since config values can arrive either way", () => {
    expect(parseCompareTranslationIds('["a","b"]')).toEqual(["a", "b"]);
  });

  it("drops duplicates while keeping the first position", () => {
    expect(parseCompareTranslationIds(["a", "b", "a"])).toEqual(["a", "b"]);
  });

  it("drops entries that are not non-empty strings", () => {
    expect(parseCompareTranslationIds(["a", "", 3, null, "b"])).toEqual([
      "a",
      "b",
    ]);
  });

  it("falls back to empty for unusable values", () => {
    expect(parseCompareTranslationIds(undefined)).toEqual([]);
    expect(parseCompareTranslationIds(null)).toEqual([]);
    expect(parseCompareTranslationIds("not json")).toEqual([]);
    expect(parseCompareTranslationIds({ a: 1 })).toEqual([]);
  });
});

describe("reorderIds / addId / removeId", () => {
  it("moves an entry forwards and backwards", () => {
    expect(reorderIds(["a", "b", "c"], 0, 2)).toEqual(["b", "c", "a"]);
    expect(reorderIds(["a", "b", "c"], 2, 0)).toEqual(["c", "a", "b"]);
  });

  it("no-ops on equal or out-of-range indices", () => {
    const ids = ["a", "b", "c"];
    expect(reorderIds(ids, 1, 1)).toBe(ids);
    expect(reorderIds(ids, -1, 1)).toBe(ids);
    expect(reorderIds(ids, 0, 5)).toBe(ids);
  });

  it("adds only when absent, and removes when present", () => {
    expect(addId(["a"], "b")).toEqual(["a", "b"]);
    expect(addId(["a"], "a")).toEqual(["a"]);
    expect(removeId(["a", "b"], "a")).toEqual(["b"]);
    expect(removeId(["a", "b"], "z")).toEqual(["a", "b"]);
  });
});

describe("resolveCompareOrder", () => {
  it("prepends a current translation that is not in the saved list", () => {
    expect(resolveCompareOrder(["a", "b"], "cur")).toEqual([
      { id: "cur", isCurrent: true, savedIndex: -1 },
      { id: "a", isCurrent: false, savedIndex: 0 },
      { id: "b", isCurrent: false, savedIndex: 1 },
    ]);
  });

  it("hoists a saved current translation to the top exactly once", () => {
    expect(resolveCompareOrder(["a", "b", "c"], "b")).toEqual([
      { id: "b", isCurrent: true, savedIndex: 1 },
      { id: "a", isCurrent: false, savedIndex: 0 },
      { id: "c", isCurrent: false, savedIndex: 2 },
    ]);
  });

  it("keeps the rest in saved order when the current one is already first", () => {
    expect(resolveCompareOrder(["a", "b"], "a")).toEqual([
      { id: "a", isCurrent: true, savedIndex: 0 },
      { id: "b", isCurrent: false, savedIndex: 1 },
    ]);
  });

  it("returns the saved list verbatim with no current translation", () => {
    expect(resolveCompareOrder(["a", "b"], null)).toEqual([
      { id: "a", isCurrent: false, savedIndex: 0 },
      { id: "b", isCurrent: false, savedIndex: 1 },
    ]);
  });
});

describe("formatVerseNumberRanges / formatSnapshotReference", () => {
  it("collapses runs into ranges", () => {
    expect(formatVerseNumberRanges([1, 2, 3])).toBe("1-3");
    expect(formatVerseNumberRanges([1, 2, 3, 7])).toBe("1-3, 7");
    expect(formatVerseNumberRanges([5])).toBe("5");
    expect(formatVerseNumberRanges([])).toBe("");
  });

  it("renders a reference using the resolved book name", () => {
    const snapshot = snapshotSelection([
      selectedVerse("JHN", 1, 1),
      selectedVerse("JHN", 1, 2),
    ]);

    expect(formatSnapshotReference(snapshot, () => "John")).toBe("John 1:1-2");
  });

  it("is empty without a snapshot", () => {
    expect(formatSnapshotReference(null, () => "John")).toBe("");
  });
});

describe("versesFromChapter", () => {
  it("returns only the requested verses, in the order asked for", () => {
    const chapter = chapterWith([
      verse(1, "one"),
      verse(2, "two"),
      verse(3, "three"),
    ]);

    expect(versesFromChapter(chapter, [1, 3]).map((v) => v.number)).toEqual([
      1, 3,
    ]);
  });

  it("skips verse numbers this translation does not have", () => {
    const chapter = chapterWith([verse(1, "one")]);

    expect(versesFromChapter(chapter, [1, 2]).map((v) => v.number)).toEqual([
      1,
    ]);
  });
});

describe("createCompareState persistence", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("saves to the device-local store when logged out", async () => {
    vi.useFakeTimers();
    const { context, login } = createTestContext();
    const state = createCompareState(context);

    state.setSelectedTranslationIds(["a", "b"]);

    // The write is debounced, so it isn't there yet — but the UI-facing value
    // already is, from the not-yet-persisted pending value.
    expect(login.localConfig.value[COMPARE_TRANSLATIONS_KEY]).toBeUndefined();
    expect(state.selectedTranslationIds.value).toEqual(["a", "b"]);

    await vi.advanceTimersByTimeAsync(500);

    expect(login.localConfig.value[COMPARE_TRANSLATIONS_KEY]).toEqual([
      "a",
      "b",
    ]);
    expect(state.selectedTranslationIds.value).toEqual(["a", "b"]);
    state.dispose();
  });

  it("saves to the profile when logged in", async () => {
    vi.useFakeTimers();
    const login = createTestLogin({
      userId: "user-1",
      profile: { name: "Reader" },
    });
    const { context } = createTestContext({ login });
    const state = createCompareState(context);

    state.setSelectedTranslationIds(["a"]);
    await vi.advanceTimersByTimeAsync(500);

    expect(
      (login.profile.value?.config as Record<string, unknown>)[
        COMPARE_TRANSLATIONS_KEY
      ]
    ).toEqual(["a"]);
    expect(state.selectedTranslationIds.value).toEqual(["a"]);
    state.dispose();
  });

  it("coalesces a rapid burst of toggles into a single write", async () => {
    vi.useFakeTimers();
    const { context, login } = createTestContext();
    const state = createCompareState(context);
    const saveSpy = vi.spyOn(login.localConfig, "value", "set");

    state.setSelectedTranslationIds(["a"]);
    await vi.advanceTimersByTimeAsync(100);
    state.setSelectedTranslationIds(["a", "b"]);
    await vi.advanceTimersByTimeAsync(100);
    state.setSelectedTranslationIds(["a", "b", "c"]);
    await vi.advanceTimersByTimeAsync(500);

    expect(saveSpy).toHaveBeenCalledTimes(1);
    expect(login.localConfig.value[COMPARE_TRANSLATIONS_KEY]).toEqual([
      "a",
      "b",
      "c",
    ]);
    state.dispose();
  });

  it("flushes a pending save on dispose instead of losing it", () => {
    const { context, login } = createTestContext();
    const state = createCompareState(context);

    state.setSelectedTranslationIds(["a"]);
    // Closing the pane right after a toggle, before the debounce would have
    // fired on its own.
    state.dispose();

    expect(login.localConfig.value[COMPARE_TRANSLATIONS_KEY]).toEqual(["a"]);
  });

  it("keeps the selection on screen when the write cannot land", async () => {
    vi.useFakeTimers();
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    // Logged in, but the profile fetch failed: `LoginManager` leaves `profile`
    // null with nothing still in flight, and `saveProfileConfigValues` refuses
    // to write into that window rather than clobber the account.
    const login = createTestLogin({ userId: "user-1" });
    const { context } = createTestContext({ login });
    const state = createCompareState(context);

    state.setSelectedTranslationIds(["a"]);
    await vi.advanceTimersByTimeAsync(500);

    expect(login.profile.value).toBeNull();
    // Nothing was stored, so the optimistic value has to stay — dropping it
    // would silently undo the toggles the user just made.
    expect(state.selectedTranslationIds.value).toEqual(["a"]);
    state.dispose();
  });

  it("prefers the profile over the device-local copy", () => {
    const login = createTestLogin({
      userId: "user-1",
      profile: {
        name: "Reader",
        config: { [COMPARE_TRANSLATIONS_KEY]: ["p"] },
      },
      localConfig: { [COMPARE_TRANSLATIONS_KEY]: ["l"] },
    });
    const { context } = createTestContext({ login });
    const state = createCompareState(context);

    expect(state.selectedTranslationIds.value).toEqual(["p"]);
    state.dispose();
  });

  it("picks up a set saved on another device when the profile resolves", () => {
    const login = createTestLogin({ userId: "user-1" });
    const { context } = createTestContext({ login });
    const state = createCompareState(context);

    expect(state.selectedTranslationIds.value).toEqual([]);

    login.profile.value = {
      name: "Reader",
      config: { [COMPARE_TRANSLATIONS_KEY]: ["remote"] },
    };

    expect(state.selectedTranslationIds.value).toEqual(["remote"]);
    state.dispose();
  });

  it("never writes the current translation to the saved list", () => {
    const { context, login } = createTestContext();
    const state = createCompareState(context);
    state.sourceReadingState.value = {
      translationId: signal("eng_kjv"),
    } as unknown as BibleReadingState;

    expect(state.order.value.map((entry) => entry.id)).toEqual(["eng_kjv"]);
    expect(state.selectedTranslationIds.value).toEqual([]);
    expect(login.localConfig.value[COMPARE_TRANSLATIONS_KEY]).toBeUndefined();
    state.dispose();
  });
});

describe("defaultSelectionForLanguage", () => {
  const translations = [
    translation("fra_lsg", "fra"),
    translation("fra_bds", "fra"),
    translation("spa_rvr", "spa"),
  ];

  it("returns every other translation in the same language", () => {
    expect(defaultSelectionForLanguage(translations, "fra_lsg")).toEqual([
      "fra_bds",
    ]);
  });

  it("is empty when the current translation isn't found", () => {
    expect(defaultSelectionForLanguage(translations, "xyz")).toEqual([]);
    expect(defaultSelectionForLanguage(translations, null)).toEqual([]);
  });

  it("is empty when no sibling translation shares the language", () => {
    expect(defaultSelectionForLanguage(translations, "spa_rvr")).toEqual([]);
  });

  describe("for English", () => {
    const englishTranslations = [
      translation("eng_aab", "eng", "AAB"),
      // Sorts before the real BSB, and shares its short name — a translation
      // in another language must not be picked over the English one just
      // because it happens to be earlier in the catalog.
      translation("spa_bsb", "spa", "BSB"),
      translation("eng_bsb", "eng", "BSB"),
      translation("eng_kjav", "eng", "KJAV"),
      translation("eng_nasb95", "eng", "NASB95"),
      // Not curated — should be excluded, unlike the "every sibling" default.
      translation("eng_web", "eng", "WEB"),
    ];

    it("returns the curated list, in order, instead of every English translation", () => {
      expect(
        defaultSelectionForLanguage(englishTranslations, "eng_aab")
      ).toEqual(["eng_bsb", "eng_kjav", "eng_nasb95"]);
    });

    it("does not match a curated short name in another language", () => {
      const spanishOnly = [
        translation("eng_aab", "eng", "AAB"),
        translation("spa_bsb", "spa", "BSB"),
      ];
      expect(defaultSelectionForLanguage(spanishOnly, "eng_aab")).toEqual([]);
    });

    it("matches curated short names case-insensitively", () => {
      const mixedCase = [
        translation("eng_aab", "eng", "aab"),
        translation("eng_bsb", "eng", "Bsb"),
      ];
      expect(defaultSelectionForLanguage(mixedCase, "eng_aab")).toEqual([
        "eng_bsb",
      ]);
    });

    it("skips a curated entry the catalog doesn't have", () => {
      const missingKjav = englishTranslations.filter(
        (t) => t.shortName !== "KJAV"
      );
      expect(defaultSelectionForLanguage(missingKjav, "eng_aab")).toEqual([
        "eng_bsb",
        "eng_nasb95",
      ]);
    });
  });
});

describe("createCompareState first-run default", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  const translations = [
    translation("spa_a", "spa"),
    translation("spa_b", "spa"),
    translation("spa_c", "spa"),
    translation("fra_x", "fra"),
  ];

  const openOn = (state: ReturnType<typeof createCompareState>) => {
    state.sourceReadingState.value = {
      translationId: signal("spa_a"),
    } as unknown as BibleReadingState;
  };

  it("populates every sibling-language translation the first time Compare opens", async () => {
    vi.useFakeTimers();
    const { context, login } = createTestContext({
      availableTranslations: translations,
    });
    const state = createCompareState(context);

    expect(state.selectedTranslationIds.value).toEqual([]);

    openOn(state);

    // The default applies to the UI-facing value right away; the write that
    // persists it is debounced like any other change to the saved set.
    expect(state.selectedTranslationIds.value).toEqual(["spa_b", "spa_c"]);

    await vi.advanceTimersByTimeAsync(500);

    expect(login.localConfig.value[COMPARE_TRANSLATIONS_KEY]).toEqual([
      "spa_b",
      "spa_c",
    ]);
    state.dispose();
  });

  it("uses the curated English defaults instead of every English translation", async () => {
    vi.useFakeTimers();
    const englishTranslations = [
      translation("eng_aab", "eng", "AAB"),
      translation("eng_bsb", "eng", "BSB"),
      translation("eng_kjav", "eng", "KJAV"),
      translation("eng_nasb95", "eng", "NASB95"),
      translation("eng_web", "eng", "WEB"),
    ];
    const { context, login } = createTestContext({
      availableTranslations: englishTranslations,
    });
    const state = createCompareState(context);
    state.sourceReadingState.value = {
      translationId: signal("eng_aab"),
    } as unknown as BibleReadingState;

    expect(state.selectedTranslationIds.value).toEqual([
      "eng_bsb",
      "eng_kjav",
      "eng_nasb95",
    ]);

    await vi.advanceTimersByTimeAsync(500);

    expect(login.localConfig.value[COMPARE_TRANSLATIONS_KEY]).toEqual([
      "eng_bsb",
      "eng_kjav",
      "eng_nasb95",
    ]);
    state.dispose();
  });

  it("leaves an explicitly saved empty selection alone", () => {
    const login = createTestLogin({
      localConfig: { [COMPARE_TRANSLATIONS_KEY]: [] },
    });
    const { context } = createTestContext({
      login,
      availableTranslations: translations,
    });
    const state = createCompareState(context);

    openOn(state);

    expect(state.selectedTranslationIds.value).toEqual([]);
    expect(login.localConfig.value[COMPARE_TRANSLATIONS_KEY]).toEqual([]);
    state.dispose();
  });

  it("does not clobber a remote set while the profile is still loading", () => {
    const login = createTestLogin({
      userId: "user-1",
      isProfileLoading: true,
    });
    const { context } = createTestContext({
      login,
      availableTranslations: translations,
    });
    const state = createCompareState(context);

    openOn(state);

    // Still loading: nothing decided or written yet.
    expect(state.selectedTranslationIds.value).toEqual([]);

    // The real profile arrives with a different, already-saved set. Mirrors
    // LoginManager's actual sequencing: `profile` resolves inside `.then()`,
    // strictly before `.finally()` clears `isProfileLoading` — never the
    // other way around, so the effect never observes "loading just turned
    // false, but the profile update from the same resolution hasn't reached
    // `profile.value` yet."
    login.profile.value = {
      name: "Reader",
      config: { [COMPARE_TRANSLATIONS_KEY]: ["remote"] },
    };
    login.isProfileLoading.value = false;

    expect(state.selectedTranslationIds.value).toEqual(["remote"]);
    state.dispose();
  });

  it("applies the default once a pending profile load resolves with nothing saved", () => {
    const login = createTestLogin({
      userId: "user-1",
      isProfileLoading: true,
    });
    const { context } = createTestContext({
      login,
      availableTranslations: translations,
    });
    const state = createCompareState(context);

    openOn(state);
    login.isProfileLoading.value = false;
    login.profile.value = { name: "Reader" };

    expect(state.selectedTranslationIds.value).toEqual(["spa_b", "spa_c"]);
    state.dispose();
  });

  it("stops after one attempt when the default cannot be written", async () => {
    vi.useFakeTimers();
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const login = createTestLogin({ userId: "user-1" });
    const { context } = createTestContext({
      login,
      availableTranslations: translations,
    });
    const state = createCompareState(context);

    openOn(state);

    expect(state.selectedTranslationIds.value).toEqual(["spa_b", "spa_c"]);

    // Ten debounce windows. The save no-ops every time (the profile never
    // loaded), so if the pending value were cleared anyway the default would
    // re-apply and re-arm the timer on every one of them.
    await vi.advanceTimersByTimeAsync(5000);

    expect(state.selectedTranslationIds.value).toEqual(["spa_b", "spa_c"]);
    expect(vi.getTimerCount()).toBe(0);
    state.dispose();
  });

  it("does not re-apply the default after the user changes the selection", () => {
    const { context } = createTestContext({
      availableTranslations: translations,
    });
    const state = createCompareState(context);
    openOn(state);

    expect(state.selectedTranslationIds.value).toEqual(["spa_b", "spa_c"]);

    state.setSelectedTranslationIds(["spa_b"]);

    expect(state.selectedTranslationIds.value).toEqual(["spa_b"]);
    state.dispose();
  });
});

describe("createCompareState loading", () => {
  it("fetches each translation's chapter once the snapshot is set", async () => {
    const getTranslationBookChapter = vi
      .fn()
      .mockResolvedValue(chapterWith([verse(1, "one")]));
    const login = createTestLogin({
      localConfig: { [COMPARE_TRANSLATIONS_KEY]: ["other"] },
    });
    const { context } = createTestContext({ login, getTranslationBookChapter });
    const state = createCompareState(context);
    state.sourceReadingState.value = {
      translationId: signal("eng_kjv"),
    } as unknown as BibleReadingState;

    state.snapshot.value = snapshotSelection([selectedVerse("JHN", 1, 1)]);
    await flushPromises();

    expect(getTranslationBookChapter).toHaveBeenCalledTimes(2);
    expect(getTranslationBookChapter).toHaveBeenCalledWith("eng_kjv", "JHN", 1);
    expect(getTranslationBookChapter).toHaveBeenCalledWith("other", "JHN", 1);
    expect(
      state.chapters.value.get(chapterCacheKey("eng_kjv", "JHN", 1))
    ).toEqual({ status: "loaded", chapter: expect.anything() });
    state.dispose();
  });

  it("records a failure instead of retrying forever", async () => {
    const getTranslationBookChapter = vi
      .fn()
      .mockRejectedValue(new Error("offline"));
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { context } = createTestContext({ getTranslationBookChapter });
    const state = createCompareState(context);
    state.sourceReadingState.value = {
      translationId: signal("eng_kjv"),
    } as unknown as BibleReadingState;

    state.snapshot.value = snapshotSelection([selectedVerse("JHN", 1, 1)]);
    await flushPromises();

    expect(
      state.chapters.value.get(chapterCacheKey("eng_kjv", "JHN", 1))
    ).toEqual({ status: "error" });

    state.loadChapters();
    expect(getTranslationBookChapter).toHaveBeenCalledTimes(1);

    state.retryTranslation("eng_kjv");
    expect(getTranslationBookChapter).toHaveBeenCalledTimes(2);
    state.dispose();
  });

  it("stops fetching for the reader's later translation switches once reset", async () => {
    const getTranslationBookChapter = vi
      .fn()
      .mockResolvedValue(chapterWith([verse(1, "one")]));
    const { context } = createTestContext({ getTranslationBookChapter });
    const state = createCompareState(context);
    const readingState = {
      translationId: signal("eng_kjv"),
    } as unknown as BibleReadingState;
    state.sourceReadingState.value = readingState;

    state.snapshot.value = snapshotSelection([selectedVerse("JHN", 1, 1)]);
    await flushPromises();
    expect(getTranslationBookChapter).toHaveBeenCalledTimes(1);

    state.reset();
    expect(state.snapshot.value).toBeNull();
    expect(state.sourceReadingState.value).toBeNull();

    // The reader switches translations elsewhere in the app — the same
    // signal the effect used to be subscribed to, mutated directly since the
    // pane no longer holds a reference to this reading state at all.
    readingState.translationId.value = "eng_bsb";
    await flushPromises();

    // No new fetch — the effect no longer reacts to this reading state.
    expect(getTranslationBookChapter).toHaveBeenCalledTimes(1);
    state.dispose();
  });
});

describe("selectedVersesForChapter", () => {
  const group = { bookId: "JHN", chapterNumber: 1, verseNumbers: [1, 2] };

  it("rebuilds the selection from the new translation's own verses", () => {
    const chapter = chapterWith([verse(1, "first"), verse(2, "second")]);

    const selected = selectedVersesForChapter({
      chapter,
      group,
      translationId: "eng_bsb",
      now: 1234,
    });

    expect(selected).toEqual([
      {
        bookId: "JHN",
        chapterNumber: 1,
        verse: verse(1, "first"),
        translationId: "eng_bsb",
        selectedAt: 1234,
      },
      {
        bookId: "JHN",
        chapterNumber: 1,
        verse: verse(2, "second"),
        translationId: "eng_bsb",
        selectedAt: 1234,
      },
    ]);
  });

  it("narrows the selection when a verse is missing from the translation", () => {
    const chapter = chapterWith([verse(1, "only this one")]);

    const selected = selectedVersesForChapter({
      chapter,
      group,
      translationId: "eng_bsb",
    });

    expect(selected.map((entry) => entry.verse.number)).toEqual([1]);
  });

  it("anchors the verse toolbar when given a position", () => {
    const chapter = chapterWith([verse(1, "first")]);

    const [selected] = selectedVersesForChapter({
      chapter,
      group,
      translationId: "eng_bsb",
      anchor: { x: 400, y: 300 },
    });

    expect(selected).toMatchObject({ selectionX: 400, selectionY: 300 });
  });

  it("leaves the anchor off when there is no position to give", () => {
    const chapter = chapterWith([verse(1, "first")]);

    const [selected] = selectedVersesForChapter({
      chapter,
      group,
      translationId: "eng_bsb",
    });

    expect(selected).not.toHaveProperty("selectionX");
    expect(selected).not.toHaveProperty("selectionY");
  });
});
