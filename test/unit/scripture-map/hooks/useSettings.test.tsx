import { render } from "preact";
import { act } from "preact/test-utils";
import { useSettings } from "scriptureMap.hooks.useSettings";
import { useScriptureMapContext } from "scriptureMap.contexts.ScriptureMap.ScriptureMapContext";
import { useReadingHistoryContext } from "scriptureMap.contexts.ReadingHistory.ReadingHistoryContext";

jest.mock("scriptureMap.contexts.ScriptureMap.ScriptureMapContext", () => ({
  useScriptureMapContext: jest.fn(),
}));

jest.mock("scriptureMap.contexts.ReadingHistory.ReadingHistoryContext", () => ({
  useReadingHistoryContext: jest.fn(),
}));

const translate = jest.fn((key: string) => key);
const CapitalizeFirstLetter = jest.fn(
  (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
);
const ColorParser = jest.fn(() => "#000000");
const readingHistoryService = {
  getColorByReadingTime: jest.fn(() => "#aabbcc"),
};

function makeScriptureMapContext(overrides: Record<string, unknown> = {}) {
  return {
    mode: "Viewer",
    project: null,
    isInSelectionMode: false,
    handleShowAllChaptersToggle: jest.fn(),
    showingAllChapters: false,
    setShowingBooksColors: jest.fn(),
    showingBooksColors: false,
    setIsReadingHistoryEnabled: jest.fn(),
    isReadingHistoryEnabled: true,
    setIsUserPresenceEnabled: jest.fn(),
    isUserPresenceEnabled: true,
    handleSectionLabelsToggle: jest.fn(),
    showSectionLabels: true,
    handleTestamentLabelsToggle: jest.fn(),
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
    setTimelineRangeMethod: jest.fn(),
    timelineRangeMethod: "Rolling",
    usersDataMap: new Map(),
    selectedTimelineKey: 2025,
    timelineRangesMap: new Map([[2025, {}]]),
    setSelectedTimelineKey: jest.fn(),
    ...overrides,
  };
}

describe("useSettings", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    translate.mockImplementation((key: string) => key);
    (useScriptureMapContext as jest.Mock).mockReturnValue(
      makeScriptureMapContext()
    );
    (useReadingHistoryContext as jest.Mock).mockReturnValue(
      makeReadingHistoryContext()
    );
  });

  afterEach(() => {
    render(null, container);
    container.remove();
    jest.clearAllMocks();
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
    (useReadingHistoryContext as jest.Mock).mockReturnValue(
      makeReadingHistoryContext({ shouldShowReadingHistory: true })
    );
    const result = setup();
    expect(result.current.settingsClass).toBe("scripture-map-settings");
  });

  it("settingsClass has 'collapsed' suffix when shouldShowReadingHistory is false", () => {
    (useReadingHistoryContext as jest.Mock).mockReturnValue(
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
    (useReadingHistoryContext as jest.Mock).mockReturnValue(
      makeReadingHistoryContext({ shouldShowReadingHistory: false })
    );
    const result = setup();
    expect(result.current.shouldShowReadingHistory).toBe(false);
  });
});
