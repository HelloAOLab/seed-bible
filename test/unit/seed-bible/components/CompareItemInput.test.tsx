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

  const refInputs = () =>
    Array.from(
      container.querySelectorAll<HTMLInputElement>(".sb-compare-refs input")
    );
  const submit = () =>
    container.querySelector<HTMLButtonElement>(".sb-settings-save-button")!;

  it("adds a comparison of two typed passages with a title and a line to look for", () => {
    const onAdd = vi.fn();
    act(() => {
      render(<CompareItemInput books={BOOKS} onAdd={onAdd} />, container);
    });
    expect(refInputs()).toHaveLength(2);
    expect(submit().disabled).toBe(true);

    act(() => {
      setValue(
        container.querySelector<HTMLInputElement>(
          ".sb-playlist-add-title-input"
        )!,
        "The angel who speaks as God"
      );
      setValue(refInputs()[0]!, "Gen 16:7-13");
      setValue(refInputs()[1]!, "Exodus 3:2-6");
      setValue(
        container.querySelector<HTMLTextAreaElement>(
          ".sb-compare-description-input"
        )!,
        "Who does each person think they met?"
      );
    });
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
    expect(refInputs().map((input) => input.value)).toEqual(["", ""]);
  });

  it("says when a passage can't be found and adds nothing", () => {
    const onAdd = vi.fn();
    act(() => {
      render(<CompareItemInput books={BOOKS} onAdd={onAdd} />, container);
    });
    act(() => {
      setValue(refInputs()[0]!, "Gen 1");
      setValue(refInputs()[1]!, "Hobbits 1");
    });
    act(() => submit().click());

    expect(onAdd).not.toHaveBeenCalled();
    expect(container.textContent).toContain("Couldn't find that reference");
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

    expect(refInputs().map((input) => input.value)).toEqual([
      "Genesis 16:7-13",
      "Exodus 3",
    ]);
    expect(handleRef.current?.isDirty()).toBe(false);

    act(() => setValue(refInputs()[1]!, "Exodus 4"));
    expect(handleRef.current?.isDirty()).toBe(true);
  });
});
