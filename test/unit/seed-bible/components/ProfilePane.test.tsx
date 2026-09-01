import type { Mock } from "vitest";
import { render } from "preact";
import { act } from "preact/test-utils";
import { signal, type Signal } from "@preact/signals";
import { ProfilePane } from "@packages/seed-bible/seed-bible/components/ProfilePane/ProfilePane";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import type {
  ReadingPlan,
  ReadingPlanMetadata,
  ReadingPlanProgress,
} from "@packages/seed-bible/seed-bible/managers/ReadingPlansManager";

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const { mockI18nManager } = await import("../testUtils/mockI18n");
  return mockI18nManager();
});

interface StateOptions {
  userId?: string | null;
  name?: string | null;
  pictureUrl?: string | null;
  plansEnabled?: boolean;
  /** Plan metadata, full plans and progress, as the manager would hold them. */
  plans?: {
    metas: ReadingPlanMetadata[];
    full: ReadingPlan[];
    progresses: ReadingPlanProgress[];
  };
}

// A fixed "now" so the plan card's day maths doesn't move with the clock.
const NOW_MS = Date.UTC(2026, 5, 17, 9, 0, 0);

/** Four one-reading sessions, read one a day. */
function planFixture(
  overrides: {
    address?: string;
    title?: string | null;
    status?: "draft" | "complete";
  } = {}
): { meta: ReadingPlanMetadata; full: ReadingPlan } {
  const address = overrides.address ?? "plan-1";
  const meta = {
    address,
    recordName: "record-1",
    authorUserId: "author-1",
    locale: "en-US",
    title: overrides.title === undefined ? "Gospel of John" : overrides.title,
    description: null,
    cadenceOptions: [
      {
        id: "daily",
        label: "Daily",
        cadence: { segments: [{ type: "read", days: 1, sessionsPerDay: 1 }] },
      },
    ],
    defaultCadenceId: "daily",
    status: overrides.status ?? "complete",
    schemaVersion: 1,
    createdAtMs: NOW_MS,
    updatedAtMs: NOW_MS,
  } as unknown as ReadingPlanMetadata;

  const full = {
    ...meta,
    sessions: ["s1", "s2", "s3", "s4"].map((id) => ({
      id: `${address}-${id}`,
      readings: [
        {
          id: `${address}-${id}-r1`,
          item: {
            type: "bible-verse",
            ref: { bookId: "JHN", chapter: 1, verse: 1 },
          },
        },
      ],
    })),
  } as unknown as ReadingPlan;

  return { meta, full };
}

/**
 * Progress for `plan` started today, with its first `doneDays` days read.
 * The time zone is fixed so a day boundary doesn't depend on the machine's.
 */
function progressFixture(
  plan: ReadingPlan,
  doneDays: number
): ReadingPlanProgress {
  return {
    id: `progress-${plan.address}`,
    planId: `rp_${plan.recordName}_${plan.address}`,
    recordName: plan.recordName,
    userId: "user-1",
    selectedCadenceId: "daily",
    selfPaced: false,
    startedAtMs: NOW_MS,
    timeZone: "utc",
    sessions: plan.sessions.slice(0, doneDays).map((session) => ({
      sessionId: session.id,
      completedReadingIds: session.readings.map((reading) => reading.id),
      partialChapters: [],
      completedAtMs: NOW_MS,
    })),
    percentComplete: doneDays / plan.sessions.length,
    totalSessions: plan.sessions.length,
    totalReadings: plan.sessions.length,
    createdAtMs: NOW_MS,
    updatedAtMs: NOW_MS,
  } as unknown as ReadingPlanProgress;
}

function createState(options: StateOptions = {}) {
  const {
    userId = "user-1",
    name = "Craig Anders",
    pictureUrl = null,
    plansEnabled = true,
  } = options;

  const logout = vi.fn(async () => {});
  const login = vi.fn(async () => null);

  const state = {
    login: {
      userId: signal(userId) as Signal<string | null>,
      profile: signal(
        name == null && pictureUrl == null ? null : { name, pictureUrl }
      ),
      logout,
      login,
    },
    features: {
      isFeatureEnabled: () => signal(plansEnabled),
    },
    // By default the user has no plans, so the card falls back to its prompt.
    readingPlans: {
      userReadingPlans: signal(options.plans?.metas ?? []),
      fullReadingPlans: signal(options.plans?.full ?? []),
      userReadingPlanProgresses: signal(options.plans?.progresses ?? []),
    },
    os: { connectionId: "conn-1" },
  } as unknown as SeedBibleState;

  return { state, logout, login };
}

describe("ProfilePane", () => {
  let container: HTMLDivElement;
  let onOpenAccountSettings: Mock<() => void>;
  let onOpenReadingPlans: Mock<() => void>;
  let onOpenYourContent: Mock<() => void>;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    onOpenAccountSettings = vi.fn(() => {});
    onOpenReadingPlans = vi.fn(() => {});
    onOpenYourContent = vi.fn(() => {});
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  function renderPane(state: SeedBibleState) {
    act(() => {
      render(
        <ProfilePane
          state={state}
          onOpenAccountSettings={onOpenAccountSettings}
          onOpenReadingPlans={onOpenReadingPlans}
          onOpenYourContent={onOpenYourContent}
        />,
        container
      );
    });
  }

  it("shows the signed-in user's name", () => {
    const { state } = createState({ name: "Craig Anders" });
    renderPane(state);

    expect(container.querySelector(".sb-profile-name")?.textContent).toBe(
      "Craig Anders"
    );
  });

  it("falls back to initials when the user has no profile picture", () => {
    const { state } = createState({ name: "Craig Anders" });
    renderPane(state);

    const avatar = container.querySelector(".sb-profile-avatar");
    expect(avatar?.textContent).toBe("CA");
    expect((avatar as HTMLElement | null)?.style.backgroundImage).toBe("");
  });

  it("uses one initial for a single-word name", () => {
    const { state } = createState({ name: "Craig" });
    renderPane(state);

    expect(container.querySelector(".sb-profile-avatar")?.textContent).toBe(
      "C"
    );
  });

  it("shows the profile picture instead of initials when there is one", () => {
    const { state } = createState({ pictureUrl: "https://example.org/me.png" });
    renderPane(state);

    const avatar = container.querySelector(".sb-profile-avatar") as HTMLElement;
    expect(avatar.textContent).toBe("");
    expect(avatar.style.backgroundImage).toContain(
      "https://example.org/me.png"
    );
  });

  it("routes the account settings button to the caller", () => {
    const { state } = createState();
    renderPane(state);

    const button = container.querySelector(
      ".sb-profile-account-button"
    ) as HTMLButtonElement;
    expect(button.textContent).toContain("Account settings");
    act(() => {
      button.click();
    });

    expect(onOpenAccountSettings).toHaveBeenCalledTimes(1);
  });

  // The picture editor lives in account settings, so "+" goes there too.
  it("routes the avatar edit badge to account settings", () => {
    const { state } = createState();
    renderPane(state);

    act(() => {
      (
        container.querySelector(".sb-profile-avatar-edit") as HTMLButtonElement
      ).click();
    });

    expect(onOpenAccountSettings).toHaveBeenCalledTimes(1);
  });

  it("signs the user out from the log out button", () => {
    const { state, logout } = createState();
    renderPane(state);

    const button = container.querySelector(
      ".sb-profile-logout"
    ) as HTMLButtonElement;
    expect(button.textContent).toBe("Log out");
    act(() => {
      button.click();
    });

    expect(logout).toHaveBeenCalledTimes(1);
  });

  it("prompts a signed-out visitor to log in instead of showing a profile", () => {
    const { state, login } = createState({ userId: null, name: null });
    renderPane(state);

    expect(container.querySelector(".sb-profile-logout")).toBeNull();
    expect(container.querySelector(".sb-profile-account-button")).toBeNull();

    const button = container.querySelector(
      ".sb-profile-signin"
    ) as HTMLButtonElement;
    expect(button.textContent).toBe("Log in");
    act(() => {
      button.click();
    });

    expect(login).toHaveBeenCalledTimes(1);
  });

  it("invites the user to start a plan when they have none in progress", () => {
    const { state } = createState();
    renderPane(state);

    const card = container.querySelector(".sb-profile-plans");
    expect(card).not.toBeNull();
    expect(card?.textContent).toContain("You haven't started a plan yet.");
    // Nothing to show progress for, so no bar is drawn.
    expect(container.querySelector(".sb-profile-progress")).toBeNull();
  });

  it("opens the plans pane from the plans card", () => {
    const { state } = createState();
    renderPane(state);

    act(() => {
      (
        container.querySelector(".sb-profile-plans") as HTMLButtonElement
      ).click();
    });

    expect(onOpenReadingPlans).toHaveBeenCalledTimes(1);
  });

  describe("with a plan in progress", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(NOW_MS);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("features the plan with its day, total and progress bar", () => {
      const { meta, full } = planFixture();
      const { state } = createState({
        plans: {
          metas: [meta],
          full: [full],
          progresses: [progressFixture(full, 1)],
        },
      });
      renderPane(state);

      const card = container.querySelector(".sb-profile-plans");
      expect(card?.textContent).toContain("Gospel of John");
      // One of four days read, so the next one to read is day 2.
      expect(card?.textContent).toContain("Day 2 of 4");

      const bar = container.querySelector(
        ".sb-profile-progress"
      ) as HTMLElement;
      expect(bar.getAttribute("aria-valuenow")).toBe("2");
      expect(bar.getAttribute("aria-valuemax")).toBe("4");
      expect(
        (bar.querySelector(".sb-profile-progress-fill") as HTMLElement).style
          .width
      ).toBe("25%");
      // Today's reading is done, so the streak reads one day.
      expect(
        container.querySelector(".sb-profile-plans-stats")?.textContent
      ).toBe("Day 2 of 4 · local_fire_department1");
    });

    it("falls back to a placeholder when the plan has no title", () => {
      const { meta, full } = planFixture({ title: null });
      const { state } = createState({
        plans: {
          metas: [meta],
          full: [full],
          progresses: [progressFixture(full, 1)],
        },
      });
      renderPane(state);

      expect(
        container.querySelector(".sb-profile-plans-name")?.textContent
      ).toBe("Untitled plan");
    });

    // A draft is the user's own unfinished plan, not something to read.
    it("ignores a draft plan and features the published one", () => {
      const draft = planFixture({ address: "draft-1", status: "draft" });
      const published = planFixture({
        address: "plan-2",
        title: "Psalms in a month",
      });
      const { state } = createState({
        plans: {
          metas: [draft.meta, published.meta],
          full: [draft.full, published.full],
          progresses: [
            // The draft is further along, so it would win if it counted.
            progressFixture(draft.full, 3),
            progressFixture(published.full, 1),
          ],
        },
      });
      renderPane(state);

      expect(
        container.querySelector(".sb-profile-plans-name")?.textContent
      ).toBe("Psalms in a month");
    });

    it("invites a new plan once every plan is finished", () => {
      const { meta, full } = planFixture();
      const { state } = createState({
        plans: {
          metas: [meta],
          full: [full],
          progresses: [progressFixture(full, 4)],
        },
      });
      renderPane(state);

      expect(container.querySelector(".sb-profile-progress")).toBeNull();
      expect(
        container.querySelector(".sb-profile-plans")?.textContent
      ).toContain("You haven't started a plan yet.");
    });
  });

  it("hides the plans card when the reading plans feature is off", () => {
    const { state } = createState({ plansEnabled: false });
    renderPane(state);

    expect(container.querySelector(".sb-profile-plans")).toBeNull();
    // The rest of the screen is unaffected.
    expect(container.querySelector(".sb-profile-name")).not.toBeNull();
  });
});
