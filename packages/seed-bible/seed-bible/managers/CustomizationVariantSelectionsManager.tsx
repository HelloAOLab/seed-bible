import * as z from "zod/v4";
import { computed, effect, signal, type ReadonlySignal } from "@preact/signals";
import type { CasualOSManager } from "./OsManager";
import type { LoginManager } from "./LoginManager";
import { getProfileConfigValue } from "./ProfileConfigSync";
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
 * `login.localConfig`, which `LoginManager` already mirrors to `localStorage` —
 * keyed under that same address.
 *
 * Unlike a real `SettingsManager` field, this manager's signed-in read comes
 * from its own dedicated record, not from `profile.config` — so when
 * `LoginManager`'s brand-new-account adoption copies a device's whole
 * `localConfig` (including a selection made here) into `profile.config` and
 * clears `localConfig`, that lands somewhere this manager doesn't normally
 * read from. `load()` below has an explicit fallback for exactly that case:
 * when this manager's own record comes back empty, it checks `profile.config`
 * for an adopted selection and, if found, both applies it and writes it into
 * the record so this fallback is only needed once per account.
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

  /**
   * Recovers a selection adopted into `profile.config` by `LoginManager`'s
   * brand-new-account flow (see the class doc comment), and makes it durable
   * in this manager's own record so this path only has to run once per
   * account.
   *
   * Returns `"stale"` if the signed-in user changed while this was waiting
   * on the profile load (the caller must not touch `remoteSelections` for a
   * user that's no longer current), `"recovered"` if an adopted selection
   * was found and applied, or `"nothing"` if there was none to recover.
   */
  const recoverAdoptedSelections = async (
    userId: string
  ): Promise<"stale" | "recovered" | "nothing"> => {
    if (login.profilePromise) {
      try {
        await login.profilePromise;
      } catch {
        // Ignored — the `profile.value` read below is what decides whether
        // there's anything usable, same guard `saveProfileConfigValues` uses.
      }
    }
    if (login.userId.value !== userId) {
      return "stale";
    }

    const adopted = parseStringRecord(
      getProfileConfigValue(login.profile.value, VARIANT_SELECTIONS_ADDRESS)
    );
    if (Object.keys(adopted).length === 0) {
      return "nothing";
    }

    remoteSelections.value = adopted;
    loadedUserId.value = userId;
    try {
      await os.recordData(
        userId,
        VARIANT_SELECTIONS_ADDRESS,
        { selections: adopted },
        { marker: "publicRead" }
      );
    } catch (error) {
      console.error(
        "Failed to persist adopted customization variant selections:",
        error
      );
    }
    return "recovered";
  };

  const load = async (userId: string): Promise<void> => {
    const result = await os.getData(userId, VARIANT_SELECTIONS_ADDRESS);
    // Discard a stale response if the signed-in user changed while this
    // request was in flight.
    if (login.userId.value !== userId) {
      return;
    }
    if (!result.success || !result.data) {
      const recovery = await recoverAdoptedSelections(userId);
      if (recovery !== "nothing") {
        return;
      }
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
