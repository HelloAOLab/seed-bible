import { render } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import { ReadingPlanEditor } from "@packages/seed-bible/seed-bible/components/ReadingPlansPane/ReadingPlanEditor";
import {
  createReadingPlan,
  type ReadingPlanDraft,
  type ReadingPlansManager,
} from "@packages/seed-bible/seed-bible/managers/ReadingPlansManager";
import { createModalManager } from "@packages/seed-bible/seed-bible/managers/ModalManager";
import type { TranslationBook } from "@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI";

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const { mockI18nManager } = await import("../testUtils/mockI18n");
  return mockI18nManager();
});

function book(id: string, name: string): TranslationBook {
  return {
    id,
    name,
    commonName: name,
    title: null,
    order: 1,
    numberOfChapters: 40,
    firstChapterNumber: 1,
    totalNumberOfVerses: 1000,
  } as TranslationBook;
}

const BOOKS = [book("GEN", "Genesis"), book("EXO", "Exodus")];

describe("ReadingPlanEditor", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  /**
   * A published two-session plan open for editing, held by a stand-in manager
   * that applies session selection like the real one.
   */
  function renderEditor() {
    const plan = createReadingPlan(
      "record-1",
      "author-1",
      "plan-1",
      1_700_000_000_000,
      {
        title: "Beginnings",
        status: "complete",
        sessions: [
          {
            id: "s1",
            title: null,
            readings: [
              {
                id: "r1",
                item: {
                  type: "bible-verse",
                  ref: { bookId: "GEN", chapter: 1 },
                },
              },
            ],
          },
          {
            id: "s2",
            title: null,
            readings: [
              {
                id: "r2",
                item: {
                  type: "bible-verse",
                  ref: { bookId: "EXO", chapter: 1 },
                },
              },
            ],
          },
        ],
      }
    );
    const editingReadingPlan = signal<ReadingPlanDraft | null>({
      plan,
      selectedSessionIndex: 0,
      persisted: true,
      isNew: false,
    });
    const finishEditingReadingPlan = vi.fn(async () => {});
    const readingPlans = {
      editingReadingPlan,
      editingReadingPlanSaving: signal(false),
      editingReadingPlanSaveError: signal(null),
      selectEditingPlanSession: (index: number) => {
        editingReadingPlan.value = {
          ...editingReadingPlan.value!,
          selectedSessionIndex: index,
        };
      },
      finishEditingReadingPlan,
    } as unknown as ReadingPlansManager;
    const modals = createModalManager();
    act(() => {
      render(
        <ReadingPlanEditor
          readingPlans={readingPlans}
          books={BOOKS}
          modals={modals}
          onCancel={vi.fn()}
          onSaved={vi.fn()}
        />,
        container
      );
    });
    return { modals, finishEditingReadingPlan };
  }

  const editButtons = () =>
    Array.from(
      container.querySelectorAll<HTMLButtonElement>(".sb-rp-reading-edit")
    );
  const sessionButtons = () =>
    Array.from(
      container.querySelectorAll<HTMLButtonElement>(".sb-rp-session-select")
    );

  it("stops editing a reading once another session is selected", async () => {
    const { modals, finishEditingReadingPlan } = renderEditor();
    act(() => editButtons()[0]!.click());
    expect(editButtons()[0]!.getAttribute("aria-pressed")).toBe("true");

    act(() => sessionButtons()[1]!.click());

    expect(
      editButtons().map((button) => button.getAttribute("aria-pressed"))
    ).toEqual(["false", "false"]);

    // A new reading half-typed in the other session isn't an unsaved edit.
    const input = container.querySelector<HTMLInputElement>(
      ".sb-rp-session-selected .sb-scripture-input input"
    )!;
    act(() => {
      input.value = "Exodus 2";
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => {
      Array.from(container.querySelectorAll<HTMLButtonElement>("button"))
        .find((button) => button.textContent?.includes("Save changes"))!
        .click();
    });

    expect(modals.modals.value).toEqual([]);
    expect(finishEditingReadingPlan).toHaveBeenCalled();
  });
});
