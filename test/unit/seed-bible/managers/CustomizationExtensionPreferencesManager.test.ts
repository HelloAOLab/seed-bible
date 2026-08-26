import {
  createCustomizationExtensionPreferencesManager,
  EXTENSION_PREFERENCES_ADDRESS,
} from "@packages/seed-bible/seed-bible/managers/CustomizationExtensionPreferencesManager";
import type { LoginManager } from "@packages/seed-bible/seed-bible/managers/LoginManager";
import { CasualOSManager } from "@packages/seed-bible/seed-bible/managers/OsManager";
import { signal, type Signal } from "@preact/signals";
import type { Mock, Mocked } from "vitest";

describe("CustomizationExtensionPreferencesManager", () => {
  let getDataMock: Mock;
  let recordDataMock: Mock;
  let warnSpy: Mock;
  let login: Mocked<LoginManager>;
  let os: CasualOSManager;
  let userIdSignal: Signal<string | null>;

  const flushPromises = async () => {
    await Promise.resolve();
    await Promise.resolve();
  };

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
    };
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it("signed out: preferences are empty and add/remove are no-ops", async () => {
    userIdSignal.value = null;
    const manager = createCustomizationExtensionPreferencesManager(os, login);
    await flushPromises();

    expect(manager.extraExtensionIdsByLocator.value).toEqual({});
    expect(manager.getExtraExtensionIds("owner.customization_1")).toEqual([]);

    await manager.addExtraExtensionId("owner.customization_1", "ext.a");

    expect(manager.extraExtensionIdsByLocator.value).toEqual({});
    expect(recordDataMock).not.toHaveBeenCalled();
  });

  it("addExtraExtensionId() persists to its own record and is immediately readable without a reload", async () => {
    const manager = createCustomizationExtensionPreferencesManager(os, login);
    await flushPromises();
    recordDataMock.mockClear();

    await manager.addExtraExtensionId("user-1.customization_1", "ext.a");

    expect(manager.getExtraExtensionIds("user-1.customization_1")).toEqual([
      "ext.a",
    ]);
    expect(recordDataMock).toHaveBeenCalledWith(
      "user-1",
      EXTENSION_PREFERENCES_ADDRESS,
      { extraExtensionIds: { "user-1.customization_1": ["ext.a"] } },
      { marker: "publicRead" }
    );
  });

  it("addExtraExtensionId() is a no-op when the id is already present", async () => {
    const manager = createCustomizationExtensionPreferencesManager(os, login);
    await flushPromises();
    await manager.addExtraExtensionId("user-1.customization_1", "ext.a");
    recordDataMock.mockClear();

    await manager.addExtraExtensionId("user-1.customization_1", "ext.a");

    expect(recordDataMock).not.toHaveBeenCalled();
    expect(manager.getExtraExtensionIds("user-1.customization_1")).toEqual([
      "ext.a",
    ]);
  });

  it("removeExtraExtensionId() removes a previously-added id and persists", async () => {
    const manager = createCustomizationExtensionPreferencesManager(os, login);
    await flushPromises();
    await manager.addExtraExtensionId("user-1.customization_1", "ext.a");
    await manager.addExtraExtensionId("user-1.customization_1", "ext.b");
    recordDataMock.mockClear();

    await manager.removeExtraExtensionId("user-1.customization_1", "ext.a");

    expect(manager.getExtraExtensionIds("user-1.customization_1")).toEqual([
      "ext.b",
    ]);
    expect(recordDataMock).toHaveBeenCalledWith(
      "user-1",
      EXTENSION_PREFERENCES_ADDRESS,
      { extraExtensionIds: { "user-1.customization_1": ["ext.b"] } },
      { marker: "publicRead" }
    );
  });

  it("removeExtraExtensionId() is a no-op when the id isn't present", async () => {
    const manager = createCustomizationExtensionPreferencesManager(os, login);
    await flushPromises();
    recordDataMock.mockClear();

    await manager.removeExtraExtensionId("user-1.customization_1", "ext.a");

    expect(recordDataMock).not.toHaveBeenCalled();
  });

  it("loads a previously-persisted payload on construction", async () => {
    getDataMock.mockResolvedValue({
      success: true,
      data: { extraExtensionIds: { "owner.customization_1": ["ext.x"] } },
    });

    const manager = createCustomizationExtensionPreferencesManager(os, login);
    await flushPromises();

    expect(getDataMock).toHaveBeenCalledWith(
      "user-1",
      EXTENSION_PREFERENCES_ADDRESS
    );
    expect(manager.getExtraExtensionIds("owner.customization_1")).toEqual([
      "ext.x",
    ]);
  });

  it("skips a corrupt persisted payload rather than throwing", async () => {
    getDataMock.mockResolvedValue({
      success: true,
      data: { extraExtensionIds: { "owner.customization_1": "not-an-array" } },
    });

    const manager = createCustomizationExtensionPreferencesManager(os, login);
    await flushPromises();

    expect(warnSpy).toHaveBeenCalled();
    expect(manager.extraExtensionIdsByLocator.value).toEqual({});
  });

  it("clears the previous user's preferences and reloads when the signed-in user changes", async () => {
    getDataMock.mockResolvedValueOnce({
      success: true,
      data: { extraExtensionIds: { "owner.customization_1": ["ext.a"] } },
    });
    const manager = createCustomizationExtensionPreferencesManager(os, login);
    await flushPromises();
    expect(manager.getExtraExtensionIds("owner.customization_1")).toEqual([
      "ext.a",
    ]);

    getDataMock.mockResolvedValueOnce({
      success: true,
      data: { extraExtensionIds: { "owner.customization_2": ["ext.b"] } },
    });
    userIdSignal.value = "user-2";
    await flushPromises();

    expect(manager.getExtraExtensionIds("owner.customization_1")).toEqual([]);
    expect(manager.getExtraExtensionIds("owner.customization_2")).toEqual([
      "ext.b",
    ]);
  });
});
