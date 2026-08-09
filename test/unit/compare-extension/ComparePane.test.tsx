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
  const actual = await vi.importActual<
    typeof import("@packages/seed-bible/seed-bible/i18n/I18nManager")
  >("@packages/seed-bible/seed-bible/i18n/I18nManager");
  return {
    ...actual,
    useI18n: () => ({
      t: (key: string, options?: Record<string, unknown>) =>
        (options?.defaultValue as string | undefined) ?? key,
      language: "en",
    }),
  };
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

function translation(id: string, shortName: string, name: string): Translation {
  return {
    id,
    shortName,
    name,
    englishName: name,
    language: "eng",
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
      ]),
      getTranslationBookChapter: (translationId: string) =>
        Promise.resolve(
          options?.chapters?.[translationId] ??
            chapterWith([verse(1, "In the beginning was the Word")])
        ),
    },
  } as unknown as SeedBibleState;

  const state = createCompareState(context);
  state.sourceReadingState.value = {
    translationId: signal("eng_kjv"),
    translationBooks: signal({ books: [{ id: "JHN", name: "John" }] }),
  } as unknown as BibleReadingState;

  return { context, state, login };
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

describe("CompareSettings", () => {
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
    expect(pinned.querySelector(".sb-discover-item-menu")).toBeNull();

    for (const row of [rows[1]!, rows[2]!]) {
      expect(row.querySelector(".sb-discover-item-drag-handle")).not.toBeNull();
      expect(row.querySelector(".sb-discover-item-menu")).not.toBeNull();
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
    expect(pinned.querySelector(".sb-discover-item-menu")).not.toBeNull();

    act(() => {
      pinned
        .querySelector<HTMLButtonElement>(".sb-discover-item-menu")!
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
        .querySelector<HTMLButtonElement>(".sb-discover-item-menu")!
        .click();
    });

    expect(state.selectedTranslationIds.value).toEqual(["eng_web"]);
  });
});
