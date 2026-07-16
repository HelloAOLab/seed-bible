import { render } from "preact";
import { act } from "preact/test-utils";
import { ScriptureItemInput } from "@packages/seed-bible/seed-bible/components/ScriptureItemInput/ScriptureItemInput";
import type { TranslationBook } from "@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI";
import type { PlaylistItemData } from "@packages/seed-bible/seed-bible/managers/PlaylistManager";

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const actual = await vi.importActual<
    typeof import("@packages/seed-bible/seed-bible/i18n/I18nManager")
  >("@packages/seed-bible/seed-bible/i18n/I18nManager");
  return {
    ...actual,
    useI18n: () => ({
      t: (key: string, options?: { defaultValue?: string }) =>
        options?.defaultValue ?? key,
      language: "en",
    }),
  };
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
});
