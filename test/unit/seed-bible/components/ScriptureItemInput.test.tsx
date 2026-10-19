import { render, createRef } from "preact";
import { act } from "preact/test-utils";
import {
  ScriptureItemInput,
  type ScriptureItemInputHandle,
} from "@packages/seed-bible/seed-bible/components/ScriptureItemInput/ScriptureItemInput";
import type { TranslationBook } from "@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI";
import type { PlaylistItemData } from "@packages/seed-bible/seed-bible/managers/PlaylistManager";

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const { mockI18nManager } = await import("../testUtils/mockI18n");
  return mockI18nManager();
});

function book(
  id: string,
  commonName: string,
  numberOfChapters = 50,
  totalNumberOfVerses = 1000
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

const BOOKS: TranslationBook[] = [
  book("GEN", "Genesis", 50, 1533),
  book("JHN", "John", 21, 879),
  book("PHP", "Philippians", 4, 104),
  book("PHM", "Philemon", 1, 25),
  book("JDG", "Judges", 21, 618),
  book("JUD", "Jude", 1, 25),
];

function setValue(input: HTMLInputElement, value: string) {
  input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

describe("ScriptureItemInput", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    render(null, container);
    container.remove();
    vi.restoreAllMocks();
  });

  function input(): HTMLInputElement {
    return container.querySelector(
      ".sb-scripture-input input"
    ) as HTMLInputElement;
  }

  function submitButton(): HTMLButtonElement {
    return container.querySelector(
      ".sb-playlist-add-row button"
    ) as HTMLButtonElement;
  }

  it("seeds the input from initialValue", () => {
    act(() => {
      render(
        <ScriptureItemInput
          books={BOOKS}
          onAdd={vi.fn()}
          initialValue="Genesis 1"
        />,
        container
      );
    });

    expect(input().value).toBe("Genesis 1");
  });

  it("disables the submit button when the field is empty", () => {
    act(() => {
      render(<ScriptureItemInput books={BOOKS} onAdd={vi.fn()} />, container);
    });

    expect(submitButton().disabled).toBe(true);

    act(() => {
      input().focus();
      setValue(input(), "John");
    });

    expect(submitButton().disabled).toBe(false);
  });

  it("uses submitLabel to override the default button text", () => {
    act(() => {
      render(
        <ScriptureItemInput
          books={BOOKS}
          onAdd={vi.fn()}
          submitLabel="Save changes"
        />,
        container
      );
    });

    expect(submitButton().textContent).toBe("Save changes");
  });

  it("shows suggestions only while focused", () => {
    act(() => {
      render(<ScriptureItemInput books={BOOKS} onAdd={vi.fn()} />, container);
    });

    act(() => {
      setValue(input(), "Phil");
    });
    expect(container.querySelector(".sb-scripture-suggestions")).toBeNull();

    act(() => {
      input().focus();
    });
    expect(container.querySelector(".sb-scripture-suggestions")).not.toBeNull();

    const suggestionBooks = Array.from(
      container.querySelectorAll(".sb-scripture-suggestion-book")
    ).map((el) => el.textContent);
    expect(suggestionBooks).toEqual(["Philippians", "Philemon"]);
  });

  it("hides suggestions once the input is blurred", () => {
    act(() => {
      render(<ScriptureItemInput books={BOOKS} onAdd={vi.fn()} />, container);
      input().focus();
      setValue(input(), "Phil");
    });
    expect(container.querySelector(".sb-scripture-suggestions")).not.toBeNull();

    act(() => {
      input().blur();
    });
    expect(container.querySelector(".sb-scripture-suggestions")).toBeNull();
  });

  it("submits the highlighted suggestion on Enter and resets the field", () => {
    const onAdd = vi.fn();
    act(() => {
      render(<ScriptureItemInput books={BOOKS} onAdd={onAdd} />, container);
      input().focus();
      setValue(input(), "John 3:16");
    });

    act(() => {
      input().dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
      );
    });

    expect(onAdd).toHaveBeenCalledWith({
      type: "bible-verse",
      ref: { bookId: "JHN", chapter: 3, verse: 16 },
    } satisfies PlaylistItemData);
    expect(input().value).toBe("");
    expect(container.querySelector(".sb-scripture-suggestions")).toBeNull();
  });

  it.each(["Gen 1", "Gen.1", "Gen. 1"])(
    "submits %s as Genesis chapter 1",
    (value) => {
      const onAdd = vi.fn();
      act(() => {
        render(<ScriptureItemInput books={BOOKS} onAdd={onAdd} />, container);
        input().focus();
        setValue(input(), value);
      });

      act(() => {
        input().dispatchEvent(
          new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
        );
      });

      expect(onAdd).toHaveBeenCalledWith({
        type: "bible-verse",
        ref: { bookId: "GEN", chapter: 1 },
      } satisfies PlaylistItemData);
    }
  );

  it.each(["Gen 1.1", "Gen.1.1", "Gen. 1.1"])(
    "submits %s as Genesis 1:1",
    (value) => {
      const onAdd = vi.fn();
      act(() => {
        render(<ScriptureItemInput books={BOOKS} onAdd={onAdd} />, container);
        input().focus();
        setValue(input(), value);
      });

      act(() => {
        input().dispatchEvent(
          new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
        );
      });

      expect(onAdd).toHaveBeenCalledWith({
        type: "bible-verse",
        ref: { bookId: "GEN", chapter: 1, verse: 1 },
      } satisfies PlaylistItemData);
    }
  );

  it("shows an error and does not call onAdd when the reference can't be resolved", () => {
    const onAdd = vi.fn();
    act(() => {
      render(<ScriptureItemInput books={BOOKS} onAdd={onAdd} />, container);
      input().focus();
      setValue(input(), "Nope 1");
    });

    act(() => {
      input().dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
      );
    });

    expect(onAdd).not.toHaveBeenCalled();
    const error = container.querySelector(".sb-playlist-add-error");
    expect(error).not.toBeNull();
    expect(error?.textContent).toBe("Couldn't find that reference");
  });

  it("does nothing on Enter when the field is blank", () => {
    const onAdd = vi.fn();
    act(() => {
      render(<ScriptureItemInput books={BOOKS} onAdd={onAdd} />, container);
      input().focus();
    });

    act(() => {
      input().dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
      );
    });

    expect(onAdd).not.toHaveBeenCalled();
    expect(container.querySelector(".sb-playlist-add-error")).toBeNull();
  });

  it("clears a previous error once the user types again", () => {
    act(() => {
      render(<ScriptureItemInput books={BOOKS} onAdd={vi.fn()} />, container);
      input().focus();
      setValue(input(), "Nope 1");
    });
    act(() => {
      input().dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
      );
    });
    expect(container.querySelector(".sb-playlist-add-error")).not.toBeNull();

    act(() => {
      setValue(input(), "Nope 12");
    });
    expect(container.querySelector(".sb-playlist-add-error")).toBeNull();
  });

  it("adds an item when a chapter/verse option is clicked (mousedown)", () => {
    const onAdd = vi.fn();
    act(() => {
      render(<ScriptureItemInput books={BOOKS} onAdd={onAdd} />, container);
      input().focus();
      setValue(input(), "Phil");
    });

    // Philemon has a single chapter, offered as option "1".
    const philemonOption = Array.from(
      container.querySelectorAll(".sb-scripture-suggestion")
    )
      .find((li) => li.textContent?.includes("Philemon"))
      ?.querySelector<HTMLButtonElement>(".sb-scripture-chapter-button");

    expect(philemonOption).not.toBeUndefined();

    act(() => {
      philemonOption?.dispatchEvent(
        new MouseEvent("mousedown", { bubbles: true })
      );
    });

    expect(onAdd).toHaveBeenCalledWith({
      type: "bible-verse",
      ref: { bookId: "PHM", chapter: 1 },
    } satisfies PlaylistItemData);
  });

  it("moves the highlighted book with ArrowDown/ArrowUp", () => {
    const onAdd = vi.fn();
    act(() => {
      render(<ScriptureItemInput books={BOOKS} onAdd={onAdd} />, container);
      input().focus();
      // "Jud" matches Judges (21 chapters) then Jude (1 chapter).
      setValue(input(), "Jud");
    });

    act(() => {
      input().dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true })
      );
    });
    act(() => {
      input().dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
      );
    });

    // Jude's only option is chapter 1, so moving down one book should land on it.
    expect(onAdd).toHaveBeenCalledWith({
      type: "bible-verse",
      ref: { bookId: "JUD", chapter: 1 },
    } satisfies PlaylistItemData);
  });

  describe("imperative handle", () => {
    it("isDirty is false when empty and true once text is typed", () => {
      const handleRef = createRef<ScriptureItemInputHandle>();
      act(() => {
        render(
          <ScriptureItemInput ref={handleRef} books={BOOKS} onAdd={vi.fn()} />,
          container
        );
      });

      expect(handleRef.current?.isDirty()).toBe(false);

      act(() => {
        setValue(input(), "John 3");
      });

      expect(handleRef.current?.isDirty()).toBe(true);
    });

    it("isDirty is false while the reference matches initialValue, and true once it differs", () => {
      const handleRef = createRef<ScriptureItemInputHandle>();
      act(() => {
        render(
          <ScriptureItemInput
            ref={handleRef}
            books={BOOKS}
            onAdd={vi.fn()}
            initialValue="Genesis 1"
          />,
          container
        );
      });

      expect(handleRef.current?.isDirty()).toBe(false);

      act(() => {
        setValue(input(), "Genesis 2");
      });
      expect(handleRef.current?.isDirty()).toBe(true);

      act(() => {
        setValue(input(), " Genesis 1 ");
      });
      expect(handleRef.current?.isDirty()).toBe(false);
    });

    it("commit() adds the highlighted reference and returns true", () => {
      const onAdd = vi.fn();
      const handleRef = createRef<ScriptureItemInputHandle>();
      act(() => {
        render(
          <ScriptureItemInput ref={handleRef} books={BOOKS} onAdd={onAdd} />,
          container
        );
        input().focus();
        setValue(input(), "Philemon");
      });

      let result: boolean | Promise<boolean> | undefined;
      act(() => {
        result = handleRef.current?.commit();
      });

      expect(result).toBe(true);
      expect(onAdd).toHaveBeenCalledWith({
        type: "bible-verse",
        ref: { bookId: "PHM", chapter: 1 },
      } satisfies PlaylistItemData);
      expect(handleRef.current?.isDirty()).toBe(false);
    });

    it("commit() returns false and does not add when the reference is empty", () => {
      const onAdd = vi.fn();
      const handleRef = createRef<ScriptureItemInputHandle>();
      act(() => {
        render(
          <ScriptureItemInput ref={handleRef} books={BOOKS} onAdd={onAdd} />,
          container
        );
      });

      let result: boolean | Promise<boolean> | undefined;
      act(() => {
        result = handleRef.current?.commit();
      });

      expect(result).toBe(false);
      expect(onAdd).not.toHaveBeenCalled();
    });
  });

  describe("further passages", () => {
    const extraInputs = () =>
      Array.from(
        container.querySelectorAll<HTMLInputElement>(
          ".sb-scripture-extra-passage input"
        )
      );
    const addPassage = () =>
      act(() => {
        Array.from(container.querySelectorAll("button"))
          .find((b) => b.textContent?.includes("Add another passage"))
          ?.click();
      });

    it("adds a step that reads several passages in order", () => {
      const onAdd = vi.fn();
      act(() => {
        render(<ScriptureItemInput books={BOOKS} onAdd={onAdd} />, container);
        input().focus();
        setValue(input(), "Genesis 16");
      });
      addPassage();
      addPassage();
      act(() => {
        setValue(extraInputs()[0]!, "Genesis 21");
        setValue(extraInputs()[1]!, "John 1:1");
      });

      act(() => submitButton().click());

      expect(onAdd).toHaveBeenCalledWith({
        type: "bible-verse",
        ref: { bookId: "GEN", chapter: 16 },
        refs: [
          { bookId: "GEN", chapter: 21 },
          { bookId: "JHN", chapter: 1, verse: 1 },
        ],
      } satisfies PlaylistItemData);
      expect(extraInputs()).toHaveLength(0);
    });

    it("refuses a further passage it can't read, and skips blank fields", () => {
      const onAdd = vi.fn();
      act(() => {
        render(<ScriptureItemInput books={BOOKS} onAdd={onAdd} />, container);
        input().focus();
        setValue(input(), "Genesis 16");
      });
      addPassage();
      addPassage();
      act(() => setValue(extraInputs()[0]!, "Hobbits 3"));

      act(() => submitButton().click());
      expect(onAdd).not.toHaveBeenCalled();
      expect(container.textContent).toContain("Couldn't find that reference");

      act(() => setValue(extraInputs()[0]!, ""));
      act(() => submitButton().click());
      expect(onAdd).toHaveBeenCalledWith({
        type: "bible-verse",
        ref: { bookId: "GEN", chapter: 16 },
      } satisfies PlaylistItemData);
    });

    it("seeds the further passages when editing, removes one, and is dirty only once they change", () => {
      const handleRef = createRef<ScriptureItemInputHandle>();
      act(() => {
        render(
          <ScriptureItemInput
            ref={handleRef}
            books={BOOKS}
            onAdd={vi.fn()}
            initialValue="Genesis 16"
            initialExtraRefs={[
              { bookId: "GEN", chapter: 21, verse: 17, endVerse: 19 },
            ]}
          />,
          container
        );
      });

      expect(extraInputs().map((el) => el.value)).toEqual(["Genesis 21:17-19"]);
      expect(handleRef.current?.isDirty()).toBe(false);

      act(() => {
        container
          .querySelector<HTMLButtonElement>(".sb-scripture-extra-remove")
          ?.click();
      });
      expect(extraInputs()).toHaveLength(0);
      expect(handleRef.current?.isDirty()).toBe(true);
    });
  });

  describe("highlighted phrases", () => {
    const chapterWith = (verses: Record<number, string>) =>
      ({
        chapter: {
          number: 16,
          footnotes: [],
          content: Object.entries(verses).map(([number, text]) => ({
            type: "verse",
            number: Number(number),
            content: [text],
          })),
        },
      }) as unknown as import("@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI").TranslationBookChapter;
    const loadChapter = vi.fn(async () =>
      chapterWith({ 13: "You are a God who sees.", 14: "Beer Lahai Roi." })
    );

    /** Selects `phrase` inside the preview's verse `verse`, as a reader dragging over it would. */
    function selectPhrase(verse: number, phrase: string) {
      const verseEl = container.querySelector<HTMLElement>(
        `[data-verse-number="${verse}"]`
      )!;
      const textNode = Array.from(verseEl.childNodes).find(
        (node) =>
          node.nodeType === Node.TEXT_NODE && node.textContent?.includes(phrase)
      ) as Text;
      const start = textNode.textContent!.indexOf(phrase);
      const range = document.createRange();
      range.setStart(textNode, start);
      range.setEnd(textNode, start + phrase.length);
      const selection = document.getSelection()!;
      selection.removeAllRanges();
      selection.addRange(range);
      act(() => {
        container
          .querySelector(".sb-scripture-passage .sb-item-inline-preview")!
          .dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
      });
    }

    it("shows the passage once the reference reads, and adds a selected phrase as a highlight", async () => {
      const onAdd = vi.fn();
      act(() => {
        render(
          <ScriptureItemInput
            books={BOOKS}
            onAdd={onAdd}
            loadChapter={loadChapter}
          />,
          container
        );
      });
      expect(container.querySelector(".sb-scripture-passage")).toBeNull();

      act(() => {
        input().focus();
        setValue(input(), "Genesis 16:13-14");
      });
      await vi.waitFor(() =>
        expect(
          container.querySelector(".sb-scripture-passage")?.textContent
        ).toContain("You are a God who sees.")
      );
      expect(container.textContent).toContain("Select words in the passage");

      selectPhrase(13, "a God who sees");
      const add = Array.from(container.querySelectorAll("button")).find((b) =>
        b.textContent?.includes("Highlight “a God who sees”")
      )!;
      expect(add).toBeDefined();
      act(() => add.click());

      expect(
        Array.from(container.querySelectorAll(".sb-scripture-highlight")).map(
          (el) => el.textContent
        )
      ).toEqual(["Genesis 16:13“a God who sees”close"]);
      expect(
        container.querySelector(".sb-item-inline-preview-phrase")?.textContent
      ).toBe("a God who sees");

      act(() => submitButton().click());
      expect(onAdd).toHaveBeenCalledWith({
        type: "bible-verse",
        ref: { bookId: "GEN", chapter: 16, verse: 13, endVerse: 14 },
        highlights: [
          { bookId: "GEN", chapter: 16, verse: 13, text: "a God who sees" },
        ],
      } satisfies PlaylistItemData);
    });

    it("seeds existing highlights, removes one, and is dirty only once they change", async () => {
      const handleRef = createRef<ScriptureItemInputHandle>();
      act(() => {
        render(
          <ScriptureItemInput
            ref={handleRef}
            books={BOOKS}
            onAdd={vi.fn()}
            initialValue="Genesis 16:13"
            initialHighlights={[
              { bookId: "GEN", chapter: 16, verse: 13, text: "God who sees" },
            ]}
            loadChapter={loadChapter}
          />,
          container
        );
      });

      expect(
        container.querySelectorAll(".sb-scripture-highlight")
      ).toHaveLength(1);
      expect(handleRef.current?.isDirty()).toBe(false);

      act(() => {
        container
          .querySelector<HTMLButtonElement>(".sb-scripture-highlight-remove")!
          .click();
      });
      expect(
        container.querySelectorAll(".sb-scripture-highlight")
      ).toHaveLength(0);
      expect(handleRef.current?.isDirty()).toBe(true);
    });
  });

  describe("the fullscreen editor's layout", () => {
    const chapter = {
      chapter: {
        number: 16,
        footnotes: [],
        content: [
          { type: "verse", number: 13, content: ["You are a God who sees."] },
          { type: "verse", number: 14, content: ["Beer Lahai Roi."] },
        ],
      },
    } as unknown as import("@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI").TranslationBookChapter;
    const loadChapter = vi.fn(async () => chapter);

    it("shows the passage as a card that opens for a change, and keeps the step's question", async () => {
      const onAdd = vi.fn();
      const handleRef = createRef<ScriptureItemInputHandle>();
      act(() => {
        render(
          <ScriptureItemInput
            ref={handleRef}
            books={BOOKS}
            onAdd={onAdd}
            initialValue="Genesis 16:13-14"
            initialQuestion={{ prompt: "Who sees?", shareable: false }}
            loadChapter={loadChapter}
            layout="screen"
            translationName="AAB"
          />,
          container
        );
      });

      expect(
        container.querySelector(".sb-step-editor-passage-ref")?.textContent
      ).toBe("Genesis 16:13-14");
      expect(
        container.querySelector(".sb-step-editor-passage-meta")?.textContent
      ).toBe("2 verses · AAB · shown highlighted in the reader");
      // Editing an existing step: the reference field waits behind Change.
      expect(container.querySelector(".sb-scripture-input")).toBeNull();
      expect(
        container.querySelector<HTMLTextAreaElement>(
          ".sb-step-editor-question-prompt"
        )?.value
      ).toBe("Who sees?");
      expect(handleRef.current?.isDirty()).toBe(false);

      act(() => {
        container
          .querySelector<HTMLButtonElement>(".sb-step-editor-change")!
          .click();
      });
      expect(container.querySelector(".sb-scripture-input")).not.toBeNull();

      const prompt = container.querySelector<HTMLTextAreaElement>(
        ".sb-step-editor-question-prompt"
      )!;
      act(() => {
        prompt.value = "Who sees whom?";
        prompt.dispatchEvent(new Event("input", { bubbles: true }));
      });
      expect(handleRef.current?.isDirty()).toBe(true);

      await act(async () => {
        await handleRef.current?.commit();
      });
      expect(onAdd).toHaveBeenCalledWith({
        type: "bible-verse",
        ref: { bookId: "GEN", chapter: 16, verse: 13, endVerse: 14 },
        question: { prompt: "Who sees whom?", shareable: false },
      });
      // Saved in place: the card closes again over the same passage.
      expect(container.querySelector(".sb-scripture-input")).toBeNull();
      expect(
        container.querySelector(".sb-step-editor-passage-ref")?.textContent
      ).toBe("Genesis 16:13-14");
    });

    it("drops the question when it is removed, and starts a new step open on the reference", () => {
      const onAdd = vi.fn();
      const handleRef = createRef<ScriptureItemInputHandle>();
      act(() => {
        render(
          <ScriptureItemInput
            ref={handleRef}
            books={BOOKS}
            onAdd={onAdd}
            initialValue="Genesis 16:13"
            initialQuestion={{ prompt: "Who sees?" }}
            layout="screen"
          />,
          container
        );
      });
      act(() => {
        container
          .querySelector<HTMLButtonElement>(".sb-step-editor-question-remove")!
          .click();
      });
      expect(container.querySelector(".sb-step-editor-question")).toBeNull();
      expect(handleRef.current?.isDirty()).toBe(true);

      render(null, container);
      act(() => {
        render(
          <ScriptureItemInput books={BOOKS} onAdd={onAdd} layout="screen" />,
          container
        );
      });
      expect(container.querySelector(".sb-scripture-input")).not.toBeNull();
      expect(
        container.querySelector(".sb-step-editor-passage-ref")?.textContent
      ).toBe("No passage yet");
    });
  });
});
