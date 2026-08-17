import type { Mock } from "vitest";
import { render } from "preact";
import { act } from "preact/test-utils";
import { useHistoryCard } from "@packages/seed-bible/seed-bible/components/TodayPane/useHistoryCard";
import { mockI18nState } from "../../testUtils/mockI18n";
import { useSocialSectionContext } from "@packages/seed-bible/seed-bible/components/TodayPane/SocialSectionContext";
import { todayStub } from "../../testUtils/todayStubs";

vi.mock(
  "@packages/seed-bible/seed-bible/components/TodayPane/SocialSectionContext",
  () => ({
    useSocialSectionContext: vi.fn(),
  })
);

// The hook imports the scroll helper directly, so it is stubbed at the module
// boundary rather than injected.
const { useHorizontalScroll } = vi.hoisted(() => ({
  useHorizontalScroll: vi.fn(),
}));

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const { mockI18nManager } = await import("../../testUtils/mockI18n");
  return mockI18nManager();
});

vi.mock(
  "@packages/seed-bible/seed-bible/components/useHorizontalScroll",
  async (importOriginal) => ({
    ...(await importOriginal<object>()),
    useHorizontalScroll,
  })
);

const optionsMap = {
  twoDays: { year: 2026, timespan: { from: 1, to: 2 } },
  week: { year: 2026, timespan: { from: 3, to: 4 } },
  month: { year: 2026, timespan: { from: 5, to: 6 } },
  all: { year: 2026, timespan: undefined },
};

const labelMap = {
  all: "All",
  month: "this-month",
  week: "this-week",
  twoDays: "last-48-hours",
};

type Result = ReturnType<typeof useHistoryCard>;

describe("useHistoryCard", () => {
  let container: HTMLDivElement;
  const selectYear = vi.fn();
  const selectDay = vi.fn();
  const toggleUserFilter = vi.fn();

  function configure(options: {
    userFilters?: Map<string, boolean>;
    timespan?: { from: number; to: number } | undefined;
    language?: string;
  }) {
    mockI18nState.language = options.language ?? "en";
    const today = todayStub({
      readingHistoryConfigProvider: {
        buildTimespanOptionsMap: () => optionsMap,
        getTimespanOptionLabelMap: () => labelMap,
      } as unknown as ReturnType<
        typeof todayStub
      >["readingHistoryConfigProvider"],
    });
    (useSocialSectionContext as Mock).mockReturnValue({
      userFilters: options.userFilters ?? new Map([["u1", true]]),
      userProfileMap: new Map(),
      toggleUserFilter,
      timespan: options.timespan,
      selectYear,
      selectDay,
    });
    return today;
  }

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    act(() => render(null, container));
    container.remove();
    vi.clearAllMocks();
  });

  function setup(options: Parameters<typeof configure>[0] = {}) {
    const today = configure(options);
    const result = { current: null as unknown as Result };
    function TestComponent() {
      const r = useHistoryCard(today);
      result.current = r;
      return (
        <div>
          <div ref={r.optionsRef} />
          <div ref={r.optionsContainerRef} />
          <div ref={r.timespanFilterRef} />
        </div>
      );
    }
    act(() => render(<TestComponent />, container));
    return result;
  }

  describe("user filter open/icon", () => {
    it("starts closed with a down chevron", () => {
      const result = setup();
      expect(result.current.userFilterOpen.value).toBe(false);
      expect(result.current.userFilterIcon.value).toBe("keyboard_arrow_down");
    });

    it("toggles open (up chevron) and stops propagation on click", () => {
      const result = setup();
      const stopPropagation = vi.fn();
      act(() =>
        result.current.handleUserFilterClick({
          stopPropagation,
        } as unknown as MouseEvent)
      );
      expect(stopPropagation).toHaveBeenCalled();
      expect(result.current.userFilterOpen.value).toBe(true);
      expect(result.current.userFilterIcon.value).toBe("keyboard_arrow_up");
    });

    it("closes when a click happens outside the filter", () => {
      const result = setup();
      act(() =>
        result.current.handleUserFilterClick({
          stopPropagation: vi.fn(),
        } as unknown as MouseEvent)
      );
      expect(result.current.userFilterOpen.value).toBe(true);

      const outside = document.createElement("div");
      document.body.appendChild(outside);
      act(() => {
        outside.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
      });
      expect(result.current.userFilterOpen.value).toBe(false);
      outside.remove();
    });
  });

  describe("timespan options", () => {
    it("starts with 'twoDays' selected", () => {
      const result = setup();
      expect(result.current.selectedTimespanOptionId.value).toBe("twoDays");
    });

    it("builds a translated, ordered option list with the selected flag", () => {
      const result = setup();
      const opts = result.current.timespanFilterOptionsData.value;
      expect(opts.map((o) => o.id)).toEqual([
        "twoDays",
        "week",
        "month",
        "all",
      ]);
      expect(opts.map((o) => o.label)).toEqual([
        "Last 48 hours",
        "This week",
        "This month",
        "All",
      ]);
      expect(opts[0]!.isSelected).toBe(true);
      expect(opts[1]!.isSelected).toBe(false);
    });

    it("selecting a windowed option sets the year and the day window", () => {
      const result = setup();
      const week = result.current.timespanFilterOptionsData.value[1]!;
      act(() => week.onClick());
      expect(result.current.selectedTimespanOptionId.value).toBe("week");
      expect(selectYear).toHaveBeenCalledWith(2026);
      expect(selectDay).toHaveBeenCalledWith({ from: 3, to: 4 });
    });

    it("selecting 'all' sets the year but no day window", () => {
      const result = setup();
      const all = result.current.timespanFilterOptionsData.value[3]!;
      act(() => all.onClick());
      expect(result.current.selectedTimespanOptionId.value).toBe("all");
      expect(selectYear).toHaveBeenCalledWith(2026);
      expect(selectDay).not.toHaveBeenCalled();
    });

    it("re-selecting the current option is a no-op", () => {
      const result = setup();
      const twoDays = result.current.timespanFilterOptionsData.value[0]!;
      act(() => twoDays.onClick());
      expect(selectYear).not.toHaveBeenCalled();
      expect(selectDay).not.toHaveBeenCalled();
    });
  });

  describe("user filter option click", () => {
    it("toggles the user filter and stops propagation", () => {
      const result = setup();
      const stopPropagation = vi.fn();
      act(() =>
        result.current.handleFilterOptionClick(
          { stopPropagation } as unknown as MouseEvent,
          "u1"
        )
      );
      expect(stopPropagation).toHaveBeenCalled();
      expect(toggleUserFilter).toHaveBeenCalledWith("u1");
    });
  });

  describe("userFilterText", () => {
    it("is 'everyone' when all users are selected", () => {
      const result = setup({
        userFilters: new Map([
          ["u1", true],
          ["u2", true],
        ]),
      });
      expect(result.current.userFilterText).toBe("Everyone");
    });

    it("is 'none' when no users are selected", () => {
      const result = setup({
        userFilters: new Map([
          ["u1", false],
          ["u2", false],
        ]),
      });
      expect(result.current.userFilterText).toBe("None");
    });

    it("is 'custom' when some users are selected", () => {
      const result = setup({
        userFilters: new Map([
          ["u1", true],
          ["u2", false],
        ]),
      });
      expect(result.current.userFilterText).toBe("Custom");
    });
  });

  describe("dateLabel", () => {
    it("is undefined when there is no timespan", () => {
      const result = setup({ timespan: undefined });
      expect(result.current.dateLabel).toBeUndefined();
    });

    it("formats the end of the selected timespan", () => {
      const to = 1_700_000_000;
      const result = setup({ timespan: { from: 0, to }, language: "en" });
      const expected = new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(new Date(to * 1000));
      expect(result.current.dateLabel).toBe(expected);
    });
  });

  describe("horizontal scroll", () => {
    it("wires useHorizontalScroll to the timespan filter ref", () => {
      const result = setup();
      expect(useHorizontalScroll).toHaveBeenCalledWith(
        result.current.timespanFilterRef
      );
    });
  });
});
