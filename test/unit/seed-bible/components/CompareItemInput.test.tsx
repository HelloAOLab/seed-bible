import { render, createRef } from "preact";
import { act } from "preact/test-utils";
import {
  CompareItemInput,
  resolveTypedReference,
  type CompareItemInputHandle,
} from "@packages/seed-bible/seed-bible/components/CompareItemInput/CompareItemInput";
import type { TranslationBook } from "@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI";

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const { mockI18nManager } = await import("../testUtils/mockI18n");
  return mockI18nManager();
});

function book(
  id: string,
  commonName: string,
  numberOfChapters: number,
  totalNumberOfVerses: number
): TranslationBook {
  return {
    id,
    name: commonName,
    commonName,
    title: null,
    order: 1,
    numberOfChapters,
    firstChapterNumber: 1,
    totalNumberOfVerses,
  } as TranslationBook;
}

const BOOKS = [
  book("GEN", "Genesis", 50, 1533),
  book("EXO", "Exodus", 40, 1213),
];

function setValue(
  input: HTMLInputElement | HTMLTextAreaElement,
  value: string
) {
  input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

describe("resolveTypedReference", () => {
  it("reads a reference the way the scripture typeahead picks it on Enter", () => {
    expect(resolveTypedReference("Gen 16:7-13", BOOKS)).toEqual({
      bookId: "GEN",
      chapter: 16,
      verse: 7,
      endVerse: 13,
    });
    expect(resolveTypedReference("Exodus 3", BOOKS)).toEqual({
      bookId: "EXO",
      chapter: 3,
    });
  });

  it("is null for text that names no passage", () => {
    expect(resolveTypedReference("", BOOKS)).toBeNull();
    expect(resolveTypedReference("Hobbits 1", BOOKS)).toBeNull();
  });
});

describe("CompareItemInput", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  const tabs = () =>
    Array.from(
      container.querySelectorAll<HTMLButtonElement>(".sb-compare-tab")
    );
  const tabRefs = () =>
    tabs().map((tab) => tab.querySelector(".sb-compare-tab-ref")?.textContent);
  const activeTab = () =>
    tabs().findIndex((tab) => tab.getAttribute("aria-selected") === "true");
  const reference = () =>
    container.querySelector<HTMLInputElement>(".sb-passage-picker-input")!;
  const submit = () =>
    container.querySelector<HTMLButtonElement>(".sb-settings-save-button")!;

  /** Types a reference into the picker of passage `index`. */
  function pick(index: number, text: string) {
    act(() => tabs()[index]!.click());
    act(() => setValue(reference(), text));
  }

  it("adds a comparison of two passages picked one tab at a time, with a title and a line to look for", () => {
    const onAdd = vi.fn();
    act(() => {
      render(<CompareItemInput books={BOOKS} onAdd={onAdd} />, container);
    });
    expect(tabs()).toHaveLength(2);
    expect(tabRefs()).toEqual(["No passage yet", "No passage yet"]);
    expect(activeTab()).toBe(0);
    expect(submit().disabled).toBe(true);

    act(() => {
      setValue(
        container.querySelector<HTMLInputElement>(
          ".sb-playlist-add-title-input"
        )!,
        "The angel who speaks as God"
      );
      setValue(
        container.querySelector<HTMLTextAreaElement>(
          ".sb-compare-description-input"
        )!,
        "Who does each person think they met?"
      );
    });
    pick(0, "Gen 16:7-13");
    pick(1, "Exodus 3:2-6");
    expect(tabRefs()).toEqual(["Genesis 16:7-13", "Exodus 3:2-6"]);
    // Each tab keeps its own reference in the picker.
    act(() => tabs()[0]!.click());
    expect(reference().value).toBe("Genesis 16:7-13");

    expect(submit().disabled).toBe(false);
    act(() => submit().click());

    expect(onAdd).toHaveBeenCalledWith({
      type: "compare",
      title: "The angel who speaks as God",
      refs: [
        { bookId: "GEN", chapter: 16, verse: 7, endVerse: 13 },
        { bookId: "EXO", chapter: 3, verse: 2, endVerse: 6 },
      ],
      description: "Who does each person think they met?",
    });
    expect(tabRefs()).toEqual(["No passage yet", "No passage yet"]);
  });

  it("asks for the missing passage and shows its tab instead of adding", () => {
    const onAdd = vi.fn();
    const handleRef = createRef<CompareItemInputHandle>();
    act(() => {
      render(
        <CompareItemInput ref={handleRef} books={BOOKS} onAdd={onAdd} />,
        container
      );
    });
    pick(0, "Gen 1");
    act(() => tabs()[0]!.click());

    let added: boolean | undefined;
    act(() => {
      added = handleRef.current?.commit();
    });

    expect(added).toBe(false);
    expect(onAdd).not.toHaveBeenCalled();
    expect(container.querySelector('[role="alert"]')?.textContent).toBe(
      "Choose both passages to compare"
    );
    expect(activeTab()).toBe(1);
  });

  it("counts a reference that names no passage as missing", () => {
    act(() => {
      render(<CompareItemInput books={BOOKS} onAdd={vi.fn()} />, container);
    });
    pick(0, "Gen 1");
    pick(1, "Hobbits 1");

    expect(tabRefs()).toEqual(["Genesis 1", "No passage yet"]);
    expect(submit().disabled).toBe(true);
  });

  it("seeds from an existing comparison with its passages written out, and is dirty only once something changes", () => {
    const handleRef = createRef<CompareItemInputHandle>();
    act(() => {
      render(
        <CompareItemInput
          ref={handleRef}
          books={BOOKS}
          onAdd={vi.fn()}
          initialItem={{
            refs: [
              { bookId: "GEN", chapter: 16, verse: 7, endVerse: 13 },
              { bookId: "EXO", chapter: 3 },
            ],
          }}
        />,
        container
      );
    });

    expect(tabRefs()).toEqual(["Genesis 16:7-13", "Exodus 3"]);
    expect(reference().value).toBe("Genesis 16:7-13");
    expect(handleRef.current?.isDirty()).toBe(false);

    pick(1, "Exodus 4");
    expect(handleRef.current?.isDirty()).toBe(true);
  });

  it("keeps what its fields don't show when an edit is saved, but drops the marked phrases of a passage that changed", () => {
    const onAdd = vi.fn();
    act(() => {
      render(
        <CompareItemInput
          books={BOOKS}
          onAdd={onAdd}
          initialItem={{
            title: "Two wells",
            translationId: "BSB",
            refs: [
              {
                bookId: "GEN",
                chapter: 16,
                verse: 7,
                label: "Hagar",
                phrases: ["the angel"],
              },
              {
                bookId: "GEN",
                chapter: 21,
                verse: 17,
                label: "Ishmael",
                phrases: ["the boy"],
              },
            ],
            terms: [{ text: "well", label: "water" }],
            phraseLabel: "God hears",
          }}
        />,
        container
      );
    });
    pick(1, "Gen 21:17-19");
    act(() => submit().click());

    expect(onAdd).toHaveBeenCalledWith({
      type: "compare",
      title: "Two wells",
      translationId: "BSB",
      refs: [
        {
          bookId: "GEN",
          chapter: 16,
          verse: 7,
          label: "Hagar",
          phrases: ["the angel"],
        },
        {
          bookId: "GEN",
          chapter: 21,
          verse: 17,
          endVerse: 19,
          label: "Ishmael",
        },
      ],
      terms: [{ text: "well", label: "water" }],
      phraseLabel: "God hears",
      description: undefined,
    });
  });
});
