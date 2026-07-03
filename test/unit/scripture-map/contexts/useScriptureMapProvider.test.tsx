import { render } from "preact";
import { act } from "preact/test-utils";
import { useScriptureMapProvider } from "../../../../packages/scripture-map/contexts/ScriptureMap/useScriptureMapProvider";

vi.mock("../../../../packages/scripture-map/hooks/useIsMobile", () => ({
  useIsMobile: vi.fn(() => false),
}));

function makeConfig(overrides: Record<string, unknown> = {}) {
  return {
    arrangementService: {
      getCurrentArrangementIndex: vi.fn(() => 0),
      getArrangementByIndex: vi.fn(() => ({
        testaments: [],
        name: "default",
      })),
    },
    seedBibleUtilsEventManager: {
      subscribe: vi.fn(() => vi.fn()),
    },
    userColorStore: {
      listUsers: vi.fn(() => []),
      getUserColor: vi.fn(() => "#000000"),
    },
    userPresenceService: {
      getUserPresence: vi.fn(() => new Map()),
    },
    seedBibleState: {
      theme: {
        currentTheme: {
          value: { variables: {} },
        },
      },
      tabs: {
        tabs: { value: [] },
        selectedTabId: { value: "" },
      },
    },
    getDayRangeSeconds: vi.fn((time: number) => ({
      start: time / 1000,
      end: time / 1000 + 86400,
    })),
    initialScaleFactor: 1,
    ...overrides,
  } as never;
}

describe("useScriptureMapProvider", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
    vi.clearAllMocks();
  });

  function setup(config = makeConfig()) {
    const result = {
      current: null as unknown as ReturnType<typeof useScriptureMapProvider>,
    };

    function TestComponent() {
      result.current = useScriptureMapProvider(config);
      return null;
    }

    act(() => render(<TestComponent />, container));
    return result;
  }

  describe("scaleFactor", () => {
    it("defaults to 1 when no initialScaleFactor is given", () => {
      const result = setup();
      expect(result.current.scaleFactor).toBe(1);
    });

    it("uses initialScaleFactor from config", () => {
      const result = setup(makeConfig({ initialScaleFactor: 0.75 }));
      expect(result.current.scaleFactor).toBe(0.75);
    });

    it("MIN_SCALE_FACTOR is 0.25", () => {
      const result = setup();
      expect(result.current.MIN_SCALE_FACTOR).toBe(0.25);
    });
  });

  describe("handleZoomIn", () => {
    it("increases scaleFactor by 0.05", () => {
      const result = setup(makeConfig({ initialScaleFactor: 1 }));
      act(() => result.current.handleZoomIn());
      expect(result.current.scaleFactor).toBeCloseTo(1.05);
    });

    it("clamps scaleFactor at 1.5", () => {
      const result = setup(makeConfig({ initialScaleFactor: 1.5 }));
      act(() => result.current.handleZoomIn());
      expect(result.current.scaleFactor).toBe(1.5);
    });
  });

  describe("handleZoomOut", () => {
    it("decreases scaleFactor by 0.05", () => {
      const result = setup(makeConfig({ initialScaleFactor: 1 }));
      act(() => result.current.handleZoomOut());
      expect(result.current.scaleFactor).toBeCloseTo(0.95);
    });

    it("clamps scaleFactor at 0.25", () => {
      const result = setup(makeConfig({ initialScaleFactor: 0.25 }));
      act(() => result.current.handleZoomOut());
      expect(result.current.scaleFactor).toBe(0.25);
    });
  });

  describe("dimensions", () => {
    it("bookWidth is scaleFactor × 150", () => {
      const result = setup(makeConfig({ initialScaleFactor: 2 }));
      expect(result.current.bookWidth).toBe(300);
    });

    it("chapterGap is scaleFactor × 3", () => {
      const result = setup(makeConfig({ initialScaleFactor: 2 }));
      expect(result.current.chapterGap).toBe(6);
    });

    it("chapterWidth is scaleFactor × 32", () => {
      const result = setup(makeConfig({ initialScaleFactor: 2 }));
      expect(result.current.chapterWidth).toBe(64);
    });

    it("chapterHeight is scaleFactor × 32", () => {
      const result = setup(makeConfig({ initialScaleFactor: 2 }));
      expect(result.current.chapterHeight).toBe(64);
    });
  });

  describe("showTestamentLabels", () => {
    it("defaults to true", () => {
      const result = setup();
      expect(result.current.showTestamentLabels).toBe(true);
    });

    it("handleTestamentLabelsToggle flips showTestamentLabels", () => {
      const result = setup();
      act(() => result.current.handleTestamentLabelsToggle());
      expect(result.current.showTestamentLabels).toBe(false);
    });

    it("uses initialShowTestamentLabels from config", () => {
      const result = setup(makeConfig({ initialShowTestamentLabels: false }));
      expect(result.current.showTestamentLabels).toBe(false);
    });
  });

  describe("showSectionLabels", () => {
    it("defaults to true", () => {
      const result = setup();
      expect(result.current.showSectionLabels).toBe(true);
    });

    it("handleSectionLabelsToggle flips showSectionLabels", () => {
      const result = setup();
      act(() => result.current.handleSectionLabelsToggle());
      expect(result.current.showSectionLabels).toBe(false);
    });
  });

  describe("showingAllChapters", () => {
    it("defaults to false", () => {
      const result = setup();
      expect(result.current.showingAllChapters).toBe(false);
    });

    it("handleShowAllChaptersToggle flips showingAllChapters", () => {
      const result = setup();
      act(() => result.current.handleShowAllChaptersToggle());
      expect(result.current.showingAllChapters).toBe(true);
    });

    it("uses initialShowingAllChapters from config", () => {
      const result = setup(makeConfig({ initialShowingAllChapters: true }));
      expect(result.current.showingAllChapters).toBe(true);
    });
  });

  describe("projectFilters", () => {
    it("initial filters all have value true", () => {
      const result = setup();
      const allTrue = Array.from(result.current.projectFilters.values()).every(
        (v) => v
      );
      expect(allTrue).toBe(true);
    });

    it("handleProjectFilterOptionClick('all') resets all filters to true", () => {
      const result = setup();
      // First isolate one key, then reset with 'all'
      act(() =>
        result.current.handleProjectFilterOptionClick("Assigned" as never)
      );
      act(() => result.current.handleProjectFilterOptionClick("all"));
      const allTrue = Array.from(result.current.projectFilters.values()).every(
        (v) => v
      );
      expect(allTrue).toBe(true);
    });

    it("handleProjectFilterOptionClick isolates a key when all are selected", () => {
      const result = setup();
      act(() =>
        result.current.handleProjectFilterOptionClick("InProgress" as never)
      );
      const inProgress = result.current.projectFilters.get(
        "InProgress" as never
      );
      expect(inProgress).toBe(true);
      // Other keys should be false
      const others = Array.from(result.current.projectFilters.entries())
        .filter(([k]) => k !== "InProgress")
        .every(([, v]) => !v);
      expect(others).toBe(true);
    });

    it("handleProjectFilterOptionClick toggles off an isolated key", () => {
      const result = setup();
      // Isolate InProgress first
      act(() =>
        result.current.handleProjectFilterOptionClick("InProgress" as never)
      );
      // Toggle it off
      act(() =>
        result.current.handleProjectFilterOptionClick("InProgress" as never)
      );
      const inProgress = result.current.projectFilters.get(
        "InProgress" as never
      );
      expect(inProgress).toBe(false);
    });
  });
});
