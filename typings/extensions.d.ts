declare module "virtual:@extensions" {
  import type { ExtensionSet } from "@packages/seed-bible/seed-bible/managers/ExtensionManager";

  const extensions: ExtensionSet;
  export default extensions;
}
