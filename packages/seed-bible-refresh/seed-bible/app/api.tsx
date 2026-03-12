import type { TabsManager } from "seed-bible.managers.TabsManager";
import type { PanesManager } from "seed-bible.managers.PanesManager";
import type { BibleSelectorState } from "seed-bible.managers.BibleSelectorManager";
import type { FreeUseBibleAPI } from "seed-bible.managers.FreeUseBibleAPI";
import type { ConfigManager } from "seed-bible.managers.ConfigManager";
import type { ThemeManager } from "seed-bible.managers.ThemeManager";
import type { I18nManager } from "seed-bible.i18n.I18nManager";
import type { ToolsManager } from "seed-bible.managers.BibleToolsManager";

export interface ExtensionContext {
  api: FreeUseBibleAPI;
  panes: PanesManager;
  tabs: TabsManager;
  selector: BibleSelectorState;
  config: ConfigManager;
  theme: ThemeManager;
  i18n: I18nManager;
  tools: ToolsManager;
}

export type CleanupFunction = () => void;

export type ExtensionInitializer = (
  context: ExtensionContext
) => Iterable<CleanupFunction, void, unknown> | void;

export interface ExtensionRegistration {
  id: string;
  init: ExtensionInitializer;
}

const registeredExtensions = new Map<string, ExtensionRegistration>();
const extensionCleanupFunctions = new Map<string, CleanupFunction[]>();
const initializedExtensionIds = new Set<string>();

let extensionContext: ExtensionContext | null = null;

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

export function setupExtensionContext(context: ExtensionContext) {
  extensionContext = context;

  for (const extensionId of registeredExtensions.keys()) {
    tryInitializeExtension(extensionId);
  }
}
