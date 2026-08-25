import {
  createCustomizationsManager,
  CUSTOMIZATION_MARKER,
  lightenColor,
  SECONDARY_LIGHTEN_AMOUNT,
  TERTIARY_LIGHTEN_AMOUNT,
} from "@packages/seed-bible/seed-bible/managers/CustomizationsManager";
import {
  createCustomizationVariantSelectionsManager,
  VARIANT_SELECTIONS_ADDRESS,
} from "@packages/seed-bible/seed-bible/managers/CustomizationVariantSelectionsManager";
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
    const manager = createCustomizationsManager(
      os,
      login,
      theme,
      nav,
      variantSelections
    );
    return { theme, variantSelections, manager };
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
            active: false,
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
            active: false,
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

  it("create() persists a new record with one variant pre-filled from the current theme, secondary/tertiary lightened from primary", async () => {
    const { manager, theme } = createManager();
    const lightThemeVariables = theme.currentTheme.value.variables;

    const created = await manager.create();

    expect(created.active).toBe(false);
    expect(created.variants).toHaveLength(1);
    expect(created.defaultVariantId).toBe(created.variants[0]?.id);
    expect(created.variants[0]?.name).toBe(theme.basePresetTheme.value.name);
    expect(created.variants[0]?.themes).toEqual({
      primaryColor: lightThemeVariables.primaryColor,
      secondaryColor: lightenColor(
        lightThemeVariables.primaryColor,
        SECONDARY_LIGHTEN_AMOUNT
      ),
      tertiaryColor: lightenColor(
        lightThemeVariables.primaryColor,
        TERTIARY_LIGHTEN_AMOUNT
      ),
      fontColor: lightThemeVariables.fontColor,
    });
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

  it("setVariantColor() re-derives secondary and tertiary from a new primary color while they're still following it", async () => {
    const { manager } = createManager();
    const created = await manager.create();
    const variantId = created.variants[0]!.id;

    await manager.setVariantColor(
      created.id,
      variantId,
      "primaryColor",
      "#123456"
    );

    const updated = manager.customizations.value[0]?.variants[0];
    expect(updated?.themes.secondaryColor).toBe(
      lightenColor("#123456", SECONDARY_LIGHTEN_AMOUNT)
    );
    expect(updated?.themes.tertiaryColor).toBe(
      lightenColor("#123456", TERTIARY_LIGHTEN_AMOUNT)
    );
  });

  it("setVariantColor() leaves a manually-picked secondary/tertiary alone when the primary changes", async () => {
    const { manager } = createManager();
    const created = await manager.create();
    const variantId = created.variants[0]!.id;

    await manager.setVariantColor(
      created.id,
      variantId,
      "secondaryColor",
      "#abcdef"
    );
    await manager.setVariantColor(
      created.id,
      variantId,
      "primaryColor",
      "#123456"
    );

    const updated = manager.customizations.value[0]?.variants[0];
    expect(updated?.themes.secondaryColor).toBe("#abcdef");
    expect(updated?.themes.tertiaryColor).toBe(
      lightenColor("#123456", TERTIARY_LIGHTEN_AMOUNT)
    );
  });

  it("setVariantColor() on one variant never touches a sibling variant's colors", async () => {
    const { manager } = createManager();
    const created = await manager.create();
    const variantA = created.variants[0]!;
    const variantB = await manager.addVariant(created.id);
    expect(variantB).not.toBeNull();

    await manager.setVariantColor(
      created.id,
      variantA.id,
      "primaryColor",
      "#123456"
    );

    const record = manager.customizations.value[0]!;
    const untouchedB = record.variants.find((v) => v.id === variantB!.id);
    expect(untouchedB?.themes).toEqual(variantB!.themes);
  });

  it("setVariantColor() on a non-active customization persists but does not touch the live theme", async () => {
    const { manager, theme } = createManager();
    const created = await manager.create();
    const variantId = created.variants[0]!.id;

    await manager.setVariantColor(
      created.id,
      variantId,
      "primaryColor",
      "#123456"
    );

    expect(
      manager.customizations.value[0]?.variants[0]?.themes.primaryColor
    ).toBe("#123456");
    expect(manager.activeThemeOverrides.value.primaryColor).toBeUndefined();
    expect(theme.customOverrides.value.primaryColor).toBeUndefined();
  });

  it("setActive() applies the customization's colors to the live theme without persisting them to the user's theme settings", async () => {
    const { manager, theme } = createManager();
    const created = await manager.create();
    const variantId = created.variants[0]!.id;
    await manager.setVariantColor(
      created.id,
      variantId,
      "primaryColor",
      "#111111"
    );
    await manager.setVariantColor(
      created.id,
      variantId,
      "fontColor",
      "#222222"
    );

    await manager.setActive(created.id);

    expect(manager.customizations.value[0]?.active).toBe(true);
    expect(manager.activeThemeOverrides.value.primaryColor).toBe("#111111");
    expect(manager.activeThemeOverrides.value.fontColor).toBe("#222222");
    // Secondary was still following the primary color (never manually set),
    // so it re-derived along with it.
    expect(manager.activeThemeOverrides.value.secondaryColor).toBe(
      lightenColor("#111111", SECONDARY_LIGHTEN_AMOUNT)
    );
    // Regression check: activating a customization must never write into the
    // user's persisted, settings-backed theme overrides — only refreshing
    // this in-memory signal.
    expect(theme.customOverrides.value).toEqual({});
  });

  it("setActive() deactivates the previously active customization", async () => {
    const { manager } = createManager();
    const first = await manager.create();
    const second = await manager.create();

    await manager.setActive(first.id);
    await manager.setActive(second.id);

    const firstNow = manager.customizations.value.find(
      (c) => c.id === first.id
    );
    const secondNow = manager.customizations.value.find(
      (c) => c.id === second.id
    );
    expect(firstNow?.active).toBe(false);
    expect(secondNow?.active).toBe(true);
  });

  it("setVariantColor() on the active customization's variant also previews the change live, without persisting it to the user's theme", async () => {
    const { manager, theme } = createManager();
    const created = await manager.create();
    const variantId = created.variants[0]!.id;
    await manager.setActive(created.id);

    await manager.setVariantColor(
      created.id,
      variantId,
      "secondaryColor",
      "#abcdef"
    );

    expect(manager.activeThemeOverrides.value.secondaryColor).toBe("#abcdef");
    expect(theme.customOverrides.value.secondaryColor).toBeUndefined();
  });

  it("deactivate() resets the live theme's overrides", async () => {
    const { manager, theme } = createManager();
    const created = await manager.create();
    await manager.setActive(created.id);

    await manager.deactivate(created.id);

    expect(manager.customizations.value[0]?.active).toBe(false);
    expect(manager.activeThemeOverrides.value).toEqual({});
    expect(theme.customOverrides.value).toEqual({});
  });

  it("remove() erases the record and resets the live theme if it was active", async () => {
    const { manager, theme } = createManager();
    const created = await manager.create();
    await manager.setActive(created.id);

    await manager.remove(created.id);

    expect(eraseDataMock).toHaveBeenCalledWith("user-1", created.id);
    expect(manager.customizations.value).toEqual([]);
    expect(manager.activeThemeOverrides.value).toEqual({});
    expect(theme.customOverrides.value).toEqual({});
  });

  it("rename() updates the name without touching the live theme", async () => {
    const { manager, theme } = createManager();
    const created = await manager.create();

    await manager.rename(created.id, "My colors");

    expect(manager.customizations.value[0]?.name).toBe("My colors");
    expect(theme.customOverrides.value).toEqual({});
  });

  it("create() defaults logoUrl to null", async () => {
    const { manager } = createManager();

    const created = await manager.create();

    expect(created.logoUrl).toBeNull();
  });

  it("uploadLogo() records the file under the customization marker and persists the returned URL", async () => {
    const { manager } = createManager();
    const created = await manager.create();
    const file = new File(["fake image bytes"], "logo.png", {
      type: "image/png",
    });

    await manager.uploadLogo(created.id, file);

    expect(recordFileMock).toHaveBeenCalledWith("user-1", file, {
      mimeType: "image/png",
      marker: CUSTOMIZATION_MARKER,
    });
    expect(manager.customizations.value[0]?.logoUrl).toBe(
      "https://files.example.com/logo.png"
    );
  });

  it("removeLogo() clears the logo URL and persists the change", async () => {
    const { manager } = createManager();
    const created = await manager.create();
    const file = new File(["fake image bytes"], "logo.png", {
      type: "image/png",
    });
    await manager.uploadLogo(created.id, file);

    await manager.removeLogo(created.id);

    expect(manager.customizations.value[0]?.logoUrl).toBeNull();
  });

  it("getShareLink() builds a link with the owner's recordName and the customization's id", async () => {
    const { manager } = createManager();
    const created = await manager.create();

    const link = manager.getShareLink(created);

    expect(link).toBe(`http://localhost/?customization=user-1.${created.id}`);
  });

  it("addVariant() appends a new variant seeded from the current theme", async () => {
    const { manager, theme } = createManager();
    const created = await manager.create();

    const added = await manager.addVariant(created.id);

    expect(added).not.toBeNull();
    const record = manager.customizations.value[0]!;
    expect(record.variants).toHaveLength(2);
    expect(record.variants[1]?.id).toBe(added!.id);
    expect(added!.themes.primaryColor).toBe(
      theme.currentTheme.value.variables.primaryColor
    );
    // The base preset name ("Light") is already taken by the first variant,
    // so the new one falls back to a generic name.
    expect(added!.name).toBe("Variant 2");
  });

  it("renameVariant() updates only the targeted variant", async () => {
    const { manager } = createManager();
    const created = await manager.create();
    const second = await manager.addVariant(created.id);

    await manager.renameVariant(created.id, second!.id, "Festive");

    const record = manager.customizations.value[0]!;
    expect(record.variants.find((v) => v.id === second!.id)?.name).toBe(
      "Festive"
    );
    expect(record.variants[0]?.name).toBe(created.variants[0]!.name);
  });

  it("setDefaultVariant() updates the default variant id, and no-ops for an unknown id", async () => {
    const { manager } = createManager();
    const created = await manager.create();
    const second = await manager.addVariant(created.id);

    await manager.setDefaultVariant(created.id, second!.id);
    expect(manager.customizations.value[0]?.defaultVariantId).toBe(second!.id);

    await manager.setDefaultVariant(created.id, "variant_does_not_exist");
    expect(manager.customizations.value[0]?.defaultVariantId).toBe(second!.id);
  });

  it("removeVariant() removes a non-default variant and leaves defaultVariantId untouched", async () => {
    const { manager } = createManager();
    const created = await manager.create();
    const second = await manager.addVariant(created.id);

    await manager.removeVariant(created.id, second!.id);

    const record = manager.customizations.value[0]!;
    expect(record.variants).toHaveLength(1);
    expect(record.defaultVariantId).toBe(created.variants[0]!.id);
  });

  it("removeVariant() reassigns defaultVariantId to the first remaining variant when the default is removed", async () => {
    const { manager } = createManager();
    const created = await manager.create();
    const originalDefaultId = created.variants[0]!.id;
    const second = await manager.addVariant(created.id);

    await manager.removeVariant(created.id, originalDefaultId);

    const record = manager.customizations.value[0]!;
    expect(record.variants).toHaveLength(1);
    expect(record.variants[0]?.id).toBe(second!.id);
    expect(record.defaultVariantId).toBe(second!.id);
  });

  it("removeVariant() is a no-op when only one variant remains", async () => {
    const { manager } = createManager();
    const created = await manager.create();
    const onlyVariantId = created.variants[0]!.id;

    await manager.removeVariant(created.id, onlyVariantId);

    const record = manager.customizations.value[0]!;
    expect(record.variants).toHaveLength(1);
    expect(record.variants[0]?.id).toBe(onlyVariantId);
  });

  it("activeThemeOverrides falls back to the customization's default variant, not necessarily the first one, when the viewer hasn't picked one", async () => {
    const { manager } = createManager();
    const created = await manager.create();
    const second = await manager.addVariant(created.id);
    await manager.setDefaultVariant(created.id, second!.id);

    await manager.setActive(created.id);

    expect(manager.activeVariant.value?.id).toBe(second!.id);
    expect(manager.activeThemeOverrides.value).toEqual(second!.themes);
  });

  it("selectActiveVariant() persists the viewer's own choice, separate from the customization record and the user's default theme settings", async () => {
    const { manager, theme } = createManager();
    const created = await manager.create();
    const second = await manager.addVariant(created.id);
    await manager.setActive(created.id);
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
      active: false,
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
  });

  it("a locator-loaded customization takes priority over the signed-in user's own active customization", async () => {
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
      active: false,
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
    await manager.setActive(ownCustomization.id);
    await Promise.resolve();
    await Promise.resolve();

    expect(manager.activeCustomization.value?.id).toBe("customization_shared");
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
