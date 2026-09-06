import {
  createExtensionSettingsManager,
  EXTENSION_SETTING_VALUES_ADDRESS,
} from "@packages/seed-bible/seed-bible/managers/ExtensionSettingsManager";
import type {
  ExtensionListEntry,
  ExtensionManager,
} from "@packages/seed-bible/seed-bible/managers/ExtensionManager";
import type { CustomizationsManager } from "@packages/seed-bible/seed-bible/managers/CustomizationsManager";
import type { LoginManager } from "@packages/seed-bible/seed-bible/managers/LoginManager";
import { CasualOSManager } from "@packages/seed-bible/seed-bible/managers/OsManager";
import { signal, type Signal } from "@preact/signals";
import type { Mock, Mocked } from "vitest";

describe("ExtensionSettingsManager", () => {
  let getDataMock: Mock;
  let recordDataMock: Mock;
  let warnSpy: Mock;
  let login: Mocked<LoginManager>;
  let os: CasualOSManager;
  let userIdSignal: Signal<string | null>;
  let extensionsListSignal: Signal<ExtensionListEntry[]>;
  let extensions: ExtensionManager;
  let activeCustomizationDefault: string | number | boolean | undefined;
  let customizations: CustomizationsManager;

  const flushPromises = async () => {
    await Promise.resolve();
    await Promise.resolve();
  };

  const extensionEntry = (
    settings: Record<
      string,
      {
        type: "string" | "boolean" | "number";
        default?: string | boolean | number;
      }
    >
  ): ExtensionListEntry => ({
    id: "ext-1",
    extension: {
      url: "https://example.com/ext-1.js",
      meta: {
        id: "ext-1",
        translations: { en: { title: "Ext 1", description: "" } },
        settings,
      },
    },
    extensionSet: null,
    registration: null,
    installed: true,
    pendingInstallation: false,
  });

  beforeEach(() => {
    os = CasualOSManager();
    getDataMock = vi.spyOn(os, "getData").mockResolvedValue({
      success: false,
      errorCode: "data_not_found",
      errorMessage: "Data not found",
    });
    recordDataMock = vi
      .spyOn(os, "recordData")
      .mockResolvedValue(undefined as never);
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    userIdSignal = signal<string | null>("user-1");
    login = {
      authBot: signal(null),
      sessionEnded: signal(null),
      userId: userIdSignal,
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

    extensionsListSignal = signal<ExtensionListEntry[]>([
      extensionEntry({
        greeting: { type: "string", default: "Hello" },
        count: { type: "number", default: 5 },
        enabled: { type: "boolean", default: false },
      }),
    ]);
    extensions = {
      extensions: extensionsListSignal,
    } as unknown as ExtensionManager;

    activeCustomizationDefault = undefined;
    customizations = {
      getActiveExtensionSettingDefault: () => activeCustomizationDefault,
    } as unknown as CustomizationsManager;
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  const create = () =>
    createExtensionSettingsManager(os, login, extensions, customizations);

  it("signed out: values are empty and setValue/clearValue are no-ops", async () => {
    userIdSignal.value = null;
    const manager = create();
    await flushPromises();

    expect(manager.valuesByExtensionId.value).toEqual({});
    expect(manager.getValue("ext-1", "greeting")).toBe("Hello"); // falls back to the extension's own default

    await manager.setValue("ext-1", "greeting", "Hi");

    expect(manager.valuesByExtensionId.value).toEqual({});
    expect(recordDataMock).not.toHaveBeenCalled();
  });

  it("getValue resolves: the viewer's own value beats the Customization default beats the extension default", async () => {
    const manager = create();
    await flushPromises();

    // Nothing set anywhere -> the extension's own default.
    expect(manager.getValue("ext-1", "greeting")).toBe("Hello");

    // A Customization default fills in over the extension default.
    activeCustomizationDefault = "Howdy";
    expect(manager.getValue("ext-1", "greeting")).toBe("Howdy");

    // The viewer's own value wins over both.
    await manager.setValue("ext-1", "greeting", "Hiya");
    expect(manager.getValue("ext-1", "greeting")).toBe("Hiya");
  });

  it("getValue returns undefined for an extension or setting key that isn't currently declared", async () => {
    const manager = create();
    await flushPromises();

    expect(manager.getValue("unknown-ext", "greeting")).toBeUndefined();
    expect(manager.getValue("ext-1", "unknown-key")).toBeUndefined();
  });

  it("setValue persists to its own record and is immediately readable without a reload", async () => {
    const manager = create();
    await flushPromises();
    recordDataMock.mockClear();

    await manager.setValue("ext-1", "count", 7);

    expect(manager.getValue("ext-1", "count")).toBe(7);
    expect(recordDataMock).toHaveBeenCalledWith(
      "user-1",
      EXTENSION_SETTING_VALUES_ADDRESS,
      { "ext-1": { count: 7 } },
      { marker: "publicRead" }
    );
  });

  it("setValue is a no-op for an unknown extension id or setting key", async () => {
    const manager = create();
    await flushPromises();
    recordDataMock.mockClear();

    await manager.setValue("unknown-ext", "greeting", "Hi");
    await manager.setValue("ext-1", "unknown-key", "Hi");

    expect(recordDataMock).not.toHaveBeenCalled();
  });

  it("clearValue removes a previously-set value and persists, falling back to the default", async () => {
    const manager = create();
    await flushPromises();
    await manager.setValue("ext-1", "greeting", "Hiya");
    recordDataMock.mockClear();

    await manager.clearValue("ext-1", "greeting");

    expect(manager.getValue("ext-1", "greeting")).toBe("Hello");
    expect(recordDataMock).toHaveBeenCalledWith(
      "user-1",
      EXTENSION_SETTING_VALUES_ADDRESS,
      { "ext-1": {} },
      { marker: "publicRead" }
    );
  });

  it("clearValue is a no-op when nothing was set", async () => {
    const manager = create();
    await flushPromises();
    recordDataMock.mockClear();

    await manager.clearValue("ext-1", "greeting");

    expect(recordDataMock).not.toHaveBeenCalled();
  });

  it("loads a previously-persisted payload on construction", async () => {
    getDataMock.mockResolvedValue({
      success: true,
      data: { "ext-1": { greeting: "Loaded" } },
    });

    const manager = create();
    await flushPromises();

    expect(getDataMock).toHaveBeenCalledWith(
      "user-1",
      EXTENSION_SETTING_VALUES_ADDRESS
    );
    expect(manager.getValue("ext-1", "greeting")).toBe("Loaded");
  });

  // Regression test: revert `extensionSettingValuesPayloadSchema` to `z.any()`
  // (or otherwise skip validation) and this fails, since the corrupt payload
  // would then be stored and surfaced as-is rather than discarded.
  it("skips a corrupt persisted payload rather than throwing", async () => {
    getDataMock.mockResolvedValue({
      success: true,
      data: { "ext-1": "not-an-object" },
    });

    const manager = create();
    await flushPromises();

    expect(warnSpy).toHaveBeenCalled();
    expect(manager.valuesByExtensionId.value).toEqual({});
  });

  it("clears the previous user's values and reloads when the signed-in user changes", async () => {
    getDataMock.mockResolvedValueOnce({
      success: true,
      data: { "ext-1": { greeting: "First" } },
    });
    const manager = create();
    await flushPromises();
    expect(manager.getValue("ext-1", "greeting")).toBe("First");

    getDataMock.mockResolvedValueOnce({
      success: true,
      data: { "ext-1": { greeting: "Second" } },
    });
    userIdSignal.value = "user-2";
    await flushPromises();

    expect(manager.getValue("ext-1", "greeting")).toBe("Second");
  });
});
