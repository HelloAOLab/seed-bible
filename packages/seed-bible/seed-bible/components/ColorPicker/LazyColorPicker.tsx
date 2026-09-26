import { lazy, Suspense } from "preact/compat";
import type { ColorPickerProps } from "./ColorPicker";

const ColorPicker = lazy(() =>
  import("./ColorPicker").then((mod) => ({ default: mod.ColorPicker }))
);

/** Start the picker chunk download before the first open (e.g. Add hover). */
export function preloadColorPicker(): void {
  void import("./ColorPicker");
}

/**
 * Same API as `ColorPicker`, but the JS/CSS chunk is fetched on first render
 * instead of with the reader boot bundle. The verse toolbar and settings
 * pages are always in `index.js`; this picker is not on screen then.
 */
export function LazyColorPicker(props: ColorPickerProps) {
  return (
    <Suspense fallback={null}>
      <ColorPicker {...props} />
    </Suspense>
  );
}
