import { render } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import { SettingsPage } from "@packages/seed-bible/seed-bible/components/SettingsPage/SettingsPage";
import { CUSTOMIZATION_FONT_PRESETS } from "@packages/seed-bible/seed-bible/managers/CustomizationsManager";
import type { LoginManager } from "@packages/seed-bible/seed-bible/managers/LoginManager";
import { createNavigationManager } from "@packages/seed-bible/seed-bible/managers/NavigationManager";
import { CasualOSManager } from "@packages/seed-bible/seed-bible/managers/OsManager";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import {
  createSettings,
  type SettingsManager,
} from "@packages/seed-bible/seed-bible/managers/SettingsManager";

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const actual = await vi.importActual<
    typeof import("@packages/seed-bible/seed-bible/i18n/I18nManager")
  >("@packages/seed-bible/seed-bible/i18n/I18nManager");
  return {
    ...actual,
    useI18n: () => ({
      t: (key: string, options?: { defaultValue?: string }) =>
        options?.defaultValue ?? key,
      language: "en",
    }),
  };
});

const ROBOTO = "Roboto, sans-serif";
const FONT_OVERRIDE_VAR = "--sb-scripture-font-override";

function makeAnonymousLogin(): LoginManager {
  return {
    userId: signal<string | null>(null),
    profile: signal(null),
    localConfig: signal<Record<string, unknown>>({}),
    profilePromise: Promise.resolve(null),
    updateProfile: () => undefined,
  } as unknown as LoginManager;
}

function makeState(settings: SettingsManager): SeedBibleState {
  return {
    settings,
    sidebar: { requestedSettingsView: signal<string>("display-and-theme") },
    app: { isMobile: signal(false) },
    customizations: { activeCustomization: signal(null) },
    theme: { themes: signal([]) },
  } as unknown as SeedBibleState;
}

describe("Display & Theme settings view", () => {
  let container: HTMLDivElement;
  let login: LoginManager;
  let settings: SettingsManager;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    login = makeAnonymousLogin();
    settings = createSettings(
      CasualOSManager(),
      login,
      createNavigationManager({ initialHref: "http://localhost:3000/" })
    );
  });

  afterEach(() => {
    render(null, container);
    container.remove();
    document.documentElement.style.removeProperty(FONT_OVERRIDE_VAR);
  });

  function renderView() {
    act(() => {
      render(<SettingsPage state={makeState(settings)} />, container);
    });
  }

  const fontSelect = () =>
    container.querySelector<HTMLSelectElement>("#sb-font-select")!;

  function chooseFont(value: string) {
    act(() => {
      const select = fontSelect();
      select.value = value;
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
  }

  it("no longer offers the All settings screen", () => {
    renderView();

    expect(container.textContent).toContain("Display & Theme");
    expect(container.textContent).not.toContain("All settings");
  });

  it("offers Default followed by the customization font presets", () => {
    renderView();

    const options = Array.from(fontSelect().options).map((option) => ({
      name: option.textContent,
      value: option.value,
    }));
    expect(options).toEqual([
      { name: "Default", value: "default" },
      ...CUSTOMIZATION_FONT_PRESETS.map(({ name, value }) => ({ name, value })),
    ]);
  });

  it("shows Default when no font has been chosen", () => {
    renderView();

    expect(fontSelect().value).toBe("default");
  });

  it("shows the saved font when the screen is opened", () => {
    settings.setFontOverride(ROBOTO);

    renderView();

    expect(fontSelect().value).toBe(ROBOTO);
  });

  it("choosing a font saves it, applies it, and keeps it selected", () => {
    renderView();

    chooseFont(ROBOTO);

    expect(login.localConfig.value.fontOverride).toBe(ROBOTO);
    expect(
      document.documentElement.style.getPropertyValue(FONT_OVERRIDE_VAR)
    ).toBe(ROBOTO);
    expect(fontSelect().value).toBe(ROBOTO);
  });

  it("choosing Default removes the saved font", () => {
    settings.setFontOverride(ROBOTO);
    renderView();

    chooseFont("default");

    expect(login.localConfig.value.fontOverride).toBeUndefined();
    expect(
      document.documentElement.style.getPropertyValue(FONT_OVERRIDE_VAR)
    ).toBe("");
    expect(fontSelect().value).toBe("default");
  });
});
