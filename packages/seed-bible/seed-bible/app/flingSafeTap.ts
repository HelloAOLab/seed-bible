/**
 * Chromium treats the tap that halts a momentum ("fling") scroll as a
 * scroll-cancel gesture instead of an activation: `pointerdown` and `pointerup`
 * still fire, but no `click` follows and the element under the finger is never
 * activated. WebKit has no such rule, which is why a control wired to `onClick`
 * alone ignores the first tap after a fast flick on Android while behaving
 * normally on iOS.
 *
 * Ordinary taps therefore stay on `click`. Only a press that starts while a
 * scroll is still coasting activates from `pointerup` — the event that still
 * arrives when Chromium withholds the click. Because that click never comes,
 * opening UI from `pointerup` cannot steal a leftover mouse event.
 *
 * Reserve this for controls that are harmless to trigger while the page is
 * still moving. Chromium suppresses those clicks on purpose, so that a tap
 * aimed at stopping a scroll cannot activate whatever it happened to land on.
 */

/** How far a pointer may travel between press and release and still be a tap. */
const TAP_SLOP_PX = 12;

/** How long the `click` paired with an already-handled tap stays ignorable. */
const CLICK_AFTER_TAP_MS = 700;

/**
 * A scroll event within this window means the page is still coasting, so the
 * tap is the one Chromium may withhold a `click` for.
 */
const FLING_SCROLL_WINDOW_MS = 150;

interface PendingTap {
  pointerId: number;
  element: EventTarget;
  x: number;
  y: number;
  duringFling: boolean;
}

// Module scope rather than closure state: the handlers are rebuilt on every
// render, and a render landing between the press and the release would
// otherwise throw away the press that the release needs to match against.
let pendingTap: PendingTap | null = null;
let handledTap: { element: EventTarget; at: number } | null = null;
let lastScrollAt = 0;
let scrollWatchInstalled = false;

function isDisabled(element: EventTarget): boolean {
  return (
    (element instanceof HTMLButtonElement ||
      element instanceof HTMLInputElement) &&
    element.disabled
  );
}

function ensureScrollWatch() {
  if (scrollWatchInstalled || typeof document === "undefined") return;
  scrollWatchInstalled = true;
  document.addEventListener(
    "scroll",
    () => {
      lastScrollAt = Date.now();
    },
    { capture: true, passive: true }
  );
}

function isRecentlyScrolling(): boolean {
  return Date.now() - lastScrollAt < FLING_SCROLL_WINDOW_MS;
}

export interface FlingSafeTapHandlers {
  onPointerDown: (event: PointerEvent) => void;
  onPointerUp: (event: PointerEvent) => void;
  onPointerCancel: () => void;
  onClick: (event: MouseEvent) => void;
}

/**
 * Builds the event handlers that activate `onTap` on tap, mouse click, or
 * keyboard, including the taps Chromium withholds a `click` for.
 *
 * @param onTap Runs once per activation.
 * @param onPress Extra `pointerdown` work, e.g. press feedback.
 */
export function flingSafeTapHandlers(
  onTap: () => void,
  onPress?: (event: PointerEvent) => void
): FlingSafeTapHandlers {
  ensureScrollWatch();

  return {
    onPointerDown(event) {
      onPress?.(event);

      const element = event.currentTarget;
      // Mouse input gets a reliable `click`, so leave it to the click handler
      // and keep the drag-to-select-text behaviour of the pressed element.
      if (!element || event.pointerType === "mouse") {
        pendingTap = null;
        return;
      }

      pendingTap = {
        pointerId: event.pointerId,
        element,
        x: event.clientX,
        y: event.clientY,
        duringFling: isRecentlyScrolling(),
      };
    },

    onPointerUp(event) {
      const press = pendingTap;
      pendingTap = null;
      if (
        !press ||
        press.pointerId !== event.pointerId ||
        press.element !== event.currentTarget ||
        isDisabled(press.element)
      ) {
        return;
      }

      // A press that travelled was a drag or a swipe, not a tap.
      if (
        Math.abs(event.clientX - press.x) > TAP_SLOP_PX ||
        Math.abs(event.clientY - press.y) > TAP_SLOP_PX
      ) {
        return;
      }

      // The page was still. Chromium will send a `click`; wait for it so the
      // action cannot reveal UI under a leftover mouse event.
      if (!press.duringFling) return;

      handledTap = { element: press.element, at: Date.now() };
      onTap();
    },

    onPointerCancel() {
      pendingTap = null;
    },

    onClick(event) {
      if (
        handledTap &&
        handledTap.element === event.currentTarget &&
        Date.now() - handledTap.at < CLICK_AFTER_TAP_MS
      ) {
        handledTap = null;
        return;
      }

      onTap();
    },
  };
}

/** Clears in-flight tap state so tests cannot leak a recent-scroll flag. */
export function resetFlingSafeTapForTests() {
  pendingTap = null;
  handledTap = null;
  lastScrollAt = 0;
}
