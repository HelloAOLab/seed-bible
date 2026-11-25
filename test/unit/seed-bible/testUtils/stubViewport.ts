import { stubMediaQuery } from "./stubMediaQuery";

export interface StubbedDevice {
  /** `window.innerWidth`. */
  width: number;
  /** `window.innerHeight`. */
  height: number;
  /** `screen.width`/`.height`. jsdom reports 0 × 0 when left out. */
  screen?: { width: number; height: number };
  /** The main pointer. Defaults to `"fine"`. */
  pointer?: "coarse" | "fine";
}

const restores: Array<() => void> = [];

function override(target: object, key: string, value: number): void {
  const own = Object.getOwnPropertyDescriptor(target, key);
  Object.defineProperty(target, key, { value, configurable: true });
  restores.push(() => {
    if (own) {
      Object.defineProperty(target, key, own);
    } else {
      delete (target as Record<string, unknown>)[key];
    }
  });
}

/**
 * Makes the window look like `device` to the app's viewport reading (see
 * `app/viewport.ts`). It doesn't fire `resize`: call `applyViewport()` or
 * dispatch one. Returns a function that switches the main pointer and fires
 * its `change`. Call `restoreViewport()` and `vi.unstubAllGlobals()` in an
 * `afterEach`.
 */
export function stubViewport(
  device: StubbedDevice
): (pointer: "coarse" | "fine") => void {
  override(window, "innerWidth", device.width);
  override(window, "innerHeight", device.height);
  if (device.screen) {
    override(window.screen, "width", device.screen.width);
    override(window.screen, "height", device.screen.height);
  }
  const setCoarse = stubMediaQuery(
    "(pointer: coarse)",
    device.pointer === "coarse"
  );
  return (pointer) => setCoarse(pointer === "coarse");
}

/** Undoes every `stubViewport` since the last call, newest first. */
export function restoreViewport(): void {
  while (restores.length > 0) {
    restores.pop()!();
  }
}

/** An iPhone held sideways in Safari: a wide window on a phone's screen. */
export const SIDEWAYS_PHONE: StubbedDevice = {
  width: 844,
  height: 390,
  screen: { width: 390, height: 844 },
  pointer: "coarse",
};

/** An iPad held sideways. */
export const SIDEWAYS_TABLET: StubbedDevice = {
  width: 1180,
  height: 820,
  screen: { width: 820, height: 1180 },
  pointer: "coarse",
};
