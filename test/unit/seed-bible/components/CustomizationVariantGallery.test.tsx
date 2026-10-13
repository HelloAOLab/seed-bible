import { render } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import { CustomizationVariantGallery } from "@packages/seed-bible/seed-bible/components/SettingsPage/SettingsPage";
import {
  buildBibleThemeFromCustomizationTheme,
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
import {
  createTheme,
  DARK_THEME,
  LIGHT_THEME,
  SYSTEM_THEME_ID,
} from "@packages/seed-bible/seed-bible/managers/ThemeManager";

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

function makeVariant(
  id: string,
  name: string,
  baseTheme: string
): CustomizationThemeVariant {
  return {
    id,
    name,
    baseTheme,
    themes: { primaryColor: "#e07b4c", tertiaryColor: "#f0f0f0" },
    highlightColors: {},
    createdAt: 1,
    updatedAt: 1,
  };
}

function makeCustomization(
  variants: CustomizationThemeVariant[]
): SeedBibleCustomization {
  return {
    id: "customization_1",
    name: "Branded",
    variants,
    defaultVariantId: variants[0]!.id,
    logoUrl: null,
    createdAt: 1,
    updatedAt: 1,
    extensionSettings: {},
    extensionSettingDefaults: {},
    extensionSensitiveProxies: {},
  };
}

describe("CustomizationVariantGallery", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  function renderGallery(options: {
    customization: SeedBibleCustomization;
    canFollowSystemScheme: boolean;
    isFollowingSystemScheme: boolean;
    activeVariantId: string;
  }) {
    const selectActiveVariant = vi.fn().mockResolvedValue(undefined);
    const state = {
      customizations: {
        activeVariant: signal(
          options.customization.variants.find(
            (v) => v.id === options.activeVariantId
          ) ?? null
        ),
        canFollowSystemScheme: signal(options.canFollowSystemScheme),
        isFollowingSystemScheme: signal(options.isFollowingSystemScheme),
        selectActiveVariant,
        resolveEditingVariantTheme: (variant: CustomizationThemeVariant) =>
          buildBibleThemeFromCustomizationTheme(
            variant,
            variant.baseTheme === DARK_THEME.id ? DARK_THEME : LIGHT_THEME
          ),
      },
    } as unknown as SeedBibleState;

    act(() => {
      render(
        <CustomizationVariantGallery
          state={state}
          customization={options.customization}
        />,
        container
      );
    });
    return { selectActiveVariant };
  }

  const cardNames = () =>
    Array.from(
      container.querySelectorAll(".sb-theme-ready-label > span:first-child")
    ).map((el) => el.textContent);

  const selectedCardName = () =>
    container.querySelector(
      ".sb-theme-ready-card-selected .sb-theme-ready-label span"
    )?.textContent;

  it("offers System alongside the variants when the customization covers both schemes", () => {
    renderGallery({
      customization: makeCustomization([
        makeVariant("variant_light", "Daylight", "light"),
        makeVariant("variant_dark", "Midnight", "dark"),
      ]),
      canFollowSystemScheme: true,
      isFollowingSystemScheme: false,
      activeVariantId: "variant_light",
    });

    expect(cardNames()).toEqual(["Daylight", "Midnight", "System"]);
    expect(selectedCardName()).toBe("Daylight");
  });

  it("marks System as the selected card, not the variant it resolved to", () => {
    renderGallery({
      customization: makeCustomization([
        makeVariant("variant_light", "Daylight", "light"),
        makeVariant("variant_dark", "Midnight", "dark"),
      ]),
      canFollowSystemScheme: true,
      isFollowingSystemScheme: true,
      activeVariantId: "variant_dark",
    });

    expect(selectedCardName()).toBe("System");
    expect(
      container.querySelectorAll(".sb-theme-ready-card-selected")
    ).toHaveLength(1);
  });

  it("stores the System sentinel when the System card is clicked", () => {
    const { selectActiveVariant } = renderGallery({
      customization: makeCustomization([
        makeVariant("variant_light", "Daylight", "light"),
        makeVariant("variant_dark", "Midnight", "dark"),
      ]),
      canFollowSystemScheme: true,
      isFollowingSystemScheme: false,
      activeVariantId: "variant_light",
    });

    const systemCard = Array.from(
      container.querySelectorAll<HTMLButtonElement>(".sb-theme-ready-card")
    ).at(-1)!;
    act(() => {
      systemCard.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(selectActiveVariant).toHaveBeenCalledWith(SYSTEM_THEME_ID);
  });

  it("hides System when the customization only has one color scheme", () => {
    renderGallery({
      customization: makeCustomization([
        makeVariant("variant_light", "Daylight", "light"),
      ]),
      canFollowSystemScheme: false,
      isFollowingSystemScheme: false,
      activeVariantId: "variant_light",
    });

    expect(cardNames()).toEqual(["Daylight"]);
  });
});

/** A variant with no overrides of its own unless `themes` is given. */
function makeBareVariant(
  id: string,
  name: string,
  baseTheme: string,
  themes: CustomizationThemeVariant["themes"] = {}
): CustomizationThemeVariant {
  return {
    id,
    name,
    baseTheme,
    themes,
    highlightColors: {},
    createdAt: 1,
    updatedAt: 1,
  };
}

/** The real customizations manager, with only CasualOS itself mocked. */
function createState(customization: SeedBibleCustomization): SeedBibleState {
  const os = CasualOSManager();
  vi.spyOn(os, "getData").mockResolvedValue({
    success: false,
    errorCode: "data_not_found",
    errorMessage: "Data not found",
  });
  vi.spyOn(os, "listAllDataByMarker").mockResolvedValue({
    success: true,
    items: [],
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
    settings: signal({
      themeId: "light",
      customTheme: {},
      customHighlights: {},
    }),
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
  // An open draft is one of the two ways a customization becomes active.
  customizations.startEditing(customization.id);
  return { customizations } as unknown as SeedBibleState;
}

/** A CSS color as jsdom serializes it, so hex and rgb() compare equal. */
function cssColor(value: string): string {
  const probe = document.createElement("div");
  probe.style.background = value;
  return probe.style.background;
}

function renderWithRealManager(customization: SeedBibleCustomization) {
  const state = createState(customization);
  const container = document.createElement("div");
  document.body.appendChild(container);
  act(() => {
    render(
      <CustomizationVariantGallery
        state={state}
        customization={customization}
      />,
      container
    );
  });
  const cards = Array.from(
    container.querySelectorAll<HTMLButtonElement>(".sb-theme-ready-card")
  );
  const cardNamed = (name: string) => {
    const card = cards.find((c) => c.textContent?.includes(name));
    if (!card) throw new Error(`No theme card named ${name}`);
    return {
      preview: card.querySelector<HTMLElement>(".sb-theme-ready-preview")!,
      halves: Array.from(
        card.querySelectorAll<HTMLElement>(".sb-theme-ready-system-half")
      ),
      swatch: (which: "a" | "b" | "c") =>
        card.querySelector<HTMLElement>(`.sb-theme-ready-swatch-${which}`)!,
    };
  };
  return { container, cardNamed };
}

describe("CustomizationVariantGallery theme colors", () => {
  let cleanup: (() => void) | undefined;

  afterEach(() => {
    cleanup?.();
    cleanup = undefined;
    vi.restoreAllMocks();
  });

  it("colors a theme with no edits of its own from the preset it's based on", () => {
    const { container, cardNamed } = renderWithRealManager(
      makeCustomization([
        makeBareVariant("v-light", "Morning", LIGHT_THEME.id),
        makeBareVariant("v-dark", "Evening", DARK_THEME.id),
      ])
    );
    cleanup = () => {
      render(null, container);
      container.remove();
    };

    const morning = cardNamed("Morning");
    expect(morning.preview.style.background).toBe(
      cssColor(LIGHT_THEME.variables.tertiaryColor)
    );
    expect(morning.swatch("a").style.background).toBe(
      cssColor(LIGHT_THEME.variables.primaryColor)
    );
    expect(morning.swatch("b").style.background).toBe(
      cssColor(LIGHT_THEME.variables.secondaryColor)
    );
    expect(morning.swatch("c").style.background).toBe(
      cssColor(LIGHT_THEME.variables.fontColor)
    );

    const evening = cardNamed("Evening");
    expect(evening.swatch("a").style.background).toBe(
      cssColor(DARK_THEME.variables.primaryColor)
    );
    expect(evening.preview.style.background).toBe(
      cssColor(DARK_THEME.variables.tertiaryColor)
    );
  });

  it("shows a theme's own color where it overrides its preset", () => {
    const { container, cardNamed } = renderWithRealManager(
      makeCustomization([
        makeBareVariant("v-light", "Morning", LIGHT_THEME.id, {
          primaryColor: "#123456",
        }),
      ])
    );
    cleanup = () => {
      render(null, container);
      container.remove();
    };

    const morning = cardNamed("Morning");
    expect(morning.swatch("a").style.background).toBe(cssColor("#123456"));
    // Fields it didn't override still come from the preset.
    expect(morning.swatch("b").style.background).toBe(
      cssColor(LIGHT_THEME.variables.secondaryColor)
    );
  });

  it("colors each half of the System card from the Light- and Dark-based themes", () => {
    const { container, cardNamed } = renderWithRealManager(
      makeCustomization([
        makeBareVariant("v-light", "Morning", LIGHT_THEME.id),
        makeBareVariant("v-dark", "Evening", DARK_THEME.id),
      ])
    );
    cleanup = () => {
      render(null, container);
      container.remove();
    };

    const [lightHalf, darkHalf] = cardNamed("System").halves;
    expect(lightHalf!.style.background).toBe(
      cssColor(LIGHT_THEME.variables.tertiaryColor)
    );
    expect(darkHalf!.style.background).toBe(
      cssColor(DARK_THEME.variables.tertiaryColor)
    );
    expect(
      darkHalf!.querySelector<HTMLElement>(".sb-theme-ready-swatch-a")!.style
        .background
    ).toBe(cssColor(DARK_THEME.variables.primaryColor));
  });
});
