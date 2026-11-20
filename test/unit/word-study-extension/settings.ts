import { signal } from "@preact/signals";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";

type Settings = Pick<
  SeedBibleState["extensionSettings"],
  "getValue" | "setValue"
>;

/**
 * Extension settings as `ExtensionSettingsManager` documents them: a value set
 * by a signed-in reader is saved and read back; signed out, `setValue` saves
 * nothing. Every Word Study setting defaults to true.
 */
export function createSettings(options: { isSignedIn: boolean }): Settings & {
  /** Changes a stored value, as Settings or another device would. */
  store(key: string, value: boolean): void;
} {
  const values = signal<Record<string, boolean>>({});

  return {
    getValue(_extensionId, key) {
      return values.value[key] ?? true;
    },
    async setValue(_extensionId, key, value) {
      if (options.isSignedIn && typeof value === "boolean") {
        values.value = { ...values.value, [key]: value };
      }
    },
    store(key, value) {
      values.value = { ...values.value, [key]: value };
    },
  };
}
