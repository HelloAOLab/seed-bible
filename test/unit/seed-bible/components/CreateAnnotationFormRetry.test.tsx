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

const tipTap = vi.hoisted(() => ({ available: false }));

// Fails like a chunk download while offline until `tipTap.available` is set.
vi.mock(
  "@packages/seed-bible/seed-bible/components/TipTapEditor/TipTapEditor",
  () => {
    if (!tipTap.available) {
      throw new TypeError("Failed to fetch dynamically imported module");
    }
    return {
      default: () => <div className="stub-tiptap-editor" />,
    };
  }
);

/**
 * Polls (each tick in its own `act()`, which only flushes renders on exit)
 * until `lazy()` has settled into either the fallback or the TipTap stub.
 */
async function waitForEditor(container: HTMLElement): Promise<Element> {
  const deadline = Date.now() + 2000;
  for (;;) {
    const editor = container.querySelector("textarea, .stub-tiptap-editor");
    if (editor) {
      return editor;
    }
    if (Date.now() > deadline) {
      throw new Error("Timed out waiting for an annotation editor");
    }
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
}

function createAnnotation(): Annotation {
  return {
    id: "ann-1",
    bookId: "GEN",
    chapterNumber: 1,
    verseNumber: null,
    endVerseNumber: null,
    data: { type: "comment", html: "" },
  };
}

function setOnline(online: boolean) {
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(online);
}

describe("CreateAnnotationForm retrying the rich text editor", () => {
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
    vi.unstubAllGlobals();
  });

  async function openForm() {
    const annotations = {
      editingAnnotation: signal(createAnnotation()),
      saveEditingAnnotation: vi.fn(),
      cancelEditingAnnotation: vi.fn(),
    } as unknown as AnnotationsManager;
    const tabs = {
      tabs: signal([]),
      selectedTabId: signal("tab-1"),
    } as unknown as TabsManager;
    await act(async () => {
      render(
        <CreateAnnotationForm
          annotations={annotations}
          tabs={tabs}
          toast={vi.fn()}
        />,
        container
      );
    });
    return waitForEditor(container);
  }

  function closeForm() {
    act(() => {
      render(null, container);
    });
  }

  // One sequential test: the failed-load state lives at module level in the
  // form, so splitting these steps across tests would make them order-bound.
  it("keeps the textarea while open, then retries TipTap on the next open once online", async () => {
    const capture = vi.fn();
    vi.stubGlobal("posthog", { capture });
    setOnline(false);
    const textarea = (await openForm()) as HTMLTextAreaElement;
    expect(textarea.tagName).toBe("TEXTAREA");
    // Reported with the online flag, so a broken deploy (failing while
    // online) can be told apart from users who are simply offline.
    expect(capture).toHaveBeenCalledWith(
      "annotation_editor_load_failed",
      expect.objectContaining({ online: false, retry: false })
    );

    // Connection returns mid-note: the open form must not swap editors and
    // drop what's been typed.
    tipTap.available = true;
    setOnline(true);
    act(() => {
      textarea.value = "Half-written note";
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(container.querySelector("textarea")?.value).toBe(
      "Half-written note"
    );
    expect(container.querySelector(".stub-tiptap-editor")).toBeNull();
    closeForm();

    // Still offline at the next open: no retry, straight to the textarea.
    setOnline(false);
    expect((await openForm()).tagName).toBe("TEXTAREA");
    closeForm();

    // Online at the next open: TipTap is fetched again and loads.
    setOnline(true);
    expect((await openForm()).className).toBe("stub-tiptap-editor");
    expect(capture).toHaveBeenCalledTimes(1);
  });
});
