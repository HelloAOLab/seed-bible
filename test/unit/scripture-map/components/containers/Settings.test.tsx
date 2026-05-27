import { render } from "preact";
import { act } from "preact/test-utils";
import { Settings } from "scriptureMap.components.containers.Settings";
import { useSettings } from "scriptureMap.hooks.useSettings";
import { ScriptureMapModes } from "scriptureMap.models.scriptureMap";
import type {
  SettingsOptionData,
  SettingsLegendSquareData,
  SettingsYearselectorOptionData,
} from "scriptureMap.components.containers.Settings";

jest.mock("scriptureMap.hooks.useSettings", () => ({
  useSettings: jest.fn(),
}));

jest.mock("scriptureMap.hooks.useClickOutside", () => ({
  useClickOutside: jest.fn(),
}));

jest.mock("scriptureMap.components.containers.ProjectStateSetter", () => ({
  ProjectStateSetter: () => <div data-testid="project-state-setter" />,
}));

jest.mock("scriptureMap.components.containers.ProjectFiltersSelector", () => ({
  ProjectFiltersSelector: () => <div data-testid="project-filters-selector" />,
}));

jest.mock(
  "scriptureMap.components.containers.ReadingHistoryUserFiltersSelector",
  () => ({
    ReadingHistoryUserFiltersSelector: () => (
      <div data-testid="reading-history-user-filters-selector" />
    ),
  })
);

jest.mock("scriptureMap.components.containers.ReadingHistoryTimeline", () => ({
  ReadingHistoryTimeline: () => <div data-testid="reading-history-timeline" />,
}));

function makeStaticOption(
  overrides: Partial<SettingsOptionData> = {}
): SettingsOptionData {
  return {
    key: "opt-static",
    type: "static",
    callback: jest.fn(),
    staticText: "Toggle books",
    ...overrides,
  } as SettingsOptionData;
}

function makeDynamicOption(
  overrides: Partial<SettingsOptionData> = {}
): SettingsOptionData {
  return {
    key: "opt-dynamic",
    type: "dynamic",
    callback: jest.fn(),
    staticText: "timeline",
    enabledText: "Hide",
    disabledText: "Show",
    condition: false,
    ...overrides,
  } as SettingsOptionData;
}

function makeHookResult(overrides: Record<string, unknown> = {}) {
  return {
    settingsClass: "scripture-map-settings",
    settingsButtonRef: { current: null },
    handleSettingsButtonClick: jest.fn(),
    showOptions: false,
    setShowOptions: jest.fn(),
    collapsed: false,
    mode: ScriptureMapModes.Viewer,
    project: undefined,
    isInSelectionMode: false,
    shouldShowReadingHistory: false,
    optionsData: [] as SettingsOptionData[],
    legendSquaresData: [] as SettingsLegendSquareData[],
    yearSelectorLabelTextContent: "2024",
    yearSelectorOptionsData: [] as SettingsYearselectorOptionData[],
    title: "Scripture Map",
    optionsTitle: "Options",
    optionsDescription: "Manage your view.",
    lessText: "Less",
    moreText: "More",
    ...overrides,
  };
}

describe("Settings", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    (useSettings as jest.Mock).mockReturnValue(makeHookResult());
  });

  afterEach(() => {
    act(() => render(null, container));
    container.remove();
    jest.clearAllMocks();
  });

  function setup(hookOverrides: Record<string, unknown> = {}) {
    if (Object.keys(hookOverrides).length > 0) {
      (useSettings as jest.Mock).mockReturnValue(makeHookResult(hookOverrides));
    }
    act(() => render(<Settings />, container));
    return container;
  }

  describe("structure", () => {
    it("applies settingsClass to the root element", () => {
      setup({ settingsClass: "scripture-map-settings collapsed" });
      expect(
        container.querySelector(".scripture-map-settings.collapsed")
      ).not.toBeNull();
    });

    it("renders .settings-title with the title text", () => {
      setup({ title: "My Map" });
      const titleEl = container.querySelector(
        ".settings-title .scripture-title"
      );
      expect(titleEl).not.toBeNull();
      expect(titleEl!.textContent).toBe("My Map");
    });

    it("renders the settings button", () => {
      setup();
      expect(container.querySelector(".settings-button")).not.toBeNull();
    });

    it("renders a .horizontal-divider", () => {
      setup();
      expect(container.querySelector(".horizontal-divider")).not.toBeNull();
    });
  });

  describe("settings button", () => {
    it("calls handleSettingsButtonClick when the settings button is clicked", () => {
      const handleSettingsButtonClick = jest.fn();
      setup({ handleSettingsButtonClick });
      act(() => {
        container
          .querySelector(".settings-button")!
          .dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });
      expect(handleSettingsButtonClick).toHaveBeenCalledTimes(1);
    });
  });

  describe("SettingsOptions panel", () => {
    it("does not render .settings-options-container when showOptions is false", () => {
      setup({ showOptions: false });
      expect(container.querySelector(".settings-options-container")).toBeNull();
    });

    it("renders .settings-options-container when showOptions is true", () => {
      setup({ showOptions: true });
      expect(
        container.querySelector(".settings-options-container")
      ).not.toBeNull();
    });

    it("renders optionsTitle inside the options container", () => {
      setup({ showOptions: true, optionsTitle: "Settings" });
      const panel = container.querySelector(".settings-options-container")!;
      expect(panel.textContent).toContain("Settings");
    });

    it("renders optionsDescription inside the options container", () => {
      setup({ showOptions: true, optionsDescription: "Configure your view." });
      const panel = container.querySelector(".settings-options-container")!;
      expect(panel.textContent).toContain("Configure your view.");
    });

    it("renders a button for each static option", () => {
      setup({
        showOptions: true,
        optionsData: [
          makeStaticOption({ key: "a", staticText: "Open books" }),
          makeStaticOption({ key: "b", staticText: "Hide colors" }),
        ],
      });
      const buttons = container.querySelectorAll(".option-button");
      expect(buttons).toHaveLength(2);
      expect(buttons[0]!.textContent).toContain("Open books");
      expect(buttons[1]!.textContent).toContain("Hide colors");
    });

    it("renders dynamic option text using enabledText when condition is true", () => {
      setup({
        showOptions: true,
        optionsData: [
          makeDynamicOption({
            condition: true,
            enabledText: "Hide",
            staticText: "timeline",
          }),
        ],
      });
      expect(container.querySelector(".option-button")!.textContent).toContain(
        "Hide timeline"
      );
    });

    it("renders dynamic option text using disabledText when condition is false", () => {
      setup({
        showOptions: true,
        optionsData: [
          makeDynamicOption({
            condition: false,
            disabledText: "Show",
            staticText: "timeline",
          }),
        ],
      });
      expect(container.querySelector(".option-button")!.textContent).toContain(
        "Show timeline"
      );
    });

    it("calls the option callback when an option button is clicked", () => {
      const callback = jest.fn();
      setup({
        showOptions: true,
        optionsData: [makeStaticOption({ key: "x", callback })],
      });
      act(() => {
        container
          .querySelector(".option-button")!
          .dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe("Project mode section", () => {
    it("renders ProjectStateSetter when mode is Project and project is set", () => {
      setup({
        mode: ScriptureMapModes.Project,
        project: { name: "Test" },
      });
      expect(
        container.querySelector("[data-testid='project-state-setter']")
      ).not.toBeNull();
    });

    it("does not render ProjectStateSetter when mode is Viewer", () => {
      setup({ mode: ScriptureMapModes.Viewer, project: { name: "Test" } });
      expect(
        container.querySelector("[data-testid='project-state-setter']")
      ).toBeNull();
    });

    it("does not render ProjectStateSetter when project is undefined", () => {
      setup({ mode: ScriptureMapModes.Project, project: undefined });
      expect(
        container.querySelector("[data-testid='project-state-setter']")
      ).toBeNull();
    });

    it("renders ProjectFiltersSelector when mode is Project, project is set, and not in selection mode", () => {
      setup({
        mode: ScriptureMapModes.Project,
        project: { name: "Test" },
        isInSelectionMode: false,
      });
      expect(
        container.querySelector("[data-testid='project-filters-selector']")
      ).not.toBeNull();
    });

    it("does not render ProjectFiltersSelector when isInSelectionMode is true", () => {
      setup({
        mode: ScriptureMapModes.Project,
        project: { name: "Test" },
        isInSelectionMode: true,
      });
      expect(
        container.querySelector("[data-testid='project-filters-selector']")
      ).toBeNull();
    });

    it("does not render ProjectFiltersSelector when mode is Viewer", () => {
      setup({
        mode: ScriptureMapModes.Viewer,
        project: { name: "Test" },
        isInSelectionMode: false,
      });
      expect(
        container.querySelector("[data-testid='project-filters-selector']")
      ).toBeNull();
    });
  });

  describe("ReadingHistory section", () => {
    it("renders ReadingHistoryUserFiltersSelector when shouldShowReadingHistory is true", () => {
      setup({ shouldShowReadingHistory: true });
      expect(
        container.querySelector(
          "[data-testid='reading-history-user-filters-selector']"
        )
      ).not.toBeNull();
    });

    it("renders ReadingHistoryTimeline when shouldShowReadingHistory is true", () => {
      setup({ shouldShowReadingHistory: true });
      expect(
        container.querySelector("[data-testid='reading-history-timeline']")
      ).not.toBeNull();
    });

    it("does not render ReadingHistoryUserFiltersSelector when shouldShowReadingHistory is false", () => {
      setup({ shouldShowReadingHistory: false });
      expect(
        container.querySelector(
          "[data-testid='reading-history-user-filters-selector']"
        )
      ).toBeNull();
    });

    it("does not render ReadingHistoryTimeline when shouldShowReadingHistory is false", () => {
      setup({ shouldShowReadingHistory: false });
      expect(
        container.querySelector("[data-testid='reading-history-timeline']")
      ).toBeNull();
    });
  });

  describe("settings footer", () => {
    it("renders .settings-footer when shouldShowReadingHistory is true and not collapsed", () => {
      setup({ shouldShowReadingHistory: true, collapsed: false });
      expect(container.querySelector(".settings-footer")).not.toBeNull();
    });

    it("does not render .settings-footer when shouldShowReadingHistory is false", () => {
      setup({ shouldShowReadingHistory: false, collapsed: false });
      expect(container.querySelector(".settings-footer")).toBeNull();
    });

    it("does not render .settings-footer when collapsed is true", () => {
      setup({ shouldShowReadingHistory: true, collapsed: true });
      expect(container.querySelector(".settings-footer")).toBeNull();
    });

    it("renders legend lessText and moreText in the footer", () => {
      setup({
        shouldShowReadingHistory: true,
        collapsed: false,
        lessText: "Poco",
        moreText: "Mucho",
      });
      const footer = container.querySelector(".settings-footer")!;
      expect(footer.querySelector(".legend")!.textContent).toContain("Poco");
      expect(footer.querySelector(".legend")!.textContent).toContain("Mucho");
    });

    it("renders one LegendSquare per legendSquaresData entry", () => {
      setup({
        shouldShowReadingHistory: true,
        collapsed: false,
        legendSquaresData: [
          { key: 0, style: { backgroundColor: "#aaa" } },
          { key: 1, style: { backgroundColor: "#bbb" } },
          { key: 2, style: { backgroundColor: "#ccc" } },
        ],
      });
      const legend = container.querySelector(".legend")!;
      expect(legend.querySelectorAll("span[style]")).toHaveLength(3);
    });

    it("renders the year selector label text in the footer", () => {
      setup({
        shouldShowReadingHistory: true,
        collapsed: false,
        yearSelectorLabelTextContent: "Year: 2023",
      });
      expect(
        container.querySelector(".year-selector-label")!.textContent
      ).toContain("Year: 2023");
    });
  });
});
