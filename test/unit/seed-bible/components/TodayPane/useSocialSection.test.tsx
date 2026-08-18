import type { Mock } from "vitest";
import { render } from "preact";
import { act } from "preact/test-utils";
import { useSocialSection } from "@packages/seed-bible/seed-bible/components/TodayPane/useSocialSection";
import { getUserAnimalVisual } from "@packages/seed-bible/seed-bible/managers/SessionsManager";
import { signal } from "@preact/signals";
import type { UserProfile } from "@packages/seed-bible/seed-bible/managers/LoginManager";
import { todayStub, loginStub } from "../../testUtils/todayStubs";
import type {
  FilteredReading,
  Timespan,
} from "@packages/seed-bible/seed-bible/managers/TodayReadingHistory";

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const { mockI18nManager } = await import("../../testUtils/mockI18n");
  return mockI18nManager();
});

// The hook imports the window builder directly, so it is stubbed at the module
// boundary rather than injected.
const { buildTimespanOptions } = vi.hoisted(() => ({
  buildTimespanOptions: vi.fn(),
}));

vi.mock(
  "@packages/seed-bible/seed-bible/managers/TodayReadingHistory",
  async (importOriginal) => ({
    ...(await importOriginal<object>()),
    buildTimespanOptions,
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

const CURRENT_USER_ID = "me";
// The hook builds the current user's own row from the real visual hash rather
// than being handed a profile, so the expectation is derived the same way.
const CURRENT_USER_VISUAL = getUserAnimalVisual(CURRENT_USER_ID);
const CURRENT_USER_PROFILE = {
  name: "Me",
  pictureUrl: undefined,
  color: CURRENT_USER_VISUAL.color,
  icon: CURRENT_USER_VISUAL.defaultIcon,
};

type Result = ReturnType<typeof useSocialSection>;

describe("useSocialSection", () => {
  let container: HTMLDivElement;
  let getCommunityReading: Mock;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    getCommunityReading = vi.fn(async () => ({}) as FilteredReading);
    // Re-seeded here because `vi.clearAllMocks()` drops the implementation.
    buildTimespanOptions.mockReturnValue({
      twoDays: { year: INITIAL_YEAR, timespan: INITIAL_TIMESPAN },
    });
  });

  afterEach(() => {
    act(() => render(null, container));
    container.remove();
    vi.clearAllMocks();
  });

  function setup() {
    const today = todayStub({ getCommunityReading });
    const login = loginStub({
      userId: signal(CURRENT_USER_ID),
      profile: signal({ name: "Me" } as UserProfile),
    });
    const result = { current: null as unknown as Result };
    function TestComponent() {
      result.current = useSocialSection({ today, login });
      return null;
    }
    act(() => render(<TestComponent />, container));
    return result;
  }

  describe("static data", () => {
    it("translates the community title", () => {
      const result = setup();
      expect(result.current.title).toBe("COMMUNITY");
    });

    it("seeds year and timespan from the twoDays option", () => {
      const result = setup();
      expect(result.current.year).toBe(INITIAL_YEAR);
      expect(result.current.timespan).toEqual(INITIAL_TIMESPAN);
    });
  });

  describe("user profiles and filters", () => {
    it("builds the profile map from the signed-in user alone", () => {
      // Nobody subscribes to anyone yet, so "community" is a party of one.
      const result = setup();
      expect([...result.current.userProfileMap.keys()]).toEqual([
        CURRENT_USER_ID,
      ]);
      expect(result.current.userProfileMap.get(CURRENT_USER_ID)).toEqual(
        CURRENT_USER_PROFILE
      );
    });

    it("initializes every user filter to true", () => {
      const result = setup();
      expect(result.current.userFilters.get(CURRENT_USER_ID)).toBe(true);
    });

    it("toggles a single user filter off and back on", () => {
      const result = setup();
      act(() => result.current.toggleUserFilter(CURRENT_USER_ID));
      expect(result.current.userFilters.get(CURRENT_USER_ID)).toBe(false);

      act(() => result.current.toggleUserFilter(CURRENT_USER_ID));
      expect(result.current.userFilters.get(CURRENT_USER_ID)).toBe(true);
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
