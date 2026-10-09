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

vi.mock("@packages/seed-bible/seed-bible/managers/Sanitization", () => ({
  // Strips inline handlers so a test can tell the note went through it.
  sanitize: vi.fn(async (html: string) =>
    html.replace(/ onclick="[^"]*"/g, "")
  ),
}));

/**
 * Stands in for the lazily-loaded TipTap editor the note field mounts. Holds
 * its HTML so tests can seed it (via `initialContent`), type into it, and see
 * it cleared.
 */
let noteEditor:
  | {
      html: string;
      readonly isEmpty: boolean;
      getHTML: () => string;
      commands: { clearContent: () => void };
      onEmptyChange: (isEmpty: boolean) => void;
    }
  | undefined;

vi.mock(
  "@packages/seed-bible/seed-bible/components/TipTapEditor/TipTapEditor",
  async () => {
    const { useEffect } = await import("preact/hooks");
    return {
      default: (props: {
        initialContent?: string;
        onEditor: (editor: unknown) => void;
        onEmptyChange: (isEmpty: boolean) => void;
      }) => {
        useEffect(() => {
          const editor = {
            html: props.initialContent ?? "",
            get isEmpty() {
              return editor.html === "";
            },
            getHTML: () => editor.html,
            commands: {
              clearContent: () => {
                editor.html = "";
                editor.onEmptyChange(true);
              },
            },
            onEmptyChange: props.onEmptyChange,
          };
          noteEditor = editor;
          props.onEditor(editor);
          return () => {
            props.onEditor(null);
            if (noteEditor === editor) noteEditor = undefined;
          };
        }, []);
        return <div className="stub-tiptap-editor" />;
      },
    };
  }
);

/**
 * Waits for the lazily-loaded note editor to mount. `lazy()` resolves its
 * import and re-renders on real timer ticks, and the first import in a run
 * takes longer than later (cached) ones, so poll rather than wait a fixed tick.
 */
async function waitForNoteEditor() {
  const deadline = Date.now() + 2000;
  while (!noteEditor) {
    if (Date.now() > deadline) throw new Error("note editor never mounted");
    // Each act() flushes the re-render and effects the tick let through.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
}

/** Lets a pending sanitize (a resolved promise) settle. */
async function flushMicrotasks() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

function typeNote(html: string) {
  noteEditor!.html = html;
  noteEditor!.onEmptyChange(html === "");
}

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

  describe("note", () => {
    function noteButton(label: string): HTMLButtonElement {
      return Array.from(
        container.querySelectorAll<HTMLButtonElement>(
          ".sb-scripture-note-toggle"
        )
      ).find((button) => button.textContent?.includes(label))!;
    }

    async function openNote() {
      act(() => noteButton("Add a note").click());
      await waitForNoteEditor();
    }

    it("adds the reference with its sanitized note", async () => {
      const onAdd = vi.fn();
      act(() => {
        render(<ScriptureItemInput books={BOOKS} onAdd={onAdd} />, container);
      });
      await openNote();
      act(() => {
        input().focus();
        setValue(input(), "Philemon");
        typeNote('<p onclick="steal()"><strong>Read</strong> slowly</p>');
      });

      await act(async () => {
        submitButton().click();
        await flushMicrotasks();
      });

      expect(onAdd).toHaveBeenCalledWith({
        type: "bible-verse",
        ref: { bookId: "PHM", chapter: 1 },
        note: "<p><strong>Read</strong> slowly</p>",
      } satisfies PlaylistItemData);
      // Ready for the next item: the note field closes and the text clears.
      expect(container.querySelector(".stub-tiptap-editor")).toBeNull();
      expect(input().value).toBe("");
    });

    it("adds no note when the note field was opened but left empty", async () => {
      const onAdd = vi.fn();
      act(() => {
        render(<ScriptureItemInput books={BOOKS} onAdd={onAdd} />, container);
      });
      await openNote();
      act(() => {
        input().focus();
        setValue(input(), "Philemon");
      });

      await act(async () => {
        submitButton().click();
      });

      expect(onAdd).toHaveBeenCalledWith({
        type: "bible-verse",
        ref: { bookId: "PHM", chapter: 1 },
      } satisfies PlaylistItemData);
    });

    it("counts an unsaved note as a draft", async () => {
      const handleRef = createRef<ScriptureItemInputHandle>();
      act(() => {
        render(
          <ScriptureItemInput ref={handleRef} books={BOOKS} onAdd={vi.fn()} />,
          container
        );
      });
      await openNote();
      expect(handleRef.current?.isDirty()).toBe(false);

      act(() => typeNote("<p>Draft</p>"));

      expect(handleRef.current?.isDirty()).toBe(true);
    });

    it("seeds the note when editing, and keeps it on save", async () => {
      const onAdd = vi.fn();
      act(() => {
        render(
          <ScriptureItemInput
            books={BOOKS}
            onAdd={onAdd}
            initialValue="Philemon"
            initialNote="<p>Existing</p>"
          />,
          container
        );
      });
      await waitForNoteEditor();
      expect(noteEditor?.getHTML()).toBe("<p>Existing</p>");

      await act(async () => {
        input().focus();
        submitButton().click();
        await flushMicrotasks();
      });

      expect(onAdd).toHaveBeenCalledWith({
        type: "bible-verse",
        ref: { bookId: "PHM", chapter: 1 },
        note: "<p>Existing</p>",
      } satisfies PlaylistItemData);
    });

    it("isn't dirty for an untouched item being edited, but is once its note changes", async () => {
      const handleRef = createRef<ScriptureItemInputHandle>();
      act(() => {
        render(
          <ScriptureItemInput
            ref={handleRef}
            books={BOOKS}
            onAdd={vi.fn()}
            initialValue="Philemon"
            initialNote="<p>Existing</p>"
          />,
          container
        );
      });
      await waitForNoteEditor();

      expect(handleRef.current?.isDirty()).toBe(false);

      act(() => typeNote("<p>Changed</p>"));

      expect(handleRef.current?.isDirty()).toBe(true);
    });

    it("counts a changed reference or a removed note as unsaved edits", async () => {
      const handleRef = createRef<ScriptureItemInputHandle>();
      act(() => {
        render(
          <ScriptureItemInput
            ref={handleRef}
            books={BOOKS}
            onAdd={vi.fn()}
            initialValue="Philemon"
            initialNote="<p>Existing</p>"
          />,
          container
        );
      });
      await waitForNoteEditor();

      act(() => setValue(input(), "Jude"));
      expect(handleRef.current?.isDirty()).toBe(true);

      act(() => setValue(input(), "Philemon"));
      expect(handleRef.current?.isDirty()).toBe(false);

      act(() => noteButton("Remove note").click());
      expect(handleRef.current?.isDirty()).toBe(true);
    });

    it("drops the note when it is removed, and starts blank if re-added", async () => {
      const onAdd = vi.fn();
      act(() => {
        render(
          <ScriptureItemInput
            books={BOOKS}
            onAdd={onAdd}
            initialValue="Philemon"
            initialNote="<p>Existing</p>"
          />,
          container
        );
      });
      await waitForNoteEditor();

      act(() => noteButton("Remove note").click());
      expect(container.querySelector(".stub-tiptap-editor")).toBeNull();

      await openNote();
      expect(noteEditor?.getHTML()).toBe("");

      await act(async () => {
        input().focus();
        submitButton().click();
      });
      expect(onAdd).toHaveBeenCalledWith({
        type: "bible-verse",
        ref: { bookId: "PHM", chapter: 1 },
      } satisfies PlaylistItemData);
    });
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

    it("commit() adds the highlighted reference and returns true", async () => {
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

      let result: boolean | undefined;
      await act(async () => {
        result = await handleRef.current?.commit();
      });

      expect(result).toBe(true);
      expect(onAdd).toHaveBeenCalledWith({
        type: "bible-verse",
        ref: { bookId: "PHM", chapter: 1 },
      } satisfies PlaylistItemData);
      expect(handleRef.current?.isDirty()).toBe(false);
    });

    it("commit() returns false and does not add when the reference is empty", async () => {
      const onAdd = vi.fn();
      const handleRef = createRef<ScriptureItemInputHandle>();
      act(() => {
        render(
          <ScriptureItemInput ref={handleRef} books={BOOKS} onAdd={onAdd} />,
          container
        );
      });

      let result: boolean | undefined;
      await act(async () => {
        result = await handleRef.current?.commit();
      });

      expect(result).toBe(false);
      expect(onAdd).not.toHaveBeenCalled();
    });
  });
});
