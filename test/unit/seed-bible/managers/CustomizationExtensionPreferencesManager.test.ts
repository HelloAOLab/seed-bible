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
      getPublicProfile: vi.fn().mockResolvedValue(null),
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
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it("signed out: add/remove apply for this session without writing a record", async () => {
    userIdSignal.value = null;
    const manager = createCustomizationExtensionPreferencesManager(os, login);
    await flushPromises();

    expect(manager.getExtraExtensionIds("owner.customization_1")).toEqual([]);

    await manager.addExtraExtensionId("owner.customization_1", "ext.a");
    expect(manager.getExtraExtensionIds("owner.customization_1")).toEqual([
      "ext.a",
    ]);

    await manager.removeExtraExtensionId("owner.customization_1", "ext.a");
    expect(manager.getExtraExtensionIds("owner.customization_1")).toEqual([]);
    expect(recordDataMock).not.toHaveBeenCalled();
  });

  it("saves picks made while signed out into the viewer's record when they sign in", async () => {
    userIdSignal.value = null;
    getDataMock.mockResolvedValue({
      success: true,
      data: { extraExtensionIds: { "owner.customization_1": ["ext.saved"] } },
    });
    const manager = createCustomizationExtensionPreferencesManager(os, login);
    await flushPromises();
    await manager.addExtraExtensionId("owner.customization_1", "ext.a");

    userIdSignal.value = "user-1";
    await flushPromises();

    expect(manager.getExtraExtensionIds("owner.customization_1")).toEqual([
      "ext.saved",
      "ext.a",
    ]);
    expect(recordDataMock).toHaveBeenCalledWith(
      "user-1",
      EXTENSION_PREFERENCES_ADDRESS,
      {
        extraExtensionIds: { "owner.customization_1": ["ext.saved", "ext.a"] },
        removedExtensionIds: {},
      },
      { marker: "publicRead" }
    );
  });

  it("keeps a pick made before the viewer's record finished loading, without overwriting the record first", async () => {
    let resolveLoad!: (value: unknown) => void;
    getDataMock.mockReturnValue(
      new Promise((resolve) => {
        resolveLoad = resolve;
      })
    );
    const manager = createCustomizationExtensionPreferencesManager(os, login);
    await manager.addExtraExtensionId("owner.customization_1", "ext.a");

    expect(manager.getExtraExtensionIds("owner.customization_1")).toEqual([
      "ext.a",
    ]);
    expect(recordDataMock).not.toHaveBeenCalled();

    resolveLoad({
      success: true,
      data: { extraExtensionIds: { "owner.customization_2": ["ext.b"] } },
    });
    await flushPromises();

    expect(manager.extraExtensionIdsByLocator.value).toEqual({
      "owner.customization_2": ["ext.b"],
      "owner.customization_1": ["ext.a"],
    });
    expect(recordDataMock).toHaveBeenCalledWith(
      "user-1",
      EXTENSION_PREFERENCES_ADDRESS,
      {
        extraExtensionIds: {
          "owner.customization_2": ["ext.b"],
          "owner.customization_1": ["ext.a"],
        },
        removedExtensionIds: {},
      },
      { marker: "publicRead" }
    );
  });

  it("doesn't rewrite the record on load when there's nothing new to save", async () => {
    getDataMock.mockResolvedValue({
      success: true,
      data: { extraExtensionIds: { "owner.customization_1": ["ext.a"] } },
    });
    createCustomizationExtensionPreferencesManager(os, login);
    await flushPromises();

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
      {
        extraExtensionIds: { "user-1.customization_1": ["ext.a"] },
        removedExtensionIds: {},
      },
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
      {
        extraExtensionIds: { "user-1.customization_1": ["ext.b"] },
        removedExtensionIds: {},
      },
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

  it("loads removed auto-installed extensions, and still reads a record saved before they existed", async () => {
    getDataMock.mockResolvedValueOnce({
      success: true,
      data: {
        extraExtensionIds: {},
        removedExtensionIds: { "owner.customization_1": ["ext.base"] },
      },
    });
    const manager = createCustomizationExtensionPreferencesManager(os, login);
    await flushPromises();
    expect(manager.getRemovedExtensionIds("owner.customization_1")).toEqual([
      "ext.base",
    ]);

    getDataMock.mockResolvedValueOnce({
      success: true,
      data: { extraExtensionIds: { "owner.customization_1": ["ext.a"] } },
    });
    userIdSignal.value = "user-2";
    await flushPromises();
    expect(manager.getExtraExtensionIds("owner.customization_1")).toEqual([
      "ext.a",
    ]);
    expect(manager.getRemovedExtensionIds("owner.customization_1")).toEqual([]);
  });

  it("saves a removal made while signed out when the viewer signs in", async () => {
    userIdSignal.value = null;
    const manager = createCustomizationExtensionPreferencesManager(os, login);
    await flushPromises();
    await manager.addRemovedExtensionId("owner.customization_1", "ext.base");
    expect(recordDataMock).not.toHaveBeenCalled();

    userIdSignal.value = "user-1";
    await flushPromises();

    expect(recordDataMock).toHaveBeenCalledWith(
      "user-1",
      EXTENSION_PREFERENCES_ADDRESS,
      {
        extraExtensionIds: {},
        removedExtensionIds: { "owner.customization_1": ["ext.base"] },
      },
      { marker: "publicRead" }
    );
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
