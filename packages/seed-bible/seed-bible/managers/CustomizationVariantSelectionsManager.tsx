import * as z from "zod/v4";
import { computed, effect, signal, type ReadonlySignal } from "@preact/signals";
import type { CasualOSManager } from "./OsManager";
import type { LoginManager } from "./LoginManager";
import { parseStringRecord } from "./SettingsManager";

export const VARIANT_SELECTIONS_ADDRESS = "customizationVariantSelections";

const variantSelectionsPayloadSchema = z.object({
  // Customization locator (`${recordName}.${id}`, the same shape
  // `CustomizationsManager.getShareLink` produces) -> chosen variant id.
  selections: z.record(z.string(), z.string()),
});

/**
 * Remembers which theme variant a viewer has chosen for each Customization
 * they've encountered (their own, or one loaded via a `?customization=...`
 * share link). Deliberately its own record, separate from both
 * `SettingsManager`'s profile-backed theme settings and from
 * `CustomizationsManager`'s own per-customization records: a viewer's choice
 * here must never touch their default theme preference, and a viewer
 * picking a variant on someone ELSE's customization has no write access to
 * that customization's own record.
 *
 * Signed-in viewers get their choices synced to a CasualOS record (`os.getData`/
 * `recordData` under `VARIANT_SELECTIONS_ADDRESS`). Signed-out viewers get
 * the same device-local persistence every other anonymous setting gets —
 * `login.localConfig`, which `LoginManager` already mirrors to `localStorage`
 * and offers to adopt into a brand-new account's profile on first login —
 * keyed under that same address so it reads/writes just like any other
 * `SettingsManager` field.
 */
export interface CustomizationVariantSelectionsManager {
  /** Locator -> chosen variant id, for the current viewer (signed-in profile or signed-out device). Empty when nothing chosen yet. */
  selections: ReadonlySignal<Record<string, string>>;
  /** Sync lookup from the already-loaded `selections` signal — no I/O. */
  getSelectedVariantId: (locator: string) => string | null;
  /**
   * Persists the viewer's variant choice for a customization locator — to
   * their CasualOS profile when signed in, to `login.localConfig` (and so
   * `localStorage`) when signed out.
   */
  selectVariant: (locator: string, variantId: string) => Promise<void>;
}

export function createCustomizationVariantSelectionsManager(
  os: CasualOSManager,
  login: LoginManager
): CustomizationVariantSelectionsManager {
  const remoteSelections = signal<Record<string, string>>({});
  const loadedUserId = signal<string | null>(null);

  const load = async (userId: string): Promise<void> => {
    const result = await os.getData(userId, VARIANT_SELECTIONS_ADDRESS);
    // Discard a stale response if the signed-in user changed while this
    // request was in flight.
    if (login.userId.value !== userId) {
      return;
    }
    if (!result.success || !result.data) {
      remoteSelections.value = {};
      loadedUserId.value = userId;
      return;
    }
    const parsed = variantSelectionsPayloadSchema.safeParse(result.data);
    if (!parsed.success) {
      console.warn(
        "Failed to parse customization variant selections:",
        parsed.error
      );
      remoteSelections.value = {};
      loadedUserId.value = userId;
      return;
    }
    remoteSelections.value = parsed.data.selections;
    loadedUserId.value = userId;
  };

  effect(() => {
    const userId = login.userId.value;
    if (!userId) {
      remoteSelections.value = {};
      loadedUserId.value = null;
      return;
    }
    if (loadedUserId.value === userId) {
      return;
    }
    void load(userId);
  });

  const localSelections = computed<Record<string, string>>(() =>
    parseStringRecord(login.localConfig.value[VARIANT_SELECTIONS_ADDRESS])
  );

  const selections = computed<Record<string, string>>(() =>
    login.userId.value ? remoteSelections.value : localSelections.value
  );

  const getSelectedVariantId = (locator: string): string | null =>
    selections.value[locator] ?? null;

  const selectVariant = async (
    locator: string,
    variantId: string
  ): Promise<void> => {
    const userId = login.userId.value;
    if (!userId) {
      login.localConfig.value = {
        ...login.localConfig.value,
        [VARIANT_SELECTIONS_ADDRESS]: {
          ...localSelections.value,
          [locator]: variantId,
        },
      };
      return;
    }
    const next = { ...remoteSelections.value, [locator]: variantId };
    remoteSelections.value = next;
    await os.recordData(
      userId,
      VARIANT_SELECTIONS_ADDRESS,
      { selections: next },
      { marker: "publicRead" }
    );
  };

  return { selections, getSelectedVariantId, selectVariant };
}
