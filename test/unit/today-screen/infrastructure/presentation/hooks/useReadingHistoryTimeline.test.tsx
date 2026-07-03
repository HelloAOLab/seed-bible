import type { Mock } from "vitest";
import { render } from "preact";
import { act } from "preact/test-utils";
import { useReadingHistoryTimeline } from "../../../../../../packages/today-screen/infrastructure/presentation/hooks/useReadingHistoryTimeline";
import { useTodayContext } from "../../../../../../packages/today-screen/infrastructure/presentation/contexts/today/TodayContext";
import { useSocialSectionContext } from "../../../../../../packages/today-screen/infrastructure/presentation/contexts/socialSection/SocialSectionContext";
import { useTimeContext } from "../../../../../../packages/today-screen/infrastructure/presentation/contexts/time/TimeContext";
import { calculateReadingHistorySummary } from "../../../../../../packages/seed-bible/seed-bible/managers/ReadingHistoryManager";

vi.mock(
  "../../../../../../packages/today-screen/infrastructure/presentation/contexts/today/TodayContext",
  () => ({
    useTodayContext: vi.fn(),
  })
);
vi.mock(
  "../../../../../../packages/today-screen/infrastructure/presentation/contexts/socialSection/SocialSectionContext",
  () => ({ useSocialSectionContext: vi.fn() })
);
vi.mock(
  "../../../../../../packages/today-screen/infrastructure/presentation/contexts/time/TimeContext",
  () => ({
    useTimeContext: vi.fn(),
  })
);
vi.mock(
  "../../../../../../packages/seed-bible/seed-bible/managers/ReadingHistoryManager",
  () => ({
    flat: vi.fn((arrays: unknown[][]) => arrays.flat()),
    calculateReadingHistorySummary: vi.fn(() => ({
      totalTimeSpentReading: 0,
      users: {},
    })),
  })
);

const getColorByReadingTime = vi.fn(
  (_data: { baseColor: string; [key: string]: unknown }) => "#abc"
);
const useHorizontalScroll = vi.fn();
const selectYear = vi.fn();
const selectDay = vi.fn();

// 2026-05-23 is a Saturday → getDay() === 6 (a full week of days).
const NOW = new Date(2026, 4, 23, 12, 0, 0);

function makeToday(overrides: Record<string, unknown> = {}) {
  return {
    getDayRangeSeconds: vi.fn((ms: number) => {
      const start = Math.floor(ms / 1000);
      return { start, end: start + 86399 };
    }),
    getReadingHistoryEvents: vi.fn(async () => []),
    translate: vi.fn((key: string) => key),
    GetPastDateInfo: vi.fn(() => ({
      weekday: undefined,
      day: 18,
      month: 4,
      monthName: "may",
      year: 2026,
    })),
    language: "en",
    CapitalizeFirstLetter: vi.fn(
      (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
    ),
    theme: {
      variables: {
        readerToolbarFloatingButtonBackground: "#base",
        secondaryColor: "#sec",
      },
    },
    readingHistoryService: { getColorByReadingTime },
    useHorizontalScroll,
    ...overrides,
  };
}

function makeSocial(overrides: Record<string, unknown> = {}) {
  return {
    selectYear,
    selectDay,
    year: 1999, // not in the year map → tiny fallback (single-week) range
    timespan: undefined,
    userFilters: new Map<string, boolean>(),
    ...overrides,
  };
}

type Result = ReturnType<typeof useReadingHistoryTimeline>;
type Item = Extract<Result["itemsData"][number], { type: "item" }>;

describe("useReadingHistoryTimeline", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    (useTimeContext as Mock).mockReturnValue({ tick: 0 });
    (calculateReadingHistorySummary as Mock).mockReturnValue({
      totalTimeSpentReading: 0,
      users: {},
    });
  });

  afterEach(() => {
    act(() => render(null, container));
    container.remove();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  function setup(
    social: Record<string, unknown> = {},
    today: Record<string, unknown> = {}
  ) {
    (useTodayContext as Mock).mockReturnValue(makeToday(today));
    (useSocialSectionContext as Mock).mockReturnValue(makeSocial(social));
    const result = { current: null as unknown as Result };
    function TestComponent() {
      result.current = useReadingHistoryTimeline();
      return null;
    }
    act(() => render(<TestComponent />, container));
    return result;
  }

  const items = (result: { current: Result }) =>
    result.current.itemsData.filter((i): i is Item => i.type === "item");
  const dayLabels = (result: { current: Result }) =>
    result.current.itemsData.filter(
      (i) => i.type === "label" && (i as { isDay?: boolean }).isDay
    );
  const monthLabels = (result: { current: Result }) =>
    result.current.itemsData.filter(
      (i) => i.type === "label" && !(i as { isDay?: boolean }).isDay
    );

  describe("day labels", () => {
    it("always renders Mon/Wed/Fri labels at the expected rows", () => {
      const result = setup();
      const labels = dayLabels(result);
      expect(labels).toHaveLength(3);
      expect(labels.map((l) => (l as { gridRow: string }).gridRow)).toEqual([
        "3 / 4",
        "5 / 6",
        "7 / 8",
      ]);
      expect(labels.map((l) => (l as { children: string }).children)).toEqual([
        "monday-short",
        "wednesday-short",
        "friday-short",
      ]);
    });
  });

  describe("month labels", () => {
    it("renders a capitalized month label", () => {
      const result = setup();
      const labels = monthLabels(result);
      expect(labels.length).toBeGreaterThanOrEqual(1);
      expect((labels[0] as { children: string }).children).toBe("May");
    });

    it("deduplicates and places month labels across a multi-week range", () => {
      const months = [
        "jan",
        "feb",
        "mar",
        "apr",
        "may",
        "jun",
        "jul",
        "aug",
        "sep",
        "oct",
        "nov",
        "dec",
      ];
      const GetPastDateInfo = vi.fn((time: number) => {
        const d = new Date(time);
        return {
          weekday: undefined,
          day: d.getDate(),
          month: d.getMonth(),
          monthName: months[d.getMonth()]!,
          year: d.getFullYear(),
        };
      });
      // A full-year range spans many distinct months, exercising the
      // month-boundary / last-week dedup branches.
      const result = setup({ year: 2026 }, { GetPastDateInfo });
      expect(monthLabels(result).length).toBeGreaterThan(1);
    });
  });

  describe("day items", () => {
    it("renders one item per day of the single-week range", () => {
      const result = setup();
      // Saturday is day 6 → days 0..6 → 7 items.
      expect(items(result)).toHaveLength(7);
      expect(items(result)[0]!.id).toBe("0-0");
    });

    it("positions items by grid row/column", () => {
      const result = setup();
      const first = items(result)[0]!;
      expect(first.style.gridRow).toBe("2 / 3"); // day 0 → 0+2 / 0+3
      expect(first.style.gridColumn).toBe("2 / 3"); // week 0 → 0+2 / 0+3
    });

    it("carries a text tooltip with a formatted date", () => {
      const result = setup();
      const tooltip = items(result)[0]!.tooltipContentsData[0] as {
        type: string;
        content: string;
      };
      expect(tooltip.type).toBe("text");
      expect(typeof tooltip.content).toBe("string");
    });

    it("selects the day's range on click, and clears it on null", () => {
      const result = setup();
      const item = items(result)[0]!;
      act(() => item.handleItemClick({ start: 10, end: 20 }));
      expect(selectDay).toHaveBeenCalledWith({ from: 10, to: 20 });
      act(() => item.handleItemClick(null));
      expect(selectDay).toHaveBeenCalledWith(undefined);
    });

    it("defaults readingHistoryRangeSeconds to 0/0 when there is no timespan", () => {
      const result = setup({ timespan: undefined });
      expect(items(result)[0]!.readingHistoryRangeSeconds).toEqual({
        start: 0,
        end: 0,
      });
    });

    it("uses the active timespan for readingHistoryRangeSeconds", () => {
      const result = setup({ timespan: { from: 5, to: 6 } });
      expect(items(result)[0]!.readingHistoryRangeSeconds).toEqual({
        start: 5,
        end: 6,
      });
    });

    it("stops generating days after the last weekday of the final week", () => {
      // 2026-05-20 is a Wednesday → getDay() === 3, so days 4..6 are skipped.
      vi.setSystemTime(new Date(2026, 4, 20, 12, 0, 0));
      const result = setup();
      expect(items(result)).toHaveLength(4); // days 0..3
    });
  });

  describe("footer", () => {
    it("lists a year-selector option per available year", () => {
      const result = setup();
      const years = result.current.footer.yearSelectorOptionsData.map(
        (o) => o.key
      );
      expect(years).toEqual([2026, 2025, 2024]);
    });

    it("marks the active year as selected", () => {
      const result = setup({ year: 2026 });
      const option = result.current.footer.yearSelectorOptionsData.find(
        (o) => o.key === 2026
      )!;
      expect(option.className).toContain("selected");
    });

    it("selects a year when its option is clicked", () => {
      const result = setup();
      act(() => result.current.footer.yearSelectorOptionsData[0]!.onClick());
      expect(selectYear).toHaveBeenCalledWith(2026);
    });

    it("exposes the legend, labels and the selected-year text", () => {
      const result = setup();
      expect(result.current.footer.legendSquaresData).toHaveLength(5);
      expect(result.current.footer.lessText).toBe("Less");
      expect(result.current.footer.moreText).toBe("More");
      expect(result.current.footer.yearSelectorLabelTextContent).toBe(
        "selected-year"
      );
    });
  });

  describe("reading-events effect", () => {
    it("summarizes an empty set when no user is selected", () => {
      setup({ userFilters: new Map() });
      expect(calculateReadingHistorySummary).toHaveBeenCalledWith([]);
    });

    it("fetches events for each selected user", () => {
      const getReadingHistoryEvents = vi.fn(async () => []);
      setup(
        { userFilters: new Map([["u1", true]]) },
        { getReadingHistoryEvents }
      );
      expect(getReadingHistoryEvents).toHaveBeenCalledWith(
        "u1",
        expect.any(Number),
        expect.any(Number)
      );
    });

    it("only fetches events for the selected users", () => {
      const getReadingHistoryEvents = vi.fn(async () => []);
      setup(
        {
          userFilters: new Map([
            ["u1", true],
            ["u2", false],
          ]),
        },
        { getReadingHistoryEvents }
      );
      expect(getReadingHistoryEvents).toHaveBeenCalledTimes(1);
      expect(getReadingHistoryEvents).toHaveBeenCalledWith(
        "u1",
        expect.any(Number),
        expect.any(Number)
      );
    });

    it("ignores out-of-range and sub-minute events", async () => {
      const getReadingHistoryEvents = vi.fn(
        async (_id: string, startTime: number) => [
          // Before the window → dayIndex < 0 → skipped.
          {
            start: startTime - 100000,
            end: startTime - 100000 + 120,
            bookId: "GEN",
            chapter: 1,
            userId: "u1",
          },
          // Under a minute → continue.
          {
            start: startTime + 100,
            end: startTime + 110,
            bookId: "GEN",
            chapter: 1,
            userId: "u1",
          },
          // Valid, in-range event on day 0.
          {
            start: startTime + 200,
            end: startTime + 200 + 120,
            bookId: "GEN",
            chapter: 1,
            userId: "u1",
          },
          // A second valid event on day 0 → the day bucket already exists.
          {
            start: startTime + 400,
            end: startTime + 400 + 120,
            bookId: "GEN",
            chapter: 2,
            userId: "u1",
          },
        ]
      );
      (calculateReadingHistorySummary as Mock).mockReturnValue({
        totalTimeSpentReading: 180,
        users: { u1: {} },
      });
      const result = setup(
        { userFilters: new Map([["u1", true]]) },
        { getReadingHistoryEvents }
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(50);
      });

      const dayZero = items(result).find((i) => i.id === "0-0")!;
      expect(dayZero.style.background).toBe("#abc");
    });

    it("ignores results that resolve after unmount", async () => {
      const getReadingHistoryEvents = vi.fn(
        async (_id: string, startTime: number) => [
          {
            start: startTime + 100,
            end: startTime + 220,
            bookId: "GEN",
            chapter: 1,
            userId: "u1",
          },
        ]
      );
      setup(
        { userFilters: new Map([["u1", true]]) },
        { getReadingHistoryEvents }
      );
      act(() => render(null, container)); // unmount → isMounted = false

      await act(async () => {
        await vi.advanceTimersByTimeAsync(50);
      });

      expect(getReadingHistoryEvents).toHaveBeenCalled();
    });

    it("colors a day that has enough reading time", async () => {
      const getReadingHistoryEvents = vi.fn(
        async (_id: string, startTime: number) => [
          {
            start: startTime + 100,
            end: startTime + 100 + 120,
            bookId: "GEN",
            chapter: 1,
            userId: "u1",
          },
        ]
      );
      (calculateReadingHistorySummary as Mock).mockReturnValue({
        totalTimeSpentReading: 180,
        users: { u1: {} },
      });
      const result = setup(
        { userFilters: new Map([["u1", true]]) },
        { getReadingHistoryEvents }
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(50);
      });

      expect(getColorByReadingTime).toHaveBeenCalled();
      const dayZero = items(result).find((i) => i.id === "0-0")!;
      expect(dayZero.style.background).toBe("#abc");
    });

    it("yields to the main thread while summarizing many days", async () => {
      const getReadingHistoryEvents = vi.fn(
        async (_id: string, startTime: number) =>
          Array.from({ length: 30 }, (_, i) => ({
            start: startTime + i * 86400 + 100,
            end: startTime + i * 86400 + 220,
            bookId: "GEN",
            chapter: 1,
            userId: "u1",
          }))
      );
      (calculateReadingHistorySummary as Mock).mockReturnValue({
        totalTimeSpentReading: 180,
        users: { u1: {} },
      });
      // A full-year range gives enough distinct days to cross the 30-iteration yield.
      const result = setup(
        { userFilters: new Map([["u1", true]]), year: 2026 },
        { getReadingHistoryEvents }
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      expect(items(result).length).toBeGreaterThan(0);
    });

    it("warns when fetching reading events fails", async () => {
      const consoleWarn = vi
        .spyOn(console, "warn")
        .mockImplementation(() => {});
      const getReadingHistoryEvents = vi.fn(async () => {
        throw new Error("boom");
      });
      setup(
        { userFilters: new Map([["u1", true]]) },
        { getReadingHistoryEvents }
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(50);
      });

      expect(consoleWarn).toHaveBeenCalled();
      consoleWarn.mockRestore();
    });

    it("falls back to #dfdede base color when the theme omits it", async () => {
      const getReadingHistoryEvents = vi.fn(
        async (_id: string, startTime: number) => [
          {
            start: startTime + 100,
            end: startTime + 220,
            bookId: "GEN",
            chapter: 1,
            userId: "u1",
          },
        ]
      );
      (calculateReadingHistorySummary as Mock).mockReturnValue({
        totalTimeSpentReading: 180,
        users: { u1: {} },
      });
      setup(
        { userFilters: new Map([["u1", true]]) },
        {
          getReadingHistoryEvents,
          theme: { variables: { secondaryColor: "#sec" } },
        }
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(50);
      });

      expect(getColorByReadingTime.mock.calls[0]![0].baseColor).toBe("#dfdede");
    });
  });

  describe("side effects", () => {
    it("wires the injected horizontal scroll to the timeline ref", () => {
      const result = setup();
      expect(useHorizontalScroll).toHaveBeenCalledWith(
        result.current.timelineRef
      );
    });

    it("scrolls the last day into view on mount", () => {
      const scrollIntoView = vi.fn();
      const el = document.createElement("div");
      el.scrollIntoView = scrollIntoView;
      const getById = vi.spyOn(document, "getElementById").mockReturnValue(el);

      setup();

      expect(getById).toHaveBeenCalledWith("0-6"); // last day key (Saturday)
      expect(scrollIntoView).toHaveBeenCalledWith({
        behavior: "smooth",
        block: "center",
      });
    });

    it("does not throw when the last day's element is missing", () => {
      vi.spyOn(document, "getElementById").mockReturnValue(null);
      expect(() => setup()).not.toThrow();
    });
  });
});
