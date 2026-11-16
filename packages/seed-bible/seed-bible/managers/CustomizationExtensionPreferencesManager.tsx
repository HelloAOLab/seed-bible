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
  // Locator -> extension ids the customization auto-installs that the viewer
  // chose to remove. Optional: records saved before this existed lack it.
  removedExtensionIds: z.record(z.string(), z.array(z.string())).default({}),
});

type IdsByLocator = Record<string, string[]>;

/**
 * Remembers, per viewer, which extra extensions they've chosen to
 * install on top of each Customization's own declared `extensionIds` (their
 * own, or one loaded via a `?customization=...` share link), and which of its
 * auto-installed ones they've chosen to remove. Deliberately
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
  /** Locator -> auto-installed extension ids the viewer removed, saved the same way as the extras. */
  removedExtensionIdsByLocator: ReadonlySignal<Record<string, string[]>>;
  /** Sync lookup from the already-loaded signal — no I/O. */
  getRemovedExtensionIds: (locator: string) => string[];
  /** Records that the viewer removed one of a customization's auto-installed extensions. */
  addRemovedExtensionId: (
    locator: string,
    extensionId: string
  ) => Promise<void>;
  /** Undoes `addRemovedExtensionId`, putting the auto-installed extension back. */
  clearRemovedExtensionId: (
    locator: string,
    extensionId: string
  ) => Promise<void>;
}

/**
 * The union of two locator -> ids maps. Returns `saved` itself when `extra`
 * adds nothing, so callers can tell whether anything changed.
 */
function mergeIdsByLocator(
  saved: IdsByLocator,
  extra: IdsByLocator
): IdsByLocator {
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
  const extraExtensionIdsByLocator = signal<IdsByLocator>({});
  const removedExtensionIdsByLocator = signal<IdsByLocator>({});
  const loadedUserId = signal<string | null>(null);

  const write = async (userId: string): Promise<void> => {
    await os.recordData(
      userId,
      EXTENSION_PREFERENCES_ADDRESS,
      {
        extraExtensionIds: extraExtensionIdsByLocator.value,
        removedExtensionIds: removedExtensionIdsByLocator.value,
      },
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
    // Only a record that doesn't exist yet counts as empty. Any other failure
    // leaves `loadedUserId` unset, so the viewer's changes stay in memory and
    // nothing writes over a record that couldn't be read.
    if (!result.success && result.errorCode !== "data_not_found") {
      console.warn(
        "Failed to load customization extension preferences:",
        result
      );
      return;
    }
    let savedExtra: IdsByLocator = {};
    let savedRemoved: IdsByLocator = {};
    if (result.success && result.data) {
      const parsed = extensionPreferencesPayloadSchema.safeParse(result.data);
      if (!parsed.success) {
        console.warn(
          "Failed to parse customization extension preferences:",
          parsed.error
        );
        return;
      }
      savedExtra = parsed.data.extraExtensionIds;
      savedRemoved = parsed.data.removedExtensionIds;
    }
    // Changes made before this user's record loaded (while signed out, or
    // while this request was in flight) only live in the signals. Fold them
    // in so signing in doesn't undo what the viewer just did.
    const hasUnsaved = loadedUserId.value === null;
    const extra = hasUnsaved
      ? mergeIdsByLocator(savedExtra, extraExtensionIdsByLocator.value)
      : savedExtra;
    const removed = hasUnsaved
      ? mergeIdsByLocator(savedRemoved, removedExtensionIdsByLocator.value)
      : savedRemoved;
    extraExtensionIdsByLocator.value = extra;
    removedExtensionIdsByLocator.value = removed;
    loadedUserId.value = userId;
    if (extra !== savedExtra || removed !== savedRemoved) {
      await write(userId);
    }
  };

  effect(() => {
    const userId = login.userId.value;
    if (!userId) {
      extraExtensionIdsByLocator.value = {};
      removedExtensionIdsByLocator.value = {};
      loadedUserId.value = null;
      return;
    }
    if (loadedUserId.value === userId) {
      return;
    }
    void load(userId);
  });

  const persist = async (): Promise<void> => {
    // Signed out (or still loading), the change applies for this session
    // and is saved by `load` once the viewer's record is available. Writing
    // now would overwrite a record we haven't read yet.
    const userId = login.userId.value;
    if (!userId || loadedUserId.value !== userId) {
      return;
    }
    await write(userId);
  };

  /** Adds or removes one id in one locator's list of `target`, then saves. */
  const update = async (
    target: typeof extraExtensionIdsByLocator,
    locator: string,
    extensionId: string,
    present: boolean
  ): Promise<void> => {
    const current = target.value[locator] ?? [];
    if (current.includes(extensionId) === present) {
      return;
    }
    target.value = {
      ...target.value,
      [locator]: present
        ? [...current, extensionId]
        : current.filter((id) => id !== extensionId),
    };
    await persist();
  };

  return {
    extraExtensionIdsByLocator,
    getExtraExtensionIds: (locator) =>
      extraExtensionIdsByLocator.value[locator] ?? [],
    addExtraExtensionId: (locator, extensionId) =>
      update(extraExtensionIdsByLocator, locator, extensionId, true),
    removeExtraExtensionId: (locator, extensionId) =>
      update(extraExtensionIdsByLocator, locator, extensionId, false),
    removedExtensionIdsByLocator,
    getRemovedExtensionIds: (locator) =>
      removedExtensionIdsByLocator.value[locator] ?? [],
    addRemovedExtensionId: (locator, extensionId) =>
      update(removedExtensionIdsByLocator, locator, extensionId, true),
    clearRemovedExtensionId: (locator, extensionId) =>
      update(removedExtensionIdsByLocator, locator, extensionId, false),
  };
}
