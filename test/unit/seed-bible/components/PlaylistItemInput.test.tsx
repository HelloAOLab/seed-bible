import { render, createRef } from "preact";
import { act } from "preact/test-utils";
import {
  PlaylistItemInput,
  type PlaylistItemInputHandle,
} from "@packages/seed-bible/seed-bible/components/PlaylistItemInput/PlaylistItemInput";
import type {
  TranslationBook,
  TranslationBookChapter,
} from "@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI";
import type { PlaylistItemData } from "@packages/seed-bible/seed-bible/managers/PlaylistManager";

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const { mockI18nManager } = await import("../testUtils/mockI18n");
  return mockI18nManager();
});

function book(id: string, commonName: string): TranslationBook {
  return {
    id,
    name: commonName,
    commonName,
    title: null,
    order: 1,
    numberOfChapters: 50,
    firstChapterNumber: 1,
    totalNumberOfVerses: 1533,
  } as TranslationBook;
}

const BOOKS = [book("GEN", "Genesis")];

function setValue(input: HTMLInputElement, value: string) {
  input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

const chapterWith = (text: string) =>
  ({
    chapter: {
      number: 1,
      footnotes: [],
      content: [{ type: "verse", number: 1, content: [text] }],
    },
  }) as unknown as TranslationBookChapter;

describe("PlaylistItemInput", () => {
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

  const buttonLabelled = (label: string) =>
    Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent === label
    );

  it("adds items from its own section with a type picker", () => {
    act(() => {
      render(<PlaylistItemInput books={BOOKS} onAdd={vi.fn()} />, container);
    });

    expect(container.querySelector(".sb-playlist-item-input")).not.toBeNull();
    expect(container.querySelector(".sb-playlist-type-picker")).not.toBeNull();
    expect(container.querySelector(".sb-playlist-item-editor")).toBeNull();
    expect(buttonLabelled("Add item")).toBeDefined();
  });

  describe("editing an item", () => {
    const scripture: PlaylistItemData = {
      type: "bible-verse",
      ref: { bookId: "GEN", chapter: 1 },
    };

    it("renders inline, without the section chrome or type picker, and shows the passage", async () => {
      const loadChapter = vi.fn(async () => chapterWith("In the beginning"));
      act(() => {
        render(
          <PlaylistItemInput
            id="editor-1"
            books={BOOKS}
            onAdd={vi.fn()}
            editItem={scripture}
            editScriptureText="Genesis 1"
            loadChapter={loadChapter}
          />,
          container
        );
      });

      const editor = container.querySelector(".sb-playlist-item-editor");
      expect(editor?.id).toBe("editor-1");
      expect(container.querySelector(".sb-playlist-item-input")).toBeNull();
      expect(container.querySelector(".sb-playlist-type-picker")).toBeNull();
      expect(
        container.querySelector<HTMLInputElement>(".sb-scripture-input input")
          ?.value
      ).toBe("Genesis 1");
      expect(buttonLabelled("Save changes")).toBeDefined();
      expect(buttonLabelled("Cancel")).toBeDefined();

      await vi.waitFor(() =>
        expect(
          container.querySelector(".sb-item-inline-preview")?.textContent
        ).toContain("In the beginning")
      );
      expect(loadChapter).toHaveBeenCalledWith(undefined, "GEN", 1);
    });

    it("shows no passage for a link item", () => {
      act(() => {
        render(
          <PlaylistItemInput
            books={BOOKS}
            onAdd={vi.fn()}
            editItem={{ type: "link", url: "https://example.com" }}
          />,
          container
        );
      });

      expect(container.querySelector(".sb-item-inline-preview")).toBeNull();
      expect(
        container.querySelector<HTMLInputElement>('input[type="url"]')?.value
      ).toBe("https://example.com");
    });

    it("saves through onUpdate, not onAdd", () => {
      const onAdd = vi.fn();
      const onUpdate = vi.fn();
      act(() => {
        render(
          <PlaylistItemInput
            books={BOOKS}
            onAdd={onAdd}
            editItem={scripture}
            editScriptureText="Genesis 1"
            onUpdate={onUpdate}
          />,
          container
        );
      });

      const input = container.querySelector<HTMLInputElement>(
        ".sb-scripture-input input"
      )!;
      act(() => {
        input.focus();
        setValue(input, "Genesis 2");
      });
      act(() => {
        buttonLabelled("Save changes")?.dispatchEvent(
          new MouseEvent("click", { bubbles: true })
        );
      });

      expect(onUpdate).toHaveBeenCalledWith({
        type: "bible-verse",
        ref: { bookId: "GEN", chapter: 2 },
      });
      expect(onAdd).not.toHaveBeenCalled();
    });

    it("Cancel calls onCancelEdit", () => {
      const onCancelEdit = vi.fn();
      act(() => {
        render(
          <PlaylistItemInput
            books={BOOKS}
            onAdd={vi.fn()}
            editItem={scripture}
            editScriptureText="Genesis 1"
            onCancelEdit={onCancelEdit}
          />,
          container
        );
      });

      act(() => {
        buttonLabelled("Cancel")?.dispatchEvent(
          new MouseEvent("click", { bubbles: true })
        );
      });

      expect(onCancelEdit).toHaveBeenCalledTimes(1);
    });

    it("isDirty reports only changes from the item's starting values", () => {
      const handleRef = createRef<PlaylistItemInputHandle>();
      act(() => {
        render(
          <PlaylistItemInput
            ref={handleRef}
            books={BOOKS}
            onAdd={vi.fn()}
            editItem={scripture}
            editScriptureText="Genesis 1"
          />,
          container
        );
      });

      expect(handleRef.current?.isDirty()).toBe(false);

      act(() => {
        setValue(
          container.querySelector<HTMLInputElement>(
            ".sb-scripture-input input"
          )!,
          "Genesis 2"
        );
      });

      expect(handleRef.current?.isDirty()).toBe(true);
    });
  });
});
