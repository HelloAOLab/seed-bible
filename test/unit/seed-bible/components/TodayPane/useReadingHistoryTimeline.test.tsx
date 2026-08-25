import type { Mock } from "vitest";
import { render } from "preact";
import { act } from "preact/test-utils";
import { useReadingHistoryTimeline } from "@packages/seed-bible/seed-bible/components/TodayPane/useReadingHistoryTimeline";
import { signal } from "@preact/signals";
import type { BibleTheme } from "@packages/seed-bible/seed-bible/managers/ThemeManager";
import { todayStub } from "../../testUtils/todayStubs";
import { useSocialSectionContext } from "@packages/seed-bible/seed-bible/components/TodayPane/SocialSectionContext";
import { useTimeContext } from "@packages/seed-bible/seed-bible/components/TodayPane/TimeContext";
import { mockI18nState, resetMockI18n } from "../../testUtils/mockI18n";

vi.mock(
  "@packages/seed-bible/seed-bible/components/TodayPane/SocialSectionContext",
  () => ({ useSocialSectionContext: vi.fn() })
);
vi.mock(
  "@packages/seed-bible/seed-bible/components/TodayPane/TimeContext",
  () => ({
    useTimeContext: vi.fn(),
  })
);
vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const { mockI18nManager, mockTranslate, mockI18nState } =
    await import("../../testUtils/mockI18n");
  return mockI18nManager({
    /**
     * The shared stub returns each call site's `defaultValue` regardless of
     * language, which makes a language switch invisible to any assertion on a
     * `t()` result — and this hook resolves the whole timeline footer that way.
     * So mark non-English output with the active language. English stays
     * unmarked, so every other assertion in this file still reads as the string
     * a user actually sees.
     */
    t: (key: string, options?: Record<string, unknown>) => {
      const text = mockTranslate(key, options);
      return mockI18nState.language === "en"
        ? text
        : `${text}[${mockI18nState.language}]`;
    },
  });
});

// The hook imports these directly, so they are stubbed at the module boundary
// rather than injected. `importOriginal` keeps each module's other exports real
// — a bare factory would silently drop them.
const {
  getColorByReadingTime,
  useHorizontalScroll,
  GetDayRangeSeconds,
  GetPastDateInfo,
} = vi.hoisted(() => ({
  getColorByReadingTime:
    vi.fn<(data: { baseColor: string; [key: string]: unknown }) => string>(),
  useHorizontalScroll: vi.fn(),
  GetDayRangeSeconds: vi.fn<(ms: number) => { start: number; end: number }>(),
  GetPastDateInfo: vi.fn<
    (
      time: number,
      lang?: string
    ) => {
      day: number;
      month: number;
      monthName: string;
      year: number;
    }
  >(),
}));

vi.mock(
  "@packages/seed-bible/seed-bible/managers/ReadingHistoryTime",
  async (importOriginal) => ({
    ...(await importOriginal<object>()),
    GetDayRangeSeconds,
    GetPastDateInfo,
  })
);
vi.mock(
  "@packages/seed-bible/seed-bible/managers/ReadingHistoryColors",
  async (importOriginal) => ({
    ...(await importOriginal<object>()),
    getColorByReadingTime,
  })
);
vi.mock(
  "@packages/seed-bible/seed-bible/components/useHorizontalScroll",
  async (importOriginal) => ({
    ...(await importOriginal<object>()),
    useHorizontalScroll,
  })
);

const selectYear = vi.fn();
const selectDay = vi.fn();

// 2026-05-23 is a Saturday → getDay() === 6 (a full week of days).
const NOW = new Date(2026, 4, 23, 12, 0, 0);

function makeToday(overrides: Record<string, unknown> = {}) {
  return todayStub({
    getReadingHistoryEvents: vi.fn(async () => []),
    ...overrides,
  });
}

const DEFAULT_THEME = {
  variables: {
    readerToolbarFloatingButtonBackground: "#base",
    secondaryColor: "#sec",
  },
} as unknown as BibleTheme;

// Mutated by the theme-switch test, so it is reset in `beforeEach`.
const THEME = signal(DEFAULT_THEME);

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
    // Re-seeded per test because `clearAllMocks` resets calls but not
    // implementations, so a per-test override would otherwise leak forward.
    GetDayRangeSeconds.mockImplementation((ms: number) => {
      const start = Math.floor(ms / 1000);
      return { start, end: start + 86399 };
    });
    GetPastDateInfo.mockImplementation(() => ({
      day: 18,
      month: 4,
      monthName: "may",
      year: 2026,
    }));
    getColorByReadingTime.mockImplementation(() => "#abc");
    THEME.value = DEFAULT_THEME;
    resetMockI18n();
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
    (useSocialSectionContext as Mock).mockReturnValue(makeSocial(social));
    const result = { current: null as unknown as Result };
    function TestComponent(_props: { nonce: number }) {
      result.current = useReadingHistoryTimeline({
        today: makeToday(today),
        theme: THEME,
      });
      return null;
    }
    let nonce = 0;
    /**
     * Re-renders in place, keeping the hook's memo state.
     *
     * The bumped `nonce` is load-bearing, not decoration: `@preact/signals`
     * installs a `shouldComponentUpdate` on every component that reads a
     * signal, and it bails out when props are unchanged — so calling `render`
     * again with identical props is a silent no-op that renders nothing and
     * fails no assertion. The changing prop stands in for whatever causes the
     * re-render in the real app (for a language switch, the i18n signal).
     */
    const rerender = () =>
      act(() => render(<TestComponent nonce={++nonce} />, container));
    rerender();
    return Object.assign(result, { rerender });
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
        "Mon",
        "Wed",
        "Fri",
      ]);
    });

    // These used to come from translation keys, where a bare "Wed" was read as
    // the verb and came back as "Heiraten" in German and "Casarse" in Spanish.
    it("localizes the day labels", () => {
      const result = setup();
      const labelsFor = (language: string) =>
        [1, 3, 5].map((day) =>
          new Intl.DateTimeFormat(language, { weekday: "short" }).format(
            new Date(2024, 0, day)
          )
        );
      const rendered = () =>
        dayLabels(result).map((l) => (l as { children: string }).children);

      // Guards the test against being vacuous: if the two languages agreed,
      // the assertion below would pass no matter what the hook did.
      expect(labelsFor("en")).not.toEqual(labelsFor("de"));
      expect(rendered()).toEqual(labelsFor("en"));

      mockI18nState.language = "de";
      result.rerender();

      expect(rendered()).toEqual(labelsFor("de"));
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
      GetPastDateInfo.mockImplementation((time: number) => {
        const d = new Date(time);
        return {
          day: d.getDate(),
          month: d.getMonth(),
          monthName: months[d.getMonth()]!,
          year: d.getFullYear(),
        };
      });
      // A full-year range spans many distinct months, exercising the
      // month-boundary / last-week dedup branches.
      const result = setup({ year: 2026 });
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

    it("carries a tooltip holding the day's formatted date", () => {
      const result = setup();
      const tooltip = items(result)[0]!.tooltipContentsData[0]!;
      // The clock is pinned, so the real localized string can be asserted
      // rather than merely its type.
      expect(tooltip.content).toMatch(/^[A-Z][a-z]{2} \d{1,2}, \d{4}$/);
    });

    it("re-formats tooltip dates when the language changes", () => {
      const result = setup();
      const timeMs = items(result)[0]!.range.start * 1000;
      const formatIn = (lang: string) =>
        new Intl.DateTimeFormat(lang, {
          month: "short",
          day: "numeric",
          year: "numeric",
        }).format(timeMs);

      // Guards the test against being vacuous: if these two agreed, the
      // assertion below would pass no matter what the hook did.
      expect(formatIn("en")).not.toBe(formatIn("fr"));
      expect(items(result)[0]!.tooltipContentsData[0]!.content).toBe(
        formatIn("en")
      );

      mockI18nState.language = "fr";
      result.rerender();

      expect(items(result)[0]!.tooltipContentsData[0]!.content).toBe(
        formatIn("fr")
      );
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
        "Year: 1999"
      );
    });

    /**
     * The legend used to be five even `color-mix` steps at 20/40/60/80/100% of
     * the primary colour, while the cells land on 25/50/75/100% over a base --
     * so it described a scale the grid never used, and its lightest swatch was
     * tinted where an unread day is plain. These assert the two now agree.
     */
    describe("the legend", () => {
      it("starts from the same base colour an unread day paints with", () => {
        THEME.value = {
          variables: { secondaryColor: "#sec" },
        } as unknown as BibleTheme;
        const result = setup();
        expect(
          result.current.footer.legendSquaresData[0]!.style.backgroundColor
        ).toBe("#dfdede");
      });

      it("asks the shared colour function for each quantisation band", () => {
        getColorByReadingTime.mockImplementation(
          (data) =>
            `band:${String(data.readingTimeSeconds)}/${String(
              data.fullColorTimeSeconds
            )}`
        );
        const result = setup();
        const swatches = result.current.footer.legendSquaresData.map(
          (s) => s.style.backgroundColor
        );
        // Base, then the four bands `step = 0.25` actually produces. Expressed
        // as a ratio out of 1, which is all the function reads.
        expect(swatches).toEqual([
          "#dfdede",
          "band:0.25/1",
          "band:0.5/1",
          "band:0.75/1",
          "band:1/1",
        ]);
      });

      it("recolours when the theme changes", () => {
        const result = setup();
        const before =
          result.current.footer.legendSquaresData[0]!.style.backgroundColor;
        expect(before).toBe("#dfdede");

        act(() => {
          THEME.value = {
            variables: { dividerColor: "#123456" },
          } as unknown as BibleTheme;
        });

        expect(
          result.current.footer.legendSquaresData[0]!.style.backgroundColor
        ).not.toBe(before);
      });
    });

    // Regression: every string here is resolved through `t`, and the footer
    // memo used to leave `language` out of its dependencies. It only looked
    // correct because an unstable `selectYear` recomputed the memo on every
    // render; stabilising that callback froze the legend and the year label in
    // whichever language loaded first.
    it("re-resolves its translated labels when the language changes", () => {
      const result = setup();
      expect(result.current.footer.lessText).toBe("Less");

      mockI18nState.language = "es";
      result.rerender();

      expect(result.current.footer.lessText).toBe("Less[es]");
      expect(result.current.footer.moreText).toBe("More[es]");
      expect(result.current.footer.yearSelectorLabelTextContent).toBe(
        "Year: 1999[es]"
      );
    });
  });

  describe("reading-events effect", () => {
    it("fetches nothing when no user is selected", () => {
      const getReadingHistoryEvents = vi.fn(async () => []);
      setup({ userFilters: new Map() }, { getReadingHistoryEvents });
      expect(getReadingHistoryEvents).not.toHaveBeenCalled();
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
      // Echo the accumulated seconds back through the colour, so a counted
      // event and a skipped one produce different output. A constant colour
      // here would render the whole test vacuous: every day that gets any
      // colour at all would look the same.
      getColorByReadingTime.mockImplementation(
        (data) => `seconds:${String(data.readingTimeSeconds)}`
      );
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
      const result = setup(
        { userFilters: new Map([["u1", true]]) },
        { getReadingHistoryEvents }
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(50);
      });

      // Only the two valid 120-second events on day 0 are counted. Counting
      // the 10-second one would read 250, and the out-of-range one would move
      // the day's total somewhere else entirely.
      const dayZero = items(result).find((i) => i.id === "0-0")!;
      expect(dayZero.style.background).toBe("seconds:240");
    });

    // The `isMounted` flag the effect keeps is torn down before every re-run,
    // not only on unmount, so what it really guards is a superseded fetch —
    // and unlike the unmount case, that one is visible from outside the hook.
    it("ignores a superseded fetch even when it resolves last", async () => {
      getColorByReadingTime.mockImplementation(
        (data) => `seconds:${String(data.readingTimeSeconds)}`
      );
      // Each reader's events are held until the test releases them, so the
      // superseded fetch can be made to settle *after* the one that replaced
      // it — the ordering a "last write wins" bug needs to survive.
      const release: Record<string, () => void> = {};
      const getReadingHistoryEvents = vi.fn(
        (readerId: string, startTime: number) =>
          new Promise<
            {
              start: number;
              end: number;
              bookId: string;
              chapter: number;
              userId: string;
            }[]
          >((resolve) => {
            release[readerId] = () =>
              resolve([
                {
                  start: startTime + 100,
                  // u1 reads for 600 seconds, u2 for 300.
                  end: startTime + 100 + (readerId === "u1" ? 600 : 300),
                  bookId: "GEN",
                  chapter: 1,
                  userId: readerId,
                },
              ]);
          })
      );

      const result = setup(
        { userFilters: new Map([["u1", true]]) },
        { getReadingHistoryEvents }
      );

      // Switch readers while u1's fetch is still in flight.
      (useSocialSectionContext as Mock).mockReturnValue(
        makeSocial({ userFilters: new Map([["u2", true]]) })
      );
      result.rerender();

      release.u2!();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(50);
      });
      const dayZero = () => items(result).find((i) => i.id === "0-0")!;
      expect(dayZero().style.background).toBe("seconds:300");

      // u1's abandoned fetch lands last. It must not repaint the timeline with
      // a reader nobody is looking at any more.
      release.u1!();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(50);
      });
      expect(dayZero().style.background).toBe("seconds:300");
    });

    // Unmounting takes the same path, but there is nothing left to observe by
    // then: the signals the guard skips writing belong to the component that
    // just went away. What is observable is that the abandoned fetch settles
    // without complaint rather than warning or throwing.
    it("settles quietly when the component unmounts mid-fetch", async () => {
      const consoleWarn = vi
        .spyOn(console, "warn")
        .mockImplementation(() => {});
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
      expect(consoleWarn).not.toHaveBeenCalled();
      consoleWarn.mockRestore();
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

    it("colours every day of a range too large to summarize in one batch", async () => {
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
      // A full-year range gives enough distinct days to cross the 30-day batch
      // `loadDailyReadingHistory` yields on, so the summary arrives in more
      // than one turn of the event loop. Every day still has to be coloured —
      // a batch dropped along the way would leave a gap on the timeline.
      const result = setup(
        { userFilters: new Map([["u1", true]]), year: 2026 },
        { getReadingHistoryEvents }
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      const coloured = items(result).filter(
        (item) => item.style.background === "#abc"
      );
      expect(coloured).toHaveLength(30);
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
      THEME.value = {
        variables: { secondaryColor: "#sec" },
      } as unknown as BibleTheme;
      setup(
        { userFilters: new Map([["u1", true]]) },
        { getReadingHistoryEvents }
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(50);
      });

      expect(getColorByReadingTime.mock.calls[0]![0].baseColor).toBe("#dfdede");
    });

    /**
     * Regression: the colours must follow a theme switch on their own.
     *
     * `theme` arrives as a signal, and a `.value` read inside the colour
     * `useMemo` neither subscribes this hook nor invalidates the memo — the
     * signal object's identity never changes. That left the timeline showing the
     * previous theme's colours until something unrelated (the clock tick, or the
     * next reading-history refetch) happened to recompute them, 3-8s later.
     */
    it("recolours as soon as the theme changes, with no refetch or tick", async () => {
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

      await act(async () => {
        await vi.advanceTimersByTimeAsync(50);
      });

      const callsBefore = getColorByReadingTime.mock.calls.length;
      expect(callsBefore).toBeGreaterThan(0);
      expect(getColorByReadingTime.mock.calls[0]![0].baseColor).toBe("#dfdede");

      const fetchesBefore = getReadingHistoryEvents.mock.calls.length;
      await act(async () => {
        THEME.value = {
          variables: { dividerColor: "#123456" },
        } as unknown as BibleTheme;
      });

      const afterSwitch = getColorByReadingTime.mock.calls.slice(callsBefore);
      expect(afterSwitch.length).toBeGreaterThan(0);
      expect(afterSwitch[0]![0].baseColor).not.toBe("#dfdede");
      // No refetch was needed to get there.
      expect(getReadingHistoryEvents.mock.calls).toHaveLength(fetchesBefore);
    });
  });

  describe("side effects", () => {
    it("wires the horizontal scroll to the timeline ref", () => {
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
