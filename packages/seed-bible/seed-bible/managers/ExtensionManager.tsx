import { computed } from "@preact/signals";
import type { SeedBibleState } from "seed-bible.managers.SeedBibleStateManager";

export type CleanupFunction = () => void;
export type ExtensionDependencies = Record<string, object>;

export type ExtensionInitializer = (
  context: SeedBibleState,
  dependencies: ExtensionDependencies
) => Iterable<CleanupFunction, object, void> | object;

export interface ExtensionRegistration {
  id: string;
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

const registeredExtensions = new Map<string, ExtensionRegistration>();
const extensionCleanupFunctions = new Map<string, CleanupFunction[]>();
const extensionExports = new Map<string, object>();
const initializedExtensionIds = new Set<string>();

let extensionContext: SeedBibleState | null = null;

function tryInitializeExtension(
  id: string,
  initializationStack: Set<string> = new Set()
): boolean {
  if (initializedExtensionIds.has(id)) {
    return true;
  }

  if (!extensionContext) {
    return false;
  }

  const extension = registeredExtensions.get(id);
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
    if (!registeredExtensions.has(dependencyId)) {
      initializationStack.delete(id);
      return false;
    }

    const dependencyInitialized = tryInitializeExtension(
      dependencyId,
      initializationStack
    );
    if (!dependencyInitialized) {
      initializationStack.delete(id);
      return false;
    }

    const dependencyExport = extensionExports.get(dependencyId);
    if (!dependencyExport) {
      initializationStack.delete(id);
      return false;
    }

    dependencyExports[dependencyId] = dependencyExport;
  }

  initializedExtensionIds.add(id);

  try {
    const cleanupIteratorOrReturn = extension.init(
      extensionContext,
      dependencyExports
    );
    const cleanupFunctions: CleanupFunction[] = [];
    if (Symbol.iterator in cleanupIteratorOrReturn) {
      const iterator = cleanupIteratorOrReturn[Symbol.iterator]();
      while (true) {
        const result = iterator.next();
        if (result.done) {
          if (result.value) {
            extensionExports.set(id, result.value);
          } else {
            extensionExports.set(id, {});
          }
          break;
        }
        cleanupFunctions.push(result.value);
      }
    } else if (cleanupIteratorOrReturn) {
      extensionExports.set(id, cleanupIteratorOrReturn);
    } else {
      extensionExports.set(id, {});
    }
    if (cleanupFunctions.length > 0) {
      extensionCleanupFunctions.set(id, cleanupFunctions);
    }
    initializationStack.delete(id);
    return true;
  } catch (error) {
    initializedExtensionIds.delete(id);
    initializationStack.delete(id);
    console.error(`Failed to initialize extension '${id}'.`, error);
    return false;
  }
}

function tryInitializeRegisteredExtensions() {
  let madeProgress = true;

  while (madeProgress) {
    madeProgress = false;

    for (const extensionId of registeredExtensions.keys()) {
      if (initializedExtensionIds.has(extensionId)) {
        continue;
      }

      const initialized = tryInitializeExtension(extensionId);
      if (initialized) {
        madeProgress = true;
      }
    }
  }
}

export function getExtensionExports<T extends object>(id: string): T | null {
  return (extensionExports.get(id) as T) ?? null;
}

export function registerExtension(
  extension: ExtensionRegistration
): CleanupFunction {
  if (!extension?.id || typeof extension.id !== "string") {
    throw new Error("registerExtension() requires a non-empty string id.");
  }

  if (typeof extension.init !== "function") {
    throw new Error("registerExtension() requires an init(context) function.");
  }

  registeredExtensions.set(extension.id, extension);

  // Allow a replacement registration for the same id to re-run init.
  initializedExtensionIds.delete(extension.id);

  tryInitializeRegisteredExtensions();

  return () => {
    const cleanupFunctions = extensionCleanupFunctions.get(extension.id) ?? [];
    for (const cleanup of cleanupFunctions) {
      try {
        cleanup();
      } catch (err) {
        console.error(
          `Error during cleanup of extension '${extension.id}':`,
          err
        );
      }
    }
    extensionCleanupFunctions.delete(extension.id);
    registeredExtensions.delete(extension.id);
    initializedExtensionIds.delete(extension.id);
    extensionExports.delete(extension.id);
  };
}

export function setupExtensionContext(context: SeedBibleState) {
  extensionContext = context;
  tryInitializeRegisteredExtensions();
}

export type ExtensionManager = ReturnType<typeof createExtensionManager>;

export function createExtensionManager() {
  const defaultExtensions = computed<ExtensionSet | null>(
    () => thisBot.tags.availableExtensions ?? null
  );

  const loadExtensionFromPackage = async (
    id: string,
    recordName: string,
    address: string
  ) => {
    try {
      const result = await os.installPackage(recordName, address);
      if (result.success) {
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

  const loadExtension = async (uploaded: UploadedExtension) =>
    await loadExtensionFromPackage(
      uploaded.meta.id,
      uploaded.recordName,
      uploaded.address
    );

  const loadExtensionSet = async (set: ExtensionSet) => {
    const promises = set.extensions.map((ext) => loadExtension(ext));
    const results = await Promise.all(promises);
    const successCount = results.filter((r) => r).length;
    console.log(
      `Finished loading extension set '${set.id}'. Successfully loaded ${successCount} out of ${set.extensions.length} extensions.`
    );
    shout("onExtensionSetLoaded", set.id);
  };

  const loadDefaultExtensions = async () => {
    if (!defaultExtensions.value) {
      console.warn("No available extensions found in bot tags.");
      return;
    }
    console.log("Loading default extension set:", defaultExtensions.value);
    await loadExtensionSet(defaultExtensions.value);
  };

  return {
    loadDefaultExtensions,
    loadExtensionSet,
    loadExtension,
    loadExtensionFromPackage,
  };
}
