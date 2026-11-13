import { render } from "preact";
import { act } from "preact/test-utils";
import {
  CustomizationEditPane,
  CustomizationEditPaneHelp,
  CustomizationEditPaneLeading,
} from "@packages/seed-bible/seed-bible/components/CustomizationEditPane/CustomizationEditPane";
import type {
  CustomizationThemeVariant,
  SeedBibleCustomization,
} from "@packages/seed-bible/seed-bible/managers/CustomizationsManager";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import { createTestSeedBibleState } from "../testUtils/createTestSeedBibleState";
import { TestHost } from "./TestHost";

function variant(id: string, baseTheme: string): CustomizationThemeVariant {
  return {
    id,
    name: id,
    baseTheme,
    themes: {},
    highlightColors: {},
    createdAt: 1,
    updatedAt: 1,
  };
}

/** A Custom Branding with a light and a dark theme, light being the default. */
const BRANDING: SeedBibleCustomization = {
  id: "customization-1",
  name: "Our church",
  variants: [variant("light-theme", "light"), variant("dark-theme", "dark")],
  defaultVariantId: "light-theme",
  logoUrl: null,
  createdAt: 1,
  updatedAt: 1,
  extensionSettings: {},
  extensionSettingDefaults: {},
  extensionSensitiveProxies: {},
};

/** Index of the tour's first step inside the theme editor. */
const FIRST_THEME_STEP = 3;

describe("CustomizationEditPaneHelp", () => {
  let container: HTMLDivElement;
  let state: SeedBibleState;

  beforeEach(async () => {
    jsdom.reconfigure({
      url: "https://example.com/en/john/1?useFreeBibleAPI=true",
    });
    container = document.createElement("div");
    document.body.appendChild(container);
    state = await createTestSeedBibleState();
  });

  afterEach(() => {
    act(() => {
      if (state.tutorial.running.value) state.tutorial.finish();
    });
    render(null, container);
    container.remove();
  });

  /** Opens the branding in the editor, the way the Custom Branding list does. */
  function editBranding() {
    state.customizations.customizations.value = [BRANDING];
    act(() => state.customizations.startEditing(BRANDING.id));
  }

  /** The pane header's back and help buttons, and optionally the editor itself. */
  function renderHelp(options: { withEditor?: boolean } = {}) {
    act(() => {
      render(
        <TestHost state={state}>
          <div className="leading">
            <CustomizationEditPaneLeading />
          </div>
          <CustomizationEditPaneHelp state={state} />
          {options.withEditor && <CustomizationEditPane state={state} />}
        </TestHost>,
        container
      );
    });
  }

  /** The pane header's Back, shown on every screen but the main editor. */
  function back() {
    return container.querySelector(".leading button");
  }

  function clickHelp() {
    const button = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Take a tour"]'
    )!;
    act(() => button.click());
  }

  function goToStep(index: number) {
    while (state.tutorial.index.value < index) {
      act(() => state.tutorial.next());
    }
  }

  it("starts the editor tour on its first step", () => {
    editBranding();
    renderHelp();

    clickHelp();

    expect(state.tutorial.activeTutorialId.value).toBe("customization-created");
    expect(state.tutorial.currentStep.value?.id).toBe(
      "customization-tutorial-name"
    );
  });

  it("starts even after the tour was seen and tours were turned off", () => {
    editBranding();
    renderHelp();
    clickHelp();
    act(() => state.tutorial.finish());
    act(() => state.tutorial.optOut());
    expect(state.tutorial.featuresSeen.value["customization-created"]).toBe(
      true
    );

    clickHelp();

    expect(state.tutorial.activeTutorialId.value).toBe("customization-created");
  });

  it("tours the theme being edited", () => {
    editBranding();
    state.customizations.editingVariantId.value = "dark-theme";
    renderHelp();

    clickHelp();
    goToStep(FIRST_THEME_STEP);

    expect(state.customizations.editingVariantId.value).toBe("dark-theme");
  });

  it("tours the default theme when no theme of this Custom Branding is open", () => {
    editBranding();
    state.customizations.editingVariantId.value =
      "a-theme-from-another-branding";
    renderHelp();

    clickHelp();
    goToStep(FIRST_THEME_STEP);

    expect(state.customizations.editingVariantId.value).toBe("light-theme");
  });

  it("leaves a running tour where it is when pressed again", () => {
    editBranding();
    renderHelp();
    clickHelp();
    goToStep(FIRST_THEME_STEP);
    const step = state.tutorial.currentStep.value?.id;
    // The tour has opened the theme editor, which has a back button.
    expect(back()).not.toBeNull();

    clickHelp();

    expect(state.tutorial.currentStep.value?.id).toBe(step);
    expect(back()).not.toBeNull();
  });

  it("goes back to the main editor, where the tour starts, from a theme", () => {
    editBranding();
    renderHelp({ withEditor: true });
    const themeCard = container.querySelector<HTMLButtonElement>(
      ".sb-cz-theme-card-open"
    )!;
    act(() => themeCard.click());
    expect(back()).not.toBeNull();

    clickHelp();

    expect(back()).toBeNull();
    expect(state.tutorial.currentStep.value?.id).toBe(
      "customization-tutorial-name"
    );
    expect(
      container.querySelector('[data-tutorial="customization-name"]')
    ).not.toBeNull();
  });

  it("isn't shown while no Custom Branding is open", () => {
    renderHelp();

    expect(
      container.querySelector('button[aria-label="Take a tour"]')
    ).toBeNull();
  });
});
