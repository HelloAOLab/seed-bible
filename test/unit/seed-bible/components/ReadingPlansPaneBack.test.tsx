import { render } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import {
  ReadingPlansPane,
  ReadingPlansPaneLeading,
  openReadingPlanDetail,
  openReadingPlanEditor,
} from "@packages/seed-bible/seed-bible/components/ReadingPlansPane/ReadingPlansPane";
import {
  createReadingPlan,
  type ReadingPlan,
  type ReadingPlanDraft,
  type ReadingPlansManager,
} from "@packages/seed-bible/seed-bible/managers/ReadingPlansManager";
import { openReadingPlansPane } from "@packages/seed-bible/seed-bible/managers/BibleToolsManager";
import { createModalManager } from "@packages/seed-bible/seed-bible/managers/ModalManager";
import type { OpenReadingPlansPaneOptions } from "@packages/seed-bible/seed-bible/managers/BibleToolsManager";

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const { mockI18nManager } = await import("../testUtils/mockI18n");
  return mockI18nManager();
});

const NOW_MS = Date.UTC(2026, 5, 17, 9, 0, 0);

/**
 * The plans pane's header back button. Profile and "Your content" close
 * themselves when they open the plans pane, so its back button is the only
 * way back to them that doesn't drop the user on the reader.
 */
describe("reading plans pane back button", () => {
  let container: HTMLDivElement;
  let readingPlan: ReadingPlan;
  let readingPlans: ReadingPlansManager & {
    selectReadingPlan: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    readingPlan = createReadingPlan("record-1", "author-1", "plan-1", NOW_MS, {
      title: "Gospel of John",
      description: null,
      status: "complete",
    });
    readingPlans = {
      userReadingPlanProgresses: signal([]),
      selectReadingPlan: vi.fn(async () => readingPlan),
      selectReadingPlanProgress: vi.fn(async () => {}),
    } as unknown as typeof readingPlans;
  });

  afterEach(() => {
    // The pane's view is shared and outlives each test; back out to the list.
    renderBackButton();
    const back = backButton();
    if (back) {
      act(() => back.click());
    }
    render(null, container);
    container.remove();
  });

  function renderBackButton(onBack?: () => void) {
    act(() => {
      render(
        <ReadingPlansPaneLeading readingPlans={readingPlans} onBack={onBack} />,
        container
      );
    });
  }

  const backButton = () =>
    container.querySelector<HTMLButtonElement>(".sb-rp-pane-back");

  async function openPlan(options?: { fromAnotherScreen?: boolean }) {
    await act(async () => {
      await openReadingPlanDetail(readingPlans, readingPlan, options);
    });
  }

  it("has no back button on the plans list when the reader is beside it", () => {
    renderBackButton();

    expect(backButton()).toBeNull();
  });

  it("goes from the plans list back to the screen that opened it", () => {
    const onBack = vi.fn();
    renderBackButton(onBack);

    act(() => backButton()!.click());

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("goes from a plan back to the list when the plan was opened from the list", async () => {
    const onBack = vi.fn();
    await openPlan();
    renderBackButton(onBack);

    act(() => backButton()!.click());

    expect(onBack).not.toHaveBeenCalled();
    expect(readingPlans.selectReadingPlan).toHaveBeenLastCalledWith(null);
  });

  it("goes from a plan straight back to the screen that opened it", async () => {
    const onBack = vi.fn();
    await openPlan({ fromAnotherScreen: true });
    renderBackButton(onBack);

    act(() => backButton()!.click());

    expect(onBack).toHaveBeenCalledTimes(1);
    expect(readingPlans.selectReadingPlan).toHaveBeenLastCalledWith(null);
  });

  it("forgets the other screen once the user has gone back", async () => {
    const onBack = vi.fn();
    await openPlan({ fromAnotherScreen: true });
    renderBackButton(onBack);
    act(() => backButton()!.click());
    expect(onBack).toHaveBeenCalledTimes(1);

    // Opened again from the list this time.
    await openPlan();
    act(() => backButton()!.click());

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("forgets the other screen when the pane is closed and opened again", async () => {
    await openPlan({ fromAnotherScreen: true });

    // Closed with its X rather than back, then opened again, still on the
    // plan, from a screen with its own way back.
    openReadingPlansPane({
      readingPlans,
      readingState: {},
      panesManager: { openPane: vi.fn() },
      modals: createModalManager(),
    } as unknown as OpenReadingPlansPaneOptions);
    const onBack = vi.fn();
    renderBackButton(onBack);
    act(() => backButton()!.click());

    expect(onBack).not.toHaveBeenCalled();
  });
});

/**
 * The plan editor's own Cancel and Save buttons leave the same way the header's
 * back button does: to the screen that opened the plan directly, if one did.
 */
describe("reading plan editor footer", () => {
  let container: HTMLDivElement;
  let readingPlan: ReadingPlan;
  let readingPlans: ReadingPlansManager;
  let finishEditingReadingPlan: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    HTMLElement.prototype.scrollIntoView = vi.fn();
    readingPlan = createReadingPlan("record-1", "author-1", "plan-1", NOW_MS, {
      title: "Gospel of John",
      description: null,
      status: "complete",
      sessions: [
        {
          id: "s1",
          title: null,
          readings: [
            {
              id: "r1",
              item: { type: "bible-verse", ref: { bookId: "JHN", chapter: 1 } },
            },
          ],
        },
      ],
    });
    const editingReadingPlan = signal<ReadingPlanDraft | null>({
      plan: readingPlan,
      selectedSessionIndex: 0,
      persisted: true,
      isNew: false,
    });
    finishEditingReadingPlan = vi.fn(async () => {});
    readingPlans = {
      editingReadingPlan,
      editingReadingPlanSaving: signal(false),
      editingReadingPlanSaveError: signal(null),
      selectEditingPlanSession: vi.fn(),
      finishEditingReadingPlan,
      cancelEditingReadingPlan: vi.fn(() => {
        editingReadingPlan.value = null;
      }),
      userReadingPlans: signal([]),
      fullReadingPlans: signal([]),
      userReadingPlanProgresses: signal([]),
      selectReadingPlan: vi.fn(async () => readingPlan),
      selectReadingPlanProgress: vi.fn(async () => {}),
    } as unknown as ReadingPlansManager;
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  async function renderEditor(
    onBack: () => void,
    options: { fromAnotherScreen?: boolean }
  ) {
    await act(async () => {
      await openReadingPlanEditor(readingPlans, readingPlan, options);
    });
    act(() => {
      render(
        <ReadingPlansPane
          readingPlans={readingPlans}
          books={[]}
          modals={createModalManager()}
          onBack={onBack}
        />,
        container
      );
    });
  }

  function footerButton(label: string) {
    const button = Array.from(container.querySelectorAll("button")).find((el) =>
      el.textContent?.includes(label)
    );
    if (!button) throw new Error(`No "${label}" button.`);
    return button;
  }

  it("returns to the screen that opened the plan when Cancel is pressed", async () => {
    const onBack = vi.fn();
    await renderEditor(onBack, { fromAnotherScreen: true });

    act(() => footerButton("Cancel").click());

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("goes back to the list on Cancel when the plan was opened from the list", async () => {
    const onBack = vi.fn();
    await renderEditor(onBack, {});

    act(() => footerButton("Cancel").click());

    expect(onBack).not.toHaveBeenCalled();
  });

  it("returns to the screen that opened the plan once Save has saved", async () => {
    const onBack = vi.fn();
    await renderEditor(onBack, { fromAnotherScreen: true });

    await act(async () => footerButton("Save changes").click());

    expect(finishEditingReadingPlan).toHaveBeenCalledTimes(1);
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("stays in the editor when Save fails", async () => {
    const onBack = vi.fn();
    vi.spyOn(console, "error").mockImplementation(() => {});
    finishEditingReadingPlan.mockRejectedValue(new Error("offline"));
    await renderEditor(onBack, { fromAnotherScreen: true });

    await act(async () => footerButton("Save changes").click());

    expect(onBack).not.toHaveBeenCalled();
    // Back out so the shared view doesn't leak into the next test.
    act(() => footerButton("Cancel").click());
  });
});
