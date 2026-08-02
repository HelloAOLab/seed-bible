import * as PreactSignalsNamespace from "@preact/signals";
import * as PreactNamespace from "preact";
import * as PreactHooksNamespace from "preact/hooks";
import * as PreactJsxRuntimeNamespace from "preact/jsx-runtime";
import type { SeedBibleState } from "../managers/SeedBibleStateManager";
import type { LoginManager } from "../managers/LoginManager";
import * as SeedBibleI18nNamespace from "../i18n";
export type CleanupFunction = () => void;
export type ExtensionDependencies = Record<string, object>;
export type ExtensionInitializer = (
  context: SeedBibleState,
  dependencies: ExtensionDependencies
) => Iterable<CleanupFunction, object, void> | object;
export interface ExtensionRegistration {
  id: string;
  /**
   * The IDs of other extensions that this extension depends on. Circular dependencies are not supported.
   *
   * If an extension is not registered yet, but is included in an extension set that was loaded, then it will be loaded and initialized before this extension.
   */
  dependencies?: string[];
  init: ExtensionInitializer;
}
export interface ExtensionTranslation {
  title: string;
  description: string;
  [key: string]: string;
}
export interface ExtensionMeta {
  /**
   * The identifier of this extension, which should be unique across all extensions.
   */
  id: string;
  /**
   * The translations for this extension in different languages.
   */
  translations: {
    en: ExtensionTranslation;
    [lang: string]: ExtensionTranslation;
  };
  /**
   * Optional extension IDs that should be installed before this extension package.
   */
  dependencies?: string[];
  /**
   * Whether to automatically install this extension when loading its extension set.
   * Defaults to false.
   */
  autoinstall?: boolean;
}
export type Extension = UploadedExtension | ImportExtension;
export interface UploadedExtension {
  /**
   * The URL of the extension to load.
   */
  url: string;
  /**
   * The metadata for this extension. `meta.translations` may be trimmed down
   * to just `title`/`description` per locale — see `loadFullTranslations`.
   */
  meta: ExtensionMeta;
  /**
   * Loads this extension's full per-locale translations (every key, not just
   * `title`/`description`). Optional: extensions whose `meta.translations`
   * is already complete (e.g. fetched over the network rather than bundled)
   * don't need it, and callers fall back to `meta.translations`.
   */
  loadFullTranslations?: () => Promise<ExtensionMeta["translations"]>;
}
export interface ImportExtension {
  /**
   * The function to dynamically import the extension module. The resolved
   * module must `export default` a function matching `ExtensionEntryPoint` —
   * the loader calls it explicitly to (re)trigger registration on every
   * install attempt, since ES module evaluation only runs once per
   * specifier.
   */
  import: () => Promise<unknown>;
  /**
   * The metadata for this extension. `meta.translations` may be trimmed down
   * to just `title`/`description` per locale — see `loadFullTranslations`.
   */
  meta: ExtensionMeta;
  /**
   * Loads this extension's full per-locale translations (every key, not just
   * `title`/`description`). Bundled extensions (see `vite-plugin-extensions.ts`)
   * defer everything but `title`/`description` to this dynamic import, so the
   * full translation payload is only fetched once the extension is installed.
   */
  loadFullTranslations?: () => Promise<ExtensionMeta["translations"]>;
}
/**
 * The contract an extension module's default export must satisfy. Calling
 * this function triggers the extension's registration (typically via a
 * `registerExtension(...)` call). It must be safe to call more than once per
 * page load: native ES module evaluation is cached per specifier, so after
 * `unloadExtension()` a later `loadExtension()`/`loadExtensionFromUrl()` call
 * re-invokes this cached function reference rather than re-running the
 * module's top-level code.
 */
export type ExtensionEntryPoint = () =>
  | void
  | CleanupFunction
  | Promise<void | CleanupFunction>;
/**
 * The expected shape of a dynamically-imported extension module: an ES
 * module namespace object with a `default` export matching
 * `ExtensionEntryPoint`.
 */
export interface ExtensionModule {
  default: ExtensionEntryPoint;
}
export interface ExtensionSet {
  /**
   * The ID of this extension set.
   */
  id: string;
  /**
   * The extensions included in this set.
   */
  extensions: Extension[];
}
export interface ExtensionListEntry {
  id: string;
  extension: Extension | null;
  extensionSet: ExtensionSet | null;
  registration: ExtensionRegistration | null;
  installed: boolean;
  pendingInstallation: boolean;
}
export declare class ExtensionInitalizer {
  private static _instance;
  static getInstance(): ExtensionInitalizer;
  private registeredExtensions;
  private extensionCleanupFunctions;
  private extensionExports;
  private initializedExtensionIds;
  private extensionContext;
  constructor();
  isExtensionRegistered(id: string): boolean;
  getExtensionExports<T extends object>(id: string): T | null;
  unregisterExtension(id: string): boolean;
  registerExtension(extension: ExtensionRegistration): CleanupFunction;
  setupExtensionContext(context: SeedBibleState): void;
  listRegisteredExtensions(): ExtensionRegistration[];
  private tryInitializeExtension;
  private tryInitializeRegisteredExtensions;
}
export declare function getExtensionExports<T extends object>(
  id: string
): T | null;
export declare function registerExtension(
  extension: ExtensionRegistration
): CleanupFunction;
export declare function unregisterExtension(id: string): boolean;
/**
 * A small, stable surface exposed on `window` for extension bundles that
 * genuinely can't be part of this app's own Vite module graph — i.e. a
 * standalone bundle built by `seed-bible-extension-scripts build --standalone`
 * and loaded via `extensions.loadExtension({ meta, url })`. Such a bundle
 * can't have a bare `import ... from "seed-bible"` (there's no import map, and
 * a raw browser `import(url)` can't resolve one), and it must not bring its
 * own copy of Preact/signals — this codebase has already hit the "two Preact
 * instances" bug once (see `vite.config.ts`'s `resolve.dedupe` comment). By
 * reading `registerExtension`/`preact`/`@preact/signals` off this global
 * instead, such a bundle shares the exact instances already running on the
 * page rather than a second, disconnected copy.
 *
 * `components` is exposed as a lazy loader (not an eager namespace import) so
 * referencing this runtime object doesn't force the entire
 * `seed-bible/components` barrel — effectively the whole app's UI surface —
 * into this module's own eager import graph, which loads very early in boot.
 * `i18n` is exposed eagerly since it's already reachable from several other
 * eager import chains (see the import above), so there's no lazy-loading
 * benefit to gain by deferring it.
 */
export interface SeedBibleExtensionRuntime {
  registerExtension: typeof registerExtension;
  unregisterExtension: typeof unregisterExtension;
  preact: typeof PreactNamespace;
  preactHooks: typeof PreactHooksNamespace;
  preactJsxRuntime: typeof PreactJsxRuntimeNamespace;
  preactSignals: typeof PreactSignalsNamespace;
  i18n: typeof SeedBibleI18nNamespace;
  loadComponents: () => Promise<typeof import("../components")>;
}
declare global {
  interface Window {
    __seedBibleExtensionRuntime?: SeedBibleExtensionRuntime;
  }
}
export declare function setupExtensionContext(context: SeedBibleState): void;
export type ExtensionManager = ReturnType<typeof createExtensionManager>;
export interface ExtensionManagerOptions {
  /**
   * The source of the default extension set that loadDefaultExtensions() loads.
   * Defaults to no extensions.
   */
  defaultExtensions?: ExtensionSet | null;
}
/**
 * Per-store metadata for the installed-extensions ID list: when each
 * currently-installed extension was installed, and when this store's ID list
 * was last mutated (an install or uninstall). Used by
 * `mergeInstalledExtensionIds` to tell "this ID is missing because it was
 * never installed here" apart from "this ID is missing because it was
 * uninstalled elsewhere after this store last had it" (see #1454) — a plain
 * union of the two ID sets can't distinguish those, so an uninstall on one
 * device would keep getting undone by a stale copy on another.
 */
export interface InstalledExtensionsMeta {
  installedAtMs: Record<string, number>;
  updatedAtMs: number;
}
export declare const emptyExtensionsMeta: () => InstalledExtensionsMeta;
export declare const parseExtensionsMeta: (
  value: unknown
) => InstalledExtensionsMeta;
export interface InstalledExtensionsStoreState {
  ids: Set<string>;
  meta: InstalledExtensionsMeta;
}
export interface MergedInstalledExtensions {
  ids: Set<string>;
  localMeta: InstalledExtensionsMeta;
  profileMeta: InstalledExtensionsMeta;
}
/**
 * Merges the installed-extension IDs saved in local storage with the ones
 * saved in the user's synced profile config.
 *
 * A plain union of the two ID sets (the previous behavior) can't tell "never
 * installed here" apart from "uninstalled elsewhere since this store last had
 * it" — so an uninstall on one device kept getting silently undone by a stale
 * copy of the ID on another (#1454). Instead, for an ID that's only on one
 * side, this compares that side's recorded install time for the ID against
 * the *other* side's `updatedAtMs` (the last time that store's ID list was
 * mutated, by any add or remove): if the other side was updated more
 * recently than this ID was installed, and still doesn't have it, that's
 * treated as an inferred deletion rather than reinstalled.
 *
 * An ID with no recorded install time (e.g. installed before this metadata
 * existed) is treated as installed "just now" for this comparison rather than
 * "long ago" — since `updatedAtMs` is a single scalar per store (bumped by
 * *any* add/remove, not per-extension), treating an unknown install time as
 * old could cause an unrelated, more recent change on the other side to
 * wrongly look like this specific ID was deleted there. This falls back to
 * today's safe adopt-it behavior for such IDs until they're installed or
 * uninstalled again post-fix, which gives them a real timestamp.
 */
export declare function mergeInstalledExtensionIds(
  local: InstalledExtensionsStoreState,
  profile: InstalledExtensionsStoreState,
  nowMs: number
): MergedInstalledExtensions;
export declare function createExtensionManager(
  login: LoginManager,
  options?: ExtensionManagerOptions
): {
  loadDefaultExtensions: () => Promise<void>;
  loadSavedExtensions: () => Promise<void>;
  loadExtensionSet: (
    set: ExtensionSet,
    filter?: (ext: Extension) => boolean
  ) => Promise<Map<string, boolean>>;
  loadExtension: (
    uploaded: Extension,
    installStack?: Set<string>
  ) => Promise<boolean>;
  unloadExtension: (id: string) => void;
  extensions: PreactSignalsNamespace.Signal<ExtensionListEntry[]>;
  getExtensions: () => ExtensionListEntry[];
  getAllExtensionsAsSet: () => ExtensionSet | undefined;
};
