import type { SeedBibleState } from "seed-bible.managers.SeedBibleStateManager";

export type { SeedBibleState };

export type CleanupFunction = () => void;

export type ExtensionInitializer = (
  context: SeedBibleState
) => Iterable<CleanupFunction, void, unknown> | void;

export interface ExtensionRegistration {
  id: string;
  init: ExtensionInitializer;
}

const registeredExtensions = new Map<string, ExtensionRegistration>();
const extensionCleanupFunctions = new Map<string, CleanupFunction[]>();
const initializedExtensionIds = new Set<string>();

let extensionContext: SeedBibleState | null = null;

function tryInitializeExtension(id: string) {
  if (initializedExtensionIds.has(id)) {
    return;
  }

  if (!extensionContext) {
    return;
  }

  const extension = registeredExtensions.get(id);
  if (!extension) {
    return;
  }

  initializedExtensionIds.add(id);

  try {
    const cleanupIterator = extension.init(extensionContext);
    const cleanupFunctions: CleanupFunction[] = [];
    if (cleanupIterator) {
      for (const cleanup of cleanupIterator) {
        if (typeof cleanup === "function") {
          cleanupFunctions.push(cleanup);
        }
      }
    }
    if (cleanupFunctions.length > 0) {
      extensionCleanupFunctions.set(id, cleanupFunctions);
    }
  } catch (error) {
    initializedExtensionIds.delete(id);
    console.error(`Failed to initialize extension '${id}'.`, error);
  }
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

  tryInitializeExtension(extension.id);

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
  };
}

export function setupExtensionContext(context: SeedBibleState) {
  extensionContext = context;

  for (const extensionId of registeredExtensions.keys()) {
    tryInitializeExtension(extensionId);
  }
}
