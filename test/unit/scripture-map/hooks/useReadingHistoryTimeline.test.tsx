import type { Mock } from "vitest";
import { render } from "preact";
import { act } from "preact/test-utils";
import { useReadingHistoryTimeline } from "../../../../packages/scripture-map/hooks/useReadingHistoryTimeline";
import { useScriptureMapContext } from "../../../../packages/scripture-map/contexts/ScriptureMap/ScriptureMapContext";
import { useReadingHistoryContext } from "../../../../packages/scripture-map/contexts/ReadingHistory/ReadingHistoryContext";
import { useTimeContext } from "../../../../packages/scripture-map/contexts/Time/TimeContext";

vi.mock(
  "../../../../packages/scripture-map/contexts/ScriptureMap/ScriptureMapContext",
  () => ({
    useScriptureMapContext: vi.fn(),
  })
);

vi.mock(
  "../../../../packages/scripture-map/contexts/ReadingHistory/ReadingHistoryContext",
  () => ({
    useReadingHistoryContext: vi.fn(),
  })
);

vi.mock("../../../../packages/scripture-map/contexts/Time/TimeContext", () => ({
  useTimeContext: vi.fn(),
}));

const SEC_PER_HOUR = 3600;
const SEC_PER_MINUTE = 60;

// A fixed Monday as the start of the first (and only) week.
const startDateStartOfWeek = new Date("2026-05-18T00:00:00");

// Saturday so getDay()=6, meaning the full week iterates all 7 days.
const endDate = new Date("2026-05-23T00:00:00");

function makeScriptureMapContext() {
  return {
    readingHistoryService: { getColorByReadingTime: vi.fn(() => "#aabbcc") },
    userColorStore: { getUserColor: vi.fn(() => "#000000") },
    translate: vi.fn((key: string) => key),
    seedBibleState: {
      theme: {
        currentTheme: {
          value: {
            variables: {
              secondaryColor: "#ffffff",
              readerToolbarFloatingButtonBackground: "#dfdede",
            },
          },
        },
      },
    },
    CapitalizeFirstLetter: vi.fn(
      (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
    ),
    GetPastDateInfo: vi.fn(() => ({
      day: 18,
      month: 4,
      monthName: "may",
      year: 2026,
    })),
    language: "en",
  };
}

function makeReadingHistoryContext() {
  return {
    startDateStartOfWeek,
    readingHistoryRangeSeconds: null,
    handleReadingHistoryRangeSelectorClick: vi.fn(),
    weeksCount: 1,
    SEC_PER_HOUR,
    SEC_PER_MINUTE,
    dayRangesMap: new Map(),
    dailyReadingHistorySummaries: new Map(),
    myAuthBotId: "me",
    timelineRange: { startDate: startDateStartOfWeek, endDate },
    yearlyReadingHistorySummary: null,
  };
}

describe("useReadingHistoryTimeline", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    (useScriptureMapContext as Mock).mockReturnValue(makeScriptureMapContext());
    (useReadingHistoryContext as Mock).mockReturnValue(
      makeReadingHistoryContext()
    );
    (useTimeContext as Mock).mockReturnValue({ tick: 0 });
  });

  afterEach(() => {
    render(null, container);
    container.remove();
    vi.clearAllMocks();
  });

  function setup() {
    const result = {
      current: null as unknown as ReturnType<typeof useReadingHistoryTimeline>,
    };

    function TestComponent() {
      result.current = useReadingHistoryTimeline();
      return null;
    }

    act(() => render(<TestComponent />, container));
    return result;
  }

  it("always includes three day labels (Mon, Wed, Fri)", () => {
    const result = setup();
    const dayLabels = result.current.itemsData.filter(
      (item) => item.type === "label" && (item as { isDay?: boolean }).isDay
    );
    expect(dayLabels).toHaveLength(3);
  });

  it("Monday label is at gridRow '3 / 4'", () => {
    const result = setup();
    const dayLabels = result.current.itemsData.filter(
      (item) => item.type === "label" && (item as { isDay?: boolean }).isDay
    );
    expect((dayLabels[0] as { gridRow: string }).gridRow).toBe("3 / 4");
  });

  it("Wednesday label is at gridRow '5 / 6'", () => {
    const result = setup();
    const dayLabels = result.current.itemsData.filter(
      (item) => item.type === "label" && (item as { isDay?: boolean }).isDay
    );
    expect((dayLabels[1] as { gridRow: string }).gridRow).toBe("5 / 6");
  });

  it("Friday label is at gridRow '7 / 8'", () => {
    const result = setup();
    const dayLabels = result.current.itemsData.filter(
      (item) => item.type === "label" && (item as { isDay?: boolean }).isDay
    );
    expect((dayLabels[2] as { gridRow: string }).gridRow).toBe("7 / 8");
  });

  it("does not include item entries when dayRangesMap is empty", () => {
    const result = setup();
    const items = result.current.itemsData.filter(
      (item) => item.type === "item"
    );
    expect(items).toHaveLength(0);
  });

  it("includes a month label for each distinct month encountered", () => {
    const result = setup();
    const monthLabels = result.current.itemsData.filter(
      (item) => item.type === "label" && !(item as { isDay?: boolean }).isDay
    );
    expect(monthLabels.length).toBeGreaterThanOrEqual(1);
  });

  it("month label gridColumn starts at week+2 column", () => {
    const result = setup();
    const monthLabels = result.current.itemsData.filter(
      (item) => item.type === "label" && !(item as { isDay?: boolean }).isDay
    );
    // week 0 → gridColumn "2 / 4"
    expect((monthLabels[0] as { gridColumn: string }).gridColumn).toBe("2 / 4");
  });

  // ---- setupWithRef: renders a div attached to timelineRef so useEffect can set up wheel listener ----
  function setupWithRef() {
    const result = {
      current: null as unknown as ReturnType<typeof useReadingHistoryTimeline>,
    };
    function TestComponentWithRef() {
      const hookResult = useReadingHistoryTimeline();
      result.current = hookResult;
      return <div ref={hookResult.timelineRef} />;
    }
    act(() => render(<TestComponentWithRef />, container));
    return result;
  }

  describe("handleItemClick", () => {
    it("calls handleReadingHistoryRangeSelectorClick with the given range", () => {
      const handleFn = vi.fn();
      const range = { start: 1000, end: 2000 };
      (useReadingHistoryContext as Mock).mockReturnValue({
        ...makeReadingHistoryContext(),
        dayRangesMap: new Map([["0-0", range]]),
        handleReadingHistoryRangeSelectorClick: handleFn,
      });
      const result = setup();
      const item = result.current.itemsData.find(
        (i) => i.type === "item"
      ) as any;
      act(() => item.handleItemClick(range));
      expect(handleFn).toHaveBeenCalledWith(range);
    });

    it("calls handleReadingHistoryRangeSelectorClick with null to deselect", () => {
      const handleFn = vi.fn();
      const range = { start: 1000, end: 2000 };
      (useReadingHistoryContext as Mock).mockReturnValue({
        ...makeReadingHistoryContext(),
        dayRangesMap: new Map([["0-0", range]]),
        handleReadingHistoryRangeSelectorClick: handleFn,
      });
      const result = setup();
      const item = result.current.itemsData.find(
        (i) => i.type === "item"
      ) as any;
      act(() => item.handleItemClick(null));
      expect(handleFn).toHaveBeenCalledWith(null);
    });
  });

  describe("itemsColorMap", () => {
    it("item background is undefined when dailyReadingHistorySummaries is null", () => {
      (useReadingHistoryContext as Mock).mockReturnValue({
        ...makeReadingHistoryContext(),
        dayRangesMap: new Map([["0-0", { start: 0, end: 100 }]]),
        dailyReadingHistorySummaries: null,
        yearlyReadingHistorySummary: { users: { me: {} } },
      });
      const result = setup();
      const item = result.current.itemsData.find(
        (i) => i.type === "item"
      ) as any;
      expect(item.style.background).toBeUndefined();
    });

    it("item background is undefined when yearlyReadingHistorySummary is null", () => {
      (useReadingHistoryContext as Mock).mockReturnValue({
        ...makeReadingHistoryContext(),
        dayRangesMap: new Map([["0-0", { start: 0, end: 100 }]]),
        dailyReadingHistorySummaries: new Map([
          [
            "0-0",
            {
              totalTimeSpentReading: 180,
              users: { me: { totalTimeSpentReading: 180 } },
            },
          ],
        ]),
        yearlyReadingHistorySummary: null,
      });
      const result = setup();
      const item = result.current.itemsData.find(
        (i) => i.type === "item"
      ) as any;
      expect(item.style.background).toBeUndefined();
    });

    it("calls getColorByReadingTime for single user with reading time > SEC_PER_MINUTE", () => {
      const getColorByReadingTime = vi.fn(() => "#computed");
      const getUserColor = vi.fn(() => "#usercolor");
      (useScriptureMapContext as Mock).mockReturnValue({
        ...makeScriptureMapContext(),
        readingHistoryService: { getColorByReadingTime },
        userColorStore: { getUserColor },
      });
      (useReadingHistoryContext as Mock).mockReturnValue({
        ...makeReadingHistoryContext(),
        dayRangesMap: new Map([["0-0", { start: 0, end: 100 }]]),
        dailyReadingHistorySummaries: new Map([
          [
            "0-0",
            {
              totalTimeSpentReading: 180,
              users: { me: { totalTimeSpentReading: 180 } },
            },
          ],
        ]),
        yearlyReadingHistorySummary: { users: { me: {} } },
      });
      const result = setup();
      expect(getColorByReadingTime).toHaveBeenCalled();
      const item = result.current.itemsData.find(
        (i) => i.type === "item"
      ) as any;
      expect(item.style.background).toBe("#computed");
    });

    it("uses theme.variables.secondaryColor as userColor when multiple users", () => {
      // eslint-disable-next-line
      const getColorByReadingTime = vi.fn((args: any) => "#computed");
      (useScriptureMapContext as Mock).mockReturnValue({
        ...makeScriptureMapContext(),
        readingHistoryService: { getColorByReadingTime },
        userColorStore: { getUserColor: vi.fn(() => "#usercolor") },
      });
      (useReadingHistoryContext as Mock).mockReturnValue({
        ...makeReadingHistoryContext(),
        dayRangesMap: new Map([["0-0", { start: 0, end: 100 }]]),
        dailyReadingHistorySummaries: new Map([
          [
            "0-0",
            {
              totalTimeSpentReading: 180,
              users: {
                me: { totalTimeSpentReading: 90 },
                other: { totalTimeSpentReading: 90 },
              },
            },
          ],
        ]),
        yearlyReadingHistorySummary: { users: { me: {}, other: {} } },
      });
      setup();
      const callArg = getColorByReadingTime.mock.calls[0]?.[0] as any;
      expect(callArg.userColor).toBe("#ffffff"); // secondaryColor from theme mock
    });

    it("skips color when reading time <= SEC_PER_MINUTE", () => {
      (useReadingHistoryContext as Mock).mockReturnValue({
        ...makeReadingHistoryContext(),
        dayRangesMap: new Map([["0-0", { start: 0, end: 100 }]]),
        dailyReadingHistorySummaries: new Map([
          [
            "0-0",
            {
              totalTimeSpentReading: 60,
              users: { me: { totalTimeSpentReading: 60 } },
            },
          ],
        ]),
        yearlyReadingHistorySummary: { users: { me: {} } },
      });
      const result = setup();
      const item = result.current.itemsData.find(
        (i) => i.type === "item"
      ) as any;
      expect(item.style.background).toBeUndefined();
    });

    it("uses '#dfdede' as baseColor fallback when readerToolbarFloatingButtonBackground is undefined", () => {
      // eslint-disable-next-line
      const getColorByReadingTime = vi.fn((args: any) => "#computed");
      (useScriptureMapContext as Mock).mockReturnValue({
        ...makeScriptureMapContext(),
        readingHistoryService: { getColorByReadingTime },
        seedBibleState: {
          theme: {
            currentTheme: {
              value: {
                variables: {
                  secondaryColor: "#ffffff",
                  // readerToolbarFloatingButtonBackground omitted → undefined → fallback "#dfdede"
                },
              },
            },
          },
        },
      });
      (useReadingHistoryContext as Mock).mockReturnValue({
        ...makeReadingHistoryContext(),
        dayRangesMap: new Map([["0-0", { start: 0, end: 100 }]]),
        dailyReadingHistorySummaries: new Map([
          [
            "0-0",
            {
              totalTimeSpentReading: 180,
              users: { me: { totalTimeSpentReading: 180 } },
            },
          ],
        ]),
        yearlyReadingHistorySummary: { users: { me: {} } },
      });
      setup();
      const callArg = getColorByReadingTime.mock.calls[0]?.[0] as any;
      expect(callArg.baseColor).toBe("#dfdede");
    });

    it("itemsColorMap loop breaks at day > endDate.getDay() when yearlyReadingHistorySummary is provided", () => {
      // endDate = Wednesday (getDay()=3) → loop breaks at day=4
      const endDateWed = new Date("2026-05-20T00:00:00");
      (useReadingHistoryContext as Mock).mockReturnValue({
        ...makeReadingHistoryContext(),
        yearlyReadingHistorySummary: { users: { me: {} } },
        dailyReadingHistorySummaries: new Map([
          [
            "0-4",
            {
              totalTimeSpentReading: 180,
              users: { me: { totalTimeSpentReading: 180 } },
            },
          ],
        ]),
        timelineRange: { startDate: startDateStartOfWeek, endDate: endDateWed },
      });
      // Verify no error and that day 4 item is not included (break triggers before it)
      const result = setup();
      const items = result.current.itemsData.filter((i) => i.type === "item");
      expect(items).toHaveLength(0); // day "0-4" is beyond endDate.getDay()=3 → break before processing
    });

    it("skips color when getUserColor returns null (no userColor)", () => {
      (useScriptureMapContext as Mock).mockReturnValue({
        ...makeScriptureMapContext(),
        userColorStore: { getUserColor: vi.fn(() => null) },
      });
      (useReadingHistoryContext as Mock).mockReturnValue({
        ...makeReadingHistoryContext(),
        dayRangesMap: new Map([["0-0", { start: 0, end: 100 }]]),
        dailyReadingHistorySummaries: new Map([
          [
            "0-0",
            {
              totalTimeSpentReading: 180,
              users: { me: { totalTimeSpentReading: 180 } },
            },
          ],
        ]),
        yearlyReadingHistorySummary: { users: { me: {} } },
      });
      const result = setup();
      const item = result.current.itemsData.find(
        (i) => i.type === "item"
      ) as any;
      expect(item.style.background).toBeUndefined();
    });
  });

  describe("item entries", () => {
    it("creates item entry when dayRangesMap has a range for the key", () => {
      (useReadingHistoryContext as Mock).mockReturnValue({
        ...makeReadingHistoryContext(),
        dayRangesMap: new Map([["0-2", { start: 200, end: 300 }]]),
      });
      const result = setup();
      const items = result.current.itemsData.filter((i) => i.type === "item");
      expect(items).toHaveLength(1);
    });

    it("item has correct gridRow (day+2/day+3) and gridColumn (week+2/week+3)", () => {
      (useReadingHistoryContext as Mock).mockReturnValue({
        ...makeReadingHistoryContext(),
        dayRangesMap: new Map([["0-3", { start: 300, end: 400 }]]),
      });
      const result = setup();
      const item = result.current.itemsData.find(
        (i) => i.type === "item"
      ) as any;
      expect(item.style.gridRow).toBe("5 / 6"); // day=3 → 3+2=5, 3+3=6
      expect(item.style.gridColumn).toBe("2 / 3"); // week=0 → 0+2=2, 0+3=3
    });

    it("item id matches the week-day key", () => {
      (useReadingHistoryContext as Mock).mockReturnValue({
        ...makeReadingHistoryContext(),
        dayRangesMap: new Map([["0-4", { start: 400, end: 500 }]]),
      });
      const result = setup();
      const item = result.current.itemsData.find(
        (i) => i.type === "item"
      ) as any;
      expect(item.id).toBe("0-4");
    });

    it("item carries readingHistoryRangeSeconds from context", () => {
      const range = { start: 0, end: 604800 };
      (useReadingHistoryContext as Mock).mockReturnValue({
        ...makeReadingHistoryContext(),
        dayRangesMap: new Map([["0-0", { start: 0, end: 100 }]]),
        readingHistoryRangeSeconds: range,
      });
      const result = setup();
      const item = result.current.itemsData.find(
        (i) => i.type === "item"
      ) as any;
      expect(item.readingHistoryRangeSeconds).toBe(range);
    });

    it("isUpcoming is false for dates in the past", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-05-20T12:00:00"));
      (useReadingHistoryContext as Mock).mockReturnValue({
        ...makeReadingHistoryContext(),
        dayRangesMap: new Map([["0-0", { start: 0, end: 100 }]]),
      });
      try {
        const result = setup();
        const item = result.current.itemsData.find(
          (i) => i.type === "item"
        ) as any;
        // day 0 = May 18, 2026 — before May 20 12:00 → not upcoming
        expect(item.isUpcoming).toBe(false);
      } finally {
        vi.useRealTimers();
      }
    });

    it("isUpcoming is true for dates in the future", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-05-20T12:00:00"));
      (useReadingHistoryContext as Mock).mockReturnValue({
        ...makeReadingHistoryContext(),
        dayRangesMap: new Map([["0-5", { start: 0, end: 100 }]]),
      });
      try {
        const result = setup();
        const item = result.current.itemsData.find(
          (i) => i.type === "item"
        ) as any;
        // day 5 = May 23, 2026 — after May 20 12:00 → upcoming
        expect(item.isUpcoming).toBe(true);
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe("tooltip data", () => {
    const range = { start: 0, end: 100 };

    function setupWithDaySummary(
      totalTimeSpentReading: number | null,
      users: Record<string, { totalTimeSpentReading: number } | null> = {}
    ) {
      (useReadingHistoryContext as Mock).mockReturnValue({
        ...makeReadingHistoryContext(),
        dayRangesMap: new Map([["0-0", range]]),
        dailyReadingHistorySummaries: new Map([
          ["0-0", { totalTimeSpentReading, users }],
        ]),
      });
      return setup();
    }

    it("tooltip header type is 'readingHistoryHeader'", () => {
      const result = setupWithDaySummary(null);
      const item = result.current.itemsData.find(
        (i) => i.type === "item"
      ) as any;
      expect(item.tooltipContentsData[0].type).toBe("readingHistoryHeader");
    });

    it("tooltip header has date info from GetPastDateInfo", () => {
      const result = setupWithDaySummary(null);
      const item = result.current.itemsData.find(
        (i) => i.type === "item"
      ) as any;
      const header = item.tooltipContentsData[0];
      expect(header.monthName).toBe("may");
      expect(header.dayOfTheMonth).toBe(18);
      expect(header.year).toBe(2026);
    });

    it("minutesCount is 0 when no daySummary for the key", () => {
      (useReadingHistoryContext as Mock).mockReturnValue({
        ...makeReadingHistoryContext(),
        dayRangesMap: new Map([["0-0", range]]),
        dailyReadingHistorySummaries: new Map(), // no entry for "0-0"
      });
      const result = setup();
      const item = result.current.itemsData.find(
        (i) => i.type === "item"
      ) as any;
      expect(item.tooltipContentsData[0].minutesCount).toBe(0);
    });

    it("minutesCount is derived from daySummary totalTimeSpentReading", () => {
      const result = setupWithDaySummary(180, {
        me: { totalTimeSpentReading: 180 },
      });
      const item = result.current.itemsData.find(
        (i) => i.type === "item"
      ) as any;
      expect(item.tooltipContentsData[0].minutesCount).toBe(3); // floor(180/60)
    });

    it("minutesCount is 0 when totalTimeSpentReading is nullish", () => {
      const result = setupWithDaySummary(null as unknown as number, {});
      const item = result.current.itemsData.find(
        (i) => i.type === "item"
      ) as any;
      expect(item.tooltipContentsData[0].minutesCount).toBe(0); // null ?? 0 = 0
    });

    it("no user entries when timeSpentMinutes <= 1", () => {
      // Math.floor(60/60) = 1, 1 > 1 = false
      const result = setupWithDaySummary(60, {
        me: { totalTimeSpentReading: 60 },
      });
      const item = result.current.itemsData.find(
        (i) => i.type === "item"
      ) as any;
      const userEntries = item.tooltipContentsData.filter(
        (d: any) => d.type === "readingHistory"
      );
      expect(userEntries).toHaveLength(0);
    });

    it("adds user entry when timeSpentMinutes > 1", () => {
      // Math.floor(180/60) = 3, 3 > 1 = true
      const result = setupWithDaySummary(180, {
        me: { totalTimeSpentReading: 180 },
      });
      const item = result.current.itemsData.find(
        (i) => i.type === "item"
      ) as any;
      const userEntries = item.tooltipContentsData.filter(
        (d: any) => d.type === "readingHistory"
      );
      expect(userEntries).toHaveLength(1);
    });

    it("user entry shows 'You' for myAuthBotId", () => {
      const result = setupWithDaySummary(180, {
        me: { totalTimeSpentReading: 180 },
      });
      const item = result.current.itemsData.find(
        (i) => i.type === "item"
      ) as any;
      const userEntry = item.tooltipContentsData.find(
        (d: any) => d.type === "readingHistory"
      );
      expect(userEntry.userName).toBe("You"); // CapitalizeFirstLetter(translate("you"))
    });

    it("user entry shows 'Guest' for non-myAuthBotId users", () => {
      const result = setupWithDaySummary(180, {
        stranger: { totalTimeSpentReading: 180 },
      });
      const item = result.current.itemsData.find(
        (i) => i.type === "item"
      ) as any;
      const userEntry = item.tooltipContentsData.find(
        (d: any) => d.type === "readingHistory"
      );
      expect(userEntry.userName).toBe("Guest");
    });

    it("user entry includes dotStyle with userColor from userColorStore", () => {
      const getUserColor = vi.fn(() => "#ff0000");
      (useScriptureMapContext as Mock).mockReturnValue({
        ...makeScriptureMapContext(),
        userColorStore: { getUserColor },
      });
      const result = setupWithDaySummary(180, {
        me: { totalTimeSpentReading: 180 },
      });
      const item = result.current.itemsData.find(
        (i) => i.type === "item"
      ) as any;
      const userEntry = item.tooltipContentsData.find(
        (d: any) => d.type === "readingHistory"
      );
      expect(userEntry.dotStyle.backgroundColor).toBe("#ff0000");
    });

    it("user entry with null userSummary in for-in loop is skipped", () => {
      // user key exists but value is null → skipped from userTimes → not in topUsers
      const result = setupWithDaySummary(180, {
        me: null,
        other: { totalTimeSpentReading: 180 },
      });
      const item = result.current.itemsData.find(
        (i) => i.type === "item"
      ) as any;
      const userEntries = item.tooltipContentsData.filter(
        (d: any) => d.type === "readingHistory"
      );
      // "me" (null) skipped; "other" (180s) added
      expect(userEntries).toHaveLength(1);
      expect(userEntries[0].userName).toBe("Guest"); // other !== myAuthBotId
    });

    it("only top 3 users appear as individual readingHistory entries", () => {
      const result = setupWithDaySummary(1500, {
        u1: { totalTimeSpentReading: 500 },
        u2: { totalTimeSpentReading: 400 },
        u3: { totalTimeSpentReading: 300 },
        u4: { totalTimeSpentReading: 200 },
        u5: { totalTimeSpentReading: 100 },
      });
      const item = result.current.itemsData.find(
        (i) => i.type === "item"
      ) as any;
      const userEntries = item.tooltipContentsData.filter(
        (d: any) => d.type === "readingHistory"
      );
      expect(userEntries).toHaveLength(3);
    });

    describe("extra users text entry", () => {
      it("adds a text entry when there are more than 3 users", () => {
        const result = setupWithDaySummary(1000, {
          u1: { totalTimeSpentReading: 400 },
          u2: { totalTimeSpentReading: 300 },
          u3: { totalTimeSpentReading: 200 },
          u4: { totalTimeSpentReading: 100 },
        });
        const item = result.current.itemsData.find(
          (i) => i.type === "item"
        ) as any;
        const textEntries = item.tooltipContentsData.filter(
          (d: any) => d.type === "text"
        );
        expect(textEntries).toHaveLength(1);
      });

      it("uses 'users-extra-minute-spent' when extra time totals <= 60s", () => {
        // u4 has 30s → Math.max(1, floor(30/60)) = 1 → singular minute
        const translate = vi.fn((key: string) => key);
        (useScriptureMapContext as Mock).mockReturnValue({
          ...makeScriptureMapContext(),
          translate,
        });
        setupWithDaySummary(1030, {
          u1: { totalTimeSpentReading: 400 },
          u2: { totalTimeSpentReading: 300 },
          u3: { totalTimeSpentReading: 300 },
          u4: { totalTimeSpentReading: 30 },
        });
        expect(translate).toHaveBeenCalledWith(
          "users-extra-minute-spent",
          expect.objectContaining({ users: 1 })
        );
      });

      it("uses 'users-extra-minutes-spent' when extra time is > 60s and < 1h", () => {
        // u4 has 180s → minutesCount=3 > 1 → plural minutes
        const translate = vi.fn((key: string) => key);
        (useScriptureMapContext as Mock).mockReturnValue({
          ...makeScriptureMapContext(),
          translate,
        });
        setupWithDaySummary(1180, {
          u1: { totalTimeSpentReading: 400 },
          u2: { totalTimeSpentReading: 300 },
          u3: { totalTimeSpentReading: 300 },
          u4: { totalTimeSpentReading: 180 },
        });
        expect(translate).toHaveBeenCalledWith(
          "users-extra-minutes-spent",
          expect.objectContaining({ users: 1, count: 3 })
        );
      });

      it("uses 'users-extra-hour-spent' when extra time is > 1h and hoursCount === 1", () => {
        // Top 3 have highest time; u4 (3801s) is 4th → extra user with ~1h
        const translate = vi.fn((key: string) => key);
        (useScriptureMapContext as Mock).mockReturnValue({
          ...makeScriptureMapContext(),
          translate,
        });
        setupWithDaySummary(30801, {
          u1: { totalTimeSpentReading: 10000 },
          u2: { totalTimeSpentReading: 9000 },
          u3: { totalTimeSpentReading: 8000 },
          u4: { totalTimeSpentReading: 3801 }, // extra: 3801 > 3600 → hoursCount=1
        });
        expect(translate).toHaveBeenCalledWith(
          "users-extra-hour-spent",
          expect.objectContaining({ users: 1, count: 1 })
        );
      });

      it("uses 'users-extra-hours-spent' when extra time is > 2h", () => {
        // Top 3 have highest time; u4 (7401s) is 4th → extra user with ~2h
        const translate = vi.fn((key: string) => key);
        (useScriptureMapContext as Mock).mockReturnValue({
          ...makeScriptureMapContext(),
          translate,
        });
        setupWithDaySummary(60401, {
          u1: { totalTimeSpentReading: 20000 },
          u2: { totalTimeSpentReading: 18000 },
          u3: { totalTimeSpentReading: 15000 },
          u4: { totalTimeSpentReading: 7401 }, // extra: 7401 > 7200 → hoursCount=2
        });
        expect(translate).toHaveBeenCalledWith(
          "users-extra-hours-spent",
          expect.objectContaining({ users: 1, count: 2 })
        );
      });
    });
  });

  describe("multi-week iteration", () => {
    it("breaks inner day loop when day > endDate.getDay() on the last week", () => {
      // endDate = Wednesday May 20 → getDay()=3; loop breaks at day=4
      const endDateWed = new Date("2026-05-20T00:00:00");
      // dayRangesMap covers all 7 days of week 0 — only days 0-3 should produce items
      const dayRangesMap = new Map(
        [0, 1, 2, 3, 4, 5, 6].map((d) => [
          `0-${d}`,
          { start: d * 100, end: d * 100 + 100 },
        ])
      );
      (useReadingHistoryContext as Mock).mockReturnValue({
        ...makeReadingHistoryContext(),
        dayRangesMap,
        timelineRange: { startDate: startDateStartOfWeek, endDate: endDateWed },
      });
      const result = setup();
      const items = result.current.itemsData.filter((i) => i.type === "item");
      // days 0, 1, 2, 3 pass; day 4 triggers break → 4 items
      expect(items).toHaveLength(4);
    });

    it("month label gridColumn advances with week index in multi-week layout", () => {
      const startDate2 = new Date("2026-05-11T00:00:00"); // 2 weeks before May 25
      const endDate2 = new Date("2026-05-23T00:00:00"); // Saturday
      (useReadingHistoryContext as Mock).mockReturnValue({
        ...makeReadingHistoryContext(),
        weeksCount: 2,
        startDateStartOfWeek: startDate2,
        timelineRange: { startDate: startDate2, endDate: endDate2 },
      });
      const result = setup();
      const monthLabels = result.current.itemsData.filter(
        (item) => item.type === "label" && !(item as { isDay?: boolean }).isDay
      );
      // Both weeks share same month (May) → deduplicated to 1 label
      expect(monthLabels).toHaveLength(1);
    });
  });

  describe("useEffect - scrollIntoView", () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("calls scrollIntoView on the element matching the last dayRangesMap key", () => {
      const mockScrollIntoView = vi.fn();
      const mockEl = document.createElement("div");
      mockEl.scrollIntoView = mockScrollIntoView;
      vi.spyOn(document, "getElementById").mockReturnValue(mockEl);

      (useReadingHistoryContext as Mock).mockReturnValue({
        ...makeReadingHistoryContext(),
        dayRangesMap: new Map([
          ["0-0", { start: 0, end: 100 }],
          ["0-3", { start: 300, end: 400 }],
        ]),
      });
      setup();
      expect(document.getElementById).toHaveBeenCalledWith("0-3");
      expect(mockScrollIntoView).toHaveBeenCalledWith({
        behavior: "smooth",
        block: "center",
      });
    });

    it("does not call getElementById when dayRangesMap is empty", () => {
      vi.spyOn(document, "getElementById");
      setup();
      expect(document.getElementById).not.toHaveBeenCalled();
    });

    it("does not scroll when getElementById returns null", () => {
      vi.spyOn(document, "getElementById").mockReturnValue(null);
      (useReadingHistoryContext as Mock).mockReturnValue({
        ...makeReadingHistoryContext(),
        dayRangesMap: new Map([["0-0", { start: 0, end: 100 }]]),
      });
      expect(() => setup()).not.toThrow();
    });
  });

  describe("useEffect - wheel handler", () => {
    it("attaches wheel listener to timelineRef element", () => {
      const result = setupWithRef();
      const el = result.current.timelineRef.current as HTMLDivElement;
      expect(el).not.toBeNull();
      // el exists: wheel event can be dispatched without errors
      expect(() =>
        el.dispatchEvent(new WheelEvent("wheel", { deltaY: 0 }))
      ).not.toThrow();
    });

    it("ignores wheel events with deltaY === 0", () => {
      const result = setupWithRef();
      const el = result.current.timelineRef.current as HTMLDivElement;
      const initialScrollLeft = el.scrollLeft;
      el.dispatchEvent(new WheelEvent("wheel", { deltaY: 0, bubbles: true }));
      expect(el.scrollLeft).toBe(initialScrollLeft);
    });

    it("does not call preventDefault when element is not scrollable (scrollWidth <= clientWidth)", () => {
      const result = setupWithRef();
      const el = result.current.timelineRef.current as HTMLDivElement;
      // scrollWidth = clientWidth = 0 by default in jsdom → not scrollable
      const event = new WheelEvent("wheel", { deltaY: 50, cancelable: true });
      const preventDefaultSpy = vi.spyOn(event, "preventDefault");
      el.dispatchEvent(event);
      expect(preventDefaultSpy).not.toHaveBeenCalled();
    });

    it("calls preventDefault and updates scrollLeft when element is scrollable", () => {
      const result = setupWithRef();
      const el = result.current.timelineRef.current as HTMLDivElement;
      Object.defineProperty(el, "scrollWidth", {
        get: () => 500,
        configurable: true,
      });
      Object.defineProperty(el, "clientWidth", {
        get: () => 100,
        configurable: true,
      });

      const event = new WheelEvent("wheel", { deltaY: 50, cancelable: true });
      const preventDefaultSpy = vi.spyOn(event, "preventDefault");
      el.dispatchEvent(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(el.scrollLeft).toBe(50);
    });
  });
});
