import type { Mock } from "vitest";
import { render } from "preact";
import { act } from "preact/test-utils";
import { useReadingHistoryProvider } from "../../../../packages/scripture-map/contexts/ReadingHistory/useReadingHistoryProvider";
import { useScriptureMapContext } from "../../../../packages/scripture-map/contexts/ScriptureMap/ScriptureMapContext";
import { useTimeContext } from "../../../../packages/scripture-map/contexts/Time/TimeContext";
import { ScriptureMapModes } from "../../../../packages/scripture-map/models/scriptureMap";
import {
  getReadingHistoryEvents,
  calculateReadingHistorySummary,
} from "../../../../packages/seed-bible/seed-bible/managers/ReadingHistoryManager";

vi.mock(
  "../../../../packages/scripture-map/contexts/ScriptureMap/ScriptureMapContext",
  () => ({
    useScriptureMapContext: vi.fn(),
  })
);

vi.mock("../../../../packages/scripture-map/contexts/Time/TimeContext", () => ({
  useTimeContext: vi.fn(),
}));

vi.mock(
  "../../../../packages/seed-bible/seed-bible/managers/ReadingHistoryManager",
  () => ({
    getReadingHistoryEvents: vi.fn(async () => []),
    // `flat` flattens the per-user event arrays; iterable result is fine.
    flat: vi.fn((arrays: unknown[][]) => arrays.flat()),
    calculateReadingHistorySummary: vi.fn(() => ({
      totalTimeSpentReading: 0,
      users: {},
    })),
  })
);

const MY_AUTH_ID = "me";

// Distinct unsubscribe spies keyed by event name so cleanup can be asserted.
let unsubscribeUserLoggedIn: Mock;
let unsubscribeOnlineUsersChanged: Mock;
let subscribe: Mock;
let setShowingBooksColors: Mock;
let getConnectedUsers: Mock;
// Captures the latest callback registered per event so tests can fire them.
let eventCallbacks: Record<string, () => void>;

function makeContext(overrides: Record<string, unknown> = {}) {
  return {
    mode: ScriptureMapModes.Viewer,
    isReadingHistoryEnabled: true,
    setShowingBooksColors,
    // myAuthBotId is now derived from the context userId (the old global
    // authBot/handleUserLoggedIn path was removed).
    userId: MY_AUTH_ID,
    seedBibleState: {
      os: {},
      tabs: { selectedTabId: { value: "tab-1" } },
    },
    seedBibleUtilsEventManager: { subscribe },
    getDayRangeSeconds: vi.fn((ms: number) => {
      const start = Math.floor(ms / 1000);
      return { start, end: start + 86399 };
    }),
    sessionProvider: { getConnectedUsers },
    ...overrides,
  };
}

describe("useReadingHistoryProvider", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);

    (globalThis as unknown as { authBot: { id: string } }).authBot = {
      id: MY_AUTH_ID,
    };

    unsubscribeUserLoggedIn = vi.fn();
    unsubscribeOnlineUsersChanged = vi.fn();
    eventCallbacks = {};
    subscribe = vi.fn((eventName: string, callback: () => void) => {
      eventCallbacks[eventName] = callback;
      return eventName === "OnUserLoggedIn"
        ? unsubscribeUserLoggedIn
        : unsubscribeOnlineUsersChanged;
    });
    setShowingBooksColors = vi.fn();
    getConnectedUsers = vi.fn(() => []);

    (useScriptureMapContext as Mock).mockReturnValue(makeContext());
    (useTimeContext as Mock).mockReturnValue({ tick: 0 });
  });

  afterEach(() => {
    render(null, container);
    container.remove();
    delete (globalThis as unknown as { authBot?: unknown }).authBot;
    vi.clearAllMocks();
  });

  type ProviderResult = ReturnType<typeof useReadingHistoryProvider>;

  function setup() {
    const result = { current: null as unknown as ProviderResult };
    function TestComponent() {
      result.current = useReadingHistoryProvider();
      return null;
    }
    act(() => render(<TestComponent />, container));
    return result;
  }

  // Mounts and drains the chained async effects (auth → usersDataMap → filters).
  async function setupAsync() {
    const result = { current: null as unknown as ProviderResult };
    function TestComponent() {
      result.current = useReadingHistoryProvider();
      return null;
    }
    await act(async () => {
      render(<TestComponent />, container);
    });
    for (let i = 0; i < 4; i++) {
      // eslint-disable-next-line no-await-in-loop
      await act(async () => {
        await Promise.resolve();
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
    }
    return result;
  }

  // Drains a microtask + macrotask cycle after firing an event/state change.
  async function flush() {
    await act(async () => {
      await Promise.resolve();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }

  // ─── initial setup ────────────────────────────────────────────────────────

  describe("initial setup", () => {
    it("sets myAuthBotId from the context userId on mount", () => {
      const result = setup();
      expect(result.current.myAuthBotId).toBe(MY_AUTH_ID);
    });

    it("seeds the user filters with the local user selected", async () => {
      // Regression: the local user must stay selected even with no other
      // connected users (the filter reconciliation must not drop it).
      const result = await setupAsync();
      expect(result.current.readingHistoryUserFilters.get(MY_AUTH_ID)).toBe(
        true
      );
    });

    it("defaults the timeline range method to Rolling", () => {
      const result = setup();
      expect(result.current.timelineRangeMethod).toBe("Rolling");
    });
  });

  // ─── event subscriptions ────────────────────────────────────────────────────

  describe("event subscriptions", () => {
    it("subscribes to OnlineUsersChanged", () => {
      setup();
      // OnUserLoggedIn was removed; only OnlineUsersChanged remains.
      expect(subscribe).toHaveBeenCalledWith(
        "OnlineUsersChanged",
        expect.any(Function)
      );
      expect(subscribe).not.toHaveBeenCalledWith(
        "OnUserLoggedIn",
        expect.any(Function)
      );
    });

    it("unsubscribes from OnlineUsersChanged on unmount", () => {
      setup();
      const beforeOnlineUsers = unsubscribeOnlineUsersChanged.mock.calls.length;
      act(() => render(null, container));
      expect(unsubscribeOnlineUsersChanged.mock.calls.length).toBeGreaterThan(
        beforeOnlineUsers
      );
    });
  });

  // ─── usersDataMap ───────────────────────────────────────────────────────────

  describe("usersDataMap", () => {
    it("is built from connected users that have an authId", async () => {
      getConnectedUsers.mockReturnValue([
        { authId: MY_AUTH_ID, configId: "c-me" },
        { authId: "u2", configId: "c-u2" },
        { authId: null, configId: "c-anon" }, // no authId → excluded
      ]);
      const result = await setupAsync();
      expect(result.current.usersDataMap.size).toBe(2);
      expect(result.current.usersDataMap.has(MY_AUTH_ID)).toBe(true);
      expect(result.current.usersDataMap.has("u2")).toBe(true);
    });

    it("keys the map by authId", async () => {
      getConnectedUsers.mockReturnValue([
        { authId: MY_AUTH_ID, configId: "c-me" },
        { authId: "u2", configId: "c-u2" },
      ]);
      const result = await setupAsync();
      expect(result.current.usersDataMap.get("u2")?.configId).toBe("c-u2");
    });
  });

  // ─── user filters ────────────────────────────────────────────────────────────

  describe("user filters", () => {
    it("adds connected users to the filters as unselected (only local user is on)", async () => {
      getConnectedUsers.mockReturnValue([
        { authId: MY_AUTH_ID, configId: "c-me" },
        { authId: "u2", configId: "c-u2" },
      ]);
      const result = await setupAsync();
      expect(result.current.readingHistoryUserFilters.get(MY_AUTH_ID)).toBe(
        true
      );
      expect(result.current.readingHistoryUserFilters.get("u2")).toBe(false);
    });
  });

  // ─── handleReadingHistoryUserSelectorClick ────────────────────────────────────

  describe("handleReadingHistoryUserSelectorClick", () => {
    async function setupWithTwoUsers() {
      getConnectedUsers.mockReturnValue([
        { authId: MY_AUTH_ID, configId: "c-me" },
        { authId: "u2", configId: "c-u2" },
      ]);
      return setupAsync();
    }

    it("selects everyone when clicking 'all'", async () => {
      const result = await setupWithTwoUsers();
      act(() => result.current.handleReadingHistoryUserSelectorClick("all"));
      expect(result.current.readingHistoryUserFilters.get(MY_AUTH_ID)).toBe(
        true
      );
      expect(result.current.readingHistoryUserFilters.get("u2")).toBe(true);
    });

    it("selects a previously unselected user when clicked", async () => {
      const result = await setupWithTwoUsers();
      // u2 starts unselected
      act(() => result.current.handleReadingHistoryUserSelectorClick("u2"));
      expect(result.current.readingHistoryUserFilters.get("u2")).toBe(true);
    });

    it("isolates a single user when clicked while everyone is selected", async () => {
      const result = await setupWithTwoUsers();
      // First select everyone, then click u2 to isolate it.
      act(() => result.current.handleReadingHistoryUserSelectorClick("all"));
      act(() => result.current.handleReadingHistoryUserSelectorClick("u2"));
      expect(result.current.readingHistoryUserFilters.get("u2")).toBe(true);
      expect(result.current.readingHistoryUserFilters.get(MY_AUTH_ID)).toBe(
        false
      );
    });
  });

  // ─── handleReadingHistoryRangeSelectorClick ───────────────────────────────────

  describe("handleReadingHistoryRangeSelectorClick", () => {
    it("sets readingHistoryRangeSeconds to the given range", () => {
      const result = setup();
      const range = { start: 1000, end: 2000 };
      act(() => result.current.handleReadingHistoryRangeSelectorClick(range));
      expect(result.current.readingHistoryRangeSeconds).toEqual(range);
    });

    it("clears readingHistoryRangeSeconds when passed null", () => {
      const result = setup();
      act(() =>
        result.current.handleReadingHistoryRangeSelectorClick({
          start: 1,
          end: 2,
        })
      );
      act(() => result.current.handleReadingHistoryRangeSelectorClick(null));
      expect(result.current.readingHistoryRangeSeconds).toBeNull();
    });
  });

  // ─── timeline ranges ──────────────────────────────────────────────────────────

  describe("timeline ranges", () => {
    it("builds a ranges map keyed by year down to (but excluding) 2023", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-05-20T12:00:00"));
      try {
        const result = setup();
        const keys = [...result.current.timelineRangesMap.keys()].sort();
        expect(keys).toEqual([2024, 2025, 2026]);
      } finally {
        vi.useRealTimers();
      }
    });

    it("defaults the selected timeline key to the current year", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-05-20T12:00:00"));
      try {
        const result = setup();
        expect(result.current.selectedTimelineKey).toBe(2026);
      } finally {
        vi.useRealTimers();
      }
    });

    it("Rolling range spans one year back from the selected year", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-05-20T12:00:00"));
      try {
        const result = setup();
        const { startDate, endDate } = result.current.timelineRange;
        expect(endDate.getFullYear()).toBe(2026);
        expect(startDate.getFullYear()).toBe(2025);
      } finally {
        vi.useRealTimers();
      }
    });

    it("Calendar method makes the range span Jan 1 → Dec 31", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-05-20T12:00:00"));
      try {
        const result = setup();
        act(() => result.current.setTimelineRangeMethod("Calendar"));
        const { startDate, endDate } = result.current.timelineRange;
        expect(startDate.getMonth()).toBe(0); // January
        expect(startDate.getDate()).toBe(1);
        expect(endDate.getMonth()).toBe(11); // December
        expect(endDate.getDate()).toBe(31);
      } finally {
        vi.useRealTimers();
      }
    });

    it("falls back to a now/now range when the selected key has no entry", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-05-20T12:00:00"));
      try {
        const result = setup();
        act(() => result.current.setSelectedTimelineKey(1999));
        const { startDate, endDate } = result.current.timelineRange;
        expect(startDate.getTime()).toBe(endDate.getTime());
      } finally {
        vi.useRealTimers();
      }
    });
  });

  // ─── week math ────────────────────────────────────────────────────────────────

  describe("week math", () => {
    it("exposes the second/millisecond constants", () => {
      const result = setup();
      expect(result.current.SEC_PER_MINUTE).toBe(60);
      expect(result.current.SEC_PER_HOUR).toBe(3600);
      expect(result.current.SEC_PER_DAY).toBe(86400);
      expect(result.current.SEC_PER_WEEK).toBe(604800);
      expect(result.current.MS_PER_SECOND).toBe(1000);
      expect(result.current.MS_PER_WEEK).toBe(604800000);
    });

    it("produces a weeksCount of at least 1 and a dayRangesMap", () => {
      const result = setup();
      expect(result.current.weeksCount).toBeGreaterThanOrEqual(1);
      expect(result.current.dayRangesMap).toBeInstanceOf(Map);
      expect(result.current.dayRangesMap.size).toBeGreaterThan(0);
    });

    it("uses getDayRangeSeconds to build the day ranges", () => {
      const getDayRangeSeconds = vi.fn((ms: number) => {
        const start = Math.floor(ms / 1000);
        return { start, end: start + 86399 };
      });
      (useScriptureMapContext as Mock).mockReturnValue(
        makeContext({ getDayRangeSeconds })
      );
      setup();
      expect(getDayRangeSeconds).toHaveBeenCalled();
    });
  });

  // ─── shouldShowReadingHistory ───────────────────────────────────────────────

  describe("shouldShowReadingHistory", () => {
    it("is false when there are no connected users", () => {
      const result = setup();
      expect(result.current.shouldShowReadingHistory).toBe(false);
    });

    it("is false when mode is not Viewer", async () => {
      getConnectedUsers.mockReturnValue([
        { authId: MY_AUTH_ID, configId: "c-me" },
      ]);
      (useScriptureMapContext as Mock).mockReturnValue(
        makeContext({ mode: ScriptureMapModes.Checkbox })
      );
      const result = await setupAsync();
      expect(result.current.shouldShowReadingHistory).toBe(false);
    });

    it("is false when reading history is disabled", async () => {
      getConnectedUsers.mockReturnValue([
        { authId: MY_AUTH_ID, configId: "c-me" },
      ]);
      (useScriptureMapContext as Mock).mockReturnValue(
        makeContext({ isReadingHistoryEnabled: false })
      );
      const result = await setupAsync();
      expect(result.current.shouldShowReadingHistory).toBe(false);
    });

    it("is true (and hides book colors) when Viewer, enabled, and users present", async () => {
      getConnectedUsers.mockReturnValue([
        { authId: MY_AUTH_ID, configId: "c-me" },
      ]);
      const result = await setupAsync();
      expect(result.current.shouldShowReadingHistory).toBe(true);
      expect(setShowingBooksColors).toHaveBeenCalledWith(false);
    });
  });

  // ─── reading-events pipeline ─────────────────────────────────────────────────

  describe("reading-events pipeline", () => {
    it("fetches reading events for the selected user", async () => {
      await setupAsync();
      // getReadingHistoryEvents now receives the OS handle as its first arg.
      expect(getReadingHistoryEvents).toHaveBeenCalledWith(
        expect.anything(),
        MY_AUTH_ID,
        expect.any(Number),
        expect.any(Number)
      );
    });

    it("reports the count of selected users", async () => {
      const result = await setupAsync();
      expect(result.current.selectedUsersCount).toBe(1);
    });

    it("summarizes an empty event set when no user is selected", async () => {
      const result = await setupAsync();
      (calculateReadingHistorySummary as Mock).mockClear();
      // Deselect the only selected user → empty-selection branch.
      act(() =>
        result.current.handleReadingHistoryUserSelectorClick(MY_AUTH_ID)
      );
      expect(result.current.selectedUsersCount).toBe(0);
      expect(calculateReadingHistorySummary).toHaveBeenCalledWith([]);
    });

    it("buckets fetched events by book and day and summarizes them", async () => {
      (getReadingHistoryEvents as Mock).mockImplementation(
        async (_os: unknown, _recordName: string, startTime: number) => {
          const events: Array<{
            start: number;
            end: number;
            bookId: string;
            chapter: number;
          }> = [];
          // 30 in-range events on distinct days → exercises the day-bucket loop
          // and the iterations % 30 === 0 yield.
          for (let i = 0; i < 30; i++) {
            events.push({
              start: startTime + i * 86400 + 100,
              end: startTime + i * 86400 + 220, // duration 120s ≥ 1 min
              bookId: "GEN",
              chapter: 1,
            });
          }
          // A second event on day 0 → exercises the "day bucket already exists"
          // path (no re-initialization of the array).
          events.push({
            start: startTime + 300,
            end: startTime + 420,
            bookId: "GEN",
            chapter: 2,
          });
          // Duration below a minute → hits the `continue`.
          events.push({
            start: startTime + 5,
            end: startTime + 10,
            bookId: "EXO",
            chapter: 1,
          });
          // Before the range start (dayIndex < 0) → skipped from both buckets.
          events.push({
            start: startTime - 100,
            end: startTime + 100,
            bookId: "LEV",
            chapter: 1,
          });
          return events;
        }
      );

      const result = await setupAsync();

      expect(result.current.rangedReadingEventsByBook.has("GEN")).toBe(true);
      // Out-of-range / sub-minute events are not bucketed by book.
      expect(result.current.rangedReadingEventsByBook.has("LEV")).toBe(false);
      expect(result.current.rangedReadingEventsByBook.has("EXO")).toBe(false);
      expect(result.current.readingEventsByDay).not.toBeNull();
      expect(
        (result.current.readingEventsByDay as Map<string, unknown>).size
      ).toBeGreaterThan(0);
      expect(result.current.dailyReadingHistorySummaries).not.toBeNull();
    });

    it("warns when fetching reading events rejects", async () => {
      const consoleWarn = vi
        .spyOn(console, "warn")
        .mockImplementation(() => {});
      (getReadingHistoryEvents as Mock).mockRejectedValue(new Error("network"));
      await setupAsync();
      expect(consoleWarn).toHaveBeenCalled();
      consoleWarn.mockRestore();
    });
  });

  // ─── event subscription callbacks ────────────────────────────────────────────

  describe("event subscription callbacks", () => {
    it("handles the OnUserLoggedIn event without throwing", async () => {
      await setupAsync();
      expect(() =>
        act(() => {
          eventCallbacks["OnUserLoggedIn"]?.();
        })
      ).not.toThrow();
    });

    it("refreshes usersDataMap on OnlineUsersChanged and prunes departed users", async () => {
      getConnectedUsers.mockReturnValue([
        { authId: MY_AUTH_ID, configId: "c-me" },
        { authId: "u2", configId: "c-u2" },
      ]);
      const result = await setupAsync();
      expect(result.current.usersDataMap.has("u2")).toBe(true);
      expect(result.current.readingHistoryUserFilters.has("u2")).toBe(true);

      // u2 disconnects; firing the event refetches the connected users.
      getConnectedUsers.mockReturnValue([
        { authId: MY_AUTH_ID, configId: "c-me" },
      ]);
      await act(async () => {
        eventCallbacks["OnlineUsersChanged"]?.();
      });
      await flush();
      await flush();

      expect(result.current.usersDataMap.has("u2")).toBe(false);
      // The reconciliation prunes the departed user from the filters.
      expect(result.current.readingHistoryUserFilters.has("u2")).toBe(false);
      // The local user is preserved.
      expect(result.current.readingHistoryUserFilters.get(MY_AUTH_ID)).toBe(
        true
      );
    });
  });

  // ─── no local auth bot ───────────────────────────────────────────────────────

  describe("without a local auth bot", () => {
    it("leaves myAuthBotId null and does not populate usersDataMap", async () => {
      // No logged-in user → no userId in context → myAuthBotId stays null.
      (useScriptureMapContext as Mock).mockReturnValue(
        makeContext({ userId: undefined })
      );
      const result = await setupAsync();
      expect(result.current.myAuthBotId).toBeNull();

      // refreshUsersDataMap runs but fetchUsersDataMap returns null (no local
      // user), so usersDataMap is never set.
      await act(async () => {
        eventCallbacks["OnlineUsersChanged"]?.();
      });
      await flush();
      expect(result.current.usersDataMap.size).toBe(0);
    });
  });

  // ─── fetchUsersDataMap error handling ────────────────────────────────────────

  describe("fetchUsersDataMap error handling", () => {
    it("logs and recovers when getConnectedUsers throws", async () => {
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      getConnectedUsers.mockImplementation(() => {
        throw new Error("boom");
      });
      const result = await setupAsync();
      expect(consoleError).toHaveBeenCalled();
      // Recovers to an empty map rather than crashing.
      expect(result.current.usersDataMap.size).toBe(0);
      consoleError.mockRestore();
    });
  });
});
