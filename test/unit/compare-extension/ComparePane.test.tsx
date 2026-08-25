import { render } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import type { BibleReadingState } from "@packages/seed-bible/seed-bible/managers/BibleReadingManager";
import type {
  ChapterVerse,
  Translation,
  TranslationBookChapter,
} from "@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI";
import type { LoginManager } from "@packages/seed-bible/seed-bible/managers/LoginManager";

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const { mockI18nManager } = await import("../seed-bible/testUtils/mockI18n");
  return mockI18nManager();
});

const { ComparePane, ComparePaneHeader, ComparePaneTitle } =
  await import("@packages/compare-extension/ext_Compare/ComparePane");
const { COMPARE_TRANSLATIONS_KEY, createCompareState, snapshotSelection } =
  await import("@packages/compare-extension/ext_Compare/compareState");

type CompareState = ReturnType<typeof createCompareState>;

function verse(number: number, text: string): ChapterVerse {
  return { type: "verse", number, content: [text] };
}

function chapterWith(verses: ChapterVerse[]): TranslationBookChapter {
  return {
    chapter: { number: 1, content: verses, footnotes: [] },
  } as unknown as TranslationBookChapter;
}

function translation(
  id: string,
  shortName: string,
  name: string,
  overrides: Partial<Translation> = {}
): Translation {
  return {
    id,
    shortName,
    name,
    englishName: name,
    language: "eng",
    languageEnglishName: "English",
    languageName: "English",
    numberOfBooks: 66,
    textDirection: "ltr",
    ...overrides,
  } as Translation;
}

function createTestLogin(localConfig: Record<string, unknown> = {}) {
  return {
    userId: signal<string | null>(null),
    profile: signal(null),
    localConfig: signal(localConfig),
    profilePromise: null,
    updateProfile: () => undefined,
  } as unknown as LoginManager;
}

function createHarness(options?: {
  savedIds?: string[];
  chapters?: Record<string, TranslationBookChapter>;
  // Takes precedence over `chapters` — for tests that need the chapter
  // returned to depend on the book/chapter requested, not just the
  // translation.
  getTranslationBookChapter?: (
    translationId: string,
    book: string,
    chapterNumber: number
  ) => Promise<TranslationBookChapter>;
}) {
  const login = createTestLogin(
    options?.savedIds ? { [COMPARE_TRANSLATIONS_KEY]: options.savedIds } : {}
  );

  const context = {
    login,
    bibleData: {
      availableTranslations: signal<Translation[]>([
        translation("eng_kjv", "KJV", "King James Version"),
        translation("eng_bsb", "BSB", "Berean Standard Bible"),
        translation("eng_web", "WEB", "World English Bible"),
        translation("heb_mod", "HMT", "Hebrew Modern Translation", {
          language: "heb",
          languageEnglishName: "Hebrew",
          languageName: "עברית",
          textDirection: "rtl",
        }),
      ]),
      getTranslationBookChapter:
        options?.getTranslationBookChapter ??
        ((translationId: string) =>
          Promise.resolve(
            options?.chapters?.[translationId] ??
              chapterWith([verse(1, "In the beginning was the Word")])
          )),
    },
    selector: {
      showAllLanguages: signal<"complete" | "all" | "popular">("all"),
    },
    panes: { closePane: vi.fn() },
  } as unknown as SeedBibleState;

  // Mirrors the real reading state closely enough for the switch path: loading
  // a chapter clears the selection and publishes the new `chapterData`.
  const chapterData = signal<TranslationBookChapter | null>(null);
  const selectedVerses = signal<unknown[]>([]);
  const selectTranslationAndChapter = vi
    .fn()
    .mockImplementation(async (translationId: string) => {
      selectedVerses.value = [];
      chapterData.value = {
        translation: { id: translationId },
        chapter: {
          number: 1,
          content: [verse(1, "switched text"), verse(2, "second verse")],
          footnotes: [],
        },
      } as unknown as TranslationBookChapter;
    });

  const decorateVerses = vi.fn().mockReturnValue("decoration-1");

  const state = createCompareState(context);
  state.sourceReadingState.value = {
    translationId: signal("eng_kjv"),
    bookId: signal("JHN"),
    chapterNumber: signal(3),
    translationBooks: signal({ books: [{ id: "JHN", name: "John" }] }),
    chapterData,
    selectedVerses,
    selectTranslationAndChapter,
    decorateVerses,
  } as unknown as BibleReadingState;

  return {
    context,
    state,
    login,
    selectTranslationAndChapter,
    selectedVerses,
    decorateVerses,
  };
}

function mount(node: preact.ComponentChild) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  act(() => {
    render(node, container);
  });
  return container;
}

async function settle(container: HTMLDivElement, node: preact.ComponentChild) {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    render(node, container);
  });
}

describe("ComparePane", () => {
  const containers: HTMLDivElement[] = [];
  const states: CompareState[] = [];

  afterEach(() => {
    for (const container of containers.splice(0)) {
      render(null, container);
      container.remove();
    }
    for (const state of states.splice(0)) {
      state.dispose();
    }
  });

  it("shows skeleton placeholders while a translation is still loading", () => {
    const { context, state } = createHarness({ savedIds: ["eng_bsb"] });
    states.push(state);
    state.snapshot.value = snapshotSelection([
      {
        bookId: "JHN",
        chapterNumber: 1,
        verse: verse(1, "x"),
        translationId: "eng_kjv",
      },
    ]);

    const container = mount(<ComparePane context={context} state={state} />);
    containers.push(container);

    expect(container.querySelectorAll(".sb-skeleton").length).toBeGreaterThan(
      0
    );
    expect(
      container.querySelector('.sb-skeleton-status[aria-busy="true"]')
    ).not.toBeNull();
  });

  it("renders the abbreviation left, the full name right, and the verse below", async () => {
    const { context, state } = createHarness({ savedIds: ["eng_bsb"] });
    states.push(state);
    state.snapshot.value = snapshotSelection([
      {
        bookId: "JHN",
        chapterNumber: 1,
        verse: verse(1, "x"),
        translationId: "eng_kjv",
      },
    ]);

    const node = <ComparePane context={context} state={state} />;
    const container = mount(node);
    containers.push(container);
    await settle(container, node);

    const headers = container.querySelectorAll(".sb-compare-block-header");
    expect(headers.length).toBe(2);
    expect(
      headers[0]!.querySelector(".sb-compare-block-abbreviation")!.textContent
    ).toBe("KJV");
    expect(
      headers[0]!.querySelector(".sb-compare-block-name")!.textContent
    ).toBe("King James Version");

    const text = container.querySelector(".sb-compare-block-text")!.textContent;
    expect(text).toContain("In the beginning was the Word");
  });

  it("mirrors the header for an RTL translation so the abbreviation sits on the right", async () => {
    const { context, state } = createHarness({ savedIds: ["heb_mod"] });
    states.push(state);
    state.snapshot.value = snapshotSelection([
      {
        bookId: "JHN",
        chapterNumber: 1,
        verse: verse(1, "x"),
        translationId: "eng_kjv",
      },
    ]);

    const node = <ComparePane context={context} state={state} />;
    const container = mount(node);
    containers.push(container);
    await settle(container, node);

    const headers = container.querySelectorAll(".sb-compare-block-header");
    // The LTR translation being read comes first, the RTL one second.
    expect(headers[0]!.getAttribute("dir")).toBe("ltr");
    expect(headers[1]!.getAttribute("dir")).toBe("rtl");

    // DOM order is unchanged; `dir` is what reverses the visual order.
    expect(
      headers[1]!.firstElementChild!.classList.contains(
        "sb-compare-block-abbreviation"
      )
    ).toBe(true);

    const rtlText = container.querySelectorAll(".sb-compare-block-text")[1]!;
    expect(rtlText.getAttribute("dir")).toBe("rtl");
  });

  it("puts the translation being read first, exactly once, even when it is saved", async () => {
    // Saved order deliberately has the current translation in the middle.
    const { context, state } = createHarness({
      savedIds: ["eng_bsb", "eng_kjv", "eng_web"],
    });
    states.push(state);
    state.snapshot.value = snapshotSelection([
      {
        bookId: "JHN",
        chapterNumber: 1,
        verse: verse(1, "x"),
        translationId: "eng_kjv",
      },
    ]);

    const node = <ComparePane context={context} state={state} />;
    const container = mount(node);
    containers.push(container);
    await settle(container, node);

    const abbreviations = [
      ...container.querySelectorAll(".sb-compare-block-abbreviation"),
    ].map((element) => element.textContent);
    expect(abbreviations).toEqual(["KJV", "BSB", "WEB"]);

    // Hoisting is display-only — the saved list keeps the user's order.
    expect(state.selectedTranslationIds.value).toEqual([
      "eng_bsb",
      "eng_kjv",
      "eng_web",
    ]);
  });

  it("renders both chapters' verse 1 when the selection spans two chapters", async () => {
    // Both groups pick verse 1 — same verse number, different chapters —
    // which used to collide under the same Preact key.
    const { context, state } = createHarness({
      savedIds: ["eng_bsb"],
      getTranslationBookChapter: (_translationId, _book, chapterNumber) =>
        Promise.resolve(
          chapterWith([
            verse(
              1,
              chapterNumber === 1 ? "first chapter text" : "second chapter text"
            ),
          ])
        ),
    });
    states.push(state);
    state.snapshot.value = snapshotSelection([
      {
        bookId: "JHN",
        chapterNumber: 1,
        verse: verse(1, "x"),
        translationId: "eng_kjv",
      },
      {
        bookId: "JHN",
        chapterNumber: 2,
        verse: verse(1, "y"),
        translationId: "eng_kjv",
      },
    ]);

    const node = <ComparePane context={context} state={state} />;
    const container = mount(node);
    containers.push(container);
    await settle(container, node);

    const block = container.querySelector(".sb-compare-block")!;
    const text = block.querySelector(".sb-compare-block-text")!.textContent;
    expect(text).toContain("first chapter text");
    expect(text).toContain("second chapter text");
    expect(block.querySelectorAll(".sb-compare-verse")).toHaveLength(2);
  });

  it("falls back to a message when the verses are missing from a translation", async () => {
    const { context, state } = createHarness({
      savedIds: ["eng_bsb"],
      chapters: { eng_bsb: chapterWith([]) },
    });
    states.push(state);
    state.snapshot.value = snapshotSelection([
      {
        bookId: "JHN",
        chapterNumber: 1,
        verse: verse(1, "x"),
        translationId: "eng_kjv",
      },
    ]);

    const node = <ComparePane context={context} state={state} />;
    const container = mount(node);
    containers.push(container);
    await settle(container, node);

    const messages = [
      ...container.querySelectorAll(".sb-compare-block-message"),
    ].map((element) => element.textContent);
    expect(messages).toEqual([
      "These verses are not available in this translation.",
    ]);
  });

  it("switches the reader to a compared translation and closes the pane", async () => {
    const { context, state, login, selectTranslationAndChapter } =
      createHarness({ savedIds: ["eng_bsb"] });
    states.push(state);
    state.snapshot.value = snapshotSelection([
      {
        bookId: "JHN",
        chapterNumber: 1,
        verse: verse(1, "x"),
        translationId: "eng_kjv",
      },
    ]);

    const node = <ComparePane context={context} state={state} />;
    const container = mount(node);
    containers.push(container);
    await settle(container, node);

    const switchable = container.querySelectorAll<HTMLButtonElement>(
      ".sb-compare-block-header--switch"
    );
    // Only the compared translation is switchable; the one being read is not.
    expect(switchable).toHaveLength(1);
    expect(switchable[0]!.getAttribute("aria-label")).toBe(
      "Read Berean Standard Bible"
    );

    act(() => {
      switchable[0]!.click();
    });

    // Goes to the verses the pane was showing (John 1:1), not the reader's
    // current chapter, and asks the reader to centre the first of them.
    expect(selectTranslationAndChapter).toHaveBeenCalledWith(
      "eng_bsb",
      "JHN",
      1,
      { scrollToVerse: 1 }
    );
    // Persisted the same way the reader's own translation list does.
    expect(login.localConfig.value.translationId).toBe("eng_bsb");
    expect(context.panes.closePane).toHaveBeenCalled();
  });

  it("reselects the compared verses in the translation it switched to", async () => {
    const { context, state, selectedVerses } = createHarness({
      savedIds: ["eng_bsb"],
    });
    states.push(state);
    state.snapshot.value = snapshotSelection([
      {
        bookId: "JHN",
        chapterNumber: 1,
        verse: verse(1, "x"),
        translationId: "eng_kjv",
      },
      {
        bookId: "JHN",
        chapterNumber: 1,
        verse: verse(2, "y"),
        translationId: "eng_kjv",
      },
    ]);

    const node = <ComparePane context={context} state={state} />;
    const container = mount(node);
    containers.push(container);
    await settle(container, node);

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>(".sb-compare-block-header--switch")!
        .click();
      await Promise.resolve();
      await Promise.resolve();
    });

    // The same two verses, but the new translation's text.
    expect(
      selectedVerses.value.map((entry) => {
        const selected = entry as {
          verse: ChapterVerse;
          translationId: string;
          bookId: string;
          chapterNumber: number;
        };
        return {
          number: selected.verse.number,
          translationId: selected.translationId,
          bookId: selected.bookId,
          chapterNumber: selected.chapterNumber,
        };
      })
    ).toEqual([
      {
        number: 1,
        translationId: "eng_bsb",
        bookId: "JHN",
        chapterNumber: 1,
      },
      {
        number: 2,
        translationId: "eng_bsb",
        bookId: "JHN",
        chapterNumber: 1,
      },
    ]);
  });

  it("fades the rest of the chapter so the compared verses stand out on arrival", async () => {
    const { context, state, decorateVerses } = createHarness({
      savedIds: ["eng_bsb"],
    });
    states.push(state);
    state.snapshot.value = snapshotSelection([
      {
        bookId: "JHN",
        chapterNumber: 1,
        verse: verse(1, "x"),
        translationId: "eng_kjv",
      },
      {
        bookId: "JHN",
        chapterNumber: 1,
        verse: verse(2, "y"),
        translationId: "eng_kjv",
      },
    ]);

    const node = <ComparePane context={context} state={state} />;
    const container = mount(node);
    containers.push(container);
    await settle(container, node);

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>(".sb-compare-block-header--switch")!
        .click();
      await Promise.resolve();
      await Promise.resolve();
    });

    // Same decoration search results, playlists and `?verse=` links use.
    expect(decorateVerses).toHaveBeenCalledWith("JHN", 1, [1, 2], {
      className: "sb-verse-decoration-diminish",
      containerClassName: "sb-chapter-decoration-diminish",
      removeAfterMs: 3000,
    });
  });

  it("leaves the translation being read as plain, unclickable text", async () => {
    const { context, state } = createHarness({ savedIds: ["eng_bsb"] });
    states.push(state);
    state.snapshot.value = snapshotSelection([
      {
        bookId: "JHN",
        chapterNumber: 1,
        verse: verse(1, "x"),
        translationId: "eng_kjv",
      },
    ]);

    const node = <ComparePane context={context} state={state} />;
    const container = mount(node);
    containers.push(container);
    await settle(container, node);

    const headers = container.querySelectorAll(".sb-compare-block-header");
    expect(headers[0]!.tagName).toBe("DIV");
    expect(headers[1]!.tagName).toBe("BUTTON");
  });

  it("explains the empty pane when nothing has been added to compare against", async () => {
    // An explicitly empty saved set, not an unset one — an unset preference
    // now auto-populates with sibling-language translations (see
    // compareState.test.ts), so it would no longer exercise this empty state.
    const { context, state } = createHarness({ savedIds: [] });
    states.push(state);
    state.snapshot.value = snapshotSelection([
      {
        bookId: "JHN",
        chapterNumber: 1,
        verse: verse(1, "x"),
        translationId: "eng_kjv",
      },
    ]);

    const node = <ComparePane context={context} state={state} />;
    const container = mount(node);
    containers.push(container);
    await settle(container, node);

    // The translation being read is the only block, so there is nothing to
    // compare it against.
    expect(container.querySelectorAll(".sb-compare-block")).toHaveLength(1);
    const empty = container.querySelector(".sb-compare-empty")!;
    expect(empty).not.toBeNull();
    expect(empty.textContent).toContain("No translations to compare yet");
    expect(empty.textContent).toContain(
      "Add translations to compare the selected verses with"
    );
    // It sits in the scrolling area, not below the Add Translation bar.
    expect(empty.closest(".sb-compare-scroll")).not.toBeNull();
  });

  it("drops the empty note once a translation is added", async () => {
    const { context, state } = createHarness({ savedIds: ["eng_bsb"] });
    states.push(state);
    state.snapshot.value = snapshotSelection([
      {
        bookId: "JHN",
        chapterNumber: 1,
        verse: verse(1, "x"),
        translationId: "eng_kjv",
      },
    ]);

    const node = <ComparePane context={context} state={state} />;
    const container = mount(node);
    containers.push(container);
    await settle(container, node);

    expect(container.querySelector(".sb-compare-empty")).toBeNull();
  });

  it("still explains the empty pane when the only saved id is the translation being read", async () => {
    // Reachable from the picker: clicking the current translation's own row
    // or chip saves it explicitly. `order` collapses it back down to the same
    // single, already-pinned block, so there is still nothing to compare.
    const { context, state } = createHarness({ savedIds: ["eng_kjv"] });
    states.push(state);
    state.snapshot.value = snapshotSelection([
      {
        bookId: "JHN",
        chapterNumber: 1,
        verse: verse(1, "x"),
        translationId: "eng_kjv",
      },
    ]);

    const node = <ComparePane context={context} state={state} />;
    const container = mount(node);
    containers.push(container);
    await settle(container, node);

    expect(container.querySelectorAll(".sb-compare-block")).toHaveLength(1);
    expect(container.querySelector(".sb-compare-empty")).not.toBeNull();
  });

  it("keeps an Add Translation button anchored below the scrolling list", () => {
    const { context, state } = createHarness();
    states.push(state);
    state.snapshot.value = snapshotSelection([]);

    const container = mount(<ComparePane context={context} state={state} />);
    containers.push(container);

    const bar = container.querySelector(".sb-compare-add-bar");
    expect(bar).not.toBeNull();
    expect(bar!.querySelector(".sb-compare-add-button")).not.toBeNull();
    // The bar is a sibling of the scroll region, not inside it.
    expect(bar!.closest(".sb-compare-scroll")).toBeNull();
  });

  it("routes between the comparison and its settings sub-view", () => {
    const { context, state } = createHarness({ savedIds: ["eng_bsb"] });
    states.push(state);
    state.snapshot.value = snapshotSelection([]);

    const headerNode = <ComparePaneHeader state={state} />;
    const header = mount(headerNode);
    containers.push(header);
    const bodyNode = <ComparePane context={context} state={state} />;
    const body = mount(bodyNode);
    containers.push(body);

    act(() => {
      header
        .querySelector<HTMLButtonElement>(".sb-compare-settings-button")!
        .click();
    });
    act(() => {
      render(bodyNode, body);
      render(headerNode, header);
    });

    expect(state.view.value).toBe("settings");
    expect(body.querySelector(".sb-compare-settings")).not.toBeNull();
    // The gear hides itself outside the comparison view.
    expect(header.querySelector(".sb-compare-settings-button")).toBeNull();

    const titleNode = <ComparePaneTitle state={state} />;
    const title = mount(titleNode);
    containers.push(title);
    act(() => {
      title.querySelector<HTMLButtonElement>(".sb-reading-plans-back")!.click();
    });

    expect(state.view.value).toBe("compare");
  });
});

describe("Compare translation picker", () => {
  const containers: HTMLDivElement[] = [];
  const states: CompareState[] = [];

  afterEach(() => {
    for (const container of containers.splice(0)) {
      render(null, container);
      container.remove();
    }
    for (const state of states.splice(0)) {
      state.dispose();
    }
  });

  function mountPicker(savedIds: string[] = []) {
    const { context, state } = createHarness({ savedIds });
    states.push(state);
    state.snapshot.value = snapshotSelection([]);
    state.view.value = "add";
    const node = <ComparePane context={context} state={state} />;
    const container = mount(node);
    containers.push(container);
    return { context, state, container, node };
  }

  it("renders the same language-grouped list the reader's selector uses", () => {
    const { container } = mountPicker();

    expect(container.querySelector(".sb-translation-list")).not.toBeNull();
    const languages = [
      ...container.querySelectorAll(".sb-translation-list-language"),
    ].map((element) => element.textContent);
    expect(languages.some((label) => label?.includes("English"))).toBe(true);
    expect(languages.some((label) => label?.includes("עברית"))).toBe(true);
  });

  it("expands the language of the translation being read", () => {
    const { container } = mountPicker();

    // English is the reading language, so its translations are already listed.
    const rows = [
      ...container.querySelectorAll(".translation-description"),
    ].map((element) => element.textContent);
    expect(rows).toContain("King James Version (KJV)");
    expect(rows).not.toContain("Hebrew Modern Translation (HMT)");
  });

  it("toggles a translation in and out of the comparison", () => {
    const { state, container, node } = mountPicker();

    const pick = (label: string) =>
      [...container.querySelectorAll(".translation-option")].find((row) =>
        row.textContent?.includes(label)
      ) as HTMLElement;

    act(() => {
      pick("Berean Standard Bible").click();
    });
    expect(state.selectedTranslationIds.value).toEqual(["eng_bsb"]);

    act(() => {
      render(node, container);
    });
    act(() => {
      pick("Berean Standard Bible").click();
    });
    expect(state.selectedTranslationIds.value).toEqual([]);
  });

  it("shows the translation being read as unchosen until it is saved", () => {
    const { container } = mountPicker();

    const kjvRow = [...container.querySelectorAll(".translation-option")].find(
      (row) => row.textContent?.includes("King James Version")
    )!;
    // It's always compared regardless, but ticking it here before it's saved
    // would leave a click with nothing to visibly change.
    expect(kjvRow.querySelector(".sb-translation-completion")).not.toBeNull();
  });

  it("ticks the translation being read once its row is clicked, and saves it", () => {
    const { state, container, node } = mountPicker();

    const kjvRow = () =>
      [...container.querySelectorAll(".translation-option")].find((row) =>
        row.textContent?.includes("King James Version")
      ) as HTMLElement;

    act(() => {
      kjvRow().click();
    });
    expect(state.selectedTranslationIds.value).toEqual(["eng_kjv"]);

    act(() => {
      render(node, container);
    });
    // The click now has a visible result: the ring is replaced by the tick.
    expect(kjvRow().querySelector(".sb-translation-completion")).toBeNull();

    act(() => {
      kjvRow().click();
    });
    expect(state.selectedTranslationIds.value).toEqual([]);

    act(() => {
      render(node, container);
    });
    expect(kjvRow().querySelector(".sb-translation-completion")).not.toBeNull();
  });

  it("offers the catalog filter, so it is not stuck on complete translations", () => {
    const { context, container } = mountPicker();

    expect(context.selector.showAllLanguages.value).toBe("all");
    expect(container.querySelector(".sb-compare-filters-menu")).toBeNull();

    act(() => {
      container
        .querySelector<HTMLButtonElement>(".sb-compare-filters-button")!
        .click();
    });

    const options = [
      ...container.querySelectorAll<HTMLButtonElement>(
        ".sb-translation-view-mode-option"
      ),
    ];
    expect(options).toHaveLength(3);

    act(() => {
      options[2]!.click();
    });

    expect(context.selector.showAllLanguages.value).toBe("popular");
    // Choosing a filter closes the menu.
    expect(container.querySelector(".sb-compare-filters-menu")).toBeNull();
  });

  it("returns to where it was opened from", () => {
    const { state, container } = mountPicker();
    state.addReturnTo.value = "settings";

    act(() => {
      container
        .querySelector<HTMLButtonElement>(".sb-compare-picker-done")!
        .click();
    });

    expect(state.view.value).toBe("settings");
  });
});

describe("CompareSettings", () => {
  const containers: HTMLDivElement[] = [];
  const states: CompareState[] = [];
  const ROW_HEIGHT = 40;
  let offsetHeightSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // jsdom doesn't lay out real geometry — stub every row's rendered height
    // so the drag math in `useDragReorder` has something to divide by.
    offsetHeightSpy = vi
      .spyOn(HTMLLIElement.prototype, "offsetHeight", "get")
      .mockReturnValue(ROW_HEIGHT);
  });

  afterEach(() => {
    for (const container of containers.splice(0)) {
      render(null, container);
      container.remove();
    }
    for (const state of states.splice(0)) {
      state.dispose();
    }
    offsetHeightSpy.mockRestore();
  });

  it("pins the current translation without a drag handle and lists the rest as draggable", () => {
    const { context, state } = createHarness({
      savedIds: ["eng_bsb", "eng_web"],
    });
    states.push(state);
    state.snapshot.value = snapshotSelection([]);
    state.view.value = "settings";

    const container = mount(<ComparePane context={context} state={state} />);
    containers.push(container);

    const rows = container.querySelectorAll(".sb-discover-item");
    expect(rows.length).toBe(3);

    const pinned = rows[0]!;
    expect(pinned.classList.contains("sb-compare-settings-pinned")).toBe(true);
    expect(pinned.querySelector(".sb-discover-item-drag-handle")).toBeNull();
    // Not in the saved list, so there is nothing to remove.
    expect(pinned.querySelector(".sb-discover-item-delete")).toBeNull();

    for (const row of [rows[1]!, rows[2]!]) {
      expect(row.querySelector(".sb-discover-item-drag-handle")).not.toBeNull();
      const remove = row.querySelector(".sb-discover-item-delete")!;
      expect(remove).not.toBeNull();
      // Same trash-can affordance the playlist editor uses.
      expect(remove.textContent).toBe("delete");
    }
  });

  it("gives the pinned row a remove button when it is also saved", () => {
    const { context, state } = createHarness({
      savedIds: ["eng_bsb", "eng_kjv"],
    });
    states.push(state);
    state.snapshot.value = snapshotSelection([]);
    state.view.value = "settings";

    const container = mount(<ComparePane context={context} state={state} />);
    containers.push(container);

    const pinned = container.querySelector(".sb-compare-settings-pinned")!;
    expect(pinned.querySelector(".sb-discover-item-delete")).not.toBeNull();

    act(() => {
      pinned
        .querySelector<HTMLButtonElement>(".sb-discover-item-delete")!
        .click();
    });

    expect(state.selectedTranslationIds.value).toEqual(["eng_bsb"]);
  });

  it("removes a saved translation from the list", () => {
    const { context, state } = createHarness({
      savedIds: ["eng_bsb", "eng_web"],
    });
    states.push(state);
    state.snapshot.value = snapshotSelection([]);
    state.view.value = "settings";

    const node = <ComparePane context={context} state={state} />;
    const container = mount(node);
    containers.push(container);

    const rows = container.querySelectorAll(".sb-discover-item");
    act(() => {
      rows[1]!
        .querySelector<HTMLButtonElement>(".sb-discover-item-delete")!
        .click();
    });

    expect(state.selectedTranslationIds.value).toEqual(["eng_web"]);
  });

  it("removes from the reordered list during an in-progress drag, not the pre-drag order", () => {
    const { context, state } = createHarness({
      savedIds: ["eng_bsb", "eng_web", "heb_mod"],
    });
    states.push(state);
    state.snapshot.value = snapshotSelection([]);
    state.view.value = "settings";

    const node = <ComparePane context={context} state={state} />;
    const container = mount(node);
    containers.push(container);

    const handle = (index: number) =>
      container.querySelectorAll<HTMLButtonElement>(
        ".sb-discover-item-drag-handle"
      )[index]!;

    // Drag the first row (eng_bsb) down two slots, past eng_web and heb_mod,
    // without ever releasing the pointer.
    act(() => {
      handle(0).dispatchEvent(
        new PointerEvent("pointerdown", {
          bubbles: true,
          pointerId: 1,
          clientY: 0,
        })
      );
      window.dispatchEvent(
        new PointerEvent("pointermove", { pointerId: 1, clientY: 90 })
      );
    });
    act(() => {
      render(node, container);
    });

    // Rows now read eng_web, heb_mod, eng_bsb — remove the middle one mid-drag.
    const rows = container.querySelectorAll(".sb-discover-item");
    act(() => {
      rows[2]!
        .querySelector<HTMLButtonElement>(".sb-discover-item-delete")!
        .click();
    });

    // The reorder survives the removal — eng_web ends up first, not eng_bsb
    // (its position in the untouched, pre-drag saved list).
    expect(state.selectedTranslationIds.value).toEqual(["eng_web", "eng_bsb"]);
  });

  it("does not resurrect the removed translation once the interrupted drag's pointerup lands", () => {
    const { context, state } = createHarness({
      savedIds: ["eng_bsb", "eng_web", "heb_mod"],
    });
    states.push(state);
    state.snapshot.value = snapshotSelection([]);
    state.view.value = "settings";

    const node = <ComparePane context={context} state={state} />;
    const container = mount(node);
    containers.push(container);

    const handle = (index: number) =>
      container.querySelectorAll<HTMLButtonElement>(
        ".sb-discover-item-drag-handle"
      )[index]!;

    act(() => {
      handle(0).dispatchEvent(
        new PointerEvent("pointerdown", {
          bubbles: true,
          pointerId: 1,
          clientY: 0,
        })
      );
      window.dispatchEvent(
        new PointerEvent("pointermove", { pointerId: 1, clientY: 90 })
      );
    });
    act(() => {
      render(node, container);
    });

    act(() => {
      container
        .querySelectorAll(".sb-discover-item")[2]!
        .querySelector<HTMLButtonElement>(".sb-discover-item-delete")!
        .click();
    });

    // The drag that was in progress when the removal committed finally ends —
    // this must not resurrect the translation just removed.
    act(() => {
      window.dispatchEvent(
        new PointerEvent("pointerup", { pointerId: 1, clientY: 90 })
      );
    });

    expect(state.selectedTranslationIds.value).toEqual(["eng_web", "eng_bsb"]);
  });
});
