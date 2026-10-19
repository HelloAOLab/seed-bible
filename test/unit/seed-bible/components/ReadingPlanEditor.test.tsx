import { render } from "preact";
import { act } from "preact/test-utils";
import { forwardRef } from "preact/compat";
import { useImperativeHandle } from "preact/hooks";
import { signal } from "@preact/signals";
import { ReadingPlanEditor } from "@packages/seed-bible/seed-bible/components/ReadingPlansPane/ReadingPlanEditor";
import {
  createReadingPlan,
  type ReadingPlanDraft,
  type ReadingPlansManager,
} from "@packages/seed-bible/seed-bible/managers/ReadingPlansManager";
import { createModalManager } from "@packages/seed-bible/seed-bible/managers/ModalManager";
import type { PlaylistItemData } from "@packages/seed-bible/seed-bible/managers/PlaylistManager";
import type { TranslationBook } from "@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI";

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const { mockI18nManager } = await import("../testUtils/mockI18n");
  return mockI18nManager();
});

interface StubPlaylistItemInputProps {
  id?: string;
  editItem?: PlaylistItemData;
  editScriptureText?: string;
  loadChapter?: unknown;
  onAdd: (item: PlaylistItemData) => void;
  onUpdate?: (item: PlaylistItemData) => void;
  onCancelEdit?: () => void;
}

const STUB_UPDATED_ITEM: PlaylistItemData = {
  type: "html",
  html: "<p>Read slowly.</p>",
};

/** Drives the stubbed item input's handle, which the editor asks before saving. */
const stubItemInputControl = {
  isDirty: false,
  commitResult: true as boolean | Promise<boolean>,
};

vi.mock(
  "@packages/seed-bible/seed-bible/components/PlaylistItemInput/PlaylistItemInput",
  () => ({
    PlaylistItemInput: forwardRef(function StubPlaylistItemInput(
      props: StubPlaylistItemInputProps,
      ref
    ) {
      useImperativeHandle(ref, () => ({
        isDirty: () => stubItemInputControl.isDirty,
        commit: () => stubItemInputControl.commitResult,
      }));
      return (
        <div
          id={props.id}
          className={
            props.editItem
              ? "stub-playlist-item-input stub-playlist-item-input--edit"
              : "stub-playlist-item-input stub-playlist-item-input--add"
          }
          data-edit-type={props.editItem?.type}
          data-edit-scripture-text={props.editScriptureText}
          data-has-load-chapter={props.loadChapter ? "true" : "false"}
        >
          <button
            type="button"
            className="stub-update"
            onClick={() => props.onUpdate?.(STUB_UPDATED_ITEM)}
          >
            update
          </button>
          <button
            type="button"
            className="stub-cancel"
            onClick={() => props.onCancelEdit?.()}
          >
            cancel
          </button>
        </div>
      );
    }),
  })
);

const NOW_MS = Date.UTC(2026, 5, 17, 9, 0, 0);

function book(id: string, name: string): TranslationBook {
  return { id, name, commonName: name } as TranslationBook;
}

function verseItem(bookId: string, chapter: number): PlaylistItemData {
  return { type: "bible-verse", ref: { bookId, chapter } };
}

function createDraft(): ReadingPlanDraft {
  return {
    plan: createReadingPlan("record-1", "author-1", "plan-1", NOW_MS, {
      title: "Genesis in a week",
      status: "draft",
      sessions: [
        {
          id: "session-1",
          title: null,
          readings: [
            { id: "reading-1", item: verseItem("GEN", 1) },
            {
              id: "reading-2",
              item: { type: "link", url: "https://example.com" },
            },
          ],
        },
      ],
    }),
    selectedSessionIndex: 0,
    persisted: true,
    isNew: true,
  };
}

function createMockReadingPlans(draft: ReadingPlanDraft) {
  const editingReadingPlan = signal<ReadingPlanDraft | null>(draft);
  const updateReadingInEditingPlan = vi.fn();
  const removeReadingFromEditingPlan = vi.fn(
    (sessionIndex: number, readingId: string) => {
      const current = editingReadingPlan.value;
      if (!current) return;
      editingReadingPlan.value = {
        ...current,
        plan: {
          ...current.plan,
          sessions: current.plan.sessions.map((session, i) =>
            i === sessionIndex
              ? {
                  ...session,
                  readings: session.readings.filter((r) => r.id !== readingId),
                }
              : session
          ),
        },
      };
    }
  );
  const finishEditingReadingPlan = vi.fn(async () => draft.plan);
  const readingPlans = {
    editingReadingPlan,
    editingReadingPlanSaving: signal(false),
    editingReadingPlanSaveError: signal(false),
    updateEditingReadingPlan: vi.fn(),
    selectEditingPlanSession: vi.fn(),
    addSessionToEditingPlan: vi.fn(),
    removeSessionFromEditingPlan: vi.fn(),
    addReadingToEditingPlan: vi.fn(),
    removeReadingFromEditingPlan,
    updateReadingInEditingPlan,
    setEditingPlanCadenceOptions: vi.fn(),
    finishEditingReadingPlan,
    discardEditingReadingPlan: vi.fn(async () => {}),
    uploadHeroImage: vi.fn(),
  } as unknown as ReadingPlansManager;
  return {
    readingPlans,
    updateReadingInEditingPlan,
    removeReadingFromEditingPlan,
    finishEditingReadingPlan,
  };
}

describe("ReadingPlanEditor", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    stubItemInputControl.isDirty = false;
    stubItemInputControl.commitResult = true;
  });

  afterEach(() => {
    render(null, container);
    container.remove();
    vi.restoreAllMocks();
  });

  function renderEditor(modals = createModalManager()) {
    const mocks = createMockReadingPlans(createDraft());
    const loadChapter = vi.fn();
    act(() => {
      render(
        <ReadingPlanEditor
          readingPlans={mocks.readingPlans}
          books={[book("GEN", "Genesis")]}
          modals={modals}
          loadChapter={loadChapter}
          onCancel={vi.fn()}
          onSaved={vi.fn()}
        />,
        container
      );
    });
    return { ...mocks, modals };
  }

  const click = (el: Element | undefined | null) =>
    act(() => {
      el?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
  const rows = () => container.querySelectorAll(".sb-rp-reading-item");
  const rowButtons = () => container.querySelectorAll(".sb-rp-reading-open");
  const editorIn = (row: Element | undefined) =>
    row?.querySelector(".stub-playlist-item-input--edit") ?? null;
  const editors = () =>
    container.querySelectorAll(".stub-playlist-item-input--edit");
  const chevron = (row: Element | undefined) =>
    row?.querySelector(".sb-rp-reading-chevron")?.textContent;

  it("has no pencil button: the reading's row itself opens it for editing", () => {
    renderEditor();

    expect(container.querySelector(".sb-rp-reading-edit")).toBeNull();
    expect(rowButtons()[0]?.getAttribute("aria-label")).toBe("Edit Genesis 1");
    expect(chevron(rows()[0])).toBe("expand_more");
    expect(editors()).toHaveLength(0);

    click(rowButtons()[0]);

    const editor = editorIn(rows()[0]);
    expect(editor).not.toBeNull();
    expect(editor?.getAttribute("data-edit-type")).toBe("bible-verse");
    expect(editor?.getAttribute("data-edit-scripture-text")).toBe("Genesis 1");
    expect(editor?.getAttribute("data-has-load-chapter")).toBe("true");
    expect(rowButtons()[0]?.getAttribute("aria-expanded")).toBe("true");
    expect(rowButtons()[0]?.getAttribute("aria-controls")).toBe(editor?.id);
    expect(chevron(rows()[0])).toBe("expand_less");
    // The session's "Add item" box is still there beneath the readings.
    expect(
      container.querySelector(".stub-playlist-item-input--add")
    ).not.toBeNull();
  });

  it("keeps one reading open at a time and closes it on a second tap", () => {
    renderEditor();

    click(rowButtons()[0]);
    click(rowButtons()[1]);

    expect(editors()).toHaveLength(1);
    expect(editorIn(rows()[1])?.getAttribute("data-edit-type")).toBe("link");
    expect(rowButtons()[0]?.getAttribute("aria-expanded")).toBe("false");

    click(rowButtons()[1]);
    expect(editors()).toHaveLength(0);
  });

  it("saving the editor updates the reading in its session, keeping its id, and closes it", () => {
    const { updateReadingInEditingPlan } = renderEditor();
    click(rowButtons()[0]);

    click(container.querySelector(".stub-update"));

    expect(updateReadingInEditingPlan).toHaveBeenCalledWith(
      0,
      "reading-1",
      STUB_UPDATED_ITEM
    );
    expect(editors()).toHaveLength(0);
  });

  it("cancelling the editor closes it without updating", () => {
    const { updateReadingInEditingPlan } = renderEditor();
    click(rowButtons()[0]);

    click(container.querySelector(".stub-cancel"));

    expect(updateReadingInEditingPlan).not.toHaveBeenCalled();
    expect(editors()).toHaveLength(0);
  });

  it("removing the open reading closes its editor", () => {
    const { removeReadingFromEditingPlan } = renderEditor();
    click(rowButtons()[0]);

    click(container.querySelectorAll(".sb-rp-reading-remove")[0]);

    expect(removeReadingFromEditingPlan).toHaveBeenCalledWith(0, "reading-1");
    expect(rows()).toHaveLength(1);
    expect(editors()).toHaveLength(0);
  });

  /** Renders the open unsaved-edit prompt into a side container. */
  function renderUnsavedEditPrompt(
    modals: ReturnType<typeof createModalManager>
  ): HTMLDivElement {
    const modal = modals.modals.value.find(
      (m) => m.id === "playlist-unsaved-item-confirm"
    );
    expect(modal).toBeDefined();
    const modalContainer = document.createElement("div");
    document.body.appendChild(modalContainer);
    act(() => {
      render(
        modal!.content({
          t: (key, options) => (options?.defaultValue as string) ?? key,
        }),
        modalContainer
      );
    });
    return modalContainer;
  }

  const promptButton = (modalContainer: HTMLDivElement, label: string) =>
    Array.from(modalContainer.querySelectorAll("button")).find(
      (b) => b.textContent === label
    );

  it("asks before switching away from a reading with unsaved edits", async () => {
    const { modals } = renderEditor();
    click(rowButtons()[0]);
    stubItemInputControl.isDirty = true;

    click(rowButtons()[1]);

    expect(editorIn(rows()[0])).not.toBeNull();
    const prompt = renderUnsavedEditPrompt(modals);

    await act(async () => {
      promptButton(prompt, "Save changes")?.dispatchEvent(
        new MouseEvent("click", { bubbles: true })
      );
      await Promise.resolve();
    });

    expect(editorIn(rows()[1])).not.toBeNull();
    expect(editors()).toHaveLength(1);
    prompt.remove();
  });

  it("asks before saving the plan when the open reading has unsaved edits", async () => {
    const { modals, finishEditingReadingPlan } = renderEditor();
    click(rowButtons()[0]);
    stubItemInputControl.isDirty = true;

    click(
      Array.from(container.querySelectorAll("button")).find(
        (b) => b.textContent === "Create plan"
      )
    );

    expect(finishEditingReadingPlan).not.toHaveBeenCalled();
    const prompt = renderUnsavedEditPrompt(modals);
    expect(prompt.textContent).toContain("haven't saved those changes");

    await act(async () => {
      promptButton(prompt, "Keep changes and save")?.dispatchEvent(
        new MouseEvent("click", { bubbles: true })
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(finishEditingReadingPlan).toHaveBeenCalledTimes(1);
    prompt.remove();
  });

  it("saves the plan directly when the open reading has no unsaved edits", async () => {
    const { modals, finishEditingReadingPlan } = renderEditor();
    click(rowButtons()[0]);
    stubItemInputControl.isDirty = false;

    await act(async () => {
      Array.from(container.querySelectorAll("button"))
        .find((b) => b.textContent === "Create plan")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(modals.modals.value).toHaveLength(0);
    expect(finishEditingReadingPlan).toHaveBeenCalledTimes(1);
  });
});
