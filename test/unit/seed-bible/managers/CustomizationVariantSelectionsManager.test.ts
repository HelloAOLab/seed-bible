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

  it("signed out: starts with empty selections", async () => {
    userIdSignal.value = null;
    const manager = createCustomizationVariantSelectionsManager(os, login);
    await flushPromises();

    expect(manager.selections.value).toEqual({});
    expect(manager.getSelectedVariantId("owner.customization_1")).toBeNull();
  });

  it("signed out: selectVariant() applies the choice and persists it to login.localConfig instead of a CasualOS record", async () => {
    userIdSignal.value = null;
    const manager = createCustomizationVariantSelectionsManager(os, login);
    await flushPromises();

    await manager.selectVariant("owner.customization_1", "variant_1");

    expect(manager.getSelectedVariantId("owner.customization_1")).toBe(
      "variant_1"
    );
    expect(recordDataMock).not.toHaveBeenCalled();
    expect(login.localConfig.value[VARIANT_SELECTIONS_ADDRESS]).toEqual({
      "owner.customization_1": "variant_1",
    });
  });

  it("signed out: a selection survives a simulated reload (a fresh manager reading the same login.localConfig)", async () => {
    userIdSignal.value = null;
    const first = createCustomizationVariantSelectionsManager(os, login);
    await flushPromises();
    await first.selectVariant("owner.customization_1", "variant_1");

    // `login.localConfig` is what `LoginManager` mirrors to `localStorage` and
    // rehydrates on the next load, so a second manager reading the same
    // signal (rather than the first instance's local state) is what proves
    // the choice isn't just held in page-lifetime memory.
    const second = createCustomizationVariantSelectionsManager(os, login);
    await flushPromises();

    expect(second.getSelectedVariantId("owner.customization_1")).toBe(
      "variant_1"
    );
  });

  it("signed out: selecting a variant for one customization doesn't clobber another's stored selection", async () => {
    userIdSignal.value = null;
    login.localConfig.value = {
      [VARIANT_SELECTIONS_ADDRESS]: { "owner.customization_1": "variant_a" },
    };
    const manager = createCustomizationVariantSelectionsManager(os, login);
    await flushPromises();

    await manager.selectVariant("owner.customization_2", "variant_b");

    expect(manager.getSelectedVariantId("owner.customization_1")).toBe(
      "variant_a"
    );
    expect(manager.getSelectedVariantId("owner.customization_2")).toBe(
      "variant_b"
    );
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
