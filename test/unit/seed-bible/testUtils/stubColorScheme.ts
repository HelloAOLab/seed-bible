import { stubMediaQuery } from "./stubMediaQuery";

/**
 * Pins `matchMedia("(prefers-color-scheme: dark)")` to `dark` and returns a
 * function that fires a change on every listener, standing in for the viewer
 * flipping their device between light and dark. Call `vi.unstubAllGlobals()`
 * in an `afterEach`.
 */
export function stubColorScheme(dark: boolean): (matches: boolean) => void {
  return stubMediaQuery("(prefers-color-scheme: dark)", dark);
}
