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
 * Remembers, per viewer, which extra extensions they've chosen to
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
  /** Locator -> extra extension ids, for the signed-in user (or this session's picks while signed out). */
  extraExtensionIdsByLocator: ReadonlySignal<Record<string, string[]>>;
  /** Sync lookup from the already-loaded signal — no I/O. */
  getExtraExtensionIds: (locator: string) => string[];
  /** Adds an extra extension id for a customization locator. No-op when already present. Signed out, it lasts for this session and is saved on sign-in. */
  addExtraExtensionId: (locator: string, extensionId: string) => Promise<void>;
  /** Removes an extra extension id for a customization locator. No-op when not present. */
  removeExtraExtensionId: (
    locator: string,
    extensionId: string
  ) => Promise<void>;
}

/**
 * The union of two locator -> ids maps. Returns `saved` itself when `extra`
 * adds nothing, so callers can tell whether anything changed.
 */
function mergeExtraExtensionIds(
  saved: Record<string, string[]>,
  extra: Record<string, string[]>
): Record<string, string[]> {
  let merged = saved;
  for (const [locator, ids] of Object.entries(extra)) {
    const current = merged[locator] ?? [];
    const added = ids.filter((id) => !current.includes(id));
    if (added.length > 0) {
      merged = { ...merged, [locator]: [...current, ...added] };
    }
  }
  return merged;
}

export function createCustomizationExtensionPreferencesManager(
  os: CasualOSManager,
  login: LoginManager
): CustomizationExtensionPreferencesManager {
  const extraExtensionIdsByLocator = signal<Record<string, string[]>>({});
  const loadedUserId = signal<string | null>(null);

  const write = async (
    userId: string,
    next: Record<string, string[]>
  ): Promise<void> => {
    await os.recordData(
      userId,
      EXTENSION_PREFERENCES_ADDRESS,
      { extraExtensionIds: next },
      { marker: "publicRead" }
    );
  };

  const load = async (userId: string): Promise<void> => {
    const result = await os.getData(userId, EXTENSION_PREFERENCES_ADDRESS);
    // Discard a stale response if the signed-in user changed while this
    // request was in flight.
    if (login.userId.value !== userId) {
      return;
    }
    let saved: Record<string, string[]> = {};
    if (result.success && result.data) {
      const parsed = extensionPreferencesPayloadSchema.safeParse(result.data);
      if (parsed.success) {
        saved = parsed.data.extraExtensionIds;
      } else {
        console.warn(
          "Failed to parse customization extension preferences:",
          parsed.error
        );
      }
    }
    // Picks made before this user's record loaded (while signed out, or
    // while this request was in flight) only live in the signal. Fold them
    // in so signing in doesn't uninstall what the viewer just added.
    const unsaved =
      loadedUserId.value === null ? extraExtensionIdsByLocator.value : {};
    const merged = mergeExtraExtensionIds(saved, unsaved);
    extraExtensionIdsByLocator.value = merged;
    loadedUserId.value = userId;
    if (merged !== saved) {
      await write(userId, merged);
    }
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
    extraExtensionIdsByLocator.value = next;
    // Signed out (or still loading), the pick applies for this session and
    // is saved by `load` once the viewer's record is available. Writing now
    // would overwrite a record we haven't read yet.
    const userId = login.userId.value;
    if (!userId || loadedUserId.value !== userId) {
      return;
    }
    await write(userId, next);
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
