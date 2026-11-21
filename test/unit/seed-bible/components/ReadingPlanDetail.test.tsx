import { render } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  ReadingPlanSchema,
  ReadingPlanProgressSchema,
  type ReadingPlan,
  type ReadingPlanProgress,
  type ReadingPlansManager,
} from "@packages/seed-bible/seed-bible/managers/ReadingPlansManager";

import type { ModalManager } from "@packages/seed-bible/seed-bible/managers/ModalManager";
import type { LoginManager } from "@packages/seed-bible/seed-bible/managers/LoginManager";

import { ReadingPlanDetail } from "@packages/seed-bible/seed-bible/components/ReadingPlansPane/ReadingPlanDetail";

const START_MS = Date.UTC(2026, 5, 17, 13, 45, 0);

function reading(id: string) {
  return {
    id,
    item: {
      type: "bible-verse" as const,
      ref: { bookId: "GEN", chapter: 1, verse: 1 },
    },
  };
}

function makePlan(overrides: Partial<ReadingPlan> = {}): ReadingPlan {
  return ReadingPlanSchema.parse({
    address: "plan-1",
    recordName: "record-1",
    authorUserId: "author-1",
    title: "Test Plan",
    locale: "en-US",
    description: null,
    cadenceOptions: [
      {
        id: "daily",
        label: "One year (daily)",
        cadence: {
          segments: [{ type: "read", days: 1, sessionsPerDay: 1 }],
        },
      },
      {
        id: "every-other-day",
        label: "Two years (every other day)",
        cadence: {
          segments: [
            { type: "read", days: 1 },
            { type: "skip", days: 1 },
          ],
        },
      },
    ],
    defaultCadenceId: "daily",
    sessions: [
      { id: "s1", readings: [reading("r1")] },
      { id: "s2", readings: [reading("r2")] },
    ],
    createdAtMs: START_MS,
    updatedAtMs: START_MS,
    ...overrides,
  });
}

function makeProgress(
  overrides: Partial<ReadingPlanProgress> = {}
): ReadingPlanProgress {
  return ReadingPlanProgressSchema.parse({
    id: "progress-1",
    planId: "rp_record-1_plan-1",
    recordName: "record-1",
    userId: "user-1",
    startedAtMs: START_MS,
    sessions: [],
    createdAtMs: START_MS,
    updatedAtMs: START_MS,
    ...overrides,
  });
}

function makeManager(plan: ReadingPlan) {
  const createdProgress = makeProgress();

  const manager = {
    selectedReadingPlan: signal(plan),
    selectedReadingPlanProgress: signal(null),
    selectedReadingPlanProgressCalendar: signal([]),
    canEditSelectedPlan: signal(false),
    userReadingPlanProgresses: signal([]),

    startReadingPlan: vi.fn().mockResolvedValue(createdProgress),
    selectReadingPlanProgress: vi.fn().mockResolvedValue(undefined),
  };

  return {
    manager: manager as unknown as ReadingPlansManager,
    createdProgress,
  };
}

describe("ReadingPlanDetail", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
    vi.restoreAllMocks();
  });

  function getButton(label: string): HTMLButtonElement {
    const button = Array.from(container.querySelectorAll("button")).find(
      (element) => element.textContent?.includes(label)
    );

    if (!button) {
      throw new Error(`Button "${label}" was not found`);
    }

    return button;
  }

  async function clickButton(label: string) {
    await act(async () => {
      getButton(label).click();
    });
  }

  function renderDetail(
    manager: ReadingPlansManager,
    options: {
      login?: Pick<LoginManager, "userId" | "login">;
      toast?: (message: string) => void;
    } = {}
  ) {
    render(
      <ReadingPlanDetail
        readingPlans={manager}
        books={[]}
        modals={{} as ModalManager}
        login={options.login}
        toast={options.toast}
      />,
      container
    );
  }

  describe("starting a reading plan", () => {
    it("does not start the plan when the user cancels login", async () => {
      const plan = makePlan();
      const { manager } = makeManager(plan);

      const userId = signal<string | null>(null);
      const login = vi.fn().mockResolvedValue(undefined);
      const toast = vi.fn();

      renderDetail(manager, {
        login: { userId, login },
        toast,
      });

      await clickButton("Start plan");

      expect(login).toHaveBeenCalledTimes(1);
      expect(manager.startReadingPlan).not.toHaveBeenCalled();
      expect(manager.selectReadingPlanProgress).not.toHaveBeenCalled();
      expect(toast).not.toHaveBeenCalled();
    });

    it("starts the plan directly when the user is already signed in", async () => {
      const plan = makePlan();
      const { manager } = makeManager(plan);

      const userId = signal<string | null>("user-1");
      const login = vi.fn();

      renderDetail(manager, {
        login: { userId, login },
      });

      await clickButton("Start plan");

      expect(login).not.toHaveBeenCalled();
      expect(manager.startReadingPlan).toHaveBeenCalledWith(plan, {
        cadenceId: "daily",
      });
    });

    it("uses the selected cadence when starting the plan", async () => {
      const plan = makePlan();
      const { manager } = makeManager(plan);

      const userId = signal<string | null>("user-1");
      const login = vi.fn();

      renderDetail(manager, {
        login: { userId, login },
      });

      const cadenceChoices =
        container.querySelectorAll<HTMLButtonElement>(".sb-rp-choice");

      expect(cadenceChoices).toHaveLength(3);

      // Select the second cadence option.
      await act(async () => {
        cadenceChoices[1]!.click();
      });

      expect(cadenceChoices[1]!.getAttribute("aria-pressed")).toBe("true");

      await clickButton("Start plan");

      expect(manager.startReadingPlan).toHaveBeenCalledWith(plan, {
        cadenceId: "every-other-day",
      });
    });

    it("starts the plan at the user's own pace when selected", async () => {
      const plan = makePlan();
      const { manager } = makeManager(plan);

      const userId = signal<string | null>("user-1");
      const login = vi.fn();

      renderDetail(manager, {
        login: { userId, login },
      });

      await clickButton("At my own pace");
      await clickButton("Start plan");

      expect(manager.startReadingPlan).toHaveBeenCalledWith(plan, {
        selfPaced: true,
      });
    });

    it("selects existing progress instead of creating a new one", async () => {
      const plan = makePlan();
      const { manager } = makeManager(plan);
      const existingProgress = makeProgress();

      manager.userReadingPlanProgresses.value = [existingProgress];

      const userId = signal<string | null>("user-1");
      const login = vi.fn();

      renderDetail(manager, {
        login: { userId, login },
      });

      await clickButton("Start plan");

      expect(manager.startReadingPlan).not.toHaveBeenCalled();

      expect(manager.selectReadingPlanProgress).toHaveBeenCalledWith(
        existingProgress
      );
    });

    it("shows an error toast when starting the plan fails", async () => {
      const plan = makePlan();
      const { manager } = makeManager(plan);

      manager.startReadingPlan = vi
        .fn()
        .mockRejectedValue(new Error("Network error"));

      const userId = signal<string | null>("user-1");
      const login = vi.fn();
      const toast = vi.fn();

      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      renderDetail(manager, {
        login: { userId, login },
        toast,
      });

      await clickButton("Start plan");

      expect(manager.startReadingPlan).toHaveBeenCalledTimes(1);

      expect(toast).toHaveBeenCalledWith(
        "Couldn't start the reading plan. Please try again."
      );

      expect(manager.selectReadingPlanProgress).not.toHaveBeenCalled();

      expect(consoleError).toHaveBeenCalled();
    });

    it("does not render the start button when the plan has no sessions", () => {
      const plan = makePlan({ sessions: [] });
      const { manager } = makeManager(plan);

      const userId = signal<string | null>("user-1");
      const login = vi.fn();

      renderDetail(manager, {
        login: { userId, login },
      });

      expect(container.textContent).toContain("Start plan");
      expect(getButton("Start plan").disabled).toBe(true);
    });
  });
});
