import { render } from "preact";
import { act } from "preact/test-utils";
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

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  it("puts share, edit, and delete in a menu on the plan card", () => {
    const readingPlan = plan({
      title: "Gospel of John",
      description: "Read John in a month.",
    });

    act(() => {
      render(
        <ReadingPlansPane
          readingPlans={listManager([readingPlan])}
          books={[]}
        />,
        container
      );
    });

    expect(container.querySelector(".sb-rp-card-actions")).toBeNull();
    expect(container.querySelector(".sb-rp-restart")).toBeNull();

    const options = container.querySelector(
      '[aria-label="Reading plan options"]'
    ) as HTMLButtonElement | null;
    expect(options).not.toBeNull();

    act(() => {
      options?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const menu = document.body.querySelector('[role="menu"]');
    expect(menu?.textContent).toContain("Share plan");
    expect(menu?.textContent).toContain("Edit plan");
    expect(menu?.textContent).toContain("Delete");
  });
});
