import {
  createExtensionSettingsManager,
  EXTENSION_SETTING_VALUES_ADDRESS,
  SETTING_SAVE_DEBOUNCE_MS,
} from "@packages/seed-bible/seed-bible/managers/ExtensionSettingsManager";
import type {
  ExtensionListEntry,
  ExtensionManager,
  ExtensionSettingDefinition,
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
  let errorSpy: Mock;
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

  /** Runs a typed change's debounce out so its write goes, then awaits it. */
  const saved = async (saving: Promise<void>): Promise<void> => {
    await flushPromises();
    await vi.advanceTimersByTimeAsync(SETTING_SAVE_DEBOUNCE_MS);
    await saving;
  };

  const deferred = <T>() => {
    let resolve!: (value: T) => void;
    let reject!: (reason: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };

  const extensionEntry = (
    settings: Record<string, ExtensionSettingDefinition>,
    id = "ext-1"
  ): ExtensionListEntry => ({
    id,
    extension: {
      url: `https://example.com/${id}.js`,
      meta: {
        id,
        translations: { en: { title: id, description: "" } },
        settings,
      },
    },
    extensionSet: null,
    registration: null,
    installed: true,
    pendingInstallation: false,
  });

  beforeEach(() => {
    vi.useFakeTimers();
    os = CasualOSManager();
    getDataMock = vi.spyOn(os, "getData").mockResolvedValue({
      success: false,
      errorCode: "data_not_found",
      errorMessage: "Data not found",
    });
    recordDataMock = vi.spyOn(os, "recordData").mockResolvedValue({
      success: true,
      recordName: "user-1",
      address: EXTENSION_SETTING_VALUES_ADDRESS,
    } as never);
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

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
    errorSpy.mockRestore();
    vi.useRealTimers();
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
    await saved(manager.setValue("ext-1", "greeting", "Hiya"));
    expect(manager.getValue("ext-1", "greeting")).toBe("Hiya");
  });

  it("getValue returns undefined for an extension or setting key that isn't currently declared", async () => {
    const manager = create();
    await flushPromises();

    expect(manager.getValue("unknown-ext", "greeting")).toBeUndefined();
    expect(manager.getValue("ext-1", "unknown-key")).toBeUndefined();
  });

  it("ignores a stored value that breaks a constraint and falls back, without clamping it", async () => {
    extensionsListSignal.value = [
      extensionEntry({
        count: {
          type: "number",
          default: 5,
          minimum: 1,
          maximum: 10,
          multipleOf: 1,
        },
        tone: {
          type: "string",
          default: "warm",
          enum: ["plain", "warm", "bold"],
        },
      }),
    ];
    getDataMock.mockResolvedValue({
      success: true,
      // Written before the extension tightened these constraints.
      data: { "ext-1": { count: -40, tone: "loud" } },
    });
    const manager = create();
    await flushPromises();

    expect(manager.getValue("ext-1", "count")).toBe(5);
    expect(manager.getValue("ext-1", "tone")).toBe("warm");

    // A Customization default that also breaks the constraint is skipped too.
    activeCustomizationDefault = 2.5;
    expect(manager.getValue("ext-1", "count")).toBe(5);
  });

  it("setValue does not store a value that breaks the setting's constraints", async () => {
    extensionsListSignal.value = [
      extensionEntry({
        count: {
          type: "number",
          default: 5,
          minimum: 1,
          maximum: 10,
          multipleOf: 1,
        },
        tone: {
          type: "string",
          default: "warm",
          enum: ["plain", "warm", "bold"],
        },
      }),
    ];
    const manager = create();
    await flushPromises();
    recordDataMock.mockClear();

    await manager.setValue("ext-1", "count", 2.5);
    await manager.setValue("ext-1", "count", 11);
    await manager.setValue("ext-1", "tone", "loud");
    await manager.setValue("ext-1", "count", "3");

    expect(recordDataMock).not.toHaveBeenCalled();
    expect(manager.getValue("ext-1", "count")).toBe(5);
    expect(manager.valuesByExtensionId.value).toEqual({});

    await saved(manager.setValue("ext-1", "count", 3));
    expect(manager.getValue("ext-1", "count")).toBe(3);
  });

  it("accepts a decimal that is a multiple of the step, and ignores a step that can't divide", async () => {
    extensionsListSignal.value = [
      extensionEntry({
        ratio: { type: "number", default: 0.1, multipleOf: 0.1 },
      }),
    ];
    const manager = create();
    await flushPromises();

    await saved(manager.setValue("ext-1", "ratio", 0.3));
    expect(manager.getValue("ext-1", "ratio")).toBe(0.3);

    extensionsListSignal.value = [
      extensionEntry({
        ratio: { type: "number", default: 0.1, multipleOf: 0 },
      }),
    ];
    await saved(manager.setValue("ext-1", "ratio", 0.25));
    expect(manager.getValue("ext-1", "ratio")).toBe(0.25);
  });

  it("setValue persists to its own record and is immediately readable without a reload", async () => {
    const manager = create();
    await flushPromises();
    recordDataMock.mockClear();

    await saved(manager.setValue("ext-1", "count", 7));

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
    await saved(manager.setValue("ext-1", "greeting", "Hiya"));
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

  it("clears the previous user's values as soon as the signed-in user changes, before the new user's values load", async () => {
    getDataMock.mockResolvedValueOnce({
      success: true,
      data: { "ext-1": { greeting: "First" } },
    });
    const manager = create();
    await flushPromises();
    expect(manager.getValue("ext-1", "greeting")).toBe("First");

    const secondLoad = deferred<unknown>();
    getDataMock.mockReturnValueOnce(secondLoad.promise);
    userIdSignal.value = "user-2";

    expect(manager.getValue("ext-1", "greeting")).toBe("Hello");

    secondLoad.resolve({
      success: true,
      data: { "ext-1": { greeting: "Second" } },
    });
    await flushPromises();

    expect(manager.getValue("ext-1", "greeting")).toBe("Second");
  });

  it("a save made while the new user's values are loading lands in the new user's record, merged with what they had stored", async () => {
    getDataMock.mockResolvedValueOnce({
      success: true,
      data: { "ext-1": { greeting: "First" } },
    });
    const manager = create();
    await flushPromises();

    const secondLoad = deferred<unknown>();
    getDataMock.mockReturnValueOnce(secondLoad.promise);
    userIdSignal.value = "user-2";
    recordDataMock.mockClear();

    const saving = manager.setValue("ext-1", "count", 9);
    secondLoad.resolve({
      success: true,
      data: { "ext-1": { enabled: true } },
    });
    await saved(saving);

    expect(recordDataMock).toHaveBeenCalledTimes(1);
    expect(recordDataMock).toHaveBeenCalledWith(
      "user-2",
      EXTENSION_SETTING_VALUES_ADDRESS,
      { "ext-1": { enabled: true, count: 9 } },
      { marker: "publicRead" }
    );
    expect(manager.getValue("ext-1", "count")).toBe(9);
    expect(manager.getValue("ext-1", "greeting")).toBe("Hello");
  });

  it("flags a save as failed, without overwriting the record, when the user's stored values failed to load", async () => {
    const failedLoad = deferred<unknown>();
    getDataMock.mockReturnValueOnce(failedLoad.promise);
    const manager = create();

    const saving = manager.setValue("ext-1", "count", 9);
    failedLoad.reject(new Error("network down"));
    await saving;

    expect(recordDataMock).not.toHaveBeenCalled();
    expect(manager.getValue("ext-1", "count")).toBe(5);
    expect(manager.hasSaveError("ext-1")).toBe(true);
  });

  it.each([
    [
      "the records server refuses the save",
      () =>
        recordDataMock.mockResolvedValueOnce({
          success: false,
          errorCode: "not_authorized",
          errorMessage: "Not authorized",
        }),
    ],
    [
      "the save can't reach the server",
      () => recordDataMock.mockRejectedValueOnce(new Error("network down")),
    ],
  ])(
    "flags the failure, without rejecting, when %s, and keeps the change for this session",
    async (_case, failNextSave) => {
      const manager = create();
      await flushPromises();
      failNextSave();

      await expect(saved(manager.setValue("ext-1", "count", 9))).resolves.toBe(
        undefined
      );

      expect(manager.hasSaveError("ext-1")).toBe(true);
      expect(manager.getValue("ext-1", "count")).toBe(9);
    }
  );

  // Regression test: one shared flag meant a failure while configuring one
  // extension reported itself in every other extension's Configure modal.
  it("flags a failed save against the extension it was for, not every extension", async () => {
    extensionsListSignal.value = [
      ...extensionsListSignal.value,
      extensionEntry({ tone: { type: "string", default: "Warm" } }, "ext-2"),
    ];
    const manager = create();
    await flushPromises();
    recordDataMock.mockResolvedValueOnce({
      success: false,
      errorCode: "server_error",
      errorMessage: "Server error",
    });

    await saved(manager.setValue("ext-1", "count", 9));

    expect(manager.hasSaveError("ext-1")).toBe(true);
    expect(manager.hasSaveError("ext-2")).toBe(false);

    // One record holds every extension's values, so a save that lands stores
    // the earlier failed change too and nothing is left outstanding.
    await saved(manager.setValue("ext-2", "tone", "Cool"));

    expect(manager.hasSaveError("ext-1")).toBe(false);
    expect(manager.getValue("ext-1", "count")).toBe(9);
  });

  it("the next successful save stores the change that failed and clears the error", async () => {
    const manager = create();
    await flushPromises();
    recordDataMock.mockResolvedValueOnce({
      success: false,
      errorCode: "server_error",
      errorMessage: "Server error",
    });
    await saved(manager.setValue("ext-1", "count", 9));
    expect(manager.hasSaveError("ext-1")).toBe(true);

    await saved(manager.setValue("ext-1", "greeting", "Hi"));

    expect(recordDataMock).toHaveBeenLastCalledWith(
      "user-1",
      EXTENSION_SETTING_VALUES_ADDRESS,
      { "ext-1": { count: 9, greeting: "Hi" } },
      { marker: "publicRead" }
    );
    expect(manager.hasSaveError("ext-1")).toBe(false);
  });

  // Regression test: without serialized writes, the second save is sent while
  // the first is still in flight, and a slower first write could land last and
  // leave the older value stored.
  it("sends saves one at a time, in the order they were made", async () => {
    const manager = create();
    await flushPromises();
    const firstWrite = deferred<unknown>();
    recordDataMock.mockReturnValueOnce(firstWrite.promise);

    // Toggles save straight away, so both writes are queued at once.
    const firstSave = manager.setValue("ext-1", "enabled", true);
    const secondSave = manager.setValue("ext-1", "enabled", false);
    await vi.advanceTimersByTimeAsync(0);
    expect(recordDataMock).toHaveBeenCalledTimes(1);

    firstWrite.resolve({
      success: true,
      recordName: "user-1",
      address: EXTENSION_SETTING_VALUES_ADDRESS,
    });
    await Promise.all([firstSave, secondSave]);

    expect(recordDataMock).toHaveBeenCalledTimes(2);
    expect(recordDataMock).toHaveBeenLastCalledWith(
      "user-1",
      EXTENSION_SETTING_VALUES_ADDRESS,
      { "ext-1": { enabled: false } },
      { marker: "publicRead" }
    );
  });

  // Regression test: every keystroke used to be its own write, so typing a
  // short value meant a burst of network writes.
  it("coalesces a burst of typing into one write holding the latest value", async () => {
    const manager = create();
    await flushPromises();
    recordDataMock.mockClear();

    const typing = [
      manager.setValue("ext-1", "greeting", "H"),
      manager.setValue("ext-1", "greeting", "Hi"),
      manager.setValue("ext-1", "greeting", "Hiya"),
    ];
    await flushPromises();
    expect(recordDataMock).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(SETTING_SAVE_DEBOUNCE_MS);
    await Promise.all(typing);

    expect(recordDataMock).toHaveBeenCalledTimes(1);
    expect(recordDataMock).toHaveBeenCalledWith(
      "user-1",
      EXTENSION_SETTING_VALUES_ADDRESS,
      { "ext-1": { greeting: "Hiya" } },
      { marker: "publicRead" }
    );
  });

  it("saves a toggle and a reset without waiting out the typing debounce", async () => {
    const manager = create();
    await flushPromises();
    recordDataMock.mockClear();

    await manager.setValue("ext-1", "enabled", true);
    expect(recordDataMock).toHaveBeenCalledTimes(1);

    await manager.clearValue("ext-1", "enabled");
    expect(recordDataMock).toHaveBeenCalledTimes(2);
  });

  it("sends a typed change that is still waiting when the account changes", async () => {
    const manager = create();
    await flushPromises();
    recordDataMock.mockClear();

    const saving = manager.setValue("ext-1", "greeting", "Hiya");
    await flushPromises();
    expect(recordDataMock).not.toHaveBeenCalled();

    userIdSignal.value = "user-2";
    await saving;

    // Written for the account that made the change, with that account's values
    // rather than the empty set the switch leaves behind.
    expect(recordDataMock).toHaveBeenCalledWith(
      "user-1",
      EXTENSION_SETTING_VALUES_ADDRESS,
      { "ext-1": { greeting: "Hiya" } },
      { marker: "publicRead" }
    );
  });
});
