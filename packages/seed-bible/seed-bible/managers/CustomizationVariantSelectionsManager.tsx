import * as z from "zod/v4";
import { effect, signal, type ReadonlySignal } from "@preact/signals";
import type { CasualOSManager } from "./OsManager";
import type { LoginManager } from "./LoginManager";

export const VARIANT_SELECTIONS_ADDRESS = "customizationVariantSelections";

const variantSelectionsPayloadSchema = z.object({
  // Customization locator (`${recordName}.${id}`, the same shape
  // `CustomizationsManager.getShareLink` produces) -> chosen variant id.
  selections: z.record(z.string(), z.string()),
});

/**
 * Remembers, per signed-in viewer, which theme variant they've chosen for
 * each Customization they've encountered (their own, or one loaded via a
 * `?customization=...` share link). Deliberately its own record, separate
 * from both `SettingsManager`'s profile-backed theme settings and from
 * `CustomizationsManager`'s own per-customization records: a viewer's
 * choice here must never touch their default theme preference, and a
 * viewer picking a variant on someone ELSE's customization has no write
 * access to that customization's own record.
 */
export interface CustomizationVariantSelectionsManager {
  /** Locator -> chosen variant id, for the signed-in user. Empty when signed out or nothing chosen yet. */
  selections: ReadonlySignal<Record<string, string>>;
  /** Sync lookup from the already-loaded `selections` signal — no I/O. */
  getSelectedVariantId: (locator: string) => string | null;
  /**
   * Applies the viewer's variant choice for a customization locator.
   * Persisted to their profile when signed in; while signed out, it's
   * applied for the current session only (via the in-memory `selections`
   * signal) and forgotten on refresh, since there's no signed-out profile
   * to remember it in.
   */
  selectVariant: (locator: string, variantId: string) => Promise<void>;
}

export function createCustomizationVariantSelectionsManager(
  os: CasualOSManager,
  login: LoginManager
): CustomizationVariantSelectionsManager {
  const selections = signal<Record<string, string>>({});
  const loadedUserId = signal<string | null>(null);

  const load = async (userId: string): Promise<void> => {
    const result = await os.getData(userId, VARIANT_SELECTIONS_ADDRESS);
    // Discard a stale response if the signed-in user changed while this
    // request was in flight.
    if (login.userId.value !== userId) {
      return;
    }
    if (!result.success || !result.data) {
      selections.value = {};
      loadedUserId.value = userId;
      return;
    }
    const parsed = variantSelectionsPayloadSchema.safeParse(result.data);
    if (!parsed.success) {
      console.warn(
        "Failed to parse customization variant selections:",
        parsed.error
      );
      selections.value = {};
      loadedUserId.value = userId;
      return;
    }
    selections.value = parsed.data.selections;
    loadedUserId.value = userId;
  };

  effect(() => {
    const userId = login.userId.value;
    if (!userId) {
      selections.value = {};
      loadedUserId.value = null;
      return;
    }
    if (loadedUserId.value === userId) {
      return;
    }
    void load(userId);
  });

  const getSelectedVariantId = (locator: string): string | null =>
    selections.value[locator] ?? null;

  const selectVariant = async (
    locator: string,
    variantId: string
  ): Promise<void> => {
    const next = { ...selections.value, [locator]: variantId };
    selections.value = next;

    const userId = login.userId.value;
    if (!userId) {
      // Signed-out viewers get the choice applied for this session only —
      // there's no profile to persist it to, and the effect above resets
      // `selections` to {} only when `login.userId` actually changes, so
      // this in-memory value survives until then.
      return;
    }
    await os.recordData(
      userId,
      VARIANT_SELECTIONS_ADDRESS,
      { selections: next },
      { marker: "publicRead" }
    );
  };

  return { selections, getSelectedVariantId, selectVariant };
}
