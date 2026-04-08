import { computed } from "@preact/signals";
import { orderBy, union } from "es-toolkit";
import type { SeedBibleState } from "seed-bible.managers.SeedBibleStateManager";

declare const crypto: import("../../../../typings/AuxLibraryDefinitions").Crypto;

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

export interface ExtensionMeta {
  /**
   * The identifier of this extension, which should be unique across all extensions.
   */
  id: string;

  /**
   * The titles of this extension in different languages. The "en" key is required and serves as the default title if a specific language is not available.
   */
  titles: {
    en: string;
    [lang: string]: string;
  };

  /**
   * The descriptions of this extension in different languages. The "en" key is required and serves as the default description if a specific language is not available.
   */
  descriptions: {
    en: string;
    [lang: string]: string;
  };

  /**
   * Optional extension IDs that should be installed before this extension package.
   */
  dependencies?: string[];
}

export interface UploadedExtension {
  /**
   * The name of the record that this extension is stored in.
   */
  recordName: string;

  /**
   * The address of the uploaded extension package.
   */
  address: string;

  /**
   * The metadata for this extension.
   */
  meta: ExtensionMeta;
}

export interface ExtensionSet {
  /**
   * The ID of this extension set.
   */
  id: string;

  /**
   * The name of the record that this extension set is stored in.
   */
  recordName: string;

  /**
   * The extensions included in this set.
   */
  extensions: UploadedExtension[];
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

/**
 * The list of extension IDs that should be loaded by default.
 */
export const DEFAULT_EXTENSION_IDS = new Set<string>(["ext_locations"]);

export function createExtensionManager() {
  const defaultExtensions = computed<ExtensionSet | null>(
    () => thisBot.tags.availableExtensions ?? null
  );
  const knownExtensionsById = new Map<string, UploadedExtension>();
  const knownExtensionsSetsByExtensionId = new Map<string, ExtensionSet>();
  const installedExtensionIds = new Set<string>();
  const pendingInstallations = new Map<string, Promise<boolean>>();

  const trackExtensionSet = (set: ExtensionSet) => {
    for (const extension of set.extensions) {
      knownExtensionsById.set(extension.meta.id, extension);
    }
  };

  const isSatisfiedDependency = (id: string) => {
    const initializer = ExtensionInitalizer.getInstance();
    return (
      installedExtensionIds.has(id) || initializer.isExtensionRegistered(id)
    );
  };

  /**
   * Loads the given extension package by installing it from the provided record name and address. If the installation is successful, the extension ID will be added to the set of installed extensions and an "onExtensionInstalled" event will be shouted with the extension ID as a parameter.
   * @param id The ID of the extension to install.
   * @param recordName The name of the record that the extension package is stored in.
   * @param address The address of the extension package to install.
   */
  const loadExtensionFromPackage = async (
    id: string,
    recordName: string,
    address: string
  ) => {
    if (isSatisfiedDependency(id)) {
      return true;
    }

    try {
      const result = await os.installPackage(recordName, address);
      if (result.success) {
        installedExtensionIds.add(id);
        shout("onExtensionInstalled", id);
        console.log(`Successfully installed extension: ${id}`);
        return true;
      } else {
        console.error(`Failed to install extension ${id}:`, result);
        return false;
      }
    } catch (err) {
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
    uploaded: UploadedExtension,
    installStack: Set<string> = new Set()
  ) => {
    const extensionId = uploaded.meta.id;
    knownExtensionsById.set(extensionId, uploaded);

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
          return false;
        }
      }

      const installed = await loadExtensionFromPackage(
        extensionId,
        uploaded.recordName,
        uploaded.address
      );
      installStack.delete(extensionId);
      return installed;
    })();

    pendingInstallations.set(extensionId, installationPromise);
    try {
      return await installationPromise;
    } finally {
      pendingInstallations.delete(extensionId);
    }
  };

  /**
   * Loads the extensions from the given extension set.
   * @param set The extension set to load.
   * @param filter The filter function to determine which extensions within the set should be loaded. By default, all extensions in the set will be loaded.
   */
  const loadExtensionSet = async (
    set: ExtensionSet,
    filter: (ext: UploadedExtension) => boolean = () => true
  ) => {
    trackExtensionSet(set);

    const promises: Promise<boolean>[] = [];
    for (const ext of set.extensions) {
      knownExtensionsById.set(ext.meta.id, ext);
      knownExtensionsSetsByExtensionId.set(ext.meta.id, set);
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
    shout("onExtensionSetLoaded", set.id);
  };

  /**
   * Loads the default set of extensions specified in bot tags.
   */
  const loadDefaultExtensions = async () => {
    if (!defaultExtensions.value) {
      console.warn("No available extensions found in bot tags.");
      return;
    }
    console.log("Loading default extension set:", defaultExtensions.value);
    await loadExtensionSet(defaultExtensions.value, (ext) =>
      DEFAULT_EXTENSION_IDS.has(ext.meta.id)
    );
  };

  /**
   * Unloads the extension with the given ID by unregistering it and removing it from the set of installed extensions. An "onExtensionUninstalled" event will be shouted with the extension ID as a parameter.
   * @param id The ID of the extension to unload.
   */
  const unloadExtension = (id: string) => {
    unregisterExtension(id);
    installedExtensionIds.delete(id);
    shout("onExtensionUninstalled", id);
  };

  /**
   * Gets the list of extensions that have been discovered from loaded extension sets.
   */
  const getExtensions = () => {
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

  /**
   * Gets all extensions as a set.
   */
  const getAllExtensionsAsSet = () => {
    const extensionsToDownload = getExtensions().filter((ext) => ext.extension);
    if (extensionsToDownload.length === 0) {
      console.warn("No extensions available to download.");
      return;
    }

    const extensions = orderBy(
      extensionsToDownload.map((ext) => ext.extension!),
      [(ext) => ext.meta.id],
      ["asc"]
    ) as UploadedExtension[];

    const hash = crypto.sha256(extensions);

    const setData: ExtensionSet = {
      id: `downloaded-extension-set-${hash.slice(0, 8)}`,
      recordName: "",
      extensions: extensions,
    };

    return setData;
  };

  return {
    loadDefaultExtensions,
    loadExtensionSet,
    loadExtension,
    loadExtensionFromPackage,
    unloadExtension,

    getExtensions,

    getAllExtensionsAsSet,
  };
}
