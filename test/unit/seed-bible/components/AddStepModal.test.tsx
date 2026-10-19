import { render } from "preact";
import { act } from "preact/test-utils";
import {
  AddStepModalContent,
  openAddStepModal,
  ADD_STEP_MODAL_ID,
} from "@packages/seed-bible/seed-bible/components/PlaylistEditor/AddStepModal";
import { PassagePicker } from "@packages/seed-bible/seed-bible/components/PassagePicker/PassagePicker";
import { createModalManager } from "@packages/seed-bible/seed-bible/managers/ModalManager";
import type {
  TranslationBook,
  TranslationBookChapter,
} from "@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI";
import type { VerseRef } from "@packages/seed-bible/seed-bible/managers/PlaylistManager";

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const { mockI18nManager } = await import("../testUtils/mockI18n");
  return mockI18nManager();
});

const t = ((key: string, options?: Record<string, unknown>) =>
  String(options?.defaultValue ?? key).replace(
    /\{\{(\w+)\}\}/g,
    (_match, name: string) => String(options?.[name] ?? "")
  )) as Parameters<typeof openAddStepModal>[1];

const books = [
  {
    id: "GEN",
    name: "Genesis",
    commonName: "Genesis",
    numberOfChapters: 50,
    firstChapterNumber: 1,
    totalNumberOfVerses: 1533,
  },
  {
    id: "EXO",
    name: "Exodus",
    commonName: "Exodus",
    numberOfChapters: 40,
    firstChapterNumber: 1,
    totalNumberOfVerses: 1213,
  },
] as unknown as TranslationBook[];

const loadChapter = vi.fn(
  async (_t: unknown, bookId: string, chapter: number) =>
    ({
      chapter: {
        number: chapter,
        footnotes: [],
        content: [10, 11, 12, 13].map((number) => ({
          type: "verse",
          number,
          content: [`${bookId} ${chapter}:${number} says.`],
        })),
      },
    }) as unknown as TranslationBookChapter
);

describe("PassagePicker", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  function renderPicker(initial: VerseRef | null = null) {
    let value = initial;
    const onChange = vi.fn((next: VerseRef | null) => {
      value = next;
      rerender();
    });
    const rerender = () =>
      act(() => {
        render(
          <PassagePicker
            books={books}
            loadChapter={loadChapter}
            value={value}
            onChange={onChange}
          />,
          container
        );
      });
    rerender();
    return { onChange, value: () => value };
  }

  const verseRows = () =>
    Array.from(
      container.querySelectorAll<HTMLButtonElement>(".sb-passage-picker-verse")
    );

  it("reads a typed reference, lists the chapter's verses and marks the ones in it", async () => {
    const { value } = renderPicker();
    const input = container.querySelector<HTMLInputElement>(
      ".sb-passage-picker-input"
    )!;
    act(() => {
      input.value = "Gen 22:11-12";
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(value()).toEqual({
      bookId: "GEN",
      chapter: 22,
      verse: 11,
      endVerse: 12,
    });
    expect(
      container.querySelector<HTMLSelectElement>(".sb-passage-picker-select")
        ?.value
    ).toBe("GEN");
    await vi.waitFor(() => expect(verseRows()).toHaveLength(4));
    expect(verseRows().map((row) => row.getAttribute("aria-selected"))).toEqual(
      ["false", "true", "true", "false"]
    );
  });

  it("picks verses by clicking the first and then the last, and writes the reference back", async () => {
    const { value } = renderPicker({ bookId: "GEN", chapter: 22 });
    await vi.waitFor(() => expect(verseRows()).toHaveLength(4));

    act(() => {
      verseRows()[1]!.dispatchEvent(
        new MouseEvent("mousedown", { bubbles: true, cancelable: true })
      );
    });
    expect(value()).toEqual({ bookId: "GEN", chapter: 22, verse: 11 });
    act(() => {
      verseRows()[3]!.dispatchEvent(
        new MouseEvent("mousedown", {
          bubbles: true,
          cancelable: true,
          shiftKey: true,
        })
      );
    });
    expect(value()).toEqual({
      bookId: "GEN",
      chapter: 22,
      verse: 11,
      endVerse: 13,
    });
    expect(
      container.querySelector<HTMLInputElement>(".sb-passage-picker-input")
        ?.value
    ).toBe("Genesis 22:11-13");
  });

  it("drags across verses to select them", async () => {
    const { value } = renderPicker({ bookId: "EXO", chapter: 3 });
    await vi.waitFor(() => expect(verseRows()).toHaveLength(4));

    act(() => {
      verseRows()[0]!.dispatchEvent(
        new MouseEvent("mousedown", { bubbles: true, cancelable: true })
      );
    });
    act(() => {
      verseRows()[2]!.dispatchEvent(
        new MouseEvent("mouseenter", { bubbles: false })
      );
    });
    expect(value()).toEqual({
      bookId: "EXO",
      chapter: 3,
      verse: 10,
      endVerse: 12,
    });
  });

  it("the book and chapter menus pick a whole chapter", () => {
    const { value } = renderPicker();
    const bookSelect = container.querySelector<HTMLSelectElement>(
      ".sb-passage-picker-select"
    )!;
    act(() => {
      bookSelect.value = "EXO";
      bookSelect.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(value()).toEqual({ bookId: "EXO", chapter: 1 });
    const chapterSelect = container.querySelector<HTMLSelectElement>(
      ".sb-passage-picker-select--chapter"
    )!;
    act(() => {
      chapterSelect.value = "3";
      chapterSelect.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(value()).toEqual({ bookId: "EXO", chapter: 3 });
  });
});

describe("AddStepModal", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  it("opens in the app's modal with the position under its title", () => {
    const modals = createModalManager();
    openAddStepModal(modals, t, {
      books,
      position: "After step 4 · Scene 2 · Abraham",
      onAdd: vi.fn(),
    });
    const modal = modals.modals.value.find((m) => m.id === ADD_STEP_MODAL_ID)!;
    expect(modal.title).toBe("Add a step");
    act(() => {
      render(<>{modal.content({ t })}</>, container);
    });
    expect(container.querySelector(".sb-add-step-position")?.textContent).toBe(
      "After step 4 · Scene 2 · Abraham"
    );
  });

  it("lists the kinds, picks a passage for a scripture step and sums it up before adding", async () => {
    const onAdd = vi.fn();
    const onCancel = vi.fn();
    act(() => {
      render(
        <AddStepModalContent
          books={books}
          loadChapter={loadChapter}
          onAdd={onAdd}
          onCancel={onCancel}
        />,
        container
      );
    });
    const types = Array.from(
      container.querySelectorAll<HTMLButtonElement>(".sb-add-step-type")
    );
    expect(
      types.map((b) => b.querySelector(".sb-add-step-type-label")?.textContent)
    ).toEqual([
      "Note",
      "Scripture",
      "Note + Scripture",
      "Compare",
      "Video",
      "Question",
    ]);
    expect(types[1]!.getAttribute("aria-checked")).toBe("true");
    expect(container.querySelector(".sb-add-step-summary")?.textContent).toBe(
      "ScriptureNo passage yet"
    );

    const input = container.querySelector<HTMLInputElement>(
      ".sb-passage-picker-input"
    )!;
    act(() => {
      input.value = "Gen 22:11-18";
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(container.querySelector(".sb-add-step-summary")?.textContent).toBe(
      "ScriptureGenesis 22:11-18 · 8 verses · ~2 min"
    );

    await act(async () => {
      Array.from(container.querySelectorAll("button"))
        .find((b) => b.textContent?.startsWith("Add step"))!
        .click();
      await Promise.resolve();
    });
    expect(onAdd).toHaveBeenCalledWith({
      type: "bible-verse",
      ref: { bookId: "GEN", chapter: 22, verse: 11, endVerse: 18 },
    });
  });

  it("refuses to add a scripture step without a passage, and Cancel closes", async () => {
    const onAdd = vi.fn();
    const onCancel = vi.fn();
    act(() => {
      render(
        <AddStepModalContent books={books} onAdd={onAdd} onCancel={onCancel} />,
        container
      );
    });
    await act(async () => {
      Array.from(container.querySelectorAll("button"))
        .find((b) => b.textContent?.startsWith("Add step"))!
        .click();
      await Promise.resolve();
    });
    expect(onAdd).not.toHaveBeenCalled();
    expect(container.querySelector(".sb-playlist-add-error")?.textContent).toBe(
      "Couldn't find that reference"
    );
    act(() => {
      Array.from(container.querySelectorAll("button"))
        .find((b) => b.textContent === "Cancel")!
        .click();
    });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("adds a question through the kind's own fields", async () => {
    const onAdd = vi.fn();
    act(() => {
      render(
        <AddStepModalContent
          books={books}
          initialMode="question"
          onAdd={onAdd}
          onCancel={vi.fn()}
        />,
        container
      );
    });
    const prompt = container.querySelector<HTMLTextAreaElement>(
      ".sb-add-step-fields textarea"
    )!;
    act(() => {
      prompt.value = "Who sees?";
      prompt.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => {
      Array.from(container.querySelectorAll("button"))
        .find((b) => b.textContent?.startsWith("Add step"))!
        .click();
      await Promise.resolve();
    });
    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({ type: "question", prompt: "Who sees?" })
    );
  });
});
