import { render } from "preact";
import { act } from "preact/test-utils";
import { HistoryCard } from "todayScreen.infrastructure.presentation.components.containers.HistoryCard";
import { useHistoryCard } from "todayScreen.infrastructure.presentation.hooks.useHistoryCard";

jest.mock(
  "todayScreen.infrastructure.presentation.hooks.useHistoryCard",
  () => ({
    useHistoryCard: jest.fn(),
  })
);

jest.mock(
  "todayScreen.infrastructure.presentation.components.containers.FilteredReading",
  () => ({
    FilteredReading: jest.fn(() => <div data-testid="filtered-reading" />),
  })
);

// Deps used by the internal ReadingHistoryTimelineSection.
jest.mock(
  "todayScreen.infrastructure.presentation.contexts.today.TodayContext",
  () => ({
    useTodayContext: jest.fn(() => ({
      ReadingHistoryTimeline: () => <div data-testid="timeline" />,
    })),
  })
);

jest.mock(
  "todayScreen.infrastructure.presentation.hooks.useReadingHistoryTimeline",
  () => ({
    useReadingHistoryTimeline: jest.fn(() => ({
      itemsData: [],
      timelineRef: { current: null },
      footer: {},
    })),
  })
);

type HistoryCardResult = ReturnType<typeof useHistoryCard>;

const MaterialIcon = ({ children }: { children: string }) => (
  <span className="material-icon">{children}</span>
);

interface TimespanOption {
  id: string;
  label: string;
  isSelected: boolean;
  onClick: () => void;
}

function makeResult(options: {
  userFilterOpen?: boolean;
  userFilterIcon?: string;
  userFilterText?: string;
  handleUserFilterClick?: () => void;
  handleFilterOptionClick?: (e: MouseEvent, id: string) => void;
  userFilters?: Map<string, boolean>;
  userProfileMap?: Map<string, { color: string; name: string }>;
  timespanOptions?: TimespanOption[];
  selectedTimespanOptionId?: string;
  dateLabel?: string;
  optionsContainerRef?: { current: HTMLDivElement | null };
  optionsRef?: { current: HTMLDivElement | null };
  timespanFilterRef?: { current: HTMLDivElement | null };
}): HistoryCardResult {
  return {
    MaterialIcon,
    userFilterOpen: { value: options.userFilterOpen ?? false },
    userFilterIcon: { value: options.userFilterIcon ?? "keyboard_arrow_down" },
    handleUserFilterClick: options.handleUserFilterClick ?? jest.fn(),
    optionsRef: options.optionsRef ?? { current: null },
    optionsContainerRef: options.optionsContainerRef ?? { current: null },
    userFilters: options.userFilters ?? new Map(),
    userProfileMap: options.userProfileMap ?? new Map(),
    handleFilterOptionClick: options.handleFilterOptionClick ?? jest.fn(),
    userFilterText: options.userFilterText ?? "Everyone",
    timespanFilterOptionsData: { value: options.timespanOptions ?? [] },
    selectedTimespanOptionId: {
      value: options.selectedTimespanOptionId ?? "twoDays",
    },
    dateLabel: options.dateLabel,
    timespanFilterRef: options.timespanFilterRef ?? { current: null },
  } as unknown as HistoryCardResult;
}

describe("HistoryCard", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    act(() => render(null, container));
    container.remove();
    jest.clearAllMocks();
  });

  function setup(options: Parameters<typeof makeResult>[0] = {}) {
    const result = makeResult(options);
    (useHistoryCard as jest.Mock).mockReturnValue(result);
    act(() => render(<HistoryCard />, container));
    return result;
  }

  const q = <T extends Element>(sel: string) => container.querySelector<T>(sel);
  const qa = (sel: string) => container.querySelectorAll(sel);

  describe("structure", () => {
    it("renders the history card with the user-filter label and icon", () => {
      setup({ userFilterText: "Custom", userFilterIcon: "keyboard_arrow_up" });
      expect(q(".history-card.today-section-card")).not.toBeNull();
      expect(q(".user-filter-label")!.textContent).toBe("Custom");
      expect(q(".user-filter-container .material-icon")!.textContent).toBe(
        "keyboard_arrow_up"
      );
    });

    it("always renders the FilteredReading section", () => {
      setup();
      expect(q("[data-testid='filtered-reading']")).not.toBeNull();
    });

    it("attaches the timespan filter ref to its container", () => {
      const timespanFilterRef = { current: null as HTMLDivElement | null };
      setup({ timespanFilterRef });
      expect(timespanFilterRef.current).not.toBeNull();
      expect(timespanFilterRef.current!.className).toContain(
        "timespan-filter-container"
      );
    });
  });

  describe("user filter dropdown", () => {
    it("does not render the options list when the filter is closed", () => {
      setup({ userFilterOpen: false });
      expect(q(".user-filter-options")).toBeNull();
    });

    it("renders an option per user with selected styling and profile data when open", () => {
      setup({
        userFilterOpen: true,
        userFilters: new Map([
          ["u1", true],
          ["u2", false],
        ]),
        userProfileMap: new Map([
          ["u1", { color: "rgb(1, 2, 3)", name: "Alice" }],
          ["u2", { color: "rgb(4, 5, 6)", name: "Bob" }],
        ]),
      });

      const opts = qa(".user-filter-option");
      expect(opts).toHaveLength(2);
      expect(opts[0]!.className).toContain("user-filter-option-selected");
      expect(opts[1]!.className).not.toContain("user-filter-option-selected");
      expect(opts[0]!.textContent).toBe("Alice");
      expect(
        (opts[0]!.querySelector("div") as HTMLDivElement).style.backgroundColor
      ).toBe("rgb(1, 2, 3)");
    });

    it("calls handleFilterOptionClick with the user id when an option is clicked", () => {
      const handleFilterOptionClick = jest.fn();
      setup({
        userFilterOpen: true,
        handleFilterOptionClick,
        userFilters: new Map([["u1", true]]),
        userProfileMap: new Map([
          ["u1", { color: "rgb(1,2,3)", name: "Alice" }],
        ]),
      });
      act(() => q<HTMLButtonElement>(".user-filter-option")!.click());
      expect(handleFilterOptionClick).toHaveBeenCalledWith(
        expect.anything(),
        "u1"
      );
    });

    it("calls handleUserFilterClick when the filter container is clicked", () => {
      const handleUserFilterClick = jest.fn();
      setup({ handleUserFilterClick });
      act(() => q<HTMLDivElement>(".user-filter-container")!.click());
      expect(handleUserFilterClick).toHaveBeenCalledTimes(1);
    });

    it("stops propagation so clicking the options list does not toggle the filter", () => {
      const handleUserFilterClick = jest.fn();
      setup({
        userFilterOpen: true,
        handleUserFilterClick,
        userFilters: new Map([["u1", true]]),
        userProfileMap: new Map([
          ["u1", { color: "rgb(1,2,3)", name: "Alice" }],
        ]),
      });
      act(() => q<HTMLDivElement>(".user-filter-options")!.click());
      expect(handleUserFilterClick).not.toHaveBeenCalled();
    });
  });

  describe("timespan filters", () => {
    it("renders a button per timespan option with selected styling", () => {
      setup({
        timespanOptions: [
          {
            id: "twoDays",
            label: "Last 48h",
            isSelected: true,
            onClick: jest.fn(),
          },
          {
            id: "week",
            label: "This week",
            isSelected: false,
            onClick: jest.fn(),
          },
        ],
      });
      const opts = qa(".timespan-filter-option");
      expect(opts).toHaveLength(2);
      expect(opts[0]!.textContent).toBe("Last 48h");
      expect(opts[0]!.className).toContain("timespan-filter-option-selected");
      expect(opts[1]!.className).not.toContain(
        "timespan-filter-option-selected"
      );
    });

    it("calls the option's onClick when a timespan button is clicked", () => {
      const onClick = jest.fn();
      setup({
        timespanOptions: [
          { id: "week", label: "This week", isSelected: false, onClick },
        ],
      });
      act(() => q<HTMLButtonElement>(".timespan-filter-option")!.click());
      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });

  describe("timeline section", () => {
    it("renders the timeline and date label when 'all' is selected", () => {
      setup({ selectedTimespanOptionId: "all", dateLabel: "Jun 5, 2026" });
      expect(q("[data-testid='timeline']")).not.toBeNull();
      expect(q(".date-label")!.textContent).toBe("Jun 5, 2026");
    });

    it("renders the timeline but no date label when 'all' is selected without a date", () => {
      setup({ selectedTimespanOptionId: "all", dateLabel: undefined });
      expect(q("[data-testid='timeline']")).not.toBeNull();
      expect(q(".date-label")).toBeNull();
    });

    it("does not render the timeline section when 'all' is not selected", () => {
      setup({ selectedTimespanOptionId: "twoDays" });
      expect(q("[data-testid='timeline']")).toBeNull();
      expect(q(".date-label")).toBeNull();
    });
  });
});
