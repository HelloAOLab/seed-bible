import * as z from "zod/v4";
import { effect, signal, type ReadonlySignal } from "@preact/signals";
import type { CasualOSManager } from "./OsManager";
import type { LoginManager } from "./LoginManager";
import type {
  ExtensionManager,
  ExtensionSettingValue,
} from "./ExtensionManager";
import type { CustomizationsManager } from "./CustomizationsManager";

export const EXTENSION_SETTING_VALUES_ADDRESS = "extensionSettingValues";

const extensionSettingValuesPayloadSchema = z.record(
  z.string(),
  z.record(z.string(), z.union([z.string(), z.boolean(), z.number()]))
);

/**
 * Remembers, per signed-in viewer, the values they've explicitly set for each
 * installed extension's declared settings (`ExtensionMeta.settings`). Values
 * the viewer hasn't set fall back to the active Customization's own default
 * for that setting (see `CustomizationsManager.getActiveExtensionSettingDefault`),
 * then to the setting's own `default`.
 *
 * Deliberately its own record, separate from `ExtensionManager`'s own
 * installed-extension bookkeeping — which extensions are installed and what
 * values they're configured with are independent facts, so uninstalling an
 * extension never clears the values a viewer already set for it.
 *
 * Values exist only for a signed-in viewer, in that viewer's own record.
 * Nothing is kept on the device, so a signed-out viewer only ever gets the
 * defaults. Offline and signed-out settings are planned as follow-up work
 * built on this manager.
 */
export interface ExtensionSettingsManager {
  /** extensionId -> settingKey -> the value this viewer explicitly set. Empty when signed out. */
  valuesByExtensionId: ReadonlySignal<
    Record<string, Record<string, ExtensionSettingValue>>
  >;
  /**
   * Resolves one setting's effective value: the viewer's own value, else the
   * active Customization's default, else the setting's own `default`, else
   * `undefined`. Returns `undefined` if `extensionId` isn't known or no
   * longer declares `key` — a stale stored value is never surfaced.
   */
  getValue: (
    extensionId: string,
    key: string
  ) => ExtensionSettingValue | undefined;
  /** True when the viewer's latest change couldn't be saved. Cleared by the next save that succeeds. */
  saveError: ReadonlySignal<boolean>;
  /**
   * Sets the viewer's own value for a setting, once the viewer's stored values
   * have loaded. Never rejects: a failed save sets `saveError`, as does a
   * change made when those stored values couldn't be loaded (saving then would
   * replace them, so nothing is saved). No-op while signed out, or if
   * `extensionId`/`key` isn't a currently-declared setting.
   */
  setValue: (
    extensionId: string,
    key: string,
    value: ExtensionSettingValue
  ) => Promise<void>;
  /** Clears the viewer's own value, falling back to the Customization/extension default. Same loading and failure rules as `setValue`; no-op if nothing was set. */
  clearValue: (extensionId: string, key: string) => Promise<void>;
}

export function createExtensionSettingsManager(
  os: CasualOSManager,
  login: LoginManager,
  extensions: ExtensionManager,
  customizations: CustomizationsManager
): ExtensionSettingsManager {
  const valuesByExtensionId = signal<
    Record<string, Record<string, ExtensionSettingValue>>
  >({});
  const saveError = signal(false);
  // The account whose stored values `valuesByExtensionId` holds. Null while
  // signed out and while the signed-in account's values are still loading.
  let loadedUserId: string | null = null;
  let currentLoad: Promise<void> = Promise.resolve();
  // Serializes writes so an older save can't land after a newer one. A number
  // field saves on every keystroke, so out-of-order writes are a real risk.
  let saveChain: Promise<void> = Promise.resolve();

  const load = async (userId: string): Promise<void> => {
    const result = await os.getData(userId, EXTENSION_SETTING_VALUES_ADDRESS);
    // Discard a stale response if the signed-in user changed while this
    // request was in flight.
    if (login.userId.value !== userId) {
      return;
    }
    if (!result.success || !result.data) {
      valuesByExtensionId.value = {};
      loadedUserId = userId;
      return;
    }
    const parsed = extensionSettingValuesPayloadSchema.safeParse(result.data);
    if (!parsed.success) {
      console.warn("Failed to parse extension setting values:", parsed.error);
      valuesByExtensionId.value = {};
      loadedUserId = userId;
      return;
    }
    valuesByExtensionId.value = parsed.data;
    loadedUserId = userId;
  };

  effect(() => {
    const userId = login.userId.value;
    if (userId === loadedUserId) {
      return;
    }
    // Drop the previous account's values now rather than when the new
    // account's load resolves. Until then they would show in the new account's
    // UI, and a save would merge them into the new account's record.
    valuesByExtensionId.value = {};
    saveError.value = false;
    loadedUserId = null;
    if (userId) {
      currentLoad = load(userId);
    }
  });

  /**
   * Resolves to the signed-in account once its stored values are in memory, or
   * null if signed out, the account changed while waiting, or the values failed
   * to load (which also sets `saveError`). Saves merge into those values, so
   * saving before they load would overwrite the record with a blob missing
   * everything else the account had stored.
   */
  const waitForOwnValues = async (): Promise<string | null> => {
    const userId = login.userId.value;
    if (!userId) {
      return null;
    }
    if (loadedUserId !== userId) {
      await currentLoad.catch(() => undefined);
    }
    if (login.userId.value !== userId) {
      return null;
    }
    if (loadedUserId !== userId) {
      console.error(
        "Failed to save extension setting values: this account's stored values didn't load"
      );
      saveError.value = true;
      return null;
    }
    return userId;
  };

  const getDefinition = (extensionId: string, key: string) =>
    extensions.extensions.value.find((entry) => entry.id === extensionId)
      ?.extension?.meta.settings?.[key];

  const getValue = (
    extensionId: string,
    key: string
  ): ExtensionSettingValue | undefined => {
    const definition = getDefinition(extensionId, key);
    if (!definition) {
      return undefined;
    }
    const ownValue = valuesByExtensionId.value[extensionId]?.[key];
    if (ownValue !== undefined && typeof ownValue === definition.type) {
      return ownValue;
    }
    const customizationDefault =
      customizations.getActiveExtensionSettingDefault(extensionId, key);
    if (
      customizationDefault !== undefined &&
      typeof customizationDefault === definition.type
    ) {
      return customizationDefault;
    }
    return definition.default;
  };

  const write = async (
    userId: string,
    next: Record<string, Record<string, ExtensionSettingValue>>
  ): Promise<void> => {
    let failed = false;
    try {
      const result = await os.recordData(
        userId,
        EXTENSION_SETTING_VALUES_ADDRESS,
        next,
        { marker: "publicRead" }
      );
      // The records client reports a refused write (not authorized, too large,
      // an expired session) by resolving with `success: false`, not rejecting.
      if (!result.success) {
        throw new Error(
          `Failed to save extension setting values: ${result.errorCode}`
        );
      }
    } catch (error) {
      console.error("Failed to save extension setting values:", error);
      failed = true;
    }
    // A save for an account that has since been switched away from says
    // nothing about whether the current account's values are saved.
    if (loadedUserId === userId) {
      saveError.value = failed;
    }
  };

  const persist = (
    userId: string,
    next: Record<string, Record<string, ExtensionSettingValue>>
  ): Promise<void> => {
    valuesByExtensionId.value = next;
    // `write` handles its own failures, so the chain always settles and one
    // failed save doesn't block the saves queued behind it.
    saveChain = saveChain.then(() => write(userId, next));
    return saveChain;
  };

  const setValue = async (
    extensionId: string,
    key: string,
    value: ExtensionSettingValue
  ): Promise<void> => {
    const userId = await waitForOwnValues();
    if (!userId || !getDefinition(extensionId, key)) {
      return;
    }
    await persist(userId, {
      ...valuesByExtensionId.value,
      [extensionId]: {
        ...valuesByExtensionId.value[extensionId],
        [key]: value,
      },
    });
  };

  const clearValue = async (
    extensionId: string,
    key: string
  ): Promise<void> => {
    const userId = await waitForOwnValues();
    const current = valuesByExtensionId.value[extensionId];
    if (!userId || !current || !(key in current)) {
      return;
    }
    const nextExtensionValues = { ...current };
    delete nextExtensionValues[key];
    await persist(userId, {
      ...valuesByExtensionId.value,
      [extensionId]: nextExtensionValues,
    });
  };

  return {
    valuesByExtensionId,
    saveError,
    getValue,
    setValue,
    clearValue,
  };
}
