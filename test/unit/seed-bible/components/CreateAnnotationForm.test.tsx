import { render } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import { CreateAnnotationForm } from "@packages/seed-bible/seed-bible/components/CreateAnnotationForm/CreateAnnotationForm";
import type {
  Annotation,
  AnnotationsManager,
} from "@packages/seed-bible/seed-bible/managers/AnnotationsManager";
import type {
  TabsManager,
  ReaderTab,
} from "@packages/seed-bible/seed-bible/managers/TabsManager";

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

vi.mock(
  "@packages/seed-bible/seed-bible/components/TipTapEditor/TipTapEditor",
  () => ({
    default: (props: {
      initialContent?: string;
      onEditor: (editor: NonNullable<typeof fakeEditor>) => void;
      onEmptyChange: (isEmpty: boolean) => void;
    }) => {
      latestOnEmptyChange = props.onEmptyChange;
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

function createMockTabs(
  overrides: {
    bookId?: string;
    chapterNumber?: number;
    numberOfVerses?: number;
  } = {}
): TabsManager {
  const tab = {
    id: "tab-1",
    readingState: {
      chapterData: signal(
        overrides.numberOfVerses
          ? {
              book: { id: overrides.bookId ?? "GEN" },
              chapter: { number: overrides.chapterNumber ?? 1 },
              numberOfVerses: overrides.numberOfVerses,
            }
          : null
      ),
    },
  } as unknown as ReaderTab;
  return {
    tabs: signal([tab]),
    selectedTabId: signal(tab.id),
  } as unknown as TabsManager;
}

describe("CreateAnnotationForm", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    fakeEditor = undefined;
    latestOnEmptyChange = null;
  });

  afterEach(() => {
    render(null, container);
    container.remove();
    vi.restoreAllMocks();
  });

  it("renders nothing when there is no annotation being edited", async () => {
    const { annotations } = createMockAnnotationsManager(null);
    const tabs = createMockTabs();

    await act(async () => {
      render(
        <CreateAnnotationForm annotations={annotations} tabs={tabs} />,
        container
      );
      await flushLazyLoad();
    });

    expect(container.innerHTML).toBe("");
  });

  it("disables Save while the editor is empty, and enables it once typed", async () => {
    const { annotations } = createMockAnnotationsManager(createAnnotation());
    const tabs = createMockTabs();

    await act(async () => {
      render(
        <CreateAnnotationForm annotations={annotations} tabs={tabs} />,
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

  it("Save writes the sanitized HTML and verse selection into the draft, then saves", async () => {
    const { annotations, saveEditingAnnotation } =
      createMockAnnotationsManager(createAnnotation());
    const tabs = createMockTabs();

    await act(async () => {
      render(
        <CreateAnnotationForm annotations={annotations} tabs={tabs} />,
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
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(saveEditingAnnotation).toHaveBeenCalledTimes(1);
    expect(annotations.editingAnnotation.value?.data.html).toBe(
      "<p>Great verse</p>"
    );
  });

  it("Cancel calls cancelEditingAnnotation", async () => {
    const { annotations, cancelEditingAnnotation } =
      createMockAnnotationsManager(createAnnotation());
    const tabs = createMockTabs();

    await act(async () => {
      render(
        <CreateAnnotationForm annotations={annotations} tabs={tabs} />,
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

  it("defaults to 'Whole chapter' and switching to specific verses sets verseNumber/endVerseNumber", async () => {
    const { annotations } = createMockAnnotationsManager(createAnnotation());
    const tabs = createMockTabs();

    await act(async () => {
      render(
        <CreateAnnotationForm annotations={annotations} tabs={tabs} />,
        container
      );
      await flushLazyLoad();
    });

    const radios = container.querySelectorAll<HTMLInputElement>(
      'input[name="annotation-scope"]'
    );
    expect(radios).toHaveLength(2);
    expect(radios[0]?.checked).toBe(true); // "Whole chapter"

    act(() => {
      radios[1]!.checked = true;
      radios[1]!.dispatchEvent(new Event("change", { bubbles: true }));
    });

    expect(annotations.editingAnnotation.value?.verseNumber).toBe(1);
    expect(annotations.editingAnnotation.value?.endVerseNumber).toBeNull();
  });

  it("switching back to 'Whole chapter' clears verseNumber/endVerseNumber", async () => {
    const { annotations } = createMockAnnotationsManager(
      createAnnotation({ verseNumber: 3, endVerseNumber: 5 })
    );
    const tabs = createMockTabs();

    await act(async () => {
      render(
        <CreateAnnotationForm annotations={annotations} tabs={tabs} />,
        container
      );
      await flushLazyLoad();
    });

    const radios = container.querySelectorAll<HTMLInputElement>(
      'input[name="annotation-scope"]'
    );
    expect(radios[1]?.checked).toBe(true); // "Specific verse(s)"

    act(() => {
      radios[0]!.checked = true;
      radios[0]!.dispatchEvent(new Event("change", { bubbles: true }));
    });

    expect(annotations.editingAnnotation.value?.verseNumber).toBeNull();
    expect(annotations.editingAnnotation.value?.endVerseNumber).toBeNull();
  });

  it("editing the from/to verse inputs updates the draft, clamped to the chapter's verse count", async () => {
    const { annotations } = createMockAnnotationsManager(
      createAnnotation({ verseNumber: 1, endVerseNumber: null })
    );
    const tabs = createMockTabs({
      bookId: "GEN",
      chapterNumber: 1,
      numberOfVerses: 10,
    });

    await act(async () => {
      render(
        <CreateAnnotationForm annotations={annotations} tabs={tabs} />,
        container
      );
      await flushLazyLoad();
    });

    const [fromInput, toInput] = container.querySelectorAll<HTMLInputElement>(
      ".sb-annotation-verse-input"
    );

    act(() => {
      fromInput!.value = "3";
      fromInput!.dispatchEvent(new Event("input", { bubbles: true }));
    });
    act(() => {
      toInput!.value = "999";
      toInput!.dispatchEvent(new Event("input", { bubbles: true }));
    });

    expect(annotations.editingAnnotation.value?.verseNumber).toBe(3);
    // Clamped to the chapter's actual verse count (10).
    expect(annotations.editingAnnotation.value?.endVerseNumber).toBe(10);
  });
});
