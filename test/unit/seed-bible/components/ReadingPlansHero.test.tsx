import { render } from "preact";
import { act } from "preact/test-utils";
import type { Mock } from "vitest";
import {
  createModalManager,
  type ModalManager,
} from "@packages/seed-bible/seed-bible/managers/ModalManager";
import { signal } from "@preact/signals";
import { ReadingPlansPane } from "@packages/seed-bible/seed-bible/components/ReadingPlansPane/ReadingPlansPane";
import { ReadingPlanDetail } from "@packages/seed-bible/seed-bible/components/ReadingPlansPane/ReadingPlanDetail";
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

function plan(options: {
  title: string;
  description: string | null;
  heroImageUrl?: string | null;
}): ReadingPlan {
  return createReadingPlan("record-1", "author-1", "plan-1", NOW_MS, {
    title: options.title,
    description: options.description,
    heroImageUrl: options.heroImageUrl ?? null,
    status: "complete",
  });
}

function listManager(plans: ReadingPlan[]): ReadingPlansManager {
  return {
    userReadingPlans: signal(plans),
    fullReadingPlans: signal(plans),
    userReadingPlanProgresses: signal([]),
  } as unknown as ReadingPlansManager;
}

function detailManager(readingPlan: ReadingPlan): ReadingPlansManager {
  return {
    selectedReadingPlan: signal(readingPlan),
    selectedReadingPlanProgress: signal(null),
    selectedReadingPlanProgressCalendar: signal(null),
    canEditSelectedPlan: signal(false),
    getReadingPlanShareUrl: () => "https://example.com/plan",
  } as unknown as ReadingPlansManager;
}

describe("reading plan hero image", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  it("shows the title and description without a placeholder when the plan has no cover", () => {
    const readingPlan = plan({
      title: "Gospel of John",
      description: "Read John in a month.",
    });

    act(() => {
      render(
        <ReadingPlansPane
          readingPlans={listManager([readingPlan])}
          books={[]}
          modals={createModalManager()}
        />,
        container
      );
    });

    const card = container.querySelector(".sb-rp-card");
    expect(card?.querySelector(".sb-rp-card-title")?.textContent).toBe(
      "Gospel of John"
    );
    expect(card?.textContent).toContain("Read John in a month.");
    expect(card?.querySelector(".sb-hero-thumb")).toBeNull();
    expect(card?.textContent).not.toContain("No image");
  });

  it("shows a cover thumbnail when the plan has one", () => {
    const readingPlan = plan({
      title: "Gospel of John",
      description: "Read John in a month.",
      heroImageUrl: "https://example.com/plan-cover.jpg",
    });

    act(() => {
      render(
        <ReadingPlansPane
          readingPlans={listManager([readingPlan])}
          books={[]}
          modals={createModalManager()}
        />,
        container
      );
    });

    const thumb = container.querySelector(
      ".sb-rp-card .sb-hero-thumb"
    ) as HTMLImageElement;
    expect(thumb).not.toBeNull();
    expect(thumb.tagName).toBe("IMG");
    expect(thumb.src).toBe("https://example.com/plan-cover.jpg");
    expect(container.querySelector(".sb-hero-thumb--empty")).toBeNull();
  });

  it("shows the description on the detail screen without a cover banner when the plan has no image", () => {
    const readingPlan = plan({
      title: "Gospel of John",
      description: "Read John in a month.",
    });

    act(() => {
      render(
        <ReadingPlanDetail
          readingPlans={detailManager(readingPlan)}
          books={[]}
          modals={createModalManager()}
        />,
        container
      );
    });

    expect(container.querySelector(".sb-rpd-subtitle")?.textContent).toBe(
      "Read John in a month."
    );
    expect(container.querySelector(".sb-hero-banner")).toBeNull();
    expect(container.textContent).not.toContain("No image");
  });

  it("shows a cover banner on the detail screen when the plan has an image", () => {
    const readingPlan = plan({
      title: "Gospel of John",
      description: "Read John in a month.",
      heroImageUrl: "https://example.com/plan-cover.jpg",
    });

    act(() => {
      render(
        <ReadingPlanDetail
          readingPlans={detailManager(readingPlan)}
          books={[]}
          modals={createModalManager()}
        />,
        container
      );
    });

    const banner = container.querySelector(
      ".sb-hero-banner img"
    ) as HTMLImageElement;
    expect(banner).not.toBeNull();
    expect(banner.src).toBe("https://example.com/plan-cover.jpg");
    expect(banner.alt).toBe("Gospel of John");
    expect(container.querySelector(".sb-hero-banner--empty")).toBeNull();
    expect(container.textContent).toContain("Read John in a month.");
  });
});

describe("reading plan options menu", () => {
  let container: HTMLDivElement;
  let modalContainer: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    modalContainer = document.createElement("div");
    document.body.append(container, modalContainer);
  });

  afterEach(() => {
    render(null, container);
    render(null, modalContainer);
    container.remove();
    modalContainer.remove();
    vi.restoreAllMocks();
  });

  const gospelOfJohn = () =>
    plan({ title: "Gospel of John", description: "Read John in a month." });

  /** A list manager that can also open and delete a plan. */
  function paneManager(
    readingPlan: ReadingPlan,
    deleteReadingPlan: () => Promise<void> = async () => {}
  ) {
    return {
      ...listManager([readingPlan]),
      selectReadingPlan: vi.fn(async () => readingPlan),
      selectReadingPlanProgress: vi.fn(async () => {}),
      deleteReadingPlan: vi.fn(deleteReadingPlan),
      getReadingPlanShareUrl: () => "https://example.com/plan",
    } as unknown as ReadingPlansManager & {
      selectReadingPlan: Mock;
      deleteReadingPlan: Mock;
    };
  }

  // `cancelable` so a menu item's `preventDefault()` behaves as in a browser.
  function click(element: Element | null | undefined) {
    expect(element).toBeTruthy();
    act(() => {
      element!.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true })
      );
    });
  }

  function openOptionsMenu() {
    click(container.querySelector('[aria-label="Reading plan options"]'));
  }

  function menuItemLabels() {
    return Array.from(
      document.body.querySelectorAll('[role="menu"] [role="menuitem"]')
    ).map((item) => {
      // The icon is a ligature font, so its name is part of the text.
      const icon = item.querySelector(".sb-context-menu-item-icon");
      return item.textContent?.replace(icon?.textContent ?? "", "").trim();
    });
  }

  function clickMenuItem(label: string) {
    click(
      Array.from(document.body.querySelectorAll('[role="menuitem"]')).find(
        (item) => item.textContent?.includes(label)
      )
    );
  }

  /** Renders the open modal, as the modal host would. */
  function renderOpenModal(modals: ModalManager) {
    const modal = modals.modals.value.at(-1);
    expect(modal).toBeDefined();
    act(() => {
      render(
        modal!.content({
          t: (key, options) => (options?.defaultValue as string) ?? key,
        }),
        modalContainer
      );
    });
  }

  async function settle() {
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
  }

  function renderPane(
    readingPlans: ReadingPlansManager,
    modals: ModalManager,
    toast?: (message: string) => void
  ) {
    act(() => {
      render(
        <ReadingPlansPane
          readingPlans={readingPlans}
          books={[]}
          modals={modals}
          toast={toast}
        />,
        container
      );
    });
  }

  it("opens the menu without opening the plan", () => {
    const readingPlans = paneManager(gospelOfJohn());
    renderPane(readingPlans, createModalManager());

    openOptionsMenu();

    expect(menuItemLabels()).toEqual(["Share plan", "Edit plan", "Delete"]);
    expect(readingPlans.selectReadingPlan).not.toHaveBeenCalled();
  });

  it("deletes nothing when the delete box is cancelled", () => {
    const readingPlans = paneManager(gospelOfJohn());
    const modals = createModalManager();
    renderPane(readingPlans, modals);

    openOptionsMenu();
    clickMenuItem("Delete");
    renderOpenModal(modals);
    expect(modalContainer.textContent).toContain(
      `Delete "Gospel of John"? This can't be undone.`
    );

    click(modalContainer.querySelector(".sb-session-settings-cancel"));

    expect(modals.modals.value).toHaveLength(0);
    expect(readingPlans.deleteReadingPlan).not.toHaveBeenCalled();
  });

  it("deletes the plan only after the delete box is confirmed", async () => {
    const readingPlan = gospelOfJohn();
    const readingPlans = paneManager(readingPlan);
    const modals = createModalManager();
    renderPane(readingPlans, modals);

    openOptionsMenu();
    clickMenuItem("Delete");
    expect(readingPlans.deleteReadingPlan).not.toHaveBeenCalled();

    renderOpenModal(modals);
    click(modalContainer.querySelector(".sb-session-settings-end"));
    await settle();

    expect(readingPlans.deleteReadingPlan).toHaveBeenCalledWith(
      expect.objectContaining({
        recordName: readingPlan.recordName,
        address: readingPlan.address,
      })
    );
    expect(modals.modals.value).toHaveLength(0);
  });

  it("says so when the plan couldn't be deleted", async () => {
    const readingPlans = paneManager(gospelOfJohn(), () =>
      Promise.reject(new Error("offline"))
    );
    const modals = createModalManager();
    const toast = vi.fn();
    vi.spyOn(console, "error").mockImplementation(() => {});
    renderPane(readingPlans, modals, toast);

    openOptionsMenu();
    clickMenuItem("Delete");
    renderOpenModal(modals);
    click(modalContainer.querySelector(".sb-session-settings-end"));
    await settle();

    expect(toast).toHaveBeenCalledWith("Couldn't delete the reading plan.");
  });

  describe("on the plan's own screen", () => {
    function renderDetail(
      readingPlans: ReadingPlansManager,
      modals: ModalManager,
      props: { onEdit?: () => void; onDeleted?: () => void } = {}
    ) {
      act(() => {
        render(
          <ReadingPlanDetail
            readingPlans={readingPlans}
            books={[]}
            modals={modals}
            {...props}
          />,
          container
        );
      });
    }

    it("leaves out Edit on a plan the reader can't change", () => {
      renderDetail(detailManager(gospelOfJohn()), createModalManager(), {
        onEdit: vi.fn(),
      });

      openOptionsMenu();

      expect(menuItemLabels()).toEqual(["Share plan", "Delete"]);
    });

    it("offers Edit on the reader's own plan", () => {
      const readingPlans = {
        ...detailManager(gospelOfJohn()),
        canEditSelectedPlan: signal(true),
      } as unknown as ReadingPlansManager;
      const onEdit = vi.fn();
      renderDetail(readingPlans, createModalManager(), { onEdit });

      openOptionsMenu();
      expect(menuItemLabels()).toEqual(["Share plan", "Edit plan", "Delete"]);

      clickMenuItem("Edit plan");
      expect(onEdit).toHaveBeenCalledTimes(1);
    });

    it("leaves the plan's screen once the plan is deleted", async () => {
      const readingPlans = {
        ...detailManager(gospelOfJohn()),
        deleteReadingPlan: vi.fn(async () => {}),
      } as unknown as ReadingPlansManager;
      const modals = createModalManager();
      const onDeleted = vi.fn();
      renderDetail(readingPlans, modals, { onDeleted });

      openOptionsMenu();
      clickMenuItem("Delete");
      renderOpenModal(modals);
      expect(onDeleted).not.toHaveBeenCalled();

      click(modalContainer.querySelector(".sb-session-settings-end"));
      await settle();

      expect(onDeleted).toHaveBeenCalledTimes(1);
    });
  });
});
