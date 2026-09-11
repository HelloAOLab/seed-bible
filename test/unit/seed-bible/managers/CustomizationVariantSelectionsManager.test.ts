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

  it("signed out: reads its selections from login.localConfig, not from manager-instance memory", async () => {
    userIdSignal.value = null;
    const first = createCustomizationVariantSelectionsManager(os, login);
    await flushPromises();
    await first.selectVariant("owner.customization_1", "variant_1");

    // A second manager instance, sharing the same `login.localConfig`
    // signal, sees the choice — proving it isn't held only in `first`'s own
    // instance state. This does NOT exercise the real localStorage
    // serialize/rehydrate round-trip a page reload performs (`writeLocalConfig`
    // / `readLocalConfig` / `hydrateLocalConfig` in LoginManager.tsx) — that
    // round-trip is `LoginManager`'s own responsibility and is covered by
    // its test suite (see "hydrateLocalConfig()" and "localStorage
    // persistence" in LoginManager.test.ts).
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

  it("signed out: selectVariant() preserves unrelated login.localConfig keys (e.g. fontSize)", async () => {
    userIdSignal.value = null;
    login.localConfig.value = { fontSize: "XL" };
    const manager = createCustomizationVariantSelectionsManager(os, login);
    await flushPromises();

    await manager.selectVariant("owner.customization_1", "variant_1");

    expect(login.localConfig.value.fontSize).toBe("XL");
    expect(login.localConfig.value[VARIANT_SELECTIONS_ADDRESS]).toEqual({
      "owner.customization_1": "variant_1",
    });
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

  it("signed in with no record yet: recovers a selection LoginManager adopted into profile.config, and persists it to this manager's own record", async () => {
    // Simulates a brand-new account's first login on a device that had a
    // signed-out selection: `LoginManager.getUserProfile` seeds the new
    // profile's `config` from `localConfig` (which includes this manager's
    // key, since `login.localConfig` is where signed-out picks live) before
    // this manager's own record has ever been written — `getData` above
    // already mocks that record as `data_not_found`.
    const adoptedProfile = {
      name: "",
      config: {
        [VARIANT_SELECTIONS_ADDRESS]: { "owner.customization_1": "variant_1" },
      },
    };
    login.profile.value = adoptedProfile;
    login.profilePromise = Promise.resolve(adoptedProfile);

    const manager = createCustomizationVariantSelectionsManager(os, login);
    await flushPromises();

    expect(manager.getSelectedVariantId("owner.customization_1")).toBe(
      "variant_1"
    );
    expect(recordDataMock).toHaveBeenCalledWith(
      "user-1",
      VARIANT_SELECTIONS_ADDRESS,
      { selections: { "owner.customization_1": "variant_1" } },
      { marker: "publicRead" }
    );
  });

  it("signed in with no record and nothing adopted: settles to empty selections without erroring", async () => {
    const manager = createCustomizationVariantSelectionsManager(os, login);
    await flushPromises();

    expect(manager.selections.value).toEqual({});
    expect(recordDataMock).not.toHaveBeenCalled();
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
