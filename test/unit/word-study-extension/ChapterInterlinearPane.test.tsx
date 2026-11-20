import { signal } from "@preact/signals";
import { render, type ComponentChild } from "preact";
import { act } from "preact/test-utils";
import { createInMemoryDatasetStore } from "@packages/seed-bible/seed-bible/managers/OfflineDatasetStore";
import type { ChapterPosition } from "@packages/word-study-extension/ext_WordStudy/chapterInterlinear";
import { G3056, GEN_1, INTERLINEAR_BOOKS, JHN_1 } from "./fixtures";
import {
  createProvider,
  goOffline,
  serve,
  useFetchMock,
  waitForCondition,
} from "./harness";
import { createSettings } from "./settings";

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const { mockI18nManager } = await import("../seed-bible/testUtils/mockI18n");
  return mockI18nManager();
});

const { ChapterInterlinearPane, ChapterInterlinearTitle } =
  await import("@packages/word-study-extension/ext_WordStudy/ChapterInterlinearPane");
const { createChapterInterlinearState, createInterlinearLines } =
  await import("@packages/word-study-extension/ext_WordStudy/chapterInterlinear");
const { WordStudyPaneLeading } =
  await import("@packages/word-study-extension/ext_WordStudy/WordStudyPane");
const { WORD_STUDY_EXTENSION_ID } =
  await import("@packages/word-study-extension/ext_WordStudy/init");

const getFetchMock = useFetchMock();

const JOHN_1: ChapterPosition = { bookId: "JHN", bookName: "John", chapter: 1 };
const GENESIS_1: ChapterPosition = {
  bookId: "GEN",
  bookName: "Genesis",
  chapter: 1,
};

const FILES = {
  "api/d/bsb-interlinear/books.json": INTERLINEAR_BOOKS,
  "api/d/bsb-interlinear/JHN/1.json": JHN_1,
  "api/d/bsb-interlinear/GEN/1.json": GEN_1,
  "api/d/stepbible-lexicon/lexicon/G3056.json": G3056,
};

const containers: HTMLDivElement[] = [];

afterEach(() => {
  for (const container of containers.splice(0)) {
    render(null, container);
    container.remove();
  }
});

function mount(node: ComponentChild) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  containers.push(container);
  act(() => {
    render(node, container);
  });
  return container;
}

function openView(
  start: ChapterPosition | null,
  options: { scrollToVerse?: number; isSignedIn?: boolean } = {}
) {
  const position = signal<ChapterPosition | null>(start);
  const state = createChapterInterlinearState(signal("original"));
  state.scrollToVerse.value = options.scrollToVerse ?? null;
  const settings = createSettings({ isSignedIn: options.isSignedIn ?? false });
  const lines = createInterlinearLines(WORD_STUDY_EXTENSION_ID, settings);
  const container = mount(
    <div>
      <WordStudyPaneLeading state={state} />
      <ChapterInterlinearTitle state={state} position={position} />
      <ChapterInterlinearPane
        provider={createProvider(createInMemoryDatasetStore())}
        state={state}
        position={position}
        lines={lines}
        onReferenceClick={vi.fn()}
      />
    </div>
  );
  return { container, position, state, settings };
}

function verses(container: HTMLElement) {
  return [...container.querySelectorAll(".sb-interlinear-verse")];
}

function words(container: HTMLElement) {
  return [...container.querySelectorAll(".sb-interlinear-word")];
}

function wordsLoaded(container: HTMLElement) {
  return () => words(container).length > 0;
}

function toggle(container: HTMLElement, label: string) {
  const button = [
    ...container.querySelectorAll<HTMLButtonElement>(
      ".sb-interlinear-line-toggle"
    ),
  ].find((element) => element.textContent === label);
  if (!button) {
    throw new Error(`No "${label}" toggle.`);
  }
  return button;
}

function click(element: Element | null | undefined) {
  act(() => {
    (element as HTMLElement).click();
  });
}

describe("ChapterInterlinearPane", () => {
  it("shows every verse of the chapter as word blocks", async () => {
    serve(getFetchMock(), FILES);
    const { container } = openView(JOHN_1);

    await waitForCondition(wordsLoaded(container));

    expect(
      verses(container).map((verse) => verse.getAttribute("data-verse"))
    ).toEqual(["1", "2"]);
    const logos = words(container)[4]!;
    expect(logos.querySelector(".sb-interlinear-original")?.textContent).toBe(
      "Λόγος"
    );
    expect(
      logos.querySelector(".sb-interlinear-transliteration")?.textContent
    ).toBe("Logos");
    expect(logos.querySelector(".sb-interlinear-gloss")?.textContent).toBe(
      "Word"
    );
    expect(logos.querySelector(".sb-interlinear-strongs")?.textContent).toBe(
      "G3056"
    );
    expect(logos.querySelector(".sb-interlinear-parsing")?.textContent).toBe(
      "N-NMS"
    );
    expect(container.textContent).toContain("Interlinear");
    expect(container.textContent).toContain("John 1");
  });

  it("follows the reader to another chapter", async () => {
    serve(getFetchMock(), FILES);
    const { container, position } = openView(JOHN_1);
    await waitForCondition(wordsLoaded(container));

    act(() => {
      position.value = GENESIS_1;
    });
    await waitForCondition(
      () =>
        container.querySelector(".sb-interlinear-original")?.textContent ===
        "בְּרֵאשִׁ֖ית"
    );

    expect(container.textContent).toContain("Genesis 1");
    expect(
      verses(container).map((verse) => verse.getAttribute("data-verse"))
    ).toEqual(["1", "11"]);
  });

  it("lays Hebrew out right to left and Greek left to right", async () => {
    serve(getFetchMock(), FILES);
    const hebrew = openView(GENESIS_1).container;
    const greek = openView(JOHN_1).container;

    await waitForCondition(wordsLoaded(hebrew));
    await waitForCondition(wordsLoaded(greek));

    expect(
      hebrew.querySelector(".sb-interlinear-chapter")?.getAttribute("dir")
    ).toBe("rtl");
    expect(
      greek.querySelector(".sb-interlinear-chapter")?.getAttribute("dir")
    ).toBe("ltr");
  });

  it("keeps the English lines under Hebrew words left to right", async () => {
    serve(getFetchMock(), FILES);
    const { container } = openView(GENESIS_1);
    await waitForCondition(wordsLoaded(container));

    const englishLines = container.querySelectorAll(
      ".sb-interlinear-transliteration, .sb-interlinear-gloss, .sb-interlinear-strongs, .sb-interlinear-parsing"
    );

    expect(englishLines.length).toBeGreaterThan(0);
    for (const line of englishLines) {
      expect(line.getAttribute("dir")).toBe("ltr");
    }
  });

  it("runs Hebrew left to right in English order, following the English", async () => {
    serve(getFetchMock(), FILES);
    const { container } = openView(GENESIS_1);
    await waitForCondition(wordsLoaded(container));

    click(
      [...container.querySelectorAll(".sb-word-study-order-option")].find(
        (option) => option.textContent === "English order"
      )
    );

    expect(
      container.querySelector(".sb-interlinear-chapter")?.getAttribute("dir")
    ).toBe("ltr");
    // Hebrew puts "created" (pos 2) before "God" (pos 3); English order
    // swaps them, with the untranslated object marker (—) between.
    const glosses = words(container)
      .slice(0, 4)
      .map((word) => word.querySelector(".sb-interlinear-gloss")?.textContent);
    expect(glosses).toEqual(["In the beginning", "God", "—", "created"]);
  });

  it.each([
    ["Transliteration", ".sb-interlinear-transliteration"],
    ["Gloss", ".sb-interlinear-gloss"],
    ["Strong's", ".sb-interlinear-strongs"],
    ["Parsing", ".sb-interlinear-parsing"],
  ])("hides and shows the %s line", async (label, selector) => {
    serve(getFetchMock(), FILES);
    const { container } = openView(JOHN_1);
    await waitForCondition(wordsLoaded(container));
    expect(container.querySelector(selector)).not.toBeNull();

    click(toggle(container, label));

    expect(toggle(container, label).getAttribute("aria-pressed")).toBe("false");
    expect(container.querySelector(selector)).toBeNull();
    expect(
      container.querySelectorAll(".sb-interlinear-original").length
    ).toBeGreaterThan(0);

    click(toggle(container, label));

    expect(container.querySelector(selector)).not.toBeNull();
  });

  it("starts with the lines a signed-in reader turned off in Settings", async () => {
    serve(getFetchMock(), FILES);
    const { container, settings } = openView(JOHN_1, { isSignedIn: true });
    await waitForCondition(wordsLoaded(container));

    act(() => {
      settings.store("showParsing", false);
    });

    expect(toggle(container, "Parsing").getAttribute("aria-pressed")).toBe(
      "false"
    );
    expect(container.querySelector(".sb-interlinear-parsing")).toBeNull();
  });

  it("says a book the interlinear doesn't cover isn't available", async () => {
    serve(getFetchMock(), FILES);
    const { container } = openView({
      bookId: "TOB",
      bookName: "Tobit",
      chapter: 1,
    });

    await waitForCondition(() =>
      container.textContent!.includes(
        "Word study isn't available for this book yet."
      )
    );
    expect(words(container)).toEqual([]);
  });

  it("says a chapter the interlinear doesn't have isn't available", async () => {
    serve(getFetchMock(), FILES);
    const { container } = openView({
      bookId: "GEN",
      bookName: "Genesis",
      chapter: 51,
    });

    await waitForCondition(() =>
      container.textContent!.includes(
        "Word study isn't available for this chapter."
      )
    );
  });

  it("asks for a chapter when none is open", () => {
    const { container } = openView(null);

    expect(container.textContent).toContain(
      "Open a chapter to read it in the original language."
    );
    expect(getFetchMock()).not.toHaveBeenCalled();
  });

  it("offers a retry when the chapter can't be fetched", async () => {
    goOffline(getFetchMock());
    const { container } = openView(JOHN_1);
    await waitForCondition(
      () => container.querySelector('[role="alert"]') !== null
    );

    serve(getFetchMock(), FILES);
    click(container.querySelector(".sb-word-study-retry"));

    await waitForCondition(wordsLoaded(container));
  });

  it("opens a word's lexicon card, and Back returns to the chapter", async () => {
    serve(getFetchMock(), FILES);
    const { container } = openView(JOHN_1);
    await waitForCondition(wordsLoaded(container));

    click(words(container)[4]?.querySelector("button"));
    await waitForCondition(
      () => !!container.querySelector(".sb-word-study-sense")
    );
    expect(
      container.querySelector(".sb-word-study-lexicon .sb-word-study-gloss")
        ?.textContent
    ).toBe("word");
    expect(container.querySelector(".sb-word-study-title")?.textContent).toBe(
      "Lexicon"
    );

    click(container.querySelector('button[aria-label="Back"]'));

    expect(container.querySelector(".sb-word-study-sense")).toBeNull();
    expect(
      container.querySelector<HTMLElement>(".sb-word-study-scroll")?.hidden
    ).toBe(false);
    expect(container.querySelector('button[aria-label="Back"]')).toBeNull();
  });

  it("doesn't make a word without a Strong's number tappable", async () => {
    serve(getFetchMock(), FILES);
    const { container } = openView(GENESIS_1);
    await waitForCondition(wordsLoaded(container));

    const untagged = verses(container)[1]
      ?.querySelectorAll(".sb-interlinear-word")
      .item(15);

    expect(
      untagged?.querySelector(".sb-interlinear-original")?.textContent
    ).toBe("ב֖וֹ");
    expect(untagged?.querySelector("button")).toBeNull();
  });

  it("scrolls to the reader's verse once the chapter loads", async () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    serve(getFetchMock(), FILES);

    const { container, state } = openView(JOHN_1, { scrollToVerse: 2 });
    await waitForCondition(() => scrollIntoView.mock.calls.length > 0);

    expect(scrollIntoView.mock.contexts[0]).toBe(
      container.querySelector('[data-verse="2"]')
    );
    expect(state.scrollToVerse.value).toBeNull();
    delete (Element.prototype as Partial<Element>).scrollIntoView;
  });
});
