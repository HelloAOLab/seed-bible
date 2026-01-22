import type { Environment } from "app.contract.environment";
import type { HookProvider } from "app.contract.provider";
import {
  hookProviderFactory,
  HookProviderFactory,
} from "app.bridge.hookProvider";

/**
 * The current environment the bridge is serving (mapping contract implementations).
 * * Ideally we need to create a proper build system that eliminates the need for these
 * * runtime factories.
 */
const currentEnvironment: Environment = "casualos" as const;

export const hookProvider: HookProvider =
  await hookProviderFactory.retrieveProvider(currentEnvironment);
