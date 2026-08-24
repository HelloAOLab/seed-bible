// Ambient declarations needed only by the package's own declaration build
// (`tsconfig.build.json`). The root app gets these from the repo-root
// `typings/*.d.ts` files, which this package can't rely on once built
// standalone (and `rootDir` in `tsconfig.build.json` excludes them anyway).
// Mirrors `typings/css.d.ts`, `typings/extensions.d.ts`, `typings/ImportMeta.d.ts`,
// and the `posthog` global from `typings/globals.d.ts`.

declare module "*.css" {}

declare module "virtual:@extensions" {
  import type { ExtensionSet } from "./managers/ExtensionManager";

  const extensions: ExtensionSet;
  export default extensions;
}

interface ImportMeta {
  glob: (
    pattern: string,
    options?: { eager?: boolean }
  ) => Record<string, (() => Promise<unknown> | unknown) | unknown>;

  env: Record<string, string | boolean | undefined>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const posthog: any;
