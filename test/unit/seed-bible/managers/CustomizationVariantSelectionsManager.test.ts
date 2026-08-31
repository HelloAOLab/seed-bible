import {
  createCustomizationVariantSelectionsManager,
  VARIANT_SELECTIONS_ADDRESS,
} from "@packages/seed-bible/seed-bible/managers/CustomizationVariantSelectionsManager";
import type { LoginManager } from "@packages/seed-bible/seed-bible/managers/LoginManager";
import { CasualOSManager } from "@packages/seed-bible/seed-bible/managers/OsManager";
import { signal, type Signal } from "@preact/signals";
import type { Mock, Mocked } from "vitest";

describe("CustomizationVariantSelectionsManager", () => {
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
      hydrateLocalConfig: vi.fn(),
    };
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it("signed out: selections are empty and selectVariant() is a no-op", async () => {
    userIdSignal.value = null;
    const manager = createCustomizationVariantSelectionsManager(os, login);
    await flushPromises();

    expect(manager.selections.value).toEqual({});
    expect(manager.getSelectedVariantId("owner.customization_1")).toBeNull();

    await manager.selectVariant("owner.customization_1", "variant_1");

    expect(manager.selections.value).toEqual({});
    expect(recordDataMock).not.toHaveBeenCalled();
  });

  it("selectVariant() persists to its own record and is immediately readable without a reload", async () => {
    const manager = createCustomizationVariantSelectionsManager(os, login);
    await flushPromises();
    recordDataMock.mockClear();

    await manager.selectVariant("user-1.customization_1", "variant_2");

    expect(manager.getSelectedVariantId("user-1.customization_1")).toBe(
      "variant_2"
    );
    expect(recordDataMock).toHaveBeenCalledWith(
      "user-1",
      VARIANT_SELECTIONS_ADDRESS,
      { selections: { "user-1.customization_1": "variant_2" } },
      { marker: "publicRead" }
    );
  });

  it("loads a previously-persisted payload on construction", async () => {
    getDataMock.mockResolvedValue({
      success: true,
      data: { selections: { "owner.customization_1": "variant_dark" } },
    });

    const manager = createCustomizationVariantSelectionsManager(os, login);
    await flushPromises();

    expect(getDataMock).toHaveBeenCalledWith(
      "user-1",
      VARIANT_SELECTIONS_ADDRESS
    );
    expect(manager.getSelectedVariantId("owner.customization_1")).toBe(
      "variant_dark"
    );
  });

  it("skips a corrupt persisted payload rather than throwing", async () => {
    getDataMock.mockResolvedValue({
      success: true,
      data: { selections: { "owner.customization_1": 42 } },
    });

    const manager = createCustomizationVariantSelectionsManager(os, login);
    await flushPromises();

    expect(warnSpy).toHaveBeenCalled();
    expect(manager.selections.value).toEqual({});
  });

  it("clears the previous user's selections and reloads when the signed-in user changes", async () => {
    getDataMock.mockResolvedValueOnce({
      success: true,
      data: { selections: { "owner.customization_1": "variant_a" } },
    });
    const manager = createCustomizationVariantSelectionsManager(os, login);
    await flushPromises();
    expect(manager.getSelectedVariantId("owner.customization_1")).toBe(
      "variant_a"
    );

    getDataMock.mockResolvedValueOnce({
      success: true,
      data: { selections: { "owner.customization_2": "variant_b" } },
    });
    userIdSignal.value = "user-2";
    await flushPromises();

    expect(manager.getSelectedVariantId("owner.customization_1")).toBeNull();
    expect(manager.getSelectedVariantId("owner.customization_2")).toBe(
      "variant_b"
    );
  });
});
