import {
  createCustomizationsManager,
  CUSTOMIZATION_MARKER,
} from "@packages/seed-bible/seed-bible/managers/CustomizationsManager";
import type { LoginManager } from "@packages/seed-bible/seed-bible/managers/LoginManager";
import { CasualOSManager } from "@packages/seed-bible/seed-bible/managers/OsManager";
import { createTheme } from "@packages/seed-bible/seed-bible/managers/ThemeManager";
import type { SettingsManager } from "@packages/seed-bible/seed-bible/managers/SettingsManager";
import { signal } from "@preact/signals";
import type { Mock, Mocked } from "vitest";

describe("CustomizationsManager", () => {
  let recordDataMock: Mock;
  let eraseDataMock: Mock;
  let listAllDataByMarkerMock: Mock;
  let recordFileMock: Mock;
  let warnSpy: Mock;
  let login: Mocked<LoginManager>;
  let os: CasualOSManager;
  let settings: Mocked<SettingsManager>;

  beforeEach(() => {
    os = CasualOSManager();
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

  it("load() lists customizations under the seedBibleCustomization marker for the signed-in user", async () => {
    const theme = createTheme(settings);
    const manager = createCustomizationsManager(os, login, theme);

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
            themes: {},
            active: false,
            createdAt: 1,
            updatedAt: 1,
          },
        },
      ],
    });
    const theme = createTheme(settings);
    const manager = createCustomizationsManager(os, login, theme);

    await manager.load();

    expect(warnSpy).toHaveBeenCalled();
    expect(manager.customizations.value).toHaveLength(1);
    expect(manager.customizations.value[0]?.id).toBe("customization_good");
  });

  it("create() persists a new record pre-filled from the current theme and does not apply it live", async () => {
    const theme = createTheme(settings);
    const manager = createCustomizationsManager(os, login, theme);
    const lightThemeVariables = theme.currentTheme.value.variables;

    const created = await manager.create();

    expect(created.active).toBe(false);
    expect(created.themes).toEqual({
      primaryColor: lightThemeVariables.primaryColor,
      secondaryColor: lightThemeVariables.secondaryColor,
      tertiaryColor: lightThemeVariables.tertiaryColor,
      fontColor: lightThemeVariables.fontColor,
    });
    expect(recordDataMock).toHaveBeenCalledWith("user-1", created.id, created, {
      marker: CUSTOMIZATION_MARKER,
    });
    expect(manager.customizations.value).toEqual([created]);
    expect(manager.activeThemeOverrides.value).toEqual({});
    expect(theme.customOverrides.value).toEqual({});
  });

  it("setColor() on a non-active customization persists but does not touch the live theme", async () => {
    const theme = createTheme(settings);
    const manager = createCustomizationsManager(os, login, theme);
    const created = await manager.create();

    await manager.setColor(created.id, "primaryColor", "#123456");

    expect(manager.customizations.value[0]?.themes.primaryColor).toBe(
      "#123456"
    );
    expect(manager.activeThemeOverrides.value.primaryColor).toBeUndefined();
    expect(theme.customOverrides.value.primaryColor).toBeUndefined();
  });

  it("setActive() applies the customization's colors to the live theme without persisting them to the user's theme settings", async () => {
    const theme = createTheme(settings);
    const manager = createCustomizationsManager(os, login, theme);
    const originalSecondaryColor =
      theme.currentTheme.value.variables.secondaryColor;
    const created = await manager.create();
    await manager.setColor(created.id, "primaryColor", "#111111");
    await manager.setColor(created.id, "fontColor", "#222222");

    await manager.setActive(created.id);

    expect(manager.customizations.value[0]?.active).toBe(true);
    expect(manager.activeThemeOverrides.value.primaryColor).toBe("#111111");
    expect(manager.activeThemeOverrides.value.fontColor).toBe("#222222");
    expect(manager.activeThemeOverrides.value.secondaryColor).toBe(
      originalSecondaryColor
    );
    // Regression check: activating a customization must never write into the
    // user's persisted, settings-backed theme overrides — only refreshing
    // this in-memory signal. Fails on the pre-fix code, which called
    // `theme.setCustomColor(...)` here.
    expect(theme.customOverrides.value).toEqual({});
  });

  it("setActive() deactivates the previously active customization", async () => {
    const theme = createTheme(settings);
    const manager = createCustomizationsManager(os, login, theme);
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

  it("setColor() on the active customization also previews the change live, without persisting it", async () => {
    const theme = createTheme(settings);
    const manager = createCustomizationsManager(os, login, theme);
    const created = await manager.create();
    await manager.setActive(created.id);

    await manager.setColor(created.id, "secondaryColor", "#abcdef");

    expect(manager.activeThemeOverrides.value.secondaryColor).toBe("#abcdef");
    expect(theme.customOverrides.value.secondaryColor).toBeUndefined();
  });

  it("deactivate() resets the live theme's overrides", async () => {
    const theme = createTheme(settings);
    const manager = createCustomizationsManager(os, login, theme);
    const created = await manager.create();
    await manager.setActive(created.id);

    await manager.deactivate(created.id);

    expect(manager.customizations.value[0]?.active).toBe(false);
    expect(manager.activeThemeOverrides.value).toEqual({});
    expect(theme.customOverrides.value).toEqual({});
  });

  it("remove() erases the record and resets the live theme if it was active", async () => {
    const theme = createTheme(settings);
    const manager = createCustomizationsManager(os, login, theme);
    const created = await manager.create();
    await manager.setActive(created.id);

    await manager.remove(created.id);

    expect(eraseDataMock).toHaveBeenCalledWith("user-1", created.id);
    expect(manager.customizations.value).toEqual([]);
    expect(manager.activeThemeOverrides.value).toEqual({});
    expect(theme.customOverrides.value).toEqual({});
  });

  it("rename() updates the name without touching the live theme", async () => {
    const theme = createTheme(settings);
    const manager = createCustomizationsManager(os, login, theme);
    const created = await manager.create();

    await manager.rename(created.id, "My colors");

    expect(manager.customizations.value[0]?.name).toBe("My colors");
    expect(theme.customOverrides.value).toEqual({});
  });

  it("create() defaults logoUrl to null", async () => {
    const theme = createTheme(settings);
    const manager = createCustomizationsManager(os, login, theme);

    const created = await manager.create();

    expect(created.logoUrl).toBeNull();
  });

  it("uploadLogo() records the file under the customization marker and persists the returned URL", async () => {
    const theme = createTheme(settings);
    const manager = createCustomizationsManager(os, login, theme);
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
    const theme = createTheme(settings);
    const manager = createCustomizationsManager(os, login, theme);
    const created = await manager.create();
    const file = new File(["fake image bytes"], "logo.png", {
      type: "image/png",
    });
    await manager.uploadLogo(created.id, file);

    await manager.removeLogo(created.id);

    expect(manager.customizations.value[0]?.logoUrl).toBeNull();
  });
});
