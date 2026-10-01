import { render } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import { CreateAnnotationForm } from "@packages/seed-bible/seed-bible/components/CreateAnnotationForm/CreateAnnotationForm";
import type {
  Annotation,
  AnnotationsManager,
} from "@packages/seed-bible/seed-bible/managers/AnnotationsManager";
import type { TabsManager } from "@packages/seed-bible/seed-bible/managers/TabsManager";

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

// Simulates the lazily-loaded TipTap chunk failing to download, as it does
// when the user is offline and the chunk isn't cached yet.
vi.mock(
  "@packages/seed-bible/seed-bible/components/TipTapEditor/TipTapEditor",
  () => {
    throw new TypeError("Failed to fetch dynamically imported module");
  }
);

/**
 * Preact's `lazy()` settles the dynamic import and schedules a re-render on a
 * real timer tick, so poll for the fallback rather than relying on microtasks.
 * Each tick runs in its own `act()`, which only flushes renders as it exits.
 */
async function waitForTextarea(
  container: HTMLElement
): Promise<HTMLTextAreaElement> {
  const deadline = Date.now() + 2000;
  for (;;) {
    const textarea = container.querySelector("textarea");
    if (textarea) {
      return textarea;
    }
    if (Date.now() > deadline) {
      throw new Error("Timed out waiting for the fallback textarea");
    }
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
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
  const annotations = {
    editingAnnotation,
    saveEditingAnnotation,
    cancelEditingAnnotation: vi.fn(),
  } as unknown as AnnotationsManager;
  return { annotations, saveEditingAnnotation };
}

function createMockTabsManager(): TabsManager {
  return {
    tabs: signal([]),
    selectedTabId: signal("tab-1"),
  } as unknown as TabsManager;
}

function typeInto(textarea: HTMLTextAreaElement, value: string) {
  textarea.value = value;
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
}

async function flushSave() {
  await Promise.resolve();
  await Promise.resolve();
}

describe("CreateAnnotationForm when the rich text editor can't load", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    render(null, container);
    container.remove();
    vi.restoreAllMocks();
  });

  async function renderForm(annotation: Annotation) {
    const { annotations, saveEditingAnnotation } =
      createMockAnnotationsManager(annotation);
    const toast = vi.fn();
    await act(async () => {
      render(
        <CreateAnnotationForm
          annotations={annotations}
          tabs={createMockTabsManager()}
          toast={toast}
        />,
        container
      );
    });
    const textarea = await waitForTextarea(container);
    const saveButton = container.querySelector(
      ".sb-settings-save-button"
    ) as HTMLButtonElement;
    return { annotations, saveEditingAnnotation, toast, textarea, saveButton };
  }

  it("shows a plain textarea with a notice instead of the editor", async () => {
    const { textarea, saveButton } = await renderForm(createAnnotation());

    expect(textarea.value).toBe("");
    expect(document.activeElement).toBe(textarea);
    expect(
      container.querySelector(".sb-annotation-editor-offline-notice")
        ?.textContent
    ).toBe(
      "The formatting editor couldn't load, so this note will be saved as plain text."
    );
    expect(saveButton.disabled).toBe(true);
  });

  it("saves typed text as escaped paragraphs", async () => {
    const { annotations, saveEditingAnnotation, toast, textarea, saveButton } =
      await renderForm(createAnnotation());

    act(() => {
      typeInto(textarea, "First <line>\nSecond & last");
    });
    expect(saveButton.disabled).toBe(false);

    await act(async () => {
      saveButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await flushSave();
    });

    expect(saveEditingAnnotation).toHaveBeenCalledTimes(1);
    expect(annotations.editingAnnotation.value?.data.html).toBe(
      "<p>First &lt;line&gt;</p><p>Second &amp; last</p>"
    );
    expect(toast).toHaveBeenCalledWith("Annotation saved");
  });

  it("keeps Save disabled for whitespace-only text", async () => {
    const { textarea, saveButton } = await renderForm(createAnnotation());

    act(() => {
      typeInto(textarea, "   \n  ");
    });

    expect(saveButton.disabled).toBe(true);
  });

  it("saves with Cmd/Ctrl+Enter", async () => {
    const { saveEditingAnnotation, textarea } =
      await renderForm(createAnnotation());
    const isMac = /Mac/.test(navigator.platform);

    act(() => {
      typeInto(textarea, "Quick note");
    });
    await act(async () => {
      textarea.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Enter",
          metaKey: isMac,
          ctrlKey: !isMac,
          bubbles: true,
        })
      );
      await flushSave();
    });

    expect(saveEditingAnnotation).toHaveBeenCalledTimes(1);
  });

  it("seeds an existing annotation's text, one line per paragraph", async () => {
    const { textarea, saveButton } = await renderForm(
      createAnnotation({
        data: {
          type: "comment",
          html: "<p>Already <strong>written</strong></p><p>Second</p>",
        },
      })
    );

    expect(textarea.value).toBe("Already written\nSecond");
    expect(saveButton.disabled).toBe(false);
  });
});
