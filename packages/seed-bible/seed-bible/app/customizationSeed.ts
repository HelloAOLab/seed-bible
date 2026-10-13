import type { InitialCustomizationSeed } from "../managers/CustomizationsManager";
import { readInjectedJsonObject } from "./injectedJson";

/**
 * Reads the SSR `?customization=...` load result the host server injected as
 * a JSON `<script>` tag (see `entry-ssr.tsx`'s `<!-- CUSTOMIZATION_JSON -->`
 * placeholder and `CustomizationsManager.getInitialCustomizationSeed`). The
 * client passes this to `createSeedBibleState` (`initialCustomizationSeed`)
 * so its own `CustomizationsManager` doesn't re-fetch a `?customization=...`
 * record the server already resolved.
 */
export function readInjectedCustomizationSeed():
  | InitialCustomizationSeed
  | undefined {
  return readInjectedJsonObject<InitialCustomizationSeed>(
    "app-customization-seed"
  );
}
