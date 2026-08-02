import type { SeedBibleState } from "../managers/SeedBibleStateManager";
import type {
  CleanupFunction,
  ExtensionDependencies,
  ExtensionInitializer,
  ExtensionRegistration,
} from "../managers/ExtensionManager";
import type {
  BibleReadingExtensionManager,
  DiscoveredContentHook,
  ReadingExtensionContext,
  ReadingExtensionDefinition,
  ReadingExtensionInstance,
  ReadingExtensionRuntime,
  ReadingNavigationHook,
  ReadingNavigationHookContext,
  ReadingNavigationOutcome,
} from "../managers/BibleReadingExtensionManager";
export type { SeedBibleState };
export type {
  CleanupFunction,
  ExtensionDependencies,
  ExtensionInitializer,
  ExtensionRegistration,
};
export type {
  BibleReadingExtensionManager,
  DiscoveredContentHook,
  ReadingExtensionContext,
  ReadingExtensionDefinition,
  ReadingExtensionInstance,
  ReadingExtensionRuntime,
  ReadingNavigationHook,
  ReadingNavigationHookContext,
  ReadingNavigationOutcome,
};
export declare function getExtensionExports<T extends object>(
  id: string
): T | null;
export declare function registerExtension(
  extension: ExtensionRegistration
): CleanupFunction;
