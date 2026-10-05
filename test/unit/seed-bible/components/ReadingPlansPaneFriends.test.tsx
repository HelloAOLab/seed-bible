import { render } from "preact";
import { act } from "preact/test-utils";
import { computed, signal } from "@preact/signals";
import { ReadingPlansPane } from "@packages/seed-bible/seed-bible/components/ReadingPlansPane/ReadingPlansPane";
import {
  createReadingPlan,
  createReadingPlansManager,
  ReadingPlanProgressSchema,
} from "@packages/seed-bible/seed-bible/managers/ReadingPlansManager";
import { CasualOSManager } from "@packages/seed-bible/seed-bible/managers/OsManager";
import type {
  Friend,
  FriendsManager,
} from "@packages/seed-bible/seed-bible/managers/FriendsManager";

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const { mockI18nManager } = await import("../testUtils/mockI18n");
  return mockI18nManager();
});

type ManagerArgs = Parameters<typeof createReadingPlansManager>;

const FIRST_START_MS = Date.UTC(2026, 0, 5, 12);
const RESTART_MS = Date.UTC(2026, 2, 9, 12);

const startedLabel = (ms: number) =>
  `started ${new Date(ms).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })}`;

const progress = (id: string, startedAtMs: number) =>
  ReadingPlanProgressSchema.parse({
    id,
    planId: "rp_author-1_plan-1",
    recordName: "ada",
    userId: "ada",
    startedAtMs,
    sessions: [],
    createdAtMs: startedAtMs,
    updatedAtMs: startedAtMs,
  });

describe("ReadingPlansPane — reading plans from your friends", () => {
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

  /** A real plans manager whose only records are Ada's progress and the plan. */
  function plansManagerWithAdasProgress(
    progresses: ReturnType<typeof progress>[]
  ) {
    const os = CasualOSManager();
    vi.spyOn(os, "listAllDataByMarker").mockImplementation(
      async (recordName: string, marker: string) => ({
        success: true,
        items:
          recordName === "ada" && marker === "publicRead:readingPlanProgress"
            ? progresses.map((p) => ({ address: p.id, data: p }))
            : [],
      })
    );
    vi.spyOn(os, "getData").mockImplementation((async (
      recordName: string,
      address: string
    ) =>
      recordName === "author-1" && address === "plan-1"
        ? {
            success: true,
            data: createReadingPlan(
              "author-1",
              "author-1",
              "plan-1",
              FIRST_START_MS,
              { title: "Gospel of John", status: "complete" }
            ),
          }
        : { success: false, errorCode: "data_not_found" }) as never);

    const login = { userId: signal("me") } as unknown as ManagerArgs[1];
    const tabs = {
      tabs: signal([
        { id: "tab-1", readingState: { translationId: signal("BSB") } },
      ]),
      selectedTabId: signal("tab-1"),
    } as unknown as ManagerArgs[2];
    const url = new URL("http://localhost:3000/en/BSB/genesis/1");
    return createReadingPlansManager(os, login, tabs, {
      currentUrl: signal(url),
      initialUrl: url,
      basePath: "",
    });
  }

  function friendsWithAda(): FriendsManager {
    const friends = signal<Friend[]>([
      { userId: "ada", name: "Ada", pictureUrl: null },
    ]);
    return {
      friends,
      friendIds: computed(() => friends.value.map((f) => f.userId)),
    } as unknown as FriendsManager;
  }

  const friendCards = () =>
    container.querySelectorAll(".sb-rp-friend-group .sb-rp-card");

  it("shows a friend's plan once, from where they restarted it", async () => {
    const readingPlans = plansManagerWithAdasProgress([
      progress("first-time", FIRST_START_MS),
      progress("restart", RESTART_MS),
    ]);

    act(() => {
      render(
        <ReadingPlansPane
          readingPlans={readingPlans}
          friends={friendsWithAda()}
          books={[]}
        />,
        container
      );
    });

    await vi.waitFor(() => expect(friendCards()).toHaveLength(1));
    const card = friendCards()[0]!;
    expect(card.textContent).toContain("Gospel of John");
    expect(card.textContent).toContain(startedLabel(RESTART_MS));
    expect(card.textContent).not.toContain(startedLabel(FIRST_START_MS));
  });
});
