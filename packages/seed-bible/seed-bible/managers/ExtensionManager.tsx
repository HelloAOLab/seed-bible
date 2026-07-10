import { effect, signal } from "@preact/signals";
import { orderBy, union } from "es-toolkit";
import type { SeedBibleState } from "../managers/SeedBibleStateManager";
import type { LoginManager } from "../managers/LoginManager";
import { addTranslations } from "../i18n/I18nManager";
import { safeLocalStorage } from "../app/ssrEnv";
import {
  getProfileConfigValue,
  saveProfileConfigValue,
} from "./ProfileConfigSync";
import hash from "hash.js";
import stringify from "@casual-simulation/fast-json-stable-stringify";

const { sha256 } = hash;

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

export class ExtensionInitalizer {
  private static _instance: ExtensionInitalizer | null = null;

  static getInstance() {
    if (!ExtensionInitalizer._instance) {
      ExtensionInitalizer._instance = new ExtensionInitalizer();
    }

    return ExtensionInitalizer._instance;
  }

  private registeredExtensions = new Map<string, ExtensionRegistration>();
  private extensionCleanupFunctions = new Map<string, CleanupFunction[]>();
  private extensionExports = new Map<string, object>();
  private initializedExtensionIds = new Set<string>();
  private extensionContext: SeedBibleState | null = null;

  constructor() {}

  isExtensionRegistered(id: string): boolean {
    return this.registeredExtensions.has(id);
  }

  getExtensionExports<T extends object>(id: string): T | null {
    return (this.extensionExports.get(id) as T) ?? null;
  }

  unregisterExtension(id: string): boolean {
    if (!this.registeredExtensions.has(id)) {
      return false;
    }

    const cleanupFunctions = this.extensionCleanupFunctions.get(id) ?? [];
    for (const cleanup of cleanupFunctions) {
      try {
        cleanup();
      } catch (err) {
        console.error(`Error during cleanup of extension '${id}':`, err);
      }
    }
    this.extensionCleanupFunctions.delete(id);
    this.registeredExtensions.delete(id);
    this.initializedExtensionIds.delete(id);
    this.extensionExports.delete(id);
    return true;
  }

  registerExtension(extension: ExtensionRegistration): CleanupFunction {
    if (!extension?.id || typeof extension.id !== "string") {
      throw new Error("registerExtension() requires a non-empty string id.");
    }

    if (typeof extension.init !== "function") {
      throw new Error(
        "registerExtension() requires an init(context) function."
      );
    }

    this.registeredExtensions.set(extension.id, extension);

    // Allow a replacement registration for the same id to re-run init.
    this.initializedExtensionIds.delete(extension.id);

    this.tryInitializeRegisteredExtensions();

    return () => this.unregisterExtension(extension.id);
  }

  setupExtensionContext(context: SeedBibleState) {
    this.extensionContext = context;
    this.tryInitializeRegisteredExtensions();
  }

  listRegisteredExtensions() {
    return Array.from(this.registeredExtensions.values());
  }

  private tryInitializeExtension(
    id: string,
    initializationStack: Set<string> = new Set()
  ): boolean {
    if (this.initializedExtensionIds.has(id)) {
      return true;
    }

    if (!this.extensionContext) {
      return false;
    }

    const extension = this.registeredExtensions.get(id);
    if (!extension) {
      return false;
    }

    if (initializationStack.has(id)) {
      console.error(
        `Failed to initialize extension '${id}': circular dependency detected.`
      );
      return false;
    }

    initializationStack.add(id);

    const dependencyExports: ExtensionDependencies = {};
    const dependencyIds = extension.dependencies ?? [];

    for (const dependencyId of dependencyIds) {
      if (!this.registeredExtensions.has(dependencyId)) {
        initializationStack.delete(id);
        return false;
      }

      const dependencyInitialized = this.tryInitializeExtension(
        dependencyId,
        initializationStack
      );
      if (!dependencyInitialized) {
        initializationStack.delete(id);
        return false;
      }

      const dependencyExport = this.extensionExports.get(dependencyId);
      if (!dependencyExport) {
        initializationStack.delete(id);
        return false;
      }

      dependencyExports[dependencyId] = dependencyExport;
    }

    this.initializedExtensionIds.add(id);

    try {
      const cleanupIteratorOrReturn = extension.init(
        this.extensionContext,
        dependencyExports
      );
      const cleanupFunctions: CleanupFunction[] = [];
      if (Symbol.iterator in cleanupIteratorOrReturn) {
        const iterator = cleanupIteratorOrReturn[Symbol.iterator]();
        while (true) {
          const result = iterator.next();
          if (result.done) {
            if (result.value) {
              this.extensionExports.set(id, result.value);
            } else {
              this.extensionExports.set(id, {});
            }
            break;
          }
          cleanupFunctions.push(result.value);
        }
      } else if (cleanupIteratorOrReturn) {
        this.extensionExports.set(id, cleanupIteratorOrReturn);
      } else {
        this.extensionExports.set(id, {});
      }
      if (cleanupFunctions.length > 0) {
        this.extensionCleanupFunctions.set(id, cleanupFunctions);
      }
      initializationStack.delete(id);
      return true;
    } catch (error) {
      this.initializedExtensionIds.delete(id);
      initializationStack.delete(id);
      console.error(`Failed to initialize extension '${id}'.`, error);
      return false;
    }
  }

  private tryInitializeRegisteredExtensions() {
    let madeProgress = true;

    while (madeProgress) {
      madeProgress = false;

      for (const extensionId of this.registeredExtensions.keys()) {
        if (this.initializedExtensionIds.has(extensionId)) {
          continue;
        }

        const initialized = this.tryInitializeExtension(extensionId);
        if (initialized) {
          madeProgress = true;
        }
      }
    }
  }
}

export function getExtensionExports<T extends object>(id: string): T | null {
  return ExtensionInitalizer.getInstance().getExtensionExports<T>(id);
}

export function registerExtension(
  extension: ExtensionRegistration
): CleanupFunction {
  return ExtensionInitalizer.getInstance().registerExtension(extension);
}

export function unregisterExtension(id: string): boolean {
  return ExtensionInitalizer.getInstance().unregisterExtension(id);
}

export function setupExtensionContext(context: SeedBibleState) {
  ExtensionInitalizer.getInstance().setupExtensionContext(context);
}

export type ExtensionManager = ReturnType<typeof createExtensionManager>;

export interface ExtensionManagerOptions {
  /**
   * The source of the default extension set that loadDefaultExtensions() loads.
   * Defaults to no extensions.
   */
  defaultExtensions?: ExtensionSet | null;
}

/**
 * Runtime type guard for `ExtensionModule`. The actual shape of a
 * dynamically-imported extension module can't be statically verified —
 * `uploaded.import()` and `import(url)` both resolve to whatever the
 * extension package actually exports — so this is checked at the call sites
 * that invoke an extension's default export.
 */
function isExtensionModule(value: unknown): value is ExtensionModule {
  return (
    typeof value === "object" &&
    value !== null &&
    "default" in value &&
    typeof (value as { default: unknown }).default === "function"
  );
}

export function createExtensionManager(
  login: LoginManager,
  options: ExtensionManagerOptions = {}
) {
  const defaultExtensions = options.defaultExtensions ?? null;
  const knownExtensionsById = new Map<string, Extension>();
  const knownExtensionsSetsByExtensionId = new Map<string, ExtensionSet>();
  const installedExtensionIds = new Set<string>();
  const pendingInstallations = new Map<string, Promise<boolean>>();

  /**
   * The localStorage key under which the IDs of the extensions that the user has
   * installed are persisted, so they can be re-loaded automatically on startup.
   */
  const INSTALLED_EXTENSIONS_STORAGE_KEY = "sb-installed-extensions";

  /**
   * Reads the set of persisted installed extension IDs from local storage.
   * Returns an empty set if nothing is stored or the stored value is invalid.
   */
  const readPersistedExtensionIds = (): Set<string> => {
    try {
      const raw = safeLocalStorage.getItem(INSTALLED_EXTENSIONS_STORAGE_KEY);
      if (!raw) {
        return new Set();
      }
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return new Set(parsed.filter((id) => typeof id === "string"));
      }
    } catch (err) {
      console.error("Failed to read persisted installed extensions:", err);
    }
    return new Set();
  };

  /** Writes the given set of installed extension IDs to local storage. */
  const writePersistedExtensionIds = (ids: Set<string>) => {
    try {
      safeLocalStorage.setItem(
        INSTALLED_EXTENSIONS_STORAGE_KEY,
        JSON.stringify([...ids])
      );
    } catch (err) {
      console.error("Failed to persist installed extensions:", err);
    }
  };

  /**
   * The key under which the IDs of the user's installed extensions are stored in
   * the user's profile config, so they sync to the account and are restored on
   * any device the user logs into.
   */
  const INSTALLED_EXTENSIONS_CONFIG_KEY = "installedExtensions";

  /**
   * Waits for an in-flight profile load to settle, if the user is logged in
   * and the profile hasn't resolved yet. Without this, a read of
   * `login.profile.value` taken while the profile is still loading sees an
   * empty profile, and any merge computed from it (e.g. the installed
   * extensions list) then overwrites the real, not-yet-arrived profile data
   * once the pending write actually lands. Resolves synchronously (no
   * microtask hop) when the profile has already loaded or there's nothing to
   * wait for, so callers that don't need to wait aren't forced through an
   * extra async tick.
   */
  const awaitProfileLoaded = (): Promise<void> | void => {
    if (login.userId.value && !login.profile.value && login.profilePromise) {
      return login.profilePromise.then(
        () => undefined,
        () => undefined
      );
    }
  };

  /**
   * Reads the set of installed extension IDs from the logged-in user's profile
   * config. Returns an empty set when logged out, the profile hasn't loaded yet,
   * or the stored value isn't a string array.
   */
  const readProfileExtensionIds = (): Set<string> => {
    const value = getProfileConfigValue(
      login.profile.value,
      INSTALLED_EXTENSIONS_CONFIG_KEY
    );
    if (Array.isArray(value)) {
      return new Set(value.filter((id) => typeof id === "string"));
    }
    return new Set();
  };

  /**
   * Writes the given set of installed extension IDs to the user's profile config.
   * No-ops when logged out or when the value is unchanged (handled by
   * saveProfileConfigValue).
   */
  const writeProfileExtensionIds = (ids: Set<string>) => {
    saveProfileConfigValue(login, INSTALLED_EXTENSIONS_CONFIG_KEY, [...ids]);
  };

  /** Records that the extension with the given ID has been installed. */
  const persistInstalledExtensionId = (id: string): void | Promise<void> => {
    const ids = readPersistedExtensionIds();
    if (!ids.has(id)) {
      ids.add(id);
      writePersistedExtensionIds(ids);
    }

    // Mirror the install into the user's profile config so it follows them
    // across devices. Reads the profile set independently of local storage in
    // case the two have diverged.
    const mirrorToProfile = () => {
      const profileIds = readProfileExtensionIds();
      if (!profileIds.has(id)) {
        profileIds.add(id);
        writeProfileExtensionIds(profileIds);
      }
    };

    // Wait for the profile load first when it's still in flight, so this
    // doesn't compute against an empty profile and clobber the real list.
    // When the profile has already loaded, run synchronously — most call
    // sites don't await this, and deferring the write through an extra
    // microtask would make it observable a tick later than the caller.
    const pendingLoad = awaitProfileLoaded();
    if (!pendingLoad) {
      mirrorToProfile();
      return;
    }
    return pendingLoad.then(mirrorToProfile);
  };

  /** Removes the extension with the given ID from the persisted set. */
  const forgetInstalledExtensionId = (id: string): void | Promise<void> => {
    const ids = readPersistedExtensionIds();
    if (ids.delete(id)) {
      writePersistedExtensionIds(ids);
    }

    const forgetFromProfile = () => {
      const profileIds = readProfileExtensionIds();
      if (profileIds.delete(id)) {
        writeProfileExtensionIds(profileIds);
      }
    };

    const pendingLoad = awaitProfileLoaded();
    if (!pendingLoad) {
      forgetFromProfile();
      return;
    }
    return pendingLoad.then(forgetFromProfile);
  };

  const computeExtensions = (): ExtensionListEntry[] => {
    const knownExtensionPackages = knownExtensionsById;
    const registeredExtensions =
      ExtensionInitalizer.getInstance().listRegisteredExtensions();
    const allExtensionIds = union(
      Array.from(knownExtensionPackages.keys()),
      registeredExtensions.map((ext) => ext.id)
    );

    return allExtensionIds.map((id) => ({
      id,
      extension: knownExtensionPackages.get(id) ?? null,
      extensionSet: knownExtensionsSetsByExtensionId.get(id) ?? null,
      registration: registeredExtensions.find((ext) => ext.id === id) ?? null,
      installed:
        installedExtensionIds.has(id) ||
        ExtensionInitalizer.getInstance().isExtensionRegistered(id),
      pendingInstallation: pendingInstallations.has(id),
    }));
  };

  const extensionsSignal = signal<ExtensionListEntry[]>([]);
  const refreshExtensionsSignal = () => {
    extensionsSignal.value = computeExtensions();
  };

  const trackExtensionSet = (set: ExtensionSet) => {
    for (const extension of set.extensions) {
      knownExtensionsById.set(extension.meta.id, extension);
    }
    refreshExtensionsSignal();
  };

  const isSatisfiedDependency = (id: string) => {
    const initializer = ExtensionInitalizer.getInstance();
    return (
      installedExtensionIds.has(id) || initializer.isExtensionRegistered(id)
    );
  };

  // /**
  //  * Loads the given extension package by installing it from the provided record name and address. If the installation is successful, the extension ID will be added to the set of installed extensions and an "onExtensionInstalled" event will be shouted with the extension ID as a parameter.
  //  * @param id The ID of the extension to install.
  //  * @param recordName The name of the record that the extension package is stored in.
  //  * @param address The address of the extension package to install.
  //  */
  // const loadExtensionFromPackage = async (
  //   id: string,
  //   recordName: string,
  //   address: string
  // ) => {
  //   if (isSatisfiedDependency(id)) {
  //     return true;
  //   }

  //   try {
  //     const result = await os.installPackage(recordName, address);
  //     if (result.success) {
  //       installedExtensionIds.add(id);
  //      refreshExtensionsSignal();
  //       shout("onExtensionInstalled", id);
  //       console.log(`Successfully installed extension: ${id}`);
  //       return true;
  //     } else {
  //     refreshExtensionsSignal();
  //       console.error(`Failed to install extension ${id}:`, result);
  //       return false;
  //     }
  //   } catch (err) {
  //   refreshExtensionsSignal();
  //     console.error("Failed to install extension:", id, err);
  //     return false;
  //   }
  // };

  /**
   * Loads the given extension package by installing it from the provided record name and address. If the installation is successful, the extension ID will be added to the set of installed extensions and an "onExtensionInstalled" event will be shouted with the extension ID as a parameter.
   * @param id The ID of the extension to install.
   * @param url The URL of the extension package to install.
   */
  const loadExtensionFromUrl = async (id: string, url: string) => {
    if (isSatisfiedDependency(id)) {
      return true;
    }

    try {
      const mod: unknown = await import(/** @vite-ignore */ url);
      if (!isExtensionModule(mod)) {
        refreshExtensionsSignal();
        console.error(
          `Failed to install extension '${id}': the module at '${url}' does not \`export default\` a function. Extensions must export a default function that triggers registration when called.`
        );
        return false;
      }
      await mod.default();
      installedExtensionIds.add(id);
      refreshExtensionsSignal();
      // shout("onExtensionInstalled", id);
      console.log(`Successfully installed extension: ${id}`);
      return true;
    } catch (err) {
      refreshExtensionsSignal();
      console.error("Failed to install extension:", id, err);
      return false;
    }
  };

  /**
   * Loads the given extension, along with its dependencies if they are not already registered. If a dependency is not registered but is included in the known extensions map, then it will be loaded first. Circular dependencies are detected and will cause the loading to fail.
   * @param uploaded The extension to load.
   * @param installStack The stack of extensions currently being installed in the chain of dependencies. This is used to detect circular dependencies and should not be provided when calling this function externally.
   */
  const loadExtension = async (
    uploaded: Extension,
    installStack: Set<string> = new Set()
  ) => {
    const extensionId = uploaded.meta.id;
    knownExtensionsById.set(extensionId, uploaded);
    refreshExtensionsSignal();

    if (pendingInstallations.has(extensionId)) {
      return pendingInstallations.get(extensionId)!;
    }

    const installationPromise = (async () => {
      if (isSatisfiedDependency(extensionId)) {
        return true;
      }

      if (installStack.has(extensionId)) {
        console.error(
          `Failed to install extension '${extensionId}': circular dependency detected in extension package metadata.`
        );
        return false;
      }

      installStack.add(extensionId);

      const dependencies = uploaded.meta.dependencies ?? [];
      for (const dependencyId of dependencies) {
        if (isSatisfiedDependency(dependencyId)) {
          continue;
        }

        const dependency = knownExtensionsById.get(dependencyId);
        if (!dependency) {
          installStack.delete(extensionId);
          console.error(
            `Failed to install extension '${extensionId}': dependency '${dependencyId}' is not registered and was not found in loaded extension sets.`
          );
          return false;
        }

        const loadedDependency = await loadExtension(dependency, installStack);
        if (!loadedDependency) {
          installStack.delete(extensionId);
          console.error(
            "Failed to install extension:",
            extensionId,
            "- dependency failed to load:",
            dependencyId
          );
          return false;
        }
      }

      const translations = uploaded.loadFullTranslations
        ? await uploaded.loadFullTranslations()
        : uploaded.meta.translations;
      addTranslations(uploaded.meta.id, translations);

      if ("url" in uploaded && uploaded.url) {
        const installed = await loadExtensionFromUrl(extensionId, uploaded.url);
        installStack.delete(extensionId);
        return installed;
      } else if ("import" in uploaded && uploaded.import) {
        try {
          const mod: unknown = await uploaded.import();
          if (!isExtensionModule(mod)) {
            console.error(
              `Failed to install extension '${extensionId}': its module does not \`export default\` a function. Extensions must export a default function that triggers registration when called.`
            );
            installStack.delete(extensionId);
            return false;
          }
          await mod.default();
        } catch (err) {
          installStack.delete(extensionId);
          console.error("Failed to install extension:", extensionId, err);
          return false;
        }
        installStack.delete(extensionId);
        return true;
      } else {
        console.warn(
          "Extension package is missing installation information (url for package installation). Marking as installed without actually installing:",
          uploaded
        );
      }
      installStack.delete(extensionId);
      return true;
    })();

    pendingInstallations.set(extensionId, installationPromise);
    refreshExtensionsSignal();
    try {
      const result = await installationPromise;
      if (result) {
        await persistInstalledExtensionId(extensionId);
      }
      return result;
    } finally {
      pendingInstallations.delete(extensionId);
      refreshExtensionsSignal();
    }
  };

  /**
   * Loads the extensions from the given extension set.
   * @param set The extension set to load.
   * @param filter The filter function to determine which extensions within the set should be loaded. By default, all extensions in the set will be loaded.
   */
  const loadExtensionSet = async (
    set: ExtensionSet,
    filter: (ext: Extension) => boolean = () => true
  ) => {
    trackExtensionSet(set);

    const promises: Promise<boolean>[] = [];
    for (const ext of set.extensions) {
      knownExtensionsById.set(ext.meta.id, ext);
      knownExtensionsSetsByExtensionId.set(ext.meta.id, set);
      addTranslations(ext.meta.id, ext.meta.translations);
      refreshExtensionsSignal();
      if (!filter(ext)) {
        continue;
      }
      promises.push(loadExtension(ext));
    }

    const results = await Promise.all(promises);
    const successCount = results.filter((r) => r).length;
    console.log(
      `Finished loading extension set '${set.id}'. Successfully loaded ${successCount} out of ${set.extensions.length} extensions.`
    );
    // shout("onExtensionSetLoaded", set.id);
  };

  /**
   * Loads the extensions that the user previously installed. The saved set is
   * the union of the IDs persisted in local storage and the IDs stored in the
   * logged-in user's profile config — so extensions installed while logged out
   * are adopted into the account, and extensions installed on another device are
   * installed here. The merged set is written back to both stores. Extensions
   * that are already installed are skipped, and IDs that are not part of any
   * known extension set are left in storage (a later build may reintroduce them)
   * but skipped for now.
   */
  const loadSavedExtensions = async () => {
    await awaitProfileLoaded();
    const localIds = readPersistedExtensionIds();
    const profileIds = readProfileExtensionIds();
    const savedIds = new Set([...localIds, ...profileIds]);

    // Write the merged set back to both stores so the two stay in sync.
    if (savedIds.size !== localIds.size) {
      writePersistedExtensionIds(savedIds);
    }
    if (savedIds.size !== profileIds.size) {
      writeProfileExtensionIds(savedIds);
    }

    const promises: Promise<boolean>[] = [];
    for (const id of savedIds) {
      if (isSatisfiedDependency(id)) {
        continue;
      }

      const extension = knownExtensionsById.get(id);
      if (!extension) {
        console.warn(
          `Saved extension '${id}' is not available in the known extensions; skipping.`
        );
        continue;
      }

      promises.push(loadExtension(extension));
    }

    await Promise.all(promises);
  };

  /**
   * Loads the default set of extensions specified in bot tags, then re-loads any
   * extensions the user previously installed (persisted in local storage).
   */
  const loadDefaultExtensions = async () => {
    if (!defaultExtensions) {
      console.warn("No available extensions found in bot tags.");
      return;
    }
    console.log("Loading default extension set:", defaultExtensions);
    const url = new URL(window.location.href);
    await loadExtensionSet(
      defaultExtensions,
      (ext) =>
        (ext.meta.autoinstall ||
          url.searchParams.get(`autoinstall-${ext.meta.id}`) === "true") ??
        false
    );

    await loadSavedExtensions();
  };

  /**
   * Unloads the extension with the given ID by unregistering it and removing it from the set of installed extensions. An "onExtensionUninstalled" event will be shouted with the extension ID as a parameter.
   * @param id The ID of the extension to unload.
   */
  const unloadExtension = (id: string) => {
    unregisterExtension(id);
    installedExtensionIds.delete(id);
    void forgetInstalledExtensionId(id);
    refreshExtensionsSignal();
  };

  /**
   * Gets the list of extensions that have been discovered from loaded extension sets.
   */
  const getExtensions = () => {
    return extensionsSignal.value;
  };

  /**
   * Gets all extensions as a set.
   */
  const getAllExtensionsAsSet = () => {
    const extensionsToDownload = extensionsSignal.value
      .filter((ext) => ext.extension)
      .map((ext) => ext.extension) as UploadedExtension[];
    if (extensionsToDownload.length === 0) {
      console.warn("No extensions available to download.");
      return;
    }

    const orderedExtensions = orderBy(
      extensionsToDownload,
      [(ext) => ext?.meta.id],
      ["asc"]
    );

    const stableJson = stringify(orderedExtensions);
    const hash = sha256().update(stableJson).digest("hex");

    const setData: ExtensionSet = {
      id: `downloaded-extension-set-${hash.slice(0, 8)}`,
      extensions: orderedExtensions,
    };

    return setData;
  };

  // Re-sync the user's saved extensions when they log in. The installed-extension
  // IDs live on the user's profile config, which loads asynchronously after
  // login, so we react to `login.profile` (not just `login.userId`) and sync once
  // per user. Logging out resets the guard so a later login re-syncs; it does not
  // uninstall anything, since extensions remain locally installed and persisted.
  const syncedUserId = signal<string | null>(null);
  effect(() => {
    const userId = login.userId.value;
    const profile = login.profile.value;
    if (!userId) {
      syncedUserId.value = null;
      return;
    }
    if (!profile || syncedUserId.value === userId) {
      return;
    }
    syncedUserId.value = userId;
    void loadSavedExtensions();
  });

  refreshExtensionsSignal();

  return {
    loadDefaultExtensions,
    loadSavedExtensions,
    loadExtensionSet,
    loadExtension,
    unloadExtension,

    extensions: extensionsSignal,
    getExtensions,

    getAllExtensionsAsSet,
  };
}
