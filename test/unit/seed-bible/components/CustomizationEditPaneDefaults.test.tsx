import { render } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import { CustomizationEditPane } from "@packages/seed-bible/seed-bible/components/CustomizationEditPane/CustomizationEditPane";
import {
  createCustomizationsManager,
  type CustomizationThemeVariant,
  type SeedBibleCustomization,
} from "@packages/seed-bible/seed-bible/managers/CustomizationsManager";
import { createCustomizationVariantSelectionsManager } from "@packages/seed-bible/seed-bible/managers/CustomizationVariantSelectionsManager";
import { createCustomizationExtensionPreferencesManager } from "@packages/seed-bible/seed-bible/managers/CustomizationExtensionPreferencesManager";
import { CasualOSManager } from "@packages/seed-bible/seed-bible/managers/OsManager";
import { createNavigationManager } from "@packages/seed-bible/seed-bible/managers/NavigationManager";
import type { LoginManager } from "@packages/seed-bible/seed-bible/managers/LoginManager";
import type { SettingsManager } from "@packages/seed-bible/seed-bible/managers/SettingsManager";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import { createTheme } from "@packages/seed-bible/seed-bible/managers/ThemeManager";

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

function makeVariant(id: string, baseTheme: string): CustomizationThemeVariant {
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

/** Two variants of each kind, with the first of each as its kind's default. */
const customization: SeedBibleCustomization = {
  id: "customization_1",
  name: "Branded",
  variants: [
    makeVariant("Day", "light"),
    makeVariant("Dusk", "light"),
    makeVariant("Midnight", "dark"),
    makeVariant("Night", "dark"),
    makeVariant("Acme A", "acme"),
    makeVariant("Acme B", "acme"),
  ],
  defaultLightVariantId: "Day",
  defaultDarkVariantId: "Midnight",
  defaultVariantId: "Acme A",
  logoUrl: null,
  createdAt: 1,
  updatedAt: 1,
  extensionSettings: {},
  extensionSettingDefaults: {},
  extensionSensitiveProxies: {},
};

/** The real customizations manager, with only CasualOS itself mocked. */
function createState(): SeedBibleState {
  const os = CasualOSManager();
  vi.spyOn(os, "getData").mockResolvedValue({
    success: false,
    errorCode: "data_not_found",
    errorMessage: "Data not found",
  });
  vi.spyOn(os, "recordData").mockResolvedValue(undefined as never);

  const login = {
    userId: signal("user-1"),
    authBot: signal(null),
    profile: signal(null),
    cachedProfile: signal(null),
    localConfig: signal({}),
  } as unknown as LoginManager;
  const settings = {
    settings: signal({ themeId: "light" }),
  } as unknown as SettingsManager;

  const customizations = createCustomizationsManager(
    os,
    login,
    createTheme(settings),
    createNavigationManager({ initialHref: "http://localhost/" }),
    createCustomizationVariantSelectionsManager(os, login),
    createCustomizationExtensionPreferencesManager(os, login)
  );
  customizations.customizations.value = [customization];
  customizations.startEditing(customization.id);
  return {
    customizations,
    bibleData: { availableTranslations: signal([]) },
    extensions: { extensions: signal([]) },
    app: { toast: vi.fn(), isMobile: signal(false) },
  } as unknown as SeedBibleState;
}

describe("CustomizationEditPane theme defaults", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    vi.spyOn(window, "requestAnimationFrame").mockImplementation(
      (callback: FrameRequestCallback) => {
        callback(0);
        return 1;
      }
    );
    container = document.createElement("div");
    document.body.appendChild(container);
    act(() => {
      render(<CustomizationEditPane state={createState()} />, container);
    });
  });

  afterEach(() => {
    render(null, container);
    container.remove();
    vi.restoreAllMocks();
  });

  function card(name: string): HTMLElement {
    const found = Array.from(
      container.querySelectorAll<HTMLElement>(".sb-cz-theme-card")
    ).find((c) => c.querySelector(".sb-cz-card-title")?.textContent === name);
    if (!found) throw new Error(`No theme card named ${name}`);
    return found;
  }

  /** The chip's label, without its icon's glyph name. */
  function chipLabel(name: string): string | null {
    const chip = card(name).querySelector(".sb-cz-default-chip");
    return chip?.lastChild?.textContent ?? null;
  }

  function openMenu(name: string): string[] {
    const button = card(name).querySelector<HTMLButtonElement>(
      'button[aria-label="Theme options"]'
    );
    if (!button) throw new Error(`No options menu on ${name}`);
    act(() => {
      button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    return Array.from(
      document.body.querySelectorAll('[role="menu"] [role="menuitem"]')
    ).map((item) => item.lastChild?.textContent ?? "");
  }

  it("marks each kind's default with its own chip and leaves the others unmarked", () => {
    expect(chipLabel("Day")).toBe("Light default");
    expect(chipLabel("Midnight")).toBe("Dark default");
    expect(chipLabel("Acme A")).toBe("Default");
    expect(chipLabel("Dusk")).toBeNull();
    expect(chipLabel("Night")).toBeNull();
    expect(chipLabel("Acme B")).toBeNull();
  });

  it("offers the default for a theme's own base in its menu, and none on a theme that already is one", () => {
    expect(openMenu("Dusk")).toEqual(["Set as light default", "Delete"]);
    expect(openMenu("Night")).toEqual(["Set as dark default", "Delete"]);
    expect(openMenu("Acme B")).toEqual(["Set as default", "Delete"]);
    expect(openMenu("Day")).toEqual(["Delete"]);
  });

  it("moves the dark default chip to the theme picked from its menu", () => {
    openMenu("Night");
    const setAsDefault = Array.from(
      document.body.querySelectorAll<HTMLElement>('[role="menuitem"]')
    ).find((item) => item.textContent?.includes("Set as dark default"));
    expect(setAsDefault).toBeDefined();

    act(() => {
      setAsDefault!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(chipLabel("Night")).toBe("Dark default");
    expect(chipLabel("Midnight")).toBeNull();
    expect(chipLabel("Day")).toBe("Light default");
  });
});
