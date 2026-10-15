import { render } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import {
  ReadingPlansPaneLeading,
  openReadingPlanDetail,
} from "@packages/seed-bible/seed-bible/components/ReadingPlansPane/ReadingPlansPane";
import {
  createReadingPlan,
  type ReadingPlan,
  type ReadingPlansManager,
} from "@packages/seed-bible/seed-bible/managers/ReadingPlansManager";

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
});
