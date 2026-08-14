/**
 * Chromium treats the tap that halts a momentum ("fling") scroll as a
 * scroll-cancel gesture instead of an activation: `pointerdown` and `pointerup`
 * still fire, but no `click` follows and the element under the finger is never
 * activated. WebKit has no such rule, which is why a control wired to `onClick`
 * alone ignores the first tap after a fast flick on Android while behaving
 * normally on iOS.
 *
 * These handlers activate from `pointerup` for touch and pen — events that
 * arrive even when the gesture is cancelled — and drop the `click` that follows
 * a tap Chromium did let through, so the action runs exactly once. Mouse and
 * keyboard activation still go through `click`.
 *
 * Reserve this for controls that are harmless to trigger while the page is
 * still moving. Chromium suppresses those clicks on purpose, so that a tap
 * aimed at stopping a scroll cannot activate whatever it happened to land on.
 */

/** How far a pointer may travel between press and release and still be a tap. */
const TAP_SLOP_PX = 12;

/** How long the `click` paired with an already-handled tap stays ignorable. */
const CLICK_AFTER_TAP_MS = 700;

interface PendingTap {
  pointerId: number;
  element: EventTarget;
  x: number;
  y: number;
}

// Module scope rather than closure state: the handlers are rebuilt on every
// render, and a render landing between the press and the release would
// otherwise throw away the press that the release needs to match against.
let pendingTap: PendingTap | null = null;
let handledTap: { element: EventTarget; at: number } | null = null;

function isDisabled(element: EventTarget): boolean {
  return (
    (element instanceof HTMLButtonElement ||
      element instanceof HTMLInputElement) &&
    element.disabled
  );
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
