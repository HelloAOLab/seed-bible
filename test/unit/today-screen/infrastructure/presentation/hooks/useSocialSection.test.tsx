import { render } from "preact";
import { act } from "preact/test-utils";
import { useSocialSection } from "todayScreen.infrastructure.presentation.hooks.useSocialSection";
import { useTodayContext } from "todayScreen.infrastructure.presentation.contexts.today.TodayContext";
import type { Timespan } from "@packages/today-screen/todayScreen/domain/models/commonTypes";
import type { FilteredReading } from "@packages/today-screen/todayScreen/domain/models/readingHistory";

jest.mock(
  "todayScreen.infrastructure.presentation.contexts.today.TodayContext",
  () => ({
    useTodayContext: jest.fn(),
  })
);

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

const INITIAL_TIMESPAN: Timespan = { from: 100, to: 200 };
const INITIAL_YEAR = 2024;

type Result = ReturnType<typeof useSocialSection>;

describe("useSocialSection", () => {
  let container: HTMLDivElement;
  let getCommunityReading: jest.Mock;
  let getUsersIds: jest.Mock;
  let getUserProfile: jest.Mock;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    getCommunityReading = jest.fn(async () => ({}) as FilteredReading);
    getUsersIds = jest.fn(() => ["u1", "u2"]);
    getUserProfile = jest.fn((id: string) => ({ id, name: `Name ${id}` }));
  });

  afterEach(() => {
    act(() => render(null, container));
    container.remove();
    jest.clearAllMocks();
  });

  function setup() {
    (useTodayContext as jest.Mock).mockReturnValue({
      translate: jest.fn((key: string) => key),
      subscribedUsersProfileProvider: { getUserProfile },
      subscribedUsersIdsProvider: { getUsersIds },
      getCommunityReading,
      readingHistoryConfigProvider: {
        buildTimespanOptionsMap: () => ({
          twoDays: { year: INITIAL_YEAR, timespan: INITIAL_TIMESPAN },
        }),
      },
    });
    const result = { current: null as unknown as Result };
    function TestComponent() {
      result.current = useSocialSection();
      return null;
    }
    act(() => render(<TestComponent />, container));
    return result;
  }

  describe("static data", () => {
    it("translates the community title", () => {
      const result = setup();
      expect(result.current.title).toBe("community");
    });

    it("seeds year and timespan from the twoDays option", () => {
      const result = setup();
      expect(result.current.year).toBe(INITIAL_YEAR);
      expect(result.current.timespan).toEqual(INITIAL_TIMESPAN);
    });
  });

  describe("user profiles and filters", () => {
    it("builds the profile map from subscribed user ids", () => {
      const result = setup();
      expect([...result.current.userProfileMap.keys()]).toEqual(["u1", "u2"]);
      expect(result.current.userProfileMap.get("u1")).toEqual({
        id: "u1",
        name: "Name u1",
      });
      expect(getUserProfile).toHaveBeenCalledWith("u1");
      expect(getUserProfile).toHaveBeenCalledWith("u2");
    });

    it("initializes every user filter to true", () => {
      const result = setup();
      expect(result.current.userFilters.get("u1")).toBe(true);
      expect(result.current.userFilters.get("u2")).toBe(true);
    });

    it("toggles a single user filter off and back on", () => {
      const result = setup();
      act(() => result.current.toggleUserFilter("u1"));
      expect(result.current.userFilters.get("u1")).toBe(false);
      expect(result.current.userFilters.get("u2")).toBe(true);

      act(() => result.current.toggleUserFilter("u1"));
      expect(result.current.userFilters.get("u1")).toBe(true);
    });
  });

  describe("community reading (reactive fetch)", () => {
    it("fetches the community reading for the initial timespan on mount", async () => {
      const reading = { JHN: { 3: [16] } } as unknown as FilteredReading;
      getCommunityReading.mockResolvedValue(reading);
      const result = setup();

      await act(async () => {});

      expect(getCommunityReading).toHaveBeenCalledWith(INITIAL_TIMESPAN);
      expect(result.current.communityReading).toEqual(reading);
    });

    it("fetches for a newly selected day", async () => {
      const reading = { GEN: { 1: [1] } } as unknown as FilteredReading;
      const result = setup();
      await act(async () => {});

      const nextTimespan: Timespan = { from: 500, to: 600 };
      getCommunityReading.mockResolvedValue(reading);
      act(() => result.current.selectDay(nextTimespan));
      await act(async () => {});

      expect(result.current.timespan).toEqual(nextTimespan);
      expect(getCommunityReading).toHaveBeenLastCalledWith(nextTimespan);
      expect(result.current.communityReading).toEqual(reading);
    });

    it("clears the reading without fetching when the timespan is cleared", async () => {
      const result = setup();
      await act(async () => {});
      getCommunityReading.mockClear();

      act(() => result.current.selectDay(undefined));
      await act(async () => {});

      expect(result.current.timespan).toBeUndefined();
      expect(result.current.communityReading).toEqual({});
      expect(getCommunityReading).not.toHaveBeenCalled();
    });

    it("selectYear sets the year and clears the timespan (no fetch)", async () => {
      const result = setup();
      await act(async () => {});
      getCommunityReading.mockClear();

      act(() => result.current.selectYear(2030));
      await act(async () => {});

      expect(result.current.year).toBe(2030);
      expect(result.current.timespan).toBeUndefined();
      expect(result.current.communityReading).toEqual({});
      expect(getCommunityReading).not.toHaveBeenCalled();
    });

    it("ignores a stale fetch result after the timespan changes", async () => {
      const stale = { STALE: {} } as unknown as FilteredReading;
      const fresh = { FRESH: {} } as unknown as FilteredReading;
      const d1 = deferred<FilteredReading>();
      const d2 = deferred<FilteredReading>();
      getCommunityReading
        .mockReturnValueOnce(d1.promise) // initial mount fetch
        .mockReturnValueOnce(d2.promise); // after selectDay

      const result = setup();
      // Change the timespan before the first fetch resolves → cancels it.
      act(() => result.current.selectDay({ from: 5, to: 6 }));

      // Resolve the stale (cancelled) request first, then the fresh one.
      await act(async () => {
        d1.resolve(stale);
        d2.resolve(fresh);
      });

      expect(result.current.communityReading).toEqual(fresh);
    });
  });
});
