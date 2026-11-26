import { render } from "preact";
import { act } from "preact/test-utils";
import { Signal, signal } from "@preact/signals";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  ReadingPlanSchema,
  ReadingPlanProgressSchema,
  createReadingPlansManager,
  type ReadingPlan,
  type ReadingPlanProgress,
  type ReadingPlansManager,
} from "@packages/seed-bible/seed-bible/managers/ReadingPlansManager";

import {
  CasualOSManager,
  type UserInfo,
} from "@packages/seed-bible/seed-bible/managers";

import { listAllByAddress } from "@packages/seed-bible/seed-bible/managers/OsManager";

import type { ModalManager } from "@packages/seed-bible/seed-bible/managers/ModalManager";
import type { LoginManager } from "@packages/seed-bible/seed-bible/managers/LoginManager";

import { ReadingPlanDetail } from "@packages/seed-bible/seed-bible/components/ReadingPlansPane/ReadingPlanDetail";

const START_MS = Date.UTC(2026, 5, 17, 13, 45, 0);

const PROGRESS_MARKER = "publicRead:readingPlanProgress";

type ListedRecord = {
  address: string;
  data: unknown;
};

type ListResult = {
  success: true;
  items: ListedRecord[];
  totalCount: number;
};
// Keep these mocks callable with explicit argument types.
const recordDataMock = vi.fn().mockResolvedValue({ success: true });
const getDataMock = vi.fn().mockResolvedValue({ success: false });
const eraseDataMock = vi.fn().mockResolvedValue({ success: true });
const recordFileMock = vi.fn().mockResolvedValue({
  success: true,
  url: "https://example.com/hero.jpg",
});
const getLinkPreviewMock = vi.fn().mockResolvedValue({
  success: false,
  errorCode: "not_supported",
  errorMessage: "Link previews are not supported.",
});

const listDataByMarkerMock = vi.fn().mockResolvedValue({
  success: true,
  items: [],
  totalCount: 0,
});

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
    recordName: "user-1",
    userId: "user-1",
    startedAtMs: START_MS,
    sessions: [],
    createdAtMs: START_MS,
    updatedAtMs: START_MS,
    ...overrides,
  });
}

/**
 * Configure the OsManager boundary to return records for each marker.
 * The real listAllByAddress pagination helper is still used.
 */
const setListData = (
  byMarker: Record<string, { address: string; data: unknown }[][]>
) => {
  listDataByMarkerMock.mockImplementation(
    async (_recordName: string, marker: string, lastAddress?: string) => {
      const pages = byMarker[marker] ?? [[]];

      if (!lastAddress) {
        const items = pages[0] ?? [];
        return {
          success: true,
          items,
          totalCount: items.length,
        };
      }

      const idx = pages.findIndex(
        (page) =>
          page.length > 0 && page[page.length - 1]!.address === lastAddress
      );

      const items = pages[idx + 1] ?? [];

      return {
        success: true,
        items,
        totalCount: items.length,
      };
    }
  );
};
type ManagerFixture = {
  manager: ReadingPlansManager;
  userId: Signal<string | null>;
};

const managers: ReadingPlansManager[] = [];

function makeManager(
  plan: ReadingPlan,
  initialUserId: string | null = "user-1"
): ManagerFixture {
  const userId = signal<string | null>(initialUserId);

  const os = CasualOSManager();

  // Mock only the persistence boundary. The ReadingPlansManager itself
  // remains the real implementation.
  Object.assign(os, {
    getData: getDataMock,
    recordData: recordDataMock,
    eraseData: eraseDataMock,
    recordFile: recordFileMock,
    listDataByMarker: listDataByMarkerMock,

    listAllDataByMarker: (
      recordName: string,
      marker: string,
      onPage?: () => void
    ) =>
      listAllByAddress(
        (lastAddress) => listDataByMarkerMock(recordName, marker, lastAddress),
        onPage
      ),
  });

  (os.client as unknown as { getLinkPreview: unknown }).getLinkPreview =
    getLinkPreviewMock;

  const login = {
    userId,
  } as unknown as LoginManager;

  const tabs = {
    tabs: signal([
      {
        id: "tab-1",
        readingState: {
          translationId: signal("AAB"),
        },
      },
    ]),
    selectedTabId: signal("tab-1"),
  };

  const navigation = {
    currentUrl: signal(new URL("http://localhost:3000/en/AAB/genesis/1")),
    initialUrl: new URL("http://localhost:3000/en/AAB/genesis/1"),
    basePath: "",
  };

  const manager = createReadingPlansManager(
    os,
    login,
    tabs as never,
    navigation as never
  );

  // Use the actual manager state, not a hand-built manager stub.
  manager.selectedReadingPlan.value = plan;

  managers.push(manager);

  return {
    manager,
    userId,
  };
}

describe("ReadingPlanDetail", () => {
  let container: HTMLDivElement;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);

    recordDataMock.mockReset().mockResolvedValue({ success: true });
    getDataMock.mockReset().mockResolvedValue({ success: false });
    eraseDataMock.mockReset().mockResolvedValue({ success: true });
    recordFileMock.mockReset().mockResolvedValue({
      success: true,
      url: "https://example.com/hero.jpg",
    });
    getLinkPreviewMock.mockReset().mockResolvedValue({
      success: false,
      errorCode: "not_supported",
      errorMessage: "Link previews are not supported.",
    });
    listDataByMarkerMock.mockReset().mockResolvedValue({
      success: true,
      items: [],
      totalCount: 0,
    });

    errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(async () => {
    render(null, container);
    container.remove();

    // Ensure any unfinished draft work is closed.
    for (const manager of managers) {
      if (manager.editingReadingPlan.peek() !== null) {
        manager.cancelEditingReadingPlan();
      }
    }

    managers.length = 0;

    errorSpy.mockRestore();
    vi.restoreAllMocks();
  });

  async function flush() {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }

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
    userId: Signal<string | null>,
    login: LoginManager["login"],
    toast?: (message: string) => void
  ) {
    render(
      <ReadingPlanDetail
        readingPlans={manager}
        books={[]}
        modals={{} as ModalManager}
        login={{ userId, login }}
        toast={toast}
      />,
      container
    );
  }

  describe("starting a reading plan", () => {
    it("does not start the plan when the user cancels login", async () => {
      const plan = makePlan();
      const { manager, userId } = makeManager(plan, null);

      const login = vi.fn().mockResolvedValue(undefined);

      renderDetail(manager, userId, login as LoginManager["login"]);

      await clickButton("Start plan");

      expect(login).toHaveBeenCalledTimes(1);
      expect(recordDataMock).not.toHaveBeenCalled();
      expect(manager.userReadingPlanProgresses.value).toEqual([]);
    });

    it("automatically starts the plan after a signed-out user successfully logs in", async () => {
      const plan = makePlan();
      const { manager, userId } = makeManager(plan, null);

      // No existing progress for this user.
      setListData({
        [PROGRESS_MARKER]: [[]],
      });

      const login = vi.fn(async (): Promise<UserInfo | null> => {
        userId.value = "user-1";
        return null;
      });

      renderDetail(manager, userId, login);

      await clickButton("Start plan");

      await vi.waitFor(() => {
        expect(manager.selectedReadingPlanProgress.value).not.toBeNull();
      });

      // Login happened and the same click continued into starting the plan.
      expect(login).toHaveBeenCalledTimes(1);

      expect(recordDataMock).toHaveBeenCalledWith(
        "user-1",
        expect.any(String),
        expect.objectContaining({
          planId: "rp_record-1_plan-1",
          userId: "user-1",
          selectedCadenceId: "daily",
        }),
        {
          marker: PROGRESS_MARKER,
        }
      );
    });

    it("waits for progress to reload after login before starting the plan", async () => {
      const plan = makePlan();
      const { manager, userId } = makeManager(plan, null);
      const existingProgress = makeProgress();

      let resolveProgressLoad!: (result: ListResult) => void;

      const progressLoad = new Promise<ListResult>((resolve) => {
        resolveProgressLoad = resolve;
      });

      // Hold the actual OsManager progress-list request.
      listDataByMarkerMock.mockImplementation(
        async (_recordName: string, marker: string): Promise<ListResult> => {
          if (marker === PROGRESS_MARKER) {
            return progressLoad;
          }

          return {
            success: true,
            items: [],
            totalCount: 0,
          };
        }
      );

      const login = vi.fn(async (): Promise<UserInfo | null> => {
        userId.value = "user-1";
        return null;
      });
      renderDetail(manager, userId, login);

      // Start the click without waiting for the handler to finish.
      const clickPromise = clickButton("Start plan");

      expect(login).toHaveBeenCalledTimes(1);

      // Wait until the actual progress reload reaches OsManager.
      await vi.waitFor(() => {
        expect(listDataByMarkerMock).toHaveBeenCalledWith(
          "user-1",
          PROGRESS_MARKER,
          undefined
        );
      });

      // The request is still pending, so no new progress should be written.
      expect(recordDataMock).not.toHaveBeenCalled();

      // Release the pending request with the existing progress.
      await act(async () => {
        resolveProgressLoad({
          success: true,
          items: [
            {
              address: existingProgress.id,
              data: existingProgress,
            },
          ],
          totalCount: 1,
        });

        await progressLoad;
      });

      // Now the click handler can finish.
      await clickPromise;

      await vi.waitFor(() => {
        expect(manager.userReadingPlanProgresses.value).toContainEqual(
          existingProgress
        );

        expect(manager.selectedReadingPlanProgress.value).toEqual(
          existingProgress
        );
      });

      // Existing progress was selected, not recreated.
      expect(recordDataMock).not.toHaveBeenCalled();
    });

    it("starts the plan directly when the user is already signed in", async () => {
      const plan = makePlan();
      const { manager, userId } = makeManager(plan);

      const login = vi.fn();

      renderDetail(manager, userId, login as LoginManager["login"]);

      await clickButton("Start plan");

      await vi.waitFor(() => {
        expect(manager.selectedReadingPlanProgress.value).not.toBeNull();
      });

      expect(login).not.toHaveBeenCalled();

      expect(recordDataMock).toHaveBeenCalledWith(
        "user-1",
        expect.any(String),
        expect.objectContaining({
          planId: "rp_record-1_plan-1",
          userId: "user-1",
          selectedCadenceId: "daily",
        }),
        {
          marker: PROGRESS_MARKER,
        }
      );
    });

    it("uses the selected cadence when starting the plan", async () => {
      const plan = makePlan();
      const { manager, userId } = makeManager(plan);

      renderDetail(manager, userId, vi.fn() as LoginManager["login"]);

      const cadenceChoices =
        container.querySelectorAll<HTMLButtonElement>(".sb-rp-choice");

      expect(cadenceChoices).toHaveLength(3);

      await act(async () => {
        cadenceChoices[1]!.click();
      });

      expect(cadenceChoices[1]!.getAttribute("aria-pressed")).toBe("true");

      await clickButton("Start plan");

      await vi.waitFor(() => {
        expect(
          manager.selectedReadingPlanProgress.value?.selectedCadenceId
        ).toBe("every-other-day");
      });
    });

    it("starts the plan at the user's own pace when selected", async () => {
      const plan = makePlan();
      const { manager, userId } = makeManager(plan);

      renderDetail(manager, userId, vi.fn() as LoginManager["login"]);

      await clickButton("At my own pace");
      await clickButton("Start plan");

      await vi.waitFor(() => {
        expect(manager.selectedReadingPlanProgress.value?.selfPaced).toBe(true);
      });
    });

    it("selects existing progress instead of creating a new one", async () => {
      const plan = makePlan();
      const existingProgress = makeProgress();

      setListData({
        [PROGRESS_MARKER]: [
          [
            {
              address: existingProgress.id,
              data: existingProgress,
            },
          ],
        ],
      });

      const { manager, userId } = makeManager(plan);

      // Wait for the real manager's initial progress sync.
      await flush();

      expect(manager.userReadingPlanProgresses.value).toContainEqual(
        existingProgress
      );

      renderDetail(manager, userId, vi.fn() as LoginManager["login"]);

      await clickButton("Start plan");

      await vi.waitFor(() => {
        expect(manager.selectedReadingPlanProgress.value).toEqual(
          existingProgress
        );
      });

      expect(recordDataMock).not.toHaveBeenCalled();
    });

    it("shows an error toast when starting the plan fails", async () => {
      const plan = makePlan();
      const { manager, userId } = makeManager(plan);

      recordDataMock.mockRejectedValueOnce(new Error("Network error"));

      const toast = vi.fn();

      renderDetail(manager, userId, vi.fn() as LoginManager["login"], toast);

      await clickButton("Start plan");

      await vi.waitFor(() => {
        expect(toast).toHaveBeenCalledWith(
          "Couldn't start the reading plan. Please try again."
        );
      });

      expect(manager.selectedReadingPlanProgress.value).toBeNull();

      expect(errorSpy).toHaveBeenCalled();
    });

    it("disables Start plan when the plan has no sessions", () => {
      const plan = makePlan({ sessions: [] });
      const { manager, userId } = makeManager(plan);

      renderDetail(manager, userId, vi.fn() as LoginManager["login"]);

      expect(container.textContent).toContain("Start plan");
      expect(getButton("Start plan").disabled).toBe(true);
    });
  });
});
