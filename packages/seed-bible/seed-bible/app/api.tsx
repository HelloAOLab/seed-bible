import type { SeedBibleState } from "../managers/SeedBibleStateManager";
import {
  getExtensionExports as getManagerExtensionExports,
  registerExtension as registerManagerExtension,
} from "../managers/ExtensionManager";
import type {
  CleanupFunction,
  ExtensionDependencies,
  ExtensionInitializer,
  ExtensionRegistration,
} from "../managers/ExtensionManager";

export type { SeedBibleState };
export type {
  CleanupFunction,
  ExtensionDependencies,
  ExtensionInitializer,
  ExtensionRegistration,
};

export function getExtensionExports<T extends object>(id: string): T | null {
  return getManagerExtensionExports<T>(id);
}

export function registerExtension(
  extension: ExtensionRegistration
): CleanupFunction {
  return registerManagerExtension(extension);
}
