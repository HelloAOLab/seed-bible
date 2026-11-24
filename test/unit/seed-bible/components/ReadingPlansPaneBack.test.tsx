import { render } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import {
  ReadingPlansPaneLeading,
  loadReadingPlanToEdit,
  openReadingPlanDetail,
} from "@packages/seed-bible/seed-bible/components/ReadingPlansPane/ReadingPlansPane";
import {
  createReadingPlan,
  type ReadingPlan,
  type ReadingPlansManager,
} from "@packages/seed-bible/seed-bible/managers/ReadingPlansManager";
import {
  openReadingPlansPane,
  READING_PLANS_PANE_ID,
} from "@packages/seed-bible/seed-bible/managers/BibleToolsManager";
import { formatV1SessionKey } from "@casual-simulation/aux-common";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import {
  createTestSeedBibleState,
  waitFor,
} from "../testUtils/createTestSeedBibleState";
import { TestHost } from "./TestHost";
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
 * The plan editor opens over the reader, in the pane's place, so leaving it
 * has to bring the pane back as it was.
 */
describe("opening the plan editor from the plans pane", () => {
  let container: HTMLDivElement;
  let state: SeedBibleState;
  let published: ReadingPlan;

  beforeEach(async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    state = await createTestSeedBibleState();
    published = createReadingPlan("user-1", "user-1", "plan-1", NOW_MS, {
      title: "Gospel of John",
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
    // Offline by default: what each test needs of the server, it says.
    vi.spyOn(state.os, "recordData").mockResolvedValue(undefined as never);
    for (const list of [
      "listAllData",
      "listAllDataByMarker",
      "listDataByMarker",
    ] as const) {
      vi.spyOn(state.os, list).mockResolvedValue({
        success: true,
        items: [],
      } as never);
    }
    vi.spyOn(state.os, "getData").mockImplementation((async (
      _recordName: string,
      address: string
    ) =>
      address === published.address
        ? { success: true, data: published }
        : { success: false, errorCode: "data_not_found" }) as never);
  });

  afterEach(() => {
    // The pane's view is shared and outlives each test; back out to the list.
    act(() => {
      render(
        <ReadingPlansPaneLeading readingPlans={state.readingPlans} />,
        container
      );
    });
    container.querySelector<HTMLButtonElement>(".sb-rp-pane-back")?.click();
    render(null, container);
    container.remove();
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  const plansPane = () =>
    state.panes.panes.value.find((pane) => pane.id === READING_PLANS_PANE_ID);

  const openPane = (onBack?: () => void) =>
    act(() => {
      openReadingPlansPane({
        readingPlans: state.readingPlans,
        readingState: state.tabs.tabs.value[0]!.readingState,
        panesManager: state.panes,
        modals: state.modals,
        playlists: state.playlists,
        onBack,
      });
    });

  const renderPane = () =>
    act(() => {
      const pane = plansPane()!;
      render(
        <TestHost state={state}>
          {pane.leading?.()}
          {pane.header?.()}
          {pane.component()}
        </TestHost>,
        container
      );
    });

  const click = async (element: Element | null | undefined) => {
    if (!element) throw new Error("Nothing to click.");
    await act(async () => (element as HTMLElement).click());
  };
  const clickCreate = () =>
    click(container.querySelector(".sb-reading-plans-create"));
  const signIn = async () => {
    act(() => {
      state.os.sessionKey.value = formatV1SessionKey(
        "user-1",
        "session-1",
        "secret-1",
        Date.now() + 60 * 60 * 1000
      );
    });
    await waitFor(() => state.login.userId.value === "user-1");
  };

  /** Opens the plan's detail view, then Edit from its menu. */
  const openEditorFromDetail = async (options?: {
    fromAnotherScreen?: boolean;
  }) => {
    await act(async () => {
      await openReadingPlanDetail(state.readingPlans, published, options);
    });
    renderPane();
    await click(container.querySelector(".sb-rp-card-menu button"));
    await click(
      Array.from(document.body.querySelectorAll(".sb-context-menu-item")).find(
        (item) => item.textContent?.includes("Edit")
      )
    );
  };

  it("returns to the plans list on leaving a new plan", async () => {
    await signIn();
    openPane();
    renderPane();

    await clickCreate();
    expect(state.readingPlans.isEditorShowing.value).toBe(true);
    expect(state.readingPlans.editingReadingPlan.value!.isNew).toBe(true);
    expect(plansPane()).toBeUndefined();

    act(() => state.readingPlans.leaveEditorKeepingDraft());

    expect(plansPane()).toBeDefined();
    renderPane();
    expect(container.querySelector(".sb-reading-plans-create")).not.toBeNull();
  });

  it("returns to the plan on publishing an edit of it, as it was published", async () => {
    await signIn();
    openPane();
    await openEditorFromDetail();
    expect(state.readingPlans.isEditorShowing.value).toBe(true);
    expect(plansPane()).toBeUndefined();

    act(() =>
      state.readingPlans.updateEditingReadingPlan({ title: "John, again" })
    );
    await act(async () => {
      await state.readingPlans.finishEditingReadingPlan();
    });

    expect(plansPane()).toBeDefined();
    renderPane();
    // On the plan, not the list, which is where Create is offered.
    expect(container.querySelector(".sb-reading-plans-create")).toBeNull();
    expect(state.readingPlans.selectedReadingPlan.value?.title).toBe(
      "John, again"
    );
  });

  it("still goes back to the screen that opened the plan after an edit", async () => {
    const onBack = vi.fn();
    openPane(onBack);
    await signIn();
    await openEditorFromDetail({ fromAnotherScreen: true });
    expect(state.readingPlans.isEditorShowing.value).toBe(true);
    act(() => state.readingPlans.leaveEditorKeepingDraft());
    renderPane();

    await click(container.querySelector(".sb-rp-pane-back"));

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("picks a new plan that is still in the editor back up", async () => {
    await signIn();
    openPane();
    renderPane();
    await clickCreate();
    act(() =>
      state.readingPlans.updateEditingReadingPlan({ title: "Resume test" })
    );
    // Put away without leaving it, as opening another pane does.
    act(() => state.readingPlans.hideEditor());

    openPane();
    renderPane();
    await clickCreate();

    expect(state.readingPlans.editingReadingPlan.value!.plan.title).toBe(
      "Resume test"
    );
  });

  it("starts a new plan rather than reopening a published plan left in the editor", async () => {
    await signIn();
    act(() => state.readingPlans.editExistingReadingPlan(published));
    openPane();
    renderPane();

    await clickCreate();

    const draft = state.readingPlans.editingReadingPlan.value!;
    expect(draft.isNew).toBe(true);
    expect(draft.plan.title).toBeNull();
  });

  it("asks a signed-out user to sign in before creating one", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const login = vi
      .spyOn(state.login, "login")
      .mockResolvedValue(null as never);
    openPane();
    renderPane();

    await clickCreate();

    expect(login).toHaveBeenCalledTimes(1);
    expect(state.readingPlans.isEditorShowing.value).toBe(false);
  });

  it("says so, and stays, when the plan can't be loaded", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(state.os, "getData").mockResolvedValue({
      success: false,
      errorCode: "server_error",
      errorMessage: "",
    } as never);
    const { sessions: _, ...metadata } = published;
    act(() => {
      state.readingPlans.userReadingPlans.value = [metadata];
    });
    openPane();
    let plan: ReadingPlan | null = published;
    await act(async () => {
      plan = await loadReadingPlanToEdit(state.readingPlans, published);
    });
    renderPane();

    expect(plan).toBeNull();
    expect(container.textContent).toContain("Couldn't load this plan");
  });
});
