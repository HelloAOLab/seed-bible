import {
  createCustomizationsManager,
  buildCustomFontValue,
  CUSTOMIZATION_COLOR_FIELDS,
  CUSTOMIZATION_FONT_FIELDS,
  CUSTOMIZATION_MARKER,
  getFontPresetsForField,
  lightenColor,
  SECONDARY_LIGHTEN_AMOUNT,
  TERTIARY_LIGHTEN_AMOUNT,
} from "@packages/seed-bible/seed-bible/managers/CustomizationsManager";
import {
  createCustomizationVariantSelectionsManager,
  VARIANT_SELECTIONS_ADDRESS,
} from "@packages/seed-bible/seed-bible/managers/CustomizationVariantSelectionsManager";
import {
  createCustomizationExtensionPreferencesManager,
  EXTENSION_PREFERENCES_ADDRESS,
} from "@packages/seed-bible/seed-bible/managers/CustomizationExtensionPreferencesManager";
import type { LoginManager } from "@packages/seed-bible/seed-bible/managers/LoginManager";
import { CasualOSManager } from "@packages/seed-bible/seed-bible/managers/OsManager";
import { createTheme } from "@packages/seed-bible/seed-bible/managers/ThemeManager";
import type { SettingsManager } from "@packages/seed-bible/seed-bible/managers/SettingsManager";
import {
  createNavigationManager,
  type NavigationManager,
} from "@packages/seed-bible/seed-bible/managers/NavigationManager";
import { signal } from "@preact/signals";
import type { Mock, Mocked } from "vitest";

function hexToRgbTuple(hex: string): [number, number, number] {
  const num = parseInt(hex.replace("#", ""), 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

describe("CustomizationsManager", () => {
  let recordDataMock: Mock;
  let eraseDataMock: Mock;
  let listAllDataByMarkerMock: Mock;
  let recordFileMock: Mock;
  let getDataMock: Mock;
  let warnSpy: Mock;
  let login: Mocked<LoginManager>;
  let os: CasualOSManager;
  let settings: Mocked<SettingsManager>;
  let navigation: NavigationManager;

  beforeEach(() => {
    os = CasualOSManager();
    getDataMock = vi.spyOn(os, "getData").mockResolvedValue({
      success: false,
      errorCode: "data_not_found",
      errorMessage: "Data not found",
    });
    navigation = createNavigationManager({ initialHref: "http://localhost/" });
    recordDataMock = vi
      .spyOn(os, "recordData")
      .mockResolvedValue(undefined as never);
    eraseDataMock = vi
      .spyOn(os, "eraseData")
      .mockResolvedValue(undefined as never);
    listAllDataByMarkerMock = vi
      .spyOn(os, "listAllDataByMarker")
      .mockResolvedValue({ success: true, items: [] });
    recordFileMock = vi.spyOn(os, "recordFile").mockResolvedValue({
      success: true,
      url: "https://files.example.com/logo.png",
    });
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    login = {
      authBot: signal(null),
      sessionEnded: signal(null),
      userId: signal("user-1"),
      connectionId: "conn-1",
      profile: signal(null),
      cachedProfile: signal(null),
      localConfig: signal({}),
      profilePromise: null,
      isProfileLoading: signal(false),
      isSavingProfile: signal(false),
      updateProfile: vi.fn().mockResolvedValue(undefined),
      login: vi.fn().mockResolvedValue(undefined),
      logout: vi.fn().mockResolvedValue(undefined),
      getUserProfile: vi.fn().mockResolvedValue(null),
      uploadProfilePicture: vi.fn().mockResolvedValue(undefined),
      userInfo: signal({ id: "user-1", email: "test@example.com" }),
      cancelLogin: vi.fn().mockResolvedValue(undefined),
      isLoginOpen: signal(false),
      requestLoginByEmail: vi
        .fn()
        .mockResolvedValue({ success: true, requestId: "req-1" }),
      submitLoginCode: vi.fn().mockResolvedValue({
        success: true,
        userInfo: { id: "user-1", email: "test@example.com" },
      }),
      hydrateLocalConfig: vi.fn(),
    };

    type MinimalSettingsValue = {
      themeId: string;
      customTheme: Record<string, string>;
      customHighlights: Record<string, unknown>;
    };
    const settingsValue = signal<MinimalSettingsValue>({
      themeId: "light",
      customTheme: {},
      customHighlights: {},
    });
    settings = {
      settings: settingsValue,
      setThemeId: vi.fn((themeId: string) => {
        settingsValue.value = { ...settingsValue.value, themeId };
      }),
      setCustomTheme: vi.fn((customTheme: Record<string, string>) => {
        settingsValue.value = { ...settingsValue.value, customTheme };
      }),
      setCustomHighlights: vi.fn(
        (customHighlights: Record<string, unknown>) => {
          settingsValue.value = { ...settingsValue.value, customHighlights };
        }
      ),
    } as unknown as Mocked<SettingsManager>;
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  function createManager(nav: NavigationManager = navigation) {
    const theme = createTheme(settings);
    const variantSelections = createCustomizationVariantSelectionsManager(
      os,
      login
    );
    const extensionPreferences = createCustomizationExtensionPreferencesManager(
      os,
      login
    );
    const manager = createCustomizationsManager(
      os,
      login,
      theme,
      nav,
      variantSelections,
      extensionPreferences
    );
    return { theme, variantSelections, extensionPreferences, manager };
  }

  it("load() lists customizations under the seedBibleCustomization marker for the signed-in user", async () => {
    const { manager } = createManager();

    await manager.load();

    expect(listAllDataByMarkerMock).toHaveBeenCalledWith(
      "user-1",
      CUSTOMIZATION_MARKER
    );
    expect(manager.customizations.value).toEqual([]);
  });

  it("load() skips invalid records instead of throwing", async () => {
    listAllDataByMarkerMock.mockResolvedValue({
      success: true,
      items: [
        { address: "customization_bad", data: { not: "valid" } },
        {
          address: "customization_good",
          data: {
            id: "customization_good",
            name: "Good",
            variants: [
              {
                id: "variant_1",
                name: "Default",
                themes: {},
                createdAt: 1,
                updatedAt: 1,
              },
            ],
            defaultVariantId: "variant_1",
            createdAt: 1,
            updatedAt: 1,
          },
        },
      ],
    });
    const { manager } = createManager();

    await manager.load();

    expect(warnSpy).toHaveBeenCalled();
    expect(manager.customizations.value).toHaveLength(1);
    expect(manager.customizations.value[0]?.id).toBe("customization_good");
  });

  it("load() skips a record persisted under the old flat-themes shape", async () => {
    listAllDataByMarkerMock.mockResolvedValue({
      success: true,
      items: [
        {
          address: "customization_old",
          data: {
            id: "customization_old",
            name: "Old shape",
            themes: { primaryColor: "#111111" },
            logoUrl: null,
            createdAt: 1,
            updatedAt: 1,
          },
        },
      ],
    });
    const { manager } = createManager();

    await manager.load();

    expect(warnSpy).toHaveBeenCalled();
    expect(manager.customizations.value).toEqual([]);
  });

  it("load() accepts a record still carrying the old `active` field and simply ignores it", async () => {
    listAllDataByMarkerMock.mockResolvedValue({
      success: true,
      items: [
        {
          address: "customization_pre-active-removal",
          data: {
            id: "customization_pre-active-removal",
            name: "Pre-active-removal",
            variants: [
              {
                id: "variant_a",
                name: "Default",
                themes: { primaryColor: "#111111" },
                createdAt: 1,
                updatedAt: 1,
              },
            ],
            defaultVariantId: "variant_a",
            logoUrl: null,
            active: true,
            createdAt: 1,
            updatedAt: 1,
          },
        },
      ],
    });
    const { manager } = createManager();

    await manager.load();

    expect(warnSpy).not.toHaveBeenCalled();
    expect(manager.customizations.value).toHaveLength(1);
    expect(manager.customizations.value[0]).not.toHaveProperty("active");
  });

  it("load() defaults extensionSettings to {} for a record persisted before the field existed", async () => {
    listAllDataByMarkerMock.mockResolvedValue({
      success: true,
      items: [
        {
          address: "customization_pre-extensions",
          data: {
            id: "customization_pre-extensions",
            name: "Pre-extensions",
            variants: [
              {
                id: "variant_a",
                name: "Default",
                themes: { primaryColor: "#111111" },
                createdAt: 1,
                updatedAt: 1,
              },
            ],
            defaultVariantId: "variant_a",
            logoUrl: null,
            createdAt: 1,
            updatedAt: 1,
            // No extensionSettings field at all.
          },
        },
      ],
    });
    const { manager } = createManager();

    await manager.load();

    expect(manager.customizations.value).toHaveLength(1);
    expect(manager.customizations.value[0]?.extensionSettings).toEqual({});
  });

  it("load() defaults a variant's highlightColors to {} for a record persisted before the field existed", async () => {
    listAllDataByMarkerMock.mockResolvedValue({
      success: true,
      items: [
        {
          address: "customization_pre-highlights",
          data: {
            id: "customization_pre-highlights",
            name: "Pre-highlights",
            variants: [
              {
                id: "variant_a",
                name: "Default",
                themes: { primaryColor: "#111111" },
                createdAt: 1,
                updatedAt: 1,
                // No highlightColors field at all.
              },
            ],
            defaultVariantId: "variant_a",
            logoUrl: null,
            createdAt: 1,
            updatedAt: 1,
          },
        },
      ],
    });
    const { manager } = createManager();

    await manager.load();

    expect(manager.customizations.value).toHaveLength(1);
    expect(
      manager.customizations.value[0]?.variants[0]?.highlightColors
    ).toEqual({});
  });

  it("load() narrows a variant's persisted themes to known color and font-family keys, dropping anything else", async () => {
    listAllDataByMarkerMock.mockResolvedValue({
      success: true,
      items: [
        {
          address: "customization_fonts",
          data: {
            id: "customization_fonts",
            name: "Has fonts",
            variants: [
              {
                id: "variant_a",
                name: "Default",
                themes: {
                  primaryColor: "#111111",
                  dividerColor: "rgba(0, 0, 0, 0.2)",
                  verseFontFamily: "Playfair Display, serif",
                  hebrewSubtitleFontFamily: "Newsreader, serif",
                  someUnknownKey: "should be dropped",
                },
                createdAt: 1,
                updatedAt: 1,
              },
            ],
            defaultVariantId: "variant_a",
            logoUrl: null,
            createdAt: 1,
            updatedAt: 1,
          },
        },
      ],
    });
    const { manager } = createManager();

    await manager.load();

    expect(manager.customizations.value[0]?.variants[0]?.themes).toEqual({
      primaryColor: "#111111",
      dividerColor: "rgba(0, 0, 0, 0.2)",
      verseFontFamily: "Playfair Display, serif",
      hebrewSubtitleFontFamily: "Newsreader, serif",
    });
  });

  it("create() persists a new record with one variant pre-filled from the current theme, secondary/tertiary lightened from primary", async () => {
    const { manager, theme } = createManager();
    const lightThemeVariables = theme.currentTheme.value.variables;

    const created = await manager.create();

    expect(created.variants).toHaveLength(1);
    expect(created.defaultVariantId).toBe(created.variants[0]?.id);
    expect(created.variants[0]?.name).toBe(theme.basePresetTheme.value.name);
    expect(created.variants[0]?.themes.primaryColor).toBe(
      lightThemeVariables.primaryColor
    );
    expect(created.variants[0]?.themes.secondaryColor).toBe(
      lightenColor(lightThemeVariables.primaryColor, SECONDARY_LIGHTEN_AMOUNT)
    );
    expect(created.variants[0]?.themes.tertiaryColor).toBe(
      lightenColor(lightThemeVariables.primaryColor, TERTIARY_LIGHTEN_AMOUNT)
    );
    expect(created.variants[0]?.themes.fontColor).toBe(
      lightThemeVariables.fontColor
    );
    // Every customizable field is seeded from the current theme, not just
    // the original 4 — spot-check a few of the newer ones.
    expect(created.variants[0]?.themes.readerBackground).toBe(
      lightThemeVariables.readerBackground
    );
    expect(created.variants[0]?.themes.sidebarFontColor).toBe(
      lightThemeVariables.sidebarFontColor
    );
    expect(created.variants[0]?.themes.linkColor).toBe(
      lightThemeVariables.linkColor
    );
    expect(created.variants[0]?.themes.verseFontColor).toBe(
      lightThemeVariables.verseFontColor
    );
    expect(created.variants[0]?.themes.readerToolbarFontColor).toBe(
      lightThemeVariables.readerToolbarFontColor
    );
    expect(created.variants[0]?.themes.selectedVerseTextDecorationColor).toBe(
      lightThemeVariables.selectedVerseTextDecorationColor
    );
    expect(created.variants[0]?.themes.primaryFontColor).toBe(
      lightThemeVariables.primaryFontColor
    );
    expect(created.variants[0]?.themes.secondaryFontColor).toBe(
      lightThemeVariables.secondaryFontColor
    );
    expect(created.variants[0]?.themes.hebrewSubtitleFontColor).toBe(
      lightThemeVariables.hebrewSubtitleFontColor
    );
    expect(created.variants[0]?.themes.dividerColor).toBe(
      lightThemeVariables.dividerColor
    );
    // Font-family fields are seeded from the current theme the same way
    // color fields are.
    expect(created.variants[0]?.themes.fontFamily).toBe(
      lightThemeVariables.fontFamily
    );
    expect(created.variants[0]?.themes.bookTitleFontFamily).toBe(
      lightThemeVariables.bookTitleFontFamily
    );
    expect(created.variants[0]?.themes.chapterHeadingFontFamily).toBe(
      lightThemeVariables.chapterHeadingFontFamily
    );
    expect(created.variants[0]?.themes.verseFontFamily).toBe(
      lightThemeVariables.verseFontFamily
    );
    expect(created.variants[0]?.themes.hebrewSubtitleFontFamily).toBe(
      lightThemeVariables.hebrewSubtitleFontFamily
    );
    // Highlight colors are seeded from the current theme too, one full
    // {color, fontColor, wordsOfJesusFontColor} entry per highlight id.
    expect(created.variants[0]?.highlightColors).toEqual(
      theme.currentTheme.value.highlightColors
    );
    const seededKeys = Object.keys(created.variants[0]!.themes);
    for (const field of CUSTOMIZATION_COLOR_FIELDS) {
      expect(seededKeys).toContain(field.key);
    }
    for (const field of CUSTOMIZATION_FONT_FIELDS) {
      expect(seededKeys).toContain(field.key);
    }
    expect(created.extensionSettings).toEqual({});
    expect(recordDataMock).toHaveBeenCalledWith("user-1", created.id, created, {
      marker: CUSTOMIZATION_MARKER,
    });
    expect(manager.customizations.value).toEqual([created]);
    expect(manager.activeThemeOverrides.value).toEqual({});
    expect(theme.customOverrides.value).toEqual({});
  });

  it("lightenColor() moves a color's lightness toward white by the given amount", () => {
    const [r1, g1, b1] = hexToRgbTuple(lightenColor("#000000", 0.5));
    expect(r1).toBeGreaterThan(0);
    expect(r1).toBeLessThan(255);
    expect(r1).toBe(g1);
    expect(g1).toBe(b1);

    expect(lightenColor("#ffffff", 0.5)).toBe("#ffffff");

    const [r2, g2, b2] = hexToRgbTuple(lightenColor("#e07b4c", 0.35));
    // Lightening moves every channel toward 255, never past it.
    expect(r2).toBeGreaterThanOrEqual(0xe0);
    expect(g2).toBeGreaterThanOrEqual(0x7b);
    expect(b2).toBeGreaterThanOrEqual(0x4c);
    expect(r2).toBeLessThanOrEqual(255);
    expect(g2).toBeLessThanOrEqual(255);
    expect(b2).toBeLessThanOrEqual(255);
  });

  it("buildCustomFontValue() builds a font-family CSS value with a sans-serif fallback", () => {
    expect(buildCustomFontValue("Lora")).toBe("Lora, sans-serif");
    expect(buildCustomFontValue("IBM Plex Sans")).toBe(
      "IBM Plex Sans, sans-serif"
    );
  });

  it("buildCustomFontValue() strips disallowed characters and collapses whitespace", () => {
    expect(buildCustomFontValue("  Lora  ")).toBe("Lora, sans-serif");
    expect(buildCustomFontValue("Lora<script>")).toBe("Lorascript, sans-serif");
    expect(buildCustomFontValue("Font;   Name")).toBe("Font Name, sans-serif");
  });

  it("buildCustomFontValue() returns an empty string for a blank or all-invalid name", () => {
    expect(buildCustomFontValue("")).toBe("");
    expect(buildCustomFontValue("   ")).toBe("");
    expect(buildCustomFontValue(";;;")).toBe("");
  });

  it('getFontPresetsForField() prepends a field-specific "Default" entry using the Light theme\'s own value, ahead of the 6 named presets', () => {
    const chapterHeadingPresets = getFontPresetsForField(
      "chapterHeadingFontFamily"
    );
    expect(chapterHeadingPresets[0]).toEqual({
      name: "Default",
      value: "Plus Jakarta Sans, sans-serif",
    });
    expect(chapterHeadingPresets.slice(1)).toEqual([
      { name: "Newsreader", value: "Newsreader, serif" },
      { name: "System UI", value: "system-ui, sans-serif" },
      { name: "Roboto", value: "Roboto, sans-serif" },
      { name: "Open Sans", value: "Open Sans, sans-serif" },
      { name: "Playfair Display", value: "Playfair Display, serif" },
      { name: "Cormorant Garamond", value: "Cormorant Garamond, serif" },
    ]);

    // Different fields have different Light-theme defaults.
    expect(getFontPresetsForField("fontFamily")[0]).toEqual({
      name: "Default",
      value: "system-ui, sans-serif",
    });
    expect(getFontPresetsForField("bookTitleFontFamily")[0]).toEqual({
      name: "Default",
      value: "Newsreader, serif",
    });
  });

  it("startEditing() seeds editingCustomization from the persisted record, and no-ops for an unknown id", async () => {
    const { manager } = createManager();
    const created = await manager.create();

    manager.startEditing(created.id);
    expect(manager.editingCustomization.value).toEqual(created);

    manager.startEditing("customization_does_not_exist");
    // Still the previously-seeded draft — no-op leaves it untouched.
    expect(manager.editingCustomization.value).toEqual(created);
  });

  it("stopEditing() clears editingCustomization and editingVariantId", async () => {
    const { manager } = createManager();
    const created = await manager.create();
    manager.startEditing(created.id);
    manager.editingVariantId.value = created.variants[0]!.id;

    manager.stopEditing();

    expect(manager.editingCustomization.value).toBeNull();
    expect(manager.editingVariantId.value).toBeNull();
  });

  it("draft mutators never call os.recordData — only saveEditingCustomization() persists the accumulated edits", async () => {
    const { manager } = createManager();
    const created = await manager.create();
    expect(recordDataMock).toHaveBeenCalledTimes(1);

    manager.startEditing(created.id);
    manager.updateEditingName("Renamed");
    manager.setEditingVariantColor(
      created.variants[0]!.id,
      "primaryColor",
      "#123456"
    );
    manager.addEditingVariant();
    manager.setEditingExtensionAvailability("ext.example", "auto-installed");

    // None of the draft edits above triggered a network write.
    expect(recordDataMock).toHaveBeenCalledTimes(1);
    expect(manager.customizations.value[0]?.name).toBe(created.name);

    await manager.saveEditingCustomization();

    expect(recordDataMock).toHaveBeenCalledTimes(2);
    const savedRecord = recordDataMock.mock.calls[1]?.[2];
    expect(savedRecord.name).toBe("Renamed");
    expect(savedRecord.variants[0].themes.primaryColor).toBe("#123456");
    expect(savedRecord.variants).toHaveLength(2);
    expect(savedRecord.extensionSettings).toEqual({
      "ext.example": "auto-installed",
    });
    expect(manager.customizations.value[0]?.name).toBe("Renamed");
  });

  it("saveEditingCustomization() no-ops when there is no open draft", async () => {
    const { manager } = createManager();
    await manager.create();
    recordDataMock.mockClear();

    await manager.saveEditingCustomization();

    expect(recordDataMock).not.toHaveBeenCalled();
  });

  it("saveEditingCustomization() no-ops when signed out", async () => {
    const { manager } = createManager();
    const created = await manager.create();
    manager.startEditing(created.id);
    manager.updateEditingName("Renamed");
    recordDataMock.mockClear();
    login.userId.value = null;

    await manager.saveEditingCustomization();

    expect(recordDataMock).not.toHaveBeenCalled();
    expect(manager.customizations.value[0]?.name).toBe(created.name);
  });

  it("updateEditingName() updates the draft's name without persisting or touching the live theme", async () => {
    const { manager, theme } = createManager();
    const created = await manager.create();
    manager.startEditing(created.id);

    manager.updateEditingName("My colors");

    expect(manager.editingCustomization.value?.name).toBe("My colors");
    expect(manager.customizations.value[0]?.name).toBe(created.name);
    expect(theme.customOverrides.value).toEqual({});
  });

  it("setEditingExtensionAvailability() sets an id's availability on the draft without persisting", async () => {
    const { manager } = createManager();
    const created = await manager.create();
    manager.startEditing(created.id);
    recordDataMock.mockClear();

    manager.setEditingExtensionAvailability("ext.example", "auto-installed");

    expect(manager.editingCustomization.value?.extensionSettings).toEqual({
      "ext.example": "auto-installed",
    });
    expect(recordDataMock).not.toHaveBeenCalled();

    manager.setEditingExtensionAvailability("ext.example", "hidden");

    expect(manager.editingCustomization.value?.extensionSettings).toEqual({
      "ext.example": "hidden",
    });
    expect(recordDataMock).not.toHaveBeenCalled();
  });

  it('setEditingExtensionAvailability() removes the entry when set back to "available" (the default)', async () => {
    const { manager } = createManager();
    const created = await manager.create();
    manager.startEditing(created.id);
    manager.setEditingExtensionAvailability("ext.example", "hidden");

    manager.setEditingExtensionAvailability("ext.example", "available");

    expect(manager.editingCustomization.value?.extensionSettings).toEqual({});
  });

  it("setEditingExtensionAvailability() no-ops when there is no open draft", async () => {
    const { manager } = createManager();

    manager.setEditingExtensionAvailability("ext.example", "hidden");

    expect(manager.editingCustomization.value).toBeNull();
  });

  it("setEditingVariantColor() re-derives secondary and tertiary from a new primary color while they're still following it", async () => {
    const { manager } = createManager();
    const created = await manager.create();
    const variantId = created.variants[0]!.id;
    manager.startEditing(created.id);

    manager.setEditingVariantColor(variantId, "primaryColor", "#123456");

    const updated = manager.editingCustomization.value?.variants[0];
    expect(updated?.themes.secondaryColor).toBe(
      lightenColor("#123456", SECONDARY_LIGHTEN_AMOUNT)
    );
    expect(updated?.themes.tertiaryColor).toBe(
      lightenColor("#123456", TERTIARY_LIGHTEN_AMOUNT)
    );
  });

  it("setEditingVariantColor() leaves a manually-picked secondary/tertiary alone when the primary changes", async () => {
    const { manager } = createManager();
    const created = await manager.create();
    const variantId = created.variants[0]!.id;
    manager.startEditing(created.id);

    manager.setEditingVariantColor(variantId, "secondaryColor", "#abcdef");
    manager.setEditingVariantColor(variantId, "primaryColor", "#123456");

    const updated = manager.editingCustomization.value?.variants[0];
    expect(updated?.themes.secondaryColor).toBe("#abcdef");
    expect(updated?.themes.tertiaryColor).toBe(
      lightenColor("#123456", TERTIARY_LIGHTEN_AMOUNT)
    );
  });

  it("setEditingVariantColor() on one variant never touches a sibling variant's colors", async () => {
    const { manager } = createManager();
    const created = await manager.create();
    manager.startEditing(created.id);
    const variantA = manager.editingCustomization.value!.variants[0]!;
    const variantB = manager.addEditingVariant();
    expect(variantB).not.toBeNull();

    manager.setEditingVariantColor(variantA.id, "primaryColor", "#123456");

    const record = manager.editingCustomization.value!;
    const untouchedB = record.variants.find((v) => v.id === variantB!.id);
    expect(untouchedB?.themes).toEqual(variantB!.themes);
  });

  it("setEditingVariantColor() works generically for a newly-added color field (e.g. readerBackground), and persists it through save", async () => {
    const { manager } = createManager();
    const created = await manager.create();
    const variantId = created.variants[0]!.id;
    manager.startEditing(created.id);

    manager.setEditingVariantColor(variantId, "readerBackground", "#f0f0f0");
    expect(
      manager.editingCustomization.value?.variants[0]?.themes.readerBackground
    ).toBe("#f0f0f0");
    // Not persisted yet.
    expect(
      manager.customizations.value[0]?.variants[0]?.themes.readerBackground
    ).not.toBe("#f0f0f0");

    await manager.saveEditingCustomization();

    expect(
      manager.customizations.value[0]?.variants[0]?.themes.readerBackground
    ).toBe("#f0f0f0");
  });

  it("setEditingVariantFont() sets a font-family value on the draft without persisting, then persists it on save", async () => {
    const { manager } = createManager();
    const created = await manager.create();
    const variantId = created.variants[0]!.id;
    manager.startEditing(created.id);

    manager.setEditingVariantFont(
      variantId,
      "verseFontFamily",
      "Playfair Display, serif"
    );

    expect(
      manager.editingCustomization.value?.variants[0]?.themes.verseFontFamily
    ).toBe("Playfair Display, serif");
    expect(
      manager.customizations.value[0]?.variants[0]?.themes.verseFontFamily
    ).not.toBe("Playfair Display, serif");

    await manager.saveEditingCustomization();

    expect(
      manager.customizations.value[0]?.variants[0]?.themes.verseFontFamily
    ).toBe("Playfair Display, serif");
  });

  it("setEditingVariantFont() on one variant never touches a sibling variant's fonts", async () => {
    const { manager } = createManager();
    const created = await manager.create();
    manager.startEditing(created.id);
    const variantA = manager.editingCustomization.value!.variants[0]!;
    const variantB = manager.addEditingVariant();
    expect(variantB).not.toBeNull();

    manager.setEditingVariantFont(
      variantA.id,
      "fontFamily",
      "Roboto, sans-serif"
    );

    const record = manager.editingCustomization.value!;
    const untouchedB = record.variants.find((v) => v.id === variantB!.id);
    expect(untouchedB?.themes).toEqual(variantB!.themes);
  });

  it("setEditingVariantHighlightColor() patches one highlight id's colors on the draft without persisting, then persists it on save", async () => {
    const { manager } = createManager();
    const created = await manager.create();
    const variantId = created.variants[0]!.id;
    manager.startEditing(created.id);

    manager.setEditingVariantHighlightColor(variantId, "yellow", {
      color: "#123456",
    });

    expect(
      manager.editingCustomization.value?.variants[0]?.highlightColors.yellow
        ?.color
    ).toBe("#123456");
    expect(
      manager.customizations.value[0]?.variants[0]?.highlightColors.yellow
        ?.color
    ).not.toBe("#123456");

    await manager.saveEditingCustomization();

    expect(
      manager.customizations.value[0]?.variants[0]?.highlightColors.yellow
        ?.color
    ).toBe("#123456");
  });

  it("setEditingVariantHighlightColor() merges a patch onto the existing entry, leaving other fields for that same id alone", async () => {
    const { manager } = createManager();
    const created = await manager.create();
    const variantId = created.variants[0]!.id;
    const originalFontColor =
      created.variants[0]!.highlightColors.yellow!.fontColor;
    manager.startEditing(created.id);

    manager.setEditingVariantHighlightColor(variantId, "yellow", {
      color: "#123456",
    });

    expect(
      manager.editingCustomization.value?.variants[0]?.highlightColors.yellow
    ).toEqual({
      color: "#123456",
      fontColor: originalFontColor,
      wordsOfJesusFontColor:
        created.variants[0]!.highlightColors.yellow!.wordsOfJesusFontColor,
    });
  });

  it("setEditingVariantHighlightColor() on one variant never touches a sibling variant's highlight colors", async () => {
    const { manager } = createManager();
    const created = await manager.create();
    manager.startEditing(created.id);
    const variantA = manager.editingCustomization.value!.variants[0]!;
    const variantB = manager.addEditingVariant();
    expect(variantB).not.toBeNull();

    manager.setEditingVariantHighlightColor(variantA.id, "yellow", {
      color: "#123456",
    });

    const record = manager.editingCustomization.value!;
    const untouchedB = record.variants.find((v) => v.id === variantB!.id);
    expect(untouchedB?.highlightColors).toEqual(variantB!.highlightColors);
  });

  it("setEditingVariantHighlightColor() no-ops when there is no open draft", async () => {
    const { manager } = createManager();
    const created = await manager.create();

    manager.setEditingVariantHighlightColor(created.variants[0]!.id, "yellow", {
      color: "#123456",
    });

    expect(manager.editingCustomization.value).toBeNull();
  });

  it("setEditingVariantFont() no-ops when there is no open draft", async () => {
    const { manager } = createManager();
    const created = await manager.create();

    manager.setEditingVariantFont(
      created.variants[0]!.id,
      "fontFamily",
      "Roboto, sans-serif"
    );

    expect(manager.editingCustomization.value).toBeNull();
  });

  it("merely creating a customization doesn't make it active — activeThemeOverrides stays empty until it's edited or linked", async () => {
    const { manager } = createManager();
    await manager.create();
    await manager.create();

    expect(manager.activeCustomization.value).toBeNull();
    expect(manager.activeThemeOverrides.value).toEqual({});
  });

  it("startEditing() immediately previews the draft's unsaved colors on the live theme without persisting them to the user's theme settings", async () => {
    const { manager, theme } = createManager();
    const created = await manager.create();
    const variantId = created.variants[0]!.id;
    manager.startEditing(created.id);
    manager.setEditingVariantColor(variantId, "primaryColor", "#111111");
    manager.setEditingVariantColor(variantId, "fontColor", "#222222");

    // Opening the editor is itself enough to become the active
    // customization — there's no separate "make it active" step.
    expect(manager.activeCustomization.value?.id).toBe(created.id);
    expect(manager.activeThemeOverrides.value.primaryColor).toBe("#111111");
    expect(manager.activeThemeOverrides.value.fontColor).toBe("#222222");
    expect(manager.activeThemeOverrides.value.secondaryColor).toBe(
      lightenColor("#111111", SECONDARY_LIGHTEN_AMOUNT)
    );
    // Regression check: none of this may ever write into the user's
    // persisted, settings-backed theme overrides — only this in-memory
    // signal.
    expect(theme.customOverrides.value).toEqual({});
  });

  it("activeHighlightOverrides reflects the active variant's highlight colors, and resets to {} once editing stops", async () => {
    const { manager, theme } = createManager();
    const created = await manager.create();
    const variantId = created.variants[0]!.id;
    manager.startEditing(created.id);

    // Newly created variants seed a full highlight-color set from the live
    // theme, so the active overrides already match it before any edit.
    expect(manager.activeHighlightOverrides.value).toEqual(
      theme.currentTheme.value.highlightColors
    );

    manager.setEditingVariantHighlightColor(variantId, "yellow", {
      color: "#123456",
    });

    expect(manager.activeHighlightOverrides.value.yellow?.color).toBe(
      "#123456"
    );
    // Regression check: same as activeThemeOverrides, this must never write
    // into the user's persisted, settings-backed highlight overrides.
    expect(theme.customHighlightOverrides.value).toEqual({});

    manager.stopEditing();

    expect(manager.activeHighlightOverrides.value).toEqual({});
  });

  it("activeCustomization switches to whichever customization is currently being edited", async () => {
    const { manager } = createManager();
    const first = await manager.create();
    const second = await manager.create();

    manager.startEditing(first.id);
    expect(manager.activeCustomization.value?.id).toBe(first.id);

    manager.startEditing(second.id);
    expect(manager.activeCustomization.value?.id).toBe(second.id);
  });

  it("stopEditing() resets the live theme's overrides", async () => {
    const { manager, theme } = createManager();
    const created = await manager.create();
    manager.startEditing(created.id);
    manager.setEditingVariantColor(
      created.variants[0]!.id,
      "secondaryColor",
      "#abcdef"
    );
    expect(manager.activeThemeOverrides.value.secondaryColor).toBe("#abcdef");

    manager.stopEditing();

    expect(manager.activeCustomization.value).toBeNull();
    expect(manager.activeThemeOverrides.value).toEqual({});
    expect(theme.customOverrides.value).toEqual({});
  });

  it("remove() erases the record and resets the live theme if it was being edited", async () => {
    const { manager, theme } = createManager();
    const created = await manager.create();
    manager.startEditing(created.id);

    await manager.remove(created.id);

    expect(eraseDataMock).toHaveBeenCalledWith("user-1", created.id);
    expect(manager.customizations.value).toEqual([]);
    expect(manager.activeThemeOverrides.value).toEqual({});
    expect(theme.customOverrides.value).toEqual({});
  });

  it("remove() clears editingCustomization only when the removed id matches", async () => {
    const { manager } = createManager();
    const editing = await manager.create();
    const other = await manager.create();
    manager.startEditing(editing.id);

    await manager.remove(other.id);
    expect(manager.editingCustomization.value?.id).toBe(editing.id);

    await manager.remove(editing.id);
    expect(manager.editingCustomization.value).toBeNull();
  });

  it("create() defaults logoUrl to null", async () => {
    const { manager } = createManager();

    const created = await manager.create();

    expect(created.logoUrl).toBeNull();
  });

  it("uploadLogo() uploads the file, stages the URL on the draft, and immediately persists it", async () => {
    const { manager } = createManager();
    const created = await manager.create();
    manager.startEditing(created.id);
    recordDataMock.mockClear();
    const file = new File(["fake image bytes"], "logo.png", {
      type: "image/png",
    });

    await manager.uploadLogo(file);

    expect(recordFileMock).toHaveBeenCalledWith("user-1", file, {
      mimeType: "image/png",
      marker: CUSTOMIZATION_MARKER,
    });
    expect(manager.editingCustomization.value?.logoUrl).toBe(
      "https://files.example.com/logo.png"
    );
    expect(recordDataMock).toHaveBeenCalledTimes(1);
    expect(manager.customizations.value[0]?.logoUrl).toBe(
      "https://files.example.com/logo.png"
    );
  });

  it("removeEditingLogo() clears the draft's logo URL and immediately persists it", async () => {
    const { manager } = createManager();
    const created = await manager.create();
    manager.startEditing(created.id);
    const file = new File(["fake image bytes"], "logo.png", {
      type: "image/png",
    });
    await manager.uploadLogo(file);
    recordDataMock.mockClear();

    await manager.removeEditingLogo();

    expect(manager.editingCustomization.value?.logoUrl).toBeNull();
    expect(recordDataMock).toHaveBeenCalledTimes(1);
    expect(manager.customizations.value[0]?.logoUrl).toBeNull();
  });

  it("uploadLogo() persists the whole draft, including other unsaved edits, not just the logo", async () => {
    const { manager } = createManager();
    const created = await manager.create();
    manager.startEditing(created.id);
    manager.updateEditingName("Renamed before logo upload");
    const file = new File(["fake image bytes"], "logo.png", {
      type: "image/png",
    });

    await manager.uploadLogo(file);

    expect(manager.customizations.value[0]?.name).toBe(
      "Renamed before logo upload"
    );
    expect(manager.customizations.value[0]?.logoUrl).toBe(
      "https://files.example.com/logo.png"
    );
  });

  it("getShareLink() builds a link with the owner's recordName and the customization's id", async () => {
    const { manager } = createManager();
    const created = await manager.create();

    const link = manager.getShareLink(created);

    expect(link).toBe(`http://localhost/?customization=user-1.${created.id}`);
  });

  it("addEditingVariant() appends a new variant to the draft, seeded from the current theme", async () => {
    const { manager, theme } = createManager();
    const created = await manager.create();
    manager.startEditing(created.id);

    const added = manager.addEditingVariant();

    expect(added).not.toBeNull();
    const record = manager.editingCustomization.value!;
    expect(record.variants).toHaveLength(2);
    expect(record.variants[1]?.id).toBe(added!.id);
    expect(added!.themes.primaryColor).toBe(
      theme.currentTheme.value.variables.primaryColor
    );
    expect(added!.themes.readerBackground).toBe(
      theme.currentTheme.value.variables.readerBackground
    );
    expect(added!.highlightColors).toEqual(
      theme.currentTheme.value.highlightColors
    );
    const seededKeys = Object.keys(added!.themes);
    for (const field of CUSTOMIZATION_COLOR_FIELDS) {
      expect(seededKeys).toContain(field.key);
    }
    // The base preset name ("Light") is already taken by the first variant,
    // so the new one falls back to a generic name.
    expect(added!.name).toBe("Variant 2");
    // Not persisted yet.
    expect(manager.customizations.value[0]?.variants).toHaveLength(1);
  });

  it("addEditingVariant() no-ops when there is no open draft", async () => {
    const { manager } = createManager();

    const added = manager.addEditingVariant();

    expect(added).toBeNull();
  });

  it("applyPresetToEditingVariant() replaces the variant's colors/fonts/highlights with the given built-in preset's, leaving its id/name/createdAt untouched", async () => {
    const { manager, theme } = createManager();
    const darkPreset = theme.themes.value.find((t) => t.id === "dark")!;
    const created = await manager.create();
    manager.startEditing(created.id);
    const variant = created.variants[0]!;
    manager.renameEditingVariant(variant.id, "My Theme");
    manager.setEditingVariantColor(variant.id, "primaryColor", "#abcdef");

    manager.applyPresetToEditingVariant(variant.id, "dark");

    const updated = manager.editingCustomization.value!.variants.find(
      (v) => v.id === variant.id
    )!;
    expect(updated.id).toBe(variant.id);
    expect(updated.name).toBe("My Theme");
    expect(updated.createdAt).toBe(variant.createdAt);
    expect(updated.themes.primaryColor).toBe(darkPreset.variables.primaryColor);
    expect(updated.themes.readerBackground).toBe(
      darkPreset.variables.readerBackground
    );
    expect(updated.highlightColors).toEqual(darkPreset.highlightColors);
  });

  it("applyPresetToEditingVariant() leaves other variants and the current live theme untouched", async () => {
    const { manager, theme } = createManager();
    const darkPreset = theme.themes.value.find((t) => t.id === "dark")!;
    const created = await manager.create();
    manager.startEditing(created.id);
    const first = created.variants[0]!;
    const second = manager.addEditingVariant()!;

    manager.applyPresetToEditingVariant(second.id, "dark");

    const record = manager.editingCustomization.value!;
    expect(record.variants.find((v) => v.id === first.id)?.themes).toEqual(
      first.themes
    );
    // The viewer's own theme (light, by default in this fixture) is
    // untouched — this only mutates the draft's variant, not the live theme.
    expect(theme.currentTheme.value.variables.readerBackground).not.toBe(
      darkPreset.variables.readerBackground
    );
  });

  it("applyPresetToEditingVariant() no-ops with no open draft or an unrecognized preset id", async () => {
    const { manager } = createManager();
    const created = await manager.create();

    manager.applyPresetToEditingVariant(created.variants[0]!.id, "dark");
    expect(manager.editingCustomization.value).toBeNull();

    manager.startEditing(created.id);
    const before = manager.editingCustomization.value;
    manager.applyPresetToEditingVariant(
      created.variants[0]!.id,
      "not-a-real-preset-id"
    );
    expect(manager.editingCustomization.value).toEqual(before);
  });

  it("renameEditingVariant() updates only the targeted variant in the draft", async () => {
    const { manager } = createManager();
    const created = await manager.create();
    manager.startEditing(created.id);
    const second = manager.addEditingVariant();

    manager.renameEditingVariant(second!.id, "Festive");

    const record = manager.editingCustomization.value!;
    expect(record.variants.find((v) => v.id === second!.id)?.name).toBe(
      "Festive"
    );
    expect(record.variants[0]?.name).toBe(created.variants[0]!.name);
  });

  it("setEditingDefaultVariant() updates the draft's default variant id, and no-ops for an unknown id", async () => {
    const { manager } = createManager();
    const created = await manager.create();
    manager.startEditing(created.id);
    const second = manager.addEditingVariant();

    manager.setEditingDefaultVariant(second!.id);
    expect(manager.editingCustomization.value?.defaultVariantId).toBe(
      second!.id
    );

    manager.setEditingDefaultVariant("variant_does_not_exist");
    expect(manager.editingCustomization.value?.defaultVariantId).toBe(
      second!.id
    );
  });

  it("removeEditingVariant() removes a non-default variant and leaves defaultVariantId untouched", async () => {
    const { manager } = createManager();
    const created = await manager.create();
    manager.startEditing(created.id);
    const second = manager.addEditingVariant();

    manager.removeEditingVariant(second!.id);

    const record = manager.editingCustomization.value!;
    expect(record.variants).toHaveLength(1);
    expect(record.defaultVariantId).toBe(created.variants[0]!.id);
  });

  it("removeEditingVariant() reassigns defaultVariantId to the first remaining variant when the default is removed", async () => {
    const { manager } = createManager();
    const created = await manager.create();
    const originalDefaultId = created.variants[0]!.id;
    manager.startEditing(created.id);
    const second = manager.addEditingVariant();

    manager.removeEditingVariant(originalDefaultId);

    const record = manager.editingCustomization.value!;
    expect(record.variants).toHaveLength(1);
    expect(record.variants[0]?.id).toBe(second!.id);
    expect(record.defaultVariantId).toBe(second!.id);
  });

  it("removeEditingVariant() is a no-op when only one variant remains", async () => {
    const { manager } = createManager();
    const created = await manager.create();
    const onlyVariantId = created.variants[0]!.id;
    manager.startEditing(created.id);

    manager.removeEditingVariant(onlyVariantId);

    const record = manager.editingCustomization.value!;
    expect(record.variants).toHaveLength(1);
    expect(record.variants[0]?.id).toBe(onlyVariantId);
  });

  it("activeThemeOverrides falls back to the saved customization's default variant, not necessarily the first one, when the viewer hasn't picked one", async () => {
    const { manager } = createManager();
    const created = await manager.create();
    manager.startEditing(created.id);
    const second = manager.addEditingVariant();
    manager.setEditingDefaultVariant(second!.id);
    await manager.saveEditingCustomization();

    expect(manager.activeVariant.value?.id).toBe(second!.id);
    expect(manager.activeThemeOverrides.value).toEqual(second!.themes);
  });

  it("selectActiveVariant() persists the viewer's own choice, separate from the customization record and the user's default theme settings", async () => {
    const { manager, theme } = createManager();
    const created = await manager.create();
    manager.startEditing(created.id);
    const second = manager.addEditingVariant();
    await manager.saveEditingCustomization();
    recordDataMock.mockClear();

    await manager.selectActiveVariant(second!.id);

    expect(manager.activeVariant.value?.id).toBe(second!.id);
    expect(manager.activeThemeOverrides.value).toEqual(second!.themes);
    // Persisted only to the new, separate variant-selections record...
    expect(recordDataMock).toHaveBeenCalledWith(
      "user-1",
      VARIANT_SELECTIONS_ADDRESS,
      { selections: { [`user-1.${created.id}`]: second!.id } },
      { marker: "publicRead" }
    );
    // ...never to the customization's own record...
    expect(recordDataMock).not.toHaveBeenCalledWith(
      "user-1",
      created.id,
      expect.anything(),
      expect.anything()
    );
    // ...and never to the user's regular, persisted theme settings.
    expect(theme.customOverrides.value).toEqual({});
    expect(settings.setThemeId).not.toHaveBeenCalled();
    expect(settings.setCustomTheme).not.toHaveBeenCalled();
  });

  it("activeExtensionIds is empty when no customization is active", async () => {
    const { manager } = createManager();

    expect(manager.activeExtensionIds.value).toEqual([]);
  });

  it("activeExtensionIds reflects the active customization's auto-installed extensions, and the viewer can add available extras on top", async () => {
    const { manager } = createManager();
    const created = await manager.create();
    manager.startEditing(created.id);
    manager.setEditingExtensionAvailability("ext.base", "auto-installed");
    await manager.saveEditingCustomization();

    expect(manager.activeExtensionIds.value).toEqual(["ext.base"]);

    await manager.addExtensionToActiveCustomization("ext.extra");

    expect(manager.activeExtensionIds.value.sort()).toEqual(
      ["ext.base", "ext.extra"].sort()
    );

    await manager.removeExtensionFromActiveCustomization("ext.extra");

    expect(manager.activeExtensionIds.value).toEqual(["ext.base"]);
  });

  it("activeExtensionIds never includes a hidden extension, even one the viewer previously added as an extra", async () => {
    const { manager } = createManager();
    const created = await manager.create();
    manager.startEditing(created.id);
    await manager.saveEditingCustomization();
    await manager.addExtensionToActiveCustomization("ext.was-available");

    expect(manager.activeExtensionIds.value).toEqual(["ext.was-available"]);

    // The owner later marks it hidden — a stale extra pick from before that
    // change must not keep forcing it into the active set.
    manager.startEditing(created.id);
    manager.setEditingExtensionAvailability("ext.was-available", "hidden");
    await manager.saveEditingCustomization();

    expect(manager.activeExtensionIds.value).toEqual([]);
  });

  it("addExtensionToActiveCustomization() no-ops for an extension the active customization marks hidden", async () => {
    const { manager } = createManager();
    const created = await manager.create();
    manager.startEditing(created.id);
    manager.setEditingExtensionAvailability("ext.hidden", "hidden");
    await manager.saveEditingCustomization();
    recordDataMock.mockClear();

    await manager.addExtensionToActiveCustomization("ext.hidden");

    expect(manager.activeExtensionIds.value).toEqual([]);
    expect(recordDataMock).not.toHaveBeenCalledWith(
      "user-1",
      EXTENSION_PREFERENCES_ADDRESS,
      expect.anything(),
      expect.anything()
    );
  });

  it("addExtensionToActiveCustomization()/removeExtensionFromActiveCustomization() persist to the viewer's own extension-preferences record, not the customization's own record", async () => {
    const { manager } = createManager();
    const created = await manager.create();
    manager.startEditing(created.id);
    recordDataMock.mockClear();

    await manager.addExtensionToActiveCustomization("ext.extra");

    expect(recordDataMock).toHaveBeenCalledWith(
      "user-1",
      EXTENSION_PREFERENCES_ADDRESS,
      { extraExtensionIds: { [`user-1.${created.id}`]: ["ext.extra"] } },
      { marker: "publicRead" }
    );
    expect(recordDataMock).not.toHaveBeenCalledWith(
      "user-1",
      created.id,
      expect.anything(),
      expect.anything()
    );

    await manager.removeExtensionFromActiveCustomization("ext.extra");

    expect(recordDataMock).toHaveBeenCalledWith(
      "user-1",
      EXTENSION_PREFERENCES_ADDRESS,
      { extraExtensionIds: { [`user-1.${created.id}`]: [] } },
      { marker: "publicRead" }
    );
  });

  it("addExtensionToActiveCustomization()/removeExtensionFromActiveCustomization() no-op when no customization is active", async () => {
    const { manager } = createManager();
    recordDataMock.mockClear();

    await manager.addExtensionToActiveCustomization("ext.extra");
    await manager.removeExtensionFromActiveCustomization("ext.extra");

    expect(recordDataMock).not.toHaveBeenCalled();
  });

  it("auto-loads a customization from the ?customization= query param on construction", async () => {
    const sharedRecord = {
      id: "customization_shared",
      name: "Shared",
      variants: [
        {
          id: "variant_shared",
          name: "Shared variant",
          themes: { primaryColor: "#abc123" },
          createdAt: 1,
          updatedAt: 1,
        },
      ],
      defaultVariantId: "variant_shared",
      logoUrl: null,
      createdAt: 1,
      updatedAt: 1,
    };
    getDataMock.mockResolvedValue({ success: true, data: sharedRecord });
    const linkedNavigation = createNavigationManager({
      initialHref:
        "http://localhost/?customization=other-user.customization_shared",
    });

    const { manager } = createManager(linkedNavigation);
    await Promise.resolve();
    await Promise.resolve();

    expect(getDataMock).toHaveBeenCalledWith(
      "other-user",
      "customization_shared"
    );
    expect(manager.activeCustomization.value?.id).toBe("customization_shared");
    expect(manager.activeThemeOverrides.value).toEqual({
      primaryColor: "#abc123",
    });
    expect(manager.activeCustomization.value?.extensionSettings).toEqual({});
  });

  it("an in-progress edit draft takes priority over a URL-linked customization", async () => {
    const sharedRecord = {
      id: "customization_shared",
      name: "Shared",
      variants: [
        {
          id: "variant_shared",
          name: "Shared variant",
          themes: { primaryColor: "#abc123" },
          createdAt: 1,
          updatedAt: 1,
        },
      ],
      defaultVariantId: "variant_shared",
      logoUrl: null,
      createdAt: 1,
      updatedAt: 1,
    };
    getDataMock.mockResolvedValue({ success: true, data: sharedRecord });
    const linkedNavigation = createNavigationManager({
      initialHref:
        "http://localhost/?customization=other-user.customization_shared",
    });
    const { manager } = createManager(linkedNavigation);
    const ownCustomization = await manager.create();
    await Promise.resolve();
    await Promise.resolve();
    // Confirm the link actually resolved first, so the next assertion is
    // proving the draft overrides it, not just that the link never loaded.
    expect(manager.activeCustomization.value?.id).toBe("customization_shared");

    manager.startEditing(ownCustomization.id);

    expect(manager.activeCustomization.value?.id).toBe(ownCustomization.id);
  });

  it("loadByLocator() ignores a malformed locator", async () => {
    const { manager } = createManager();
    getDataMock.mockClear();

    await manager.loadByLocator("no-dot-here");

    expect(manager.linkedCustomization.value).toBeNull();
    expect(getDataMock).not.toHaveBeenCalled();
  });

  it("loadByLocator() ignores a locator for a record that doesn't exist", async () => {
    getDataMock.mockResolvedValue({
      success: false,
      errorCode: "data_not_found",
      errorMessage: "Data not found",
    });
    const { manager } = createManager();

    await manager.loadByLocator("owner.customization_missing");

    expect(manager.linkedCustomization.value).toBeNull();
  });
});
