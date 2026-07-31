import type { appHooks } from "@packages/seed-bible/app/contract/hooks";

/**
 * A contract providing hooks to the application in an agnostic fashion.
 * * Currently it is only an alias (but enables ease of extension).
 */
export interface HookProvider extends appHooks {}
