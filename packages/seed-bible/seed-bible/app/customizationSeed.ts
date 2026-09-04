import type { InitialCustomizationSeed } from "../managers/CustomizationsManager";

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
  if (typeof document === "undefined") {
    return undefined;
  }
  const el = document.getElementById("app-customization-seed");
  if (!el?.textContent) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(el.textContent);
    return parsed && typeof parsed === "object" ? parsed : undefined;
  } catch (error) {
    console.error("CUSTOMIZATION SEED JSON PARSE FAILED:", error);
    return undefined;
  }
}
