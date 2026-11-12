import { render } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import { createModalManager } from "@packages/seed-bible/seed-bible/managers/ModalManager";
import { ReadingPlansPane } from "@packages/seed-bible/seed-bible/components/ReadingPlansPane/ReadingPlansPane";
import {
  ReadingPlanSchema,
  ReadingPlanProgressSchema,
  type ReadingPlan,
  type ReadingPlanProgress,
  type ReadingPlansManager,
} from "@packages/seed-bible/seed-bible/managers/ReadingPlansManager";

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const { mockI18nManager } = await import("../testUtils/mockI18n");
  return mockI18nManager();
});

const DAY_MS = 24 * 60 * 60 * 1000;
// Far enough back that every day below has already come round, so the plan
// shows as under way rather than as starting today.
const STARTED_MS = Date.now() - 30 * DAY_MS;

const reading = (id: string) => ({
  id,
  item: {
    type: "bible-verse" as const,
    ref: { bookId: "GEN", chapter: 1, verse: 1 },
  },
});

/** A plan of `days` sessions, one reading each, read one a day. */
function planOfDays(days: number): ReadingPlan {
  return ReadingPlanSchema.parse({
    address: "plan-1",
    recordName: "record-1",
    authorUserId: "author-1",
    title: "Test Plan",
    locale: "en",
    description: null,
    status: "complete",
    cadenceOptions: [
      {
        id: "daily",
        label: "Daily",
        cadence: { segments: [{ type: "read", days: 1, sessionsPerDay: 1 }] },
      },
    ],
    defaultCadenceId: "daily",
    sessions: Array.from({ length: days }, (_, i) => ({
      id: `s${i + 1}`,
      readings: [reading(`r${i + 1}`)],
    })),
    createdAtMs: STARTED_MS,
    updatedAtMs: STARTED_MS,
  });
}

/** Progress over that plan with its first `done` sessions finished. */
function progressWithDone(done: number): ReadingPlanProgress {
  return ReadingPlanProgressSchema.parse({
    id: "progress-1",
    planId: "rp_record-1_plan-1",
    recordName: "user-1",
    userId: "user-1",
    selectedCadenceId: "daily",
    startedAtMs: STARTED_MS,
    timeZone: "utc",
    sessions: Array.from({ length: done }, (_, i) => ({
      sessionId: `s${i + 1}`,
      completedReadingIds: [`r${i + 1}`],
      completedAtMs: STARTED_MS + (i + 1) * DAY_MS,
    })),
    createdAtMs: STARTED_MS,
    updatedAtMs: STARTED_MS,
  });
}

function listManager(
  plans: ReadingPlan[],
  progresses: ReadingPlanProgress[]
): ReadingPlansManager {
  return {
    userReadingPlans: signal(plans),
    fullReadingPlans: signal(plans),
    userReadingPlanProgresses: signal(progresses),
  } as unknown as ReadingPlansManager;
}

describe("reading plan card progress", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  function renderPane(days: number, done: number) {
    act(() => {
      render(
        <ReadingPlansPane
          readingPlans={listManager(
            [planOfDays(days)],
            [progressWithDone(done)]
          )}
          books={[]}
          modals={createModalManager()}
        />,
        container
      );
    });
  }

  it("draws one segment per day for a short plan, filling the days read", () => {
    renderPane(3, 2);

    const segments = container.querySelectorAll(".sb-rp-card-progress-segment");
    expect(segments).toHaveLength(3);
    expect(
      container.querySelectorAll(".sb-rp-card-progress-segment-done")
    ).toHaveLength(2);
    // The bar is the long-plan treatment; a 3-day plan should not use it.
    expect(container.querySelector(".sb-rp-card-progress-bar")).toBeNull();
  });

  it("shows every day waiting rather than an empty bar when nothing is read", () => {
    renderPane(3, 0);

    expect(
      container.querySelectorAll(".sb-rp-card-progress-segment")
    ).toHaveLength(3);
    expect(
      container.querySelectorAll(".sb-rp-card-progress-segment-done")
    ).toHaveLength(0);
    expect(
      container.querySelector(".sb-rp-card-progress-label")?.textContent
    ).toBe("0/3");
  });

  it("falls back to a filled bar once a plan is longer than ten days", () => {
    renderPane(12, 2);

    expect(container.querySelector(".sb-rp-card-progress-bar")).not.toBeNull();
    expect(
      container.querySelectorAll(".sb-rp-card-progress-segment")
    ).toHaveLength(0);
  });

  it("says which day the reader is on, not how long the plan is", () => {
    renderPane(3, 2);

    const subs = Array.from(
      container.querySelectorAll(".sb-rp-card .sb-rp-card-sub")
    ).map((el) => el.textContent);
    expect(subs.some((text) => text?.includes("Day 3 of 3"))).toBe(true);
    expect(subs.some((text) => text?.includes("3 days ·"))).toBe(false);
  });

  it("omits the day count rather than saying 'Day 0 of 0' when a plan has no readings", () => {
    renderPane(0, 0);

    const subs = Array.from(
      container.querySelectorAll(".sb-rp-card .sb-rp-card-sub")
    ).map((el) => el.textContent ?? "");
    expect(subs.some((text) => text.includes("of 0"))).toBe(false);
    // The start date is still worth showing on its own.
    expect(subs.some((text) => text.startsWith("since "))).toBe(true);
  });

  it("gives a plan with no cover a monogram so every row starts in the same place", () => {
    renderPane(3, 2);

    const thumb = container.querySelector(".sb-rp-card .sb-rp-thumb");
    expect(thumb).not.toBeNull();
    // "Test Plan" — first letter of the first word, first of the last.
    expect(thumb?.textContent).toBe("TP");
  });
});
