import { render } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import { CustomizationVariantGallery } from "@packages/seed-bible/seed-bible/components/SettingsPage/SettingsPage";
import type {
  CustomizationThemeVariant,
  SeedBibleCustomization,
} from "@packages/seed-bible/seed-bible/managers/CustomizationsManager";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import { SYSTEM_THEME_ID } from "@packages/seed-bible/seed-bible/managers/ThemeManager";

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
