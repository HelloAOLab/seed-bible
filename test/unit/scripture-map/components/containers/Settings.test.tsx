import type { Mock } from "vitest";
import { render } from "preact";
import { act } from "preact/test-utils";
import { Settings } from "../../../../../packages/scripture-map/components/containers/Settings";
import { useSettings } from "../../../../../packages/scripture-map/hooks/useSettings";
import { ScriptureMapModes } from "../../../../../packages/scripture-map/models/scriptureMap";
import type {
  SettingsOptionData,
  SettingsLegendSquareData,
  SettingsYearselectorOptionData,
} from "../../../../../packages/scripture-map/components/containers/Settings";

vi.mock("../../../../../packages/scripture-map/hooks/useSettings", () => ({
  useSettings: vi.fn(),
}));

const { settingsHeaderSlotMock } = vi.hoisted(() => ({
  settingsHeaderSlotMock: { value: null as HTMLElement | null },
}));

vi.mock(
  "../../../../../packages/scripture-map/contexts/ScriptureMap/ScriptureMapContext",
  () => ({
    useScriptureMapContext: vi.fn(() => ({
      MaterialIcon: ({ children }: { children: string }) => (
        <span>{children}</span>
      ),
      ReadingHistoryTimeline: ({ footer }: { footer?: unknown }) => (
        <div
          data-testid="reading-history-timeline"
          data-has-footer={footer ? "true" : "false"}
        />
      ),
      settingsHeaderSlot: settingsHeaderSlotMock,
    })),
  })
);

vi.mock("../../../../../packages/scripture-map/hooks/useClickOutside", () => ({
  useClickOutside: vi.fn(),
}));

vi.mock(
  "../../../../../packages/scripture-map/components/containers/ProjectStateSetter",
  () => ({
    ProjectStateSetter: () => <div data-testid="project-state-setter" />,
  })
);

vi.mock(
  "../../../../../packages/scripture-map/components/containers/ProjectFiltersSelector",
  () => ({
    ProjectFiltersSelector: () => (
      <div data-testid="project-filters-selector" />
    ),
  })
);

vi.mock(
  "../../../../../packages/scripture-map/components/containers/ReadingHistoryUserFiltersSelector",
  () => ({
    ReadingHistoryUserFiltersSelector: () => (
      <div data-testid="reading-history-user-filters-selector" />
    ),
  })
);

vi.mock(
  "../../../../../packages/scripture-map/hooks/useReadingHistoryTimeline",
  () => ({
    useReadingHistoryTimeline: vi.fn(() => ({
      itemsData: [],
      timelineRef: { current: null },
    })),
  })
);

vi.mock(
  "../../../../../packages/scripture-map/components/containers/Tooltip",
  () => ({
    Tooltip: () => null,
  })
);

function makeStaticOption(
  overrides: Partial<SettingsOptionData> = {}
): SettingsOptionData {
  return {
    key: "opt-static",
    type: "static",
    callback: vi.fn(),
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
    callback: vi.fn(),
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
    handleSettingsButtonClick: vi.fn(),
    showOptions: false,
    setShowOptions: vi.fn(),
    collapsed: false,
    mode: ScriptureMapModes.Viewer,
    project: undefined,
    isInSelectionMode: false,
    shouldShowReadingHistory: false,
    optionsData: [] as SettingsOptionData[],
    legendSquaresData: [] as SettingsLegendSquareData[],
    yearSelectorLabelTextContent: "2024",
    yearSelectorOptionsData: [] as SettingsYearselectorOptionData[],
    optionsTitle: "Options",
    optionsDescription: "Manage your view.",
    lessText: "Less",
    moreText: "More",
    ...overrides,
  };
}

describe("Settings", () => {
  let container: HTMLDivElement;
  // The settings button portals into the pane header's slot rather than
  // rendering inline (see Settings.tsx), so it lives in its own DOM node,
  // separate from `container`.
  let portalTarget: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    portalTarget = document.createElement("div");
    document.body.appendChild(portalTarget);
    settingsHeaderSlotMock.value = portalTarget;
    (useSettings as Mock).mockReturnValue(makeHookResult());
  });

  afterEach(() => {
    act(() => render(null, container));
    container.remove();
    portalTarget.remove();
    settingsHeaderSlotMock.value = null;
    vi.clearAllMocks();
  });

  function setup(hookOverrides: Record<string, unknown> = {}) {
    if (Object.keys(hookOverrides).length > 0) {
      (useSettings as Mock).mockReturnValue(makeHookResult(hookOverrides));
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

    it("renders the settings button into the pane header's slot", () => {
      setup();
      expect(container.querySelector(".settings-button")).toBeNull();
      expect(portalTarget.querySelector(".settings-button")).not.toBeNull();
    });

    it("renders a .horizontal-divider", () => {
      setup();
      expect(container.querySelector(".horizontal-divider")).not.toBeNull();
    });
  });

  describe("settings button", () => {
    it("calls handleSettingsButtonClick when the settings button is clicked", () => {
      const handleSettingsButtonClick = vi.fn();
      setup({ handleSettingsButtonClick });
      act(() => {
        portalTarget
          .querySelector(".settings-button")!
          .dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });
      expect(handleSettingsButtonClick).toHaveBeenCalledTimes(1);
    });

    it("does not render the settings button when the header slot isn't mounted yet", () => {
      settingsHeaderSlotMock.value = null;
      setup();
      expect(container.querySelector(".settings-button")).toBeNull();
      expect(portalTarget.querySelector(".settings-button")).toBeNull();
    });
  });

  describe("SettingsOptions panel", () => {
    it("does not render .settings-options-container when showOptions is false", () => {
      setup({ showOptions: false });
      expect(
        portalTarget.querySelector(".settings-options-container")
      ).toBeNull();
    });

    it("renders .settings-options-container when showOptions is true", () => {
      setup({ showOptions: true });
      expect(
        portalTarget.querySelector(".settings-options-container")
      ).not.toBeNull();
    });

    it("renders optionsTitle inside the options container", () => {
      setup({ showOptions: true, optionsTitle: "Settings" });
      const panel = portalTarget.querySelector(".settings-options-container")!;
      expect(panel.textContent).toContain("Settings");
    });

    it("renders optionsDescription inside the options container", () => {
      setup({ showOptions: true, optionsDescription: "Configure your view." });
      const panel = portalTarget.querySelector(".settings-options-container")!;
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
      const buttons = portalTarget.querySelectorAll(".option-button");
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
      expect(
        portalTarget.querySelector(".option-button")!.textContent
      ).toContain("Hide timeline");
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
      expect(
        portalTarget.querySelector(".option-button")!.textContent
      ).toContain("Show timeline");
    });

    it("calls the option callback when an option button is clicked", () => {
      const callback = vi.fn();
      setup({
        showOptions: true,
        optionsData: [makeStaticOption({ key: "x", callback })],
      });
      act(() => {
        portalTarget
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

  describe("reading-history footer", () => {
    // The footer (legend + year selector) now lives inside the shared
    // ReadingHistoryTimeline. Settings only decides whether to pass it.
    it("passes a footer to the timeline when shouldShowReadingHistory and not collapsed", () => {
      setup({ shouldShowReadingHistory: true, collapsed: false });
      expect(
        container
          .querySelector("[data-testid='reading-history-timeline']")
          ?.getAttribute("data-has-footer")
      ).toBe("true");
    });

    it("does not pass a footer when collapsed is true", () => {
      setup({ shouldShowReadingHistory: true, collapsed: true });
      expect(
        container
          .querySelector("[data-testid='reading-history-timeline']")
          ?.getAttribute("data-has-footer")
      ).toBe("false");
    });
  });
});
