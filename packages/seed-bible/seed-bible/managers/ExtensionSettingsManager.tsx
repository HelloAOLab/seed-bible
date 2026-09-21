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

/**
 * How long a typed change waits before it is written. Text and number fields
 * change on every keystroke, so without this a 20-character value would mean 20
 * writes. A toggle or a reset is one deliberate change and doesn't wait.
 */
export const SETTING_SAVE_DEBOUNCE_MS = 700;

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
  /**
   * True when the viewer's latest change to this extension's settings couldn't
   * be saved. Scoped per extension so one extension's failure doesn't report
   * itself in another's UI; cleared by that extension's next successful save.
   */
  hasSaveError: (extensionId: string) => boolean;
  /**
   * Sets the viewer's own value for a setting, once the viewer's stored values
   * have loaded. Never rejects: a failed save sets `hasSaveError` for this
   * extension, as does a change made when those stored values couldn't be
   * loaded (saving then would replace them, so nothing is saved). No-op while
   * signed out, or if `extensionId`/`key` isn't a currently-declared setting.
   */
  setValue: (
    extensionId: string,
    key: string,
    value: ExtensionSettingValue
  ) => Promise<void>;
  /** Clears the viewer's own value, falling back to the Customization/extension default. Same loading and failure rules as `setValue`; no-op if nothing was set. */
  clearValue: (extensionId: string, key: string) => Promise<void>;
  /**
   * Writes a typed change that is still waiting out its debounce, rather than
   * leaving it for the timer. Resolves once nothing is outstanding.
   */
  flushPendingSave: () => Promise<void>;
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
  // Extensions whose latest save failed. Keyed by extension so a failure in one
  // extension's Configure modal doesn't show in every other one's.
  const saveErrors = signal<Record<string, boolean>>({});
  // The account whose stored values `valuesByExtensionId` holds. Null while
  // signed out and while the signed-in account's values are still loading.
  let loadedUserId: string | null = null;
  let currentLoad: Promise<void> = Promise.resolve();
  // Serializes writes so an older save can't land after a newer one. A number
  // field saves on every keystroke, so out-of-order writes are a real risk.
  let saveChain: Promise<void> = Promise.resolve();
  // A typed change waiting out its debounce, with the extensions it covers so a
  // failed write can be reported against each of them.
  let pendingSave: {
    userId: string;
    extensionIds: Set<string>;
    timer: ReturnType<typeof setTimeout>;
    waited: Promise<void>;
    settle: () => void;
  } | null = null;

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

  const hasSaveError = (extensionId: string): boolean =>
    saveErrors.value[extensionId] === true;

  const flagSaveError = (extensionId: string): void => {
    if (hasSaveError(extensionId)) {
      return;
    }
    saveErrors.value = { ...saveErrors.value, [extensionId]: true };
  };

  /**
   * Every extension's values live in one record, so a write that lands stores
   * all of them — including a change an earlier failed save left unsaved.
   */
  const clearSaveErrors = (): void => {
    if (Object.keys(saveErrors.value).length === 0) {
      return;
    }
    saveErrors.value = {};
  };

  /**
   * Resolves to the signed-in account once its stored values are in memory, or
   * null if signed out, the account changed while waiting, or the values failed
   * to load (which also flags the failure against `extensionId`). Saves merge
   * into those values, so saving before they load would overwrite the record
   * with a blob missing everything else the account had stored.
   */
  const waitForOwnValues = async (
    extensionId: string
  ): Promise<string | null> => {
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
      flagSaveError(extensionId);
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
    extensionIds: Set<string>,
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
    if (loadedUserId !== userId) {
      return;
    }
    if (failed) {
      for (const extensionId of extensionIds) {
        flagSaveError(extensionId);
      }
    } else {
      clearSaveErrors();
    }
  };

  const queueWrite = (
    userId: string,
    extensionIds: Set<string>
  ): Promise<void> => {
    // The record holds every extension's values, so the write always sends the
    // newest of them rather than the snapshot the change was built from.
    const next = valuesByExtensionId.value;
    // `write` handles its own failures, so the chain always settles and one
    // failed save doesn't block the saves queued behind it.
    saveChain = saveChain.then(() => write(userId, extensionIds, next));
    return saveChain;
  };

  const flushPendingSave = (): Promise<void> => {
    const pending = pendingSave;
    if (!pending) {
      return saveChain;
    }
    clearTimeout(pending.timer);
    pendingSave = null;
    const written = queueWrite(pending.userId, pending.extensionIds);
    void written.then(pending.settle);
    return written;
  };

  /**
   * Holds a typed change back so a burst of them lands as one write. Resolves
   * when that write has been made, so callers still learn when their change is
   * stored.
   */
  const schedulePendingSave = (
    userId: string,
    extensionId: string
  ): Promise<void> => {
    if (pendingSave && pendingSave.userId === userId) {
      clearTimeout(pendingSave.timer);
      pendingSave.extensionIds.add(extensionId);
      pendingSave.timer = setTimeout(
        () => void flushPendingSave(),
        SETTING_SAVE_DEBOUNCE_MS
      );
      return pendingSave.waited;
    }
    // A change for a different account says nothing about the one waiting.
    void flushPendingSave();
    let settle!: () => void;
    const waited = new Promise<void>((resolve) => {
      settle = resolve;
    });
    pendingSave = {
      userId,
      extensionIds: new Set([extensionId]),
      timer: setTimeout(
        () => void flushPendingSave(),
        SETTING_SAVE_DEBOUNCE_MS
      ),
      waited,
      settle,
    };
    return waited;
  };

  const persist = (
    userId: string,
    extensionId: string,
    next: Record<string, Record<string, ExtensionSettingValue>>,
    debounced: boolean
  ): Promise<void> => {
    valuesByExtensionId.value = next;
    if (debounced) {
      return schedulePendingSave(userId, extensionId);
    }
    // A toggle or a reset is one deliberate change, so it goes now — and takes
    // anything typing has queued with it.
    if (pendingSave && pendingSave.userId === userId) {
      pendingSave.extensionIds.add(extensionId);
      return flushPendingSave();
    }
    void flushPendingSave();
    return queueWrite(userId, new Set([extensionId]));
  };

  const setValue = async (
    extensionId: string,
    key: string,
    value: ExtensionSettingValue
  ): Promise<void> => {
    const userId = await waitForOwnValues(extensionId);
    const definition = getDefinition(extensionId, key);
    if (!userId || !definition) {
      return;
    }
    await persist(
      userId,
      extensionId,
      {
        ...valuesByExtensionId.value,
        [extensionId]: {
          ...valuesByExtensionId.value[extensionId],
          [key]: value,
        },
      },
      // Text and number fields report every keystroke; a checkbox reports one
      // deliberate change.
      definition.type !== "boolean"
    );
  };

  const clearValue = async (
    extensionId: string,
    key: string
  ): Promise<void> => {
    const userId = await waitForOwnValues(extensionId);
    const current = valuesByExtensionId.value[extensionId];
    if (!userId || !current || !(key in current)) {
      return;
    }
    const nextExtensionValues = { ...current };
    delete nextExtensionValues[key];
    await persist(
      userId,
      extensionId,
      {
        ...valuesByExtensionId.value,
        [extensionId]: nextExtensionValues,
      },
      // Clearing a value is one deliberate change, like a toggle.
      false
    );
  };

  // A change still inside its debounce would be lost with the page, and a
  // mobile browser may never come back to fire the timer, so hiding the page
  // sends it.
  if (typeof document !== "undefined" && !import.meta.env.SSR) {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        void flushPendingSave();
      }
    });
  }

  // Started once everything it reaches for exists: this runs immediately, and
  // an account change has to be able to flush a save that is still waiting.
  effect(() => {
    const userId = login.userId.value;
    if (userId === loadedUserId) {
      return;
    }
    // Send a change that is still waiting before the values it covers are
    // dropped below, or it would write this account's settings as empty.
    void flushPendingSave();
    // Drop the previous account's values now rather than when the new
    // account's load resolves. Until then they would show in the new account's
    // UI, and a save would merge them into the new account's record.
    valuesByExtensionId.value = {};
    saveErrors.value = {};
    loadedUserId = null;
    if (userId) {
      currentLoad = load(userId);
    }
  });

  return {
    valuesByExtensionId,
    hasSaveError,
    getValue,
    setValue,
    clearValue,
    flushPendingSave,
  };
}
