import type { Mock } from "vitest";
import { render } from "preact";
import { act } from "preact/test-utils";
import { useSettings } from "../../../../packages/scripture-map/hooks/useSettings";
import { useScriptureMapContext } from "../../../../packages/scripture-map/contexts/ScriptureMap/ScriptureMapContext";
import { useReadingHistoryContext } from "../../../../packages/scripture-map/contexts/ReadingHistory/ReadingHistoryContext";

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

const translate = vi.fn((key: string) => key);
const CapitalizeFirstLetter = vi.fn(
  (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
);
const ColorParser = vi.fn(() => "#000000");
const readingHistoryService = {
  getColorByReadingTime: vi.fn(() => "#aabbcc"),
};

function makeScriptureMapContext(overrides: Record<string, unknown> = {}) {
  return {
    mode: "Viewer",
    project: null,
    isInSelectionMode: false,
    handleShowAllChaptersToggle: vi.fn(),
    showingAllChapters: false,
    setShowingBooksColors: vi.fn(),
    showingBooksColors: false,
    setIsReadingHistoryEnabled: vi.fn(),
    isReadingHistoryEnabled: true,
    setIsUserPresenceEnabled: vi.fn(),
    isUserPresenceEnabled: true,
    handleSectionLabelsToggle: vi.fn(),
    showSectionLabels: true,
    handleTestamentLabelsToggle: vi.fn(),
    showTestamentLabels: true,
    readingHistoryService,
    seedBibleState: {
      theme: { currentTheme: { value: { variables: {} } } },
    },
    translate,
    ColorParser,
    CapitalizeFirstLetter,
    ...overrides,
  };
}

function makeReadingHistoryContext(overrides: Record<string, unknown> = {}) {
  return {
    shouldShowReadingHistory: true,
    setTimelineRangeMethod: vi.fn(),
    timelineRangeMethod: "Rolling",
    usersDataMap: new Map(),
    selectedTimelineKey: 2025,
    timelineRangesMap: new Map([[2025, {}]]),
    setSelectedTimelineKey: vi.fn(),
    ...overrides,
  };
}

describe("useSettings", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    translate.mockImplementation((key: string) => key);
    (useScriptureMapContext as Mock).mockReturnValue(makeScriptureMapContext());
    (useReadingHistoryContext as Mock).mockReturnValue(
      makeReadingHistoryContext()
    );
  });

  afterEach(() => {
    render(null, container);
    container.remove();
    vi.clearAllMocks();
  });

  function setup() {
    const result = {
      current: null as unknown as ReturnType<typeof useSettings>,
    };

    function TestComponent() {
      result.current = useSettings();
      return null;
    }

    act(() => render(<TestComponent />, container));
    return result;
  }

  it("settingsClass has no 'collapsed' suffix when shouldShowReadingHistory is true and not collapsed", () => {
    (useReadingHistoryContext as Mock).mockReturnValue(
      makeReadingHistoryContext({ shouldShowReadingHistory: true })
    );
    const result = setup();
    expect(result.current.settingsClass).toBe("scripture-map-settings");
  });

  it("settingsClass has 'collapsed' suffix when shouldShowReadingHistory is false", () => {
    (useReadingHistoryContext as Mock).mockReturnValue(
      makeReadingHistoryContext({ shouldShowReadingHistory: false })
    );
    const result = setup();
    expect(result.current.settingsClass).toBe(
      "scripture-map-settings collapsed"
    );
  });

  it("showOptions starts as false", () => {
    const result = setup();
    expect(result.current.showOptions).toBe(false);
  });

  it("handleSettingsButtonClick toggles showOptions to true", () => {
    const result = setup();
    act(() => result.current.handleSettingsButtonClick());
    expect(result.current.showOptions).toBe(true);
  });

  it("handleSettingsButtonClick toggles showOptions back to false", () => {
    const result = setup();
    act(() => result.current.handleSettingsButtonClick());
    act(() => result.current.handleSettingsButtonClick());
    expect(result.current.showOptions).toBe(false);
  });

  it("collapsed starts as false", () => {
    const result = setup();
    expect(result.current.collapsed).toBe(false);
  });

  it("shouldShowReadingHistory is passed through from context", () => {
    (useReadingHistoryContext as Mock).mockReturnValue(
      makeReadingHistoryContext({ shouldShowReadingHistory: false })
    );
    const result = setup();
    expect(result.current.shouldShowReadingHistory).toBe(false);
  });
});
