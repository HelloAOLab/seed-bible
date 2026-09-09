import * as z from "zod/v4";
import { effect, signal, type ReadonlySignal } from "@preact/signals";
import type { CasualOSManager } from "./OsManager";
import type { LoginManager } from "./LoginManager";

export const EXTENSION_PREFERENCES_ADDRESS =
  "customizationExtensionPreferences";

const extensionPreferencesPayloadSchema = z.object({
  // Customization locator (`${recordName}.${id}`, the same shape
  // `CustomizationsManager.getShareLink` produces) -> extra extension ids
  // the viewer chose to add on top of that customization's own declared list.
  extraExtensionIds: z.record(z.string(), z.array(z.string())),
});

/**
 * Remembers, per signed-in viewer, which extra extensions they've chosen to
 * install on top of each Customization's own declared `extensionIds` (their
 * own, or one loaded via a `?customization=...` share link). Deliberately
 * its own record, separate from both the viewer's default installed
 * extensions (`ExtensionManager`'s own local storage / profile config) and
 * from `CustomizationsManager`'s own per-customization records: a viewer's
 * extra picks here must never touch their default extension profile, and a
 * viewer adding an extra extension on someone ELSE's customization has no
 * write access to that customization's own record.
 */
export interface CustomizationExtensionPreferencesManager {
  /** Locator -> extra extension ids, for the signed-in user. Empty when signed out or nothing added yet. */
  extraExtensionIdsByLocator: ReadonlySignal<Record<string, string[]>>;
  /** Sync lookup from the already-loaded signal — no I/O. */
  getExtraExtensionIds: (locator: string) => string[];
  /** Adds an extra extension id for a customization locator. No-op while signed out or already present. */
  addExtraExtensionId: (locator: string, extensionId: string) => Promise<void>;
  /** Removes an extra extension id for a customization locator. No-op while signed out or not present. */
  removeExtraExtensionId: (
    locator: string,
    extensionId: string
  ) => Promise<void>;
}

export function createCustomizationExtensionPreferencesManager(
  os: CasualOSManager,
  login: LoginManager
): CustomizationExtensionPreferencesManager {
  const extraExtensionIdsByLocator = signal<Record<string, string[]>>({});
  const loadedUserId = signal<string | null>(null);

  const load = async (userId: string): Promise<void> => {
    const result = await os.getData(userId, EXTENSION_PREFERENCES_ADDRESS);
    // Discard a stale response if the signed-in user changed while this
    // request was in flight.
    if (login.userId.value !== userId) {
      return;
    }
    if (!result.success || !result.data) {
      extraExtensionIdsByLocator.value = {};
      loadedUserId.value = userId;
      return;
    }
    const parsed = extensionPreferencesPayloadSchema.safeParse(result.data);
    if (!parsed.success) {
      console.warn(
        "Failed to parse customization extension preferences:",
        parsed.error
      );
      extraExtensionIdsByLocator.value = {};
      loadedUserId.value = userId;
      return;
    }
    extraExtensionIdsByLocator.value = parsed.data.extraExtensionIds;
    loadedUserId.value = userId;
  };

  effect(() => {
    const userId = login.userId.value;
    if (!userId) {
      extraExtensionIdsByLocator.value = {};
      loadedUserId.value = null;
      return;
    }
    if (loadedUserId.value === userId) {
      return;
    }
    void load(userId);
  });

  const getExtraExtensionIds = (locator: string): string[] =>
    extraExtensionIdsByLocator.value[locator] ?? [];

  const persist = async (next: Record<string, string[]>): Promise<void> => {
    const userId = login.userId.value;
    if (!userId) {
      return;
    }
    extraExtensionIdsByLocator.value = next;
    await os.recordData(
      userId,
      EXTENSION_PREFERENCES_ADDRESS,
      { extraExtensionIds: next },
      { marker: "publicRead" }
    );
  };

  const addExtraExtensionId = async (
    locator: string,
    extensionId: string
  ): Promise<void> => {
    const current = getExtraExtensionIds(locator);
    if (current.includes(extensionId)) {
      return;
    }
    await persist({
      ...extraExtensionIdsByLocator.value,
      [locator]: [...current, extensionId],
    });
  };

  const removeExtraExtensionId = async (
    locator: string,
    extensionId: string
  ): Promise<void> => {
    const current = getExtraExtensionIds(locator);
    if (!current.includes(extensionId)) {
      return;
    }
    await persist({
      ...extraExtensionIdsByLocator.value,
      [locator]: current.filter((id) => id !== extensionId),
    });
  };

  return {
    extraExtensionIdsByLocator,
    getExtraExtensionIds,
    addExtraExtensionId,
    removeExtraExtensionId,
  };
}
