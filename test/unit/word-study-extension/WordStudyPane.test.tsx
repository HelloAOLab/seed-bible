import { render, type ComponentChild } from "preact";
import { act } from "preact/test-utils";
import { createInMemoryDatasetStore } from "@packages/seed-bible/seed-bible/managers/OfflineDatasetStore";
import type { StudiedVerse } from "@packages/word-study-extension/ext_WordStudy/wordStudyState";
import { G3056, GEN_1, INTERLINEAR_BOOKS, JHN_1 } from "./fixtures";
import {
  createProvider,
  goOffline,
  hang,
  serve,
  useFetchMock,
  waitForCondition,
} from "./harness";

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const { mockI18nManager } = await import("../seed-bible/testUtils/mockI18n");
  return mockI18nManager();
});

const { WordStudyPane, WordStudyPaneLeading, WordStudyPaneTitle } =
  await import("@packages/word-study-extension/ext_WordStudy/WordStudyPane");
const { createWordStudyState } =
  await import("@packages/word-study-extension/ext_WordStudy/wordStudyState");

const getFetchMock = useFetchMock();

const JOHN_1_1: StudiedVerse = {
  bookId: "JHN",
  bookName: "John",
  chapter: 1,
  verse: 1,
};
const GENESIS_1_1: StudiedVerse = {
  bookId: "GEN",
  bookName: "Genesis",
  chapter: 1,
  verse: 1,
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

function openPane(verses: StudiedVerse[]) {
  const state = createWordStudyState();
  state.verses.value = verses;
  const onReferenceClick = vi.fn();
  const container = mount(
    <div>
      <WordStudyPaneTitle state={state} />
      <WordStudyPaneLeading state={state} />
      <WordStudyPane
        provider={createProvider(createInMemoryDatasetStore())}
        state={state}
        onReferenceClick={onReferenceClick}
      />
    </div>
  );
  return { container, state, onReferenceClick };
}

function rows(container: HTMLElement) {
  return [...container.querySelectorAll(".sb-word-study-word")];
}

function rowText(row: Element, part: string) {
  return row.querySelector(`.sb-word-study-${part}`)?.textContent;
}

function buttonNamed(container: HTMLElement, name: string) {
  const button = [...container.querySelectorAll("button")].find(
    (candidate) => candidate.textContent?.trim() === name
  );
  if (!button) {
    throw new Error(`No button named ${name}`);
  }
  return button;
}

async function click(element: Element) {
  await act(async () => {
    (element as HTMLElement).click();
  });
}

describe("WordStudyPane", () => {
  it("lists each original word of the verse with its details", async () => {
    serve(getFetchMock(), FILES);
    const { container } = openPane([JOHN_1_1]);

    await waitForCondition(() => rows(container).length > 0);

    expect(
      container.querySelector(".sb-word-study-verse-heading")?.textContent
    ).toBe("John 1:1");
    expect(rows(container)).toHaveLength(17);
    const logos = rows(container)[4]!;
    expect(rowText(logos, "original")).toBe("Λόγος");
    expect(rowText(logos, "transliteration")).toBe("Logos");
    expect(rowText(logos, "gloss")).toBe("Word");
    expect(rowText(logos, "strongs")).toBe("G3056");
    expect(
      logos.querySelector(".sb-word-study-parsing")?.textContent
    ).toContain("N-NMS");
  });

  it("names the verses in the title", () => {
    hang(getFetchMock());
    const { container } = openPane([
      JOHN_1_1,
      { ...JOHN_1_1, verse: 2 },
      { ...JOHN_1_1, verse: 4 },
    ]);

    expect(container.querySelector(".sb-word-study-title")?.textContent).toBe(
      "Word Study"
    );
    expect(
      container.querySelector(".sb-word-study-reference")?.textContent
    ).toBe("John 1:1–2, 4");
  });

  it("shows a placeholder while the words load", () => {
    hang(getFetchMock());
    const { container } = openPane([JOHN_1_1]);

    const status = container.querySelector('[role="status"]');
    expect(status?.textContent).toBe("Loading the original words");
  });

  it("switches between original and English word order", async () => {
    serve(getFetchMock(), FILES);
    const { container } = openPane([GENESIS_1_1]);
    await waitForCondition(() => rows(container).length > 0);
    const strongs = () => rows(container).map((row) => rowText(row, "strongs"));

    // Hebrew puts the verb before its subject: "created God".
    expect(strongs().slice(0, 3)).toEqual(["H7225", "H1254", "H0430"]);
    expect(
      buttonNamed(container, "Original order").getAttribute("aria-pressed")
    ).toBe("true");

    await click(buttonNamed(container, "English order"));

    // "In the beginning God created".
    expect(strongs().slice(0, 4)).toEqual(["H7225", "H0430", "H0853", "H1254"]);
    expect(
      buttonNamed(container, "English order").getAttribute("aria-pressed")
    ).toBe("true");
  });

  it("writes Hebrew right to left and Greek left to right", async () => {
    serve(getFetchMock(), FILES);
    const { container } = openPane([GENESIS_1_1, JOHN_1_1]);
    await waitForCondition(() => rows(container).length > 7);

    const hebrew = container.querySelector(
      ".sb-word-study-original[lang='hbo']"
    );
    const greek = container.querySelector(
      ".sb-word-study-original[lang='grc']"
    );
    expect(hebrew?.textContent).toBe("בְּרֵאשִׁ֖ית");
    expect(hebrew?.getAttribute("dir")).toBe("rtl");
    expect(greek?.getAttribute("dir")).toBe("ltr");
  });

  it("shows a word with no Strong's number, but not as something to open", async () => {
    serve(getFetchMock(), FILES);
    const { container } = openPane([{ ...GENESIS_1_1, verse: 11 }]);
    await waitForCondition(() => rows(container).length > 0);

    const untagged = rows(container).find(
      (row) => rowText(row, "transliteration") === "ḇōw"
    )!;
    const main = untagged.querySelector(".sb-word-study-word-main")!;
    expect(main.tagName).toBe("DIV");
    expect(main.getAttribute("title")).toBe(
      "This word has no Strong's number, so it has no lexicon entry."
    );
    expect(rowText(untagged, "strongs")).toBeUndefined();
  });

  it("spells out a word's grammar on request", async () => {
    serve(getFetchMock(), FILES);
    const { container } = openPane([JOHN_1_1]);
    await waitForCondition(() => rows(container).length > 0);
    const logos = rows(container)[4]!;
    const toggle = logos.querySelector(".sb-word-study-parsing")!;

    expect(toggle.getAttribute("title")).toBe(
      "Noun - Nominative Masculine Singular"
    );
    expect(logos.querySelector(".sb-word-study-parsing-full")).toBeNull();

    await click(toggle);

    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(rowText(logos, "parsing-full")).toBe(
      "Noun - Nominative Masculine Singular"
    );
  });

  it("opens a word's lexicon entry, and goes back to the words", async () => {
    serve(getFetchMock(), FILES);
    const { container, state } = openPane([JOHN_1_1]);
    await waitForCondition(() => rows(container).length > 0);

    await click(rows(container)[4]!.querySelector("button")!);

    expect(state.lexiconStack.value).toEqual(["G3056"]);
    await waitForCondition(
      () => !!container.querySelector(".sb-word-study-sense")
    );
    expect(
      container.querySelector(".sb-word-study-lexicon .sb-word-study-gloss")
        ?.textContent
    ).toBe("word");
    expect(
      container
        .querySelector(".sb-word-study-words")
        ?.closest(".sb-word-study-scroll")
        ?.hasAttribute("hidden")
    ).toBe(true);
    expect(container.querySelector(".sb-word-study-title")?.textContent).toBe(
      "Lexicon"
    );

    await click(container.querySelector('button[aria-label="Back"]')!);

    expect(container.querySelector(".sb-word-study-sense")).toBeNull();
    expect(rows(container)).toHaveLength(17);
    expect(container.querySelector('button[aria-label="Back"]')).toBeNull();
  });

  it("credits the interlinear's source", async () => {
    serve(getFetchMock(), FILES);
    const { container } = openPane([JOHN_1_1]);

    expect(
      container.querySelector(".sb-word-study-attribution")?.textContent
    ).toBe("Interlinear data: Berean Standard Bible (public domain)");
  });

  it("says when the interlinear doesn't cover the book", async () => {
    serve(getFetchMock(), FILES);
    const { container } = openPane([
      { bookId: "TOB", bookName: "Tobit", chapter: 1, verse: 1 },
    ]);

    await waitForCondition(
      () => !!container.querySelector(".sb-word-study-message")
    );
    expect(container.querySelector(".sb-word-study-message")?.textContent).toBe(
      "Word study isn't available for this book yet."
    );
  });

  it("says when the interlinear doesn't have the verse", async () => {
    serve(getFetchMock(), FILES);
    const { container } = openPane([{ ...GENESIS_1_1, verse: 40 }]);

    await waitForCondition(
      () => !!container.querySelector(".sb-word-study-message")
    );
    expect(container.querySelector(".sb-word-study-message")?.textContent).toBe(
      "Word study isn't available for this verse."
    );
  });

  it("offers a retry when offline, which loads the words once back online", async () => {
    goOffline(getFetchMock());
    const { container } = openPane([JOHN_1_1]);

    await waitForCondition(() => !!container.querySelector('[role="alert"]'));
    expect(container.querySelector('[role="alert"] p')?.textContent).toBe(
      "Couldn't load the original words. Check your connection and try again."
    );

    serve(getFetchMock(), FILES);
    await click(buttonNamed(container, "Retry"));

    await waitForCondition(() => rows(container).length > 0);
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });
});
