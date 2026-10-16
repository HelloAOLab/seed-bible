// Standalone-build alias target for the bare `"seed-bible/i18n"` specifier —
// see preact.shim.ts for the general pattern. Typed against the real
// `seed-bible/i18n` package export (a type-only import, erased at this
// package's own build time) so this shim's typing can't silently drift from
// what the real `useI18n`/`addTranslations`/`i18n` actually look like.
import { getSeedBibleExtensionRuntime } from "./runtimeAccess.js";
import type {
  useI18n as UseI18nFn,
  addTranslations as AddTranslationsFn,
  i18n as I18nInstance,
} from "seed-bible/i18n";

const ns = getSeedBibleExtensionRuntime().i18n as {
  useI18n: typeof UseI18nFn;
  addTranslations: typeof AddTranslationsFn;
  i18n: typeof I18nInstance;
};

export const useI18n = ns.useI18n;
export const addTranslations = ns.addTranslations;
export const i18n = ns.i18n;
