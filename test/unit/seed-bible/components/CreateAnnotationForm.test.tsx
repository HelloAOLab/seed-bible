import { render } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import { CreateAnnotationForm } from "@packages/seed-bible/seed-bible/components/CreateAnnotationForm/CreateAnnotationForm";
import type {
  Annotation,
  AnnotationsManager,
} from "@packages/seed-bible/seed-bible/managers/AnnotationsManager";
import type { TabsManager } from "@packages/seed-bible/seed-bible/managers/TabsManager";
import type { TranslationBookChapter } from "@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI";

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const actual = await vi.importActual<
    typeof import("@packages/seed-bible/seed-bible/i18n/I18nManager")
  >("@packages/seed-bible/seed-bible/i18n/I18nManager");
  return {
    ...actual,
    useI18n: () => ({
      t: (key: string, options?: Record<string, unknown>) => {
        let str = (options?.defaultValue as string | undefined) ?? key;
        for (const [optionKey, value] of Object.entries(options ?? {})) {
          if (optionKey === "defaultValue") continue;
          str = str.replaceAll(`{{${optionKey}}}`, String(value));
        }
        return str;
      },
      language: "en",
    }),
  };
});

vi.mock("@packages/seed-bible/seed-bible/managers/Sanitization", () => ({
  sanitize: vi.fn(async (html: string) => html),
}));

/**
 * A minimal stand-in for the live TipTap `Editor` instance, mirroring the
 * approach in `TextItemInput.test.tsx`: `CreateAnnotationForm` lazily loads
 * the real `TipTapEditor`, so this replaces that module entirely.
 */
let fakeEditor:
  | {
      isEmpty: boolean;
      getHTML: () => string;
    }
  | undefined;
let latestOnEmptyChange: ((isEmpty: boolean) => void) | null = null;
let latestOnModEnter: (() => void) | undefined;

vi.mock(
  "@packages/seed-bible/seed-bible/components/TipTapEditor/TipTapEditor",
  () => ({
    default: (props: {
      initialContent?: string;
      onEditor: (editor: NonNullable<typeof fakeEditor>) => void;
      onEmptyChange: (isEmpty: boolean) => void;
      onModEnter?: () => void;
    }) => {
      latestOnEmptyChange = props.onEmptyChange;
      latestOnModEnter = props.onModEnter;
      if (!fakeEditor) {
        fakeEditor = {
          isEmpty: !props.initialContent,
          getHTML: () => "<p>Great verse</p>",
        };
      }
      props.onEditor(fakeEditor);
      return <div className="stub-tiptap-editor" />;
    },
  })
);

/** Simulates the user typing into the (stubbed) editor. */
function typeIntoEditor() {
  fakeEditor!.isEmpty = false;
  latestOnEmptyChange?.(false);
}

/**
 * Waits for the lazily-loaded TipTap editor to mount. Preact's `lazy()`
 * resolves the dynamic import and schedules a re-render on a real timer
 * tick, not just microtasks, so this needs an actual `setTimeout`.
 */
async function flushLazyLoad() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

async function flushSave() {
  await Promise.resolve();
  await Promise.resolve();
}

function createAnnotation(overrides: Partial<Annotation> = {}): Annotation {
  return {
    id: "ann-1",
    bookId: "GEN",
    chapterNumber: 1,
    verseNumber: null,
    endVerseNumber: null,
    data: { type: "comment", html: "" },
    ...overrides,
  };
}

function createMockAnnotationsManager(editing: Annotation | null) {
  const editingAnnotation = signal(editing);
  const saveEditingAnnotation = vi.fn().mockResolvedValue(undefined);
  const cancelEditingAnnotation = vi.fn();
  const annotations = {
    editingAnnotation,
    saveEditingAnnotation,
    cancelEditingAnnotation,
  } as unknown as AnnotationsManager;
  return { annotations, saveEditingAnnotation, cancelEditingAnnotation };
}

function createChapterVerse(number: number, text: string) {
  return { type: "verse", number, content: [text] };
}

function createChapterData(
  overrides: { bookId?: string; chapterNumber?: number; verses?: number[] } = {}
): TranslationBookChapter {
  const { bookId = "GEN", chapterNumber = 1, verses = [1, 2, 3] } = overrides;
  return {
    translation: { id: "engwebp" },
    book: { id: bookId, name: "Genesis", commonName: "Genesis" },
    chapter: {
      number: chapterNumber,
      content: verses.map((n) => createChapterVerse(n, `Verse ${n} text.`)),
      footnotes: [],
    },
  } as unknown as TranslationBookChapter;
}

function createMockTabsManager(
  chapterData: TranslationBookChapter | null = null
): TabsManager {
  return {
    tabs: signal(
      chapterData
        ? [
            {
              id: "tab-1",
              readingState: { chapterData: signal(chapterData) },
            },
          ]
        : []
    ),
    selectedTabId: signal("tab-1"),
  } as unknown as TabsManager;
}

describe("CreateAnnotationForm", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    fakeEditor = undefined;
    latestOnEmptyChange = null;
    latestOnModEnter = undefined;
  });

  afterEach(() => {
    render(null, container);
    container.remove();
    vi.restoreAllMocks();
  });

  it("renders nothing when there is no annotation being edited", async () => {
    const { annotations } = createMockAnnotationsManager(null);
    const tabs = createMockTabsManager();

    await act(async () => {
      render(
        <CreateAnnotationForm
          annotations={annotations}
          tabs={tabs}
          toast={vi.fn()}
        />,
        container
      );
      await flushLazyLoad();
    });

    expect(container.innerHTML).toBe("");
  });

  it("disables Save while the editor is empty, and enables it once typed", async () => {
    const { annotations } = createMockAnnotationsManager(createAnnotation());
    const tabs = createMockTabsManager();

    await act(async () => {
      render(
        <CreateAnnotationForm
          annotations={annotations}
          tabs={tabs}
          toast={vi.fn()}
        />,
        container
      );
      await flushLazyLoad();
    });

    const saveButton = container.querySelector(
      ".sb-settings-save-button"
    ) as HTMLButtonElement;
    expect(saveButton.disabled).toBe(true);

    act(() => {
      typeIntoEditor();
    });
    expect(saveButton.disabled).toBe(false);
  });

  it("Save writes the sanitized HTML into the draft, then saves", async () => {
    const { annotations, saveEditingAnnotation } =
      createMockAnnotationsManager(createAnnotation());
    const tabs = createMockTabsManager();
    const toast = vi.fn();

    await act(async () => {
      render(
        <CreateAnnotationForm
          annotations={annotations}
          tabs={tabs}
          toast={toast}
        />,
        container
      );
      await flushLazyLoad();
    });

    act(() => {
      typeIntoEditor();
    });

    const saveButton = container.querySelector(
      ".sb-settings-save-button"
    ) as HTMLButtonElement;
    await act(async () => {
      saveButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await flushSave();
    });

    expect(saveEditingAnnotation).toHaveBeenCalledTimes(1);
    expect(annotations.editingAnnotation.value?.data.html).toBe(
      "<p>Great verse</p>"
    );
    expect(toast).toHaveBeenCalledWith("Annotation saved");
  });

  it("Cancel calls cancelEditingAnnotation", async () => {
    const { annotations, cancelEditingAnnotation } =
      createMockAnnotationsManager(createAnnotation());
    const tabs = createMockTabsManager();

    await act(async () => {
      render(
        <CreateAnnotationForm
          annotations={annotations}
          tabs={tabs}
          toast={vi.fn()}
        />,
        container
      );
      await flushLazyLoad();
    });

    const cancelButton = container.querySelector(
      ".sb-reading-plans-back"
    ) as HTMLButtonElement;
    act(() => {
      cancelButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(cancelEditingAnnotation).toHaveBeenCalledTimes(1);
  });

  it("shows the verse reference and quoted text when the annotated chapter is open in a tab", async () => {
    const { annotations } = createMockAnnotationsManager(
      createAnnotation({ verseNumbers: [2, 3] })
    );
    const tabs = createMockTabsManager(createChapterData());

    await act(async () => {
      render(
        <CreateAnnotationForm
          annotations={annotations}
          tabs={tabs}
          toast={vi.fn()}
        />,
        container
      );
      await flushLazyLoad();
    });

    const reference = container.querySelector(
      ".sb-annotation-verse-quote-reference"
    );
    const text = container.querySelector(".sb-annotation-verse-quote-text");
    expect(reference?.textContent).toBe("Genesis 1:2-3");
    expect(text?.textContent).toBe("Verse 2 text. Verse 3 text.");
  });

  it("shows the reference only when no open tab has the annotated chapter loaded", async () => {
    const { annotations } = createMockAnnotationsManager(
      createAnnotation({ verseNumbers: [2, 3] })
    );
    const tabs = createMockTabsManager();

    await act(async () => {
      render(
        <CreateAnnotationForm
          annotations={annotations}
          tabs={tabs}
          toast={vi.fn()}
        />,
        container
      );
      await flushLazyLoad();
    });

    const reference = container.querySelector(
      ".sb-annotation-verse-quote-reference"
    );
    const text = container.querySelector(".sb-annotation-verse-quote-text");
    expect(reference?.textContent).toBe("GEN 1:2-3");
    expect(text).toBeNull();
  });

  it("renders no quote box for a whole-chapter annotation", async () => {
    const { annotations } = createMockAnnotationsManager(createAnnotation());
    const tabs = createMockTabsManager(createChapterData());

    await act(async () => {
      render(
        <CreateAnnotationForm
          annotations={annotations}
          tabs={tabs}
          toast={vi.fn()}
        />,
        container
      );
      await flushLazyLoad();
    });

    expect(container.querySelector(".sb-annotation-verse-quote")).toBeNull();
  });

  it("Cmd/Ctrl+Enter saves the annotation the same way the Save button does", async () => {
    const { annotations, saveEditingAnnotation } =
      createMockAnnotationsManager(createAnnotation());
    const tabs = createMockTabsManager();
    const toast = vi.fn();

    await act(async () => {
      render(
        <CreateAnnotationForm
          annotations={annotations}
          tabs={tabs}
          toast={toast}
        />,
        container
      );
      await flushLazyLoad();
    });

    act(() => {
      typeIntoEditor();
    });

    expect(latestOnModEnter).toBeTypeOf("function");
    await act(async () => {
      latestOnModEnter?.();
      await flushSave();
    });

    expect(saveEditingAnnotation).toHaveBeenCalledTimes(1);
    expect(annotations.editingAnnotation.value?.data.html).toBe(
      "<p>Great verse</p>"
    );
    expect(toast).toHaveBeenCalledWith("Annotation saved");
  });

  it("Cmd/Ctrl+Enter does not save while the editor is empty", async () => {
    const { annotations, saveEditingAnnotation } =
      createMockAnnotationsManager(createAnnotation());
    const tabs = createMockTabsManager();
    const toast = vi.fn();

    await act(async () => {
      render(
        <CreateAnnotationForm
          annotations={annotations}
          tabs={tabs}
          toast={toast}
        />,
        container
      );
      await flushLazyLoad();
    });

    await act(async () => {
      latestOnModEnter?.();
      await flushSave();
    });

    expect(saveEditingAnnotation).not.toHaveBeenCalled();
    expect(toast).not.toHaveBeenCalled();
  });

  it("shows an error and does not toast when save fails", async () => {
    const { annotations, saveEditingAnnotation } =
      createMockAnnotationsManager(createAnnotation());
    saveEditingAnnotation.mockRejectedValue(new Error("nope"));
    const tabs = createMockTabsManager();
    const toast = vi.fn();
    vi.spyOn(console, "error").mockImplementation(() => {});

    await act(async () => {
      render(
        <CreateAnnotationForm
          annotations={annotations}
          tabs={tabs}
          toast={toast}
        />,
        container
      );
      await flushLazyLoad();
    });

    act(() => {
      typeIntoEditor();
    });

    const saveButton = container.querySelector(
      ".sb-settings-save-button"
    ) as HTMLButtonElement;
    await act(async () => {
      saveButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await flushSave();
    });

    expect(toast).not.toHaveBeenCalled();
    expect(container.querySelector(".sb-playlist-add-error")?.textContent).toBe(
      "Couldn't save the annotation."
    );
    expect(saveButton.disabled).toBe(false);
    expect(saveButton.textContent).toBe("Save");
  });

  it("labels the Save button with the platform save shortcut", async () => {
    const { annotations } = createMockAnnotationsManager(createAnnotation());
    const tabs = createMockTabsManager();

    await act(async () => {
      render(
        <CreateAnnotationForm
          annotations={annotations}
          tabs={tabs}
          toast={vi.fn()}
        />,
        container
      );
      await flushLazyLoad();
    });

    const saveButton = container.querySelector(
      ".sb-settings-save-button"
    ) as HTMLButtonElement;
    const isMac = /Mac/.test(navigator.platform);
    expect(saveButton.getAttribute("aria-keyshortcuts")).toBe(
      isMac ? "Meta+Enter" : "Control+Enter"
    );
    expect(saveButton.title).toBe(
      isMac ? "Save (⌘Enter)" : "Save (Ctrl+Enter)"
    );
  });
});
