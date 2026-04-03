import type { SeedBibleState } from "seed-bible.managers.SeedBibleStateManager";

export type { SeedBibleState };

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
