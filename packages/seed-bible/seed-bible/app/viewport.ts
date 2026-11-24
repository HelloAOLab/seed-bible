/**
 * App-wide mobile breakpoint, in pixels. A window at or below this width uses
 * the mobile layout (drawer sidebar, mobile header, full-screen selector), and
 * so does a phone at any width (see {@link isMobileViewport}). Styles don't
 * repeat this number: they read `isMobile` through the `data-sb-app-layout`
 * attribute on `<html>` (see `app/layoutAttribute.ts`).
 */
export const MOBILE_BREAKPOINT = 480;

/** What the app measures about the window to pick its layout. */
export interface ViewportMeasurement {
  /** `window.innerWidth`: the window, or the frame the app is embedded in. */
  width: number;
  /** `window.innerHeight`. */
  height: number;
  /** Whether the main pointer is a finger (`(pointer: coarse)`). */
  coarsePointer: boolean;
  /**
   * The screen's shorter side, in CSS pixels. Unlike the window it doesn't
   * change when a keyboard opens, in split screen or inside a frame. 0 when
   * the browser doesn't report it (jsdom and some headless browsers).
   */
  screenShortSide: number;
}

/** Reads the real window. Only call where `window` exists. */
export function readViewport(): ViewportMeasurement {
  const screen = window.screen as Screen | undefined;
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    coarsePointer:
      typeof window.matchMedia === "function" &&
      window.matchMedia("(pointer: coarse)").matches,
    screenShortSide: screen ? Math.min(screen.width, screen.height) : 0,
  };
}

/**
 * Whether to use the mobile layout. Either the window is narrow, or the device
 * is a phone: its main pointer is a finger and its screen's short side is at
 * or below the breakpoint. A phone's short side is about 320–430 whichever way
 * it's held, and small tablets are 600 or more, so a phone turned sideways
 * keeps the mobile layout and a tablet never gets it. Touch laptops report a
 * fine pointer, because the trackpad or mouse is the main one.
 *
 * `index.html`'s layout fallback script repeats this rule, since it runs
 * before any of the app's code; a test checks the two agree.
 */
export function isMobileViewport(
  viewport: Pick<
    ViewportMeasurement,
    "width" | "coarsePointer" | "screenShortSide"
  >
): boolean {
  return (
    viewport.width <= MOBILE_BREAKPOINT ||
    (viewport.coarsePointer &&
      viewport.screenShortSide > 0 &&
      viewport.screenShortSide <= MOBILE_BREAKPOINT)
  );
}
