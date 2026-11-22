import type { ComponentChild } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { Tooltip, type TooltipAnchor } from "../Tooltip/Tooltip";

/** How long the pointer or keyboard focus rests on something before its label shows. */
const SHOW_DELAY_MS = 500;
/**
 * After a label hides, the next one shows at once for this long, so moving
 * along a toolbar reads each button's label without waiting on every one.
 */
const WARM_MS = 300;
/** How long a finger holds before the label shows. */
const HOLD_MS = 500;
/** A finger that travels farther than this is scrolling, not holding. */
const HOLD_MOVE_PX = 10;
/** How long a label from a press-and-hold stays up after the finger lifts. */
const HOLD_LINGER_MS = 1500;

/** The tooltip on screen now, so showing another one can take it down first. */
let active: { hide: () => void } | null = null;
let lastHiddenAt = -Infinity;

const isDisabled = (element: HTMLElement) => element.matches(":disabled");

type Handler<E extends Event> = (
  event: E & { currentTarget: HTMLElement }
) => void;

/** The event handlers that make an element show a tooltip. Spread them on it. */
export interface TooltipTriggerHandlers {
  onPointerEnter: Handler<PointerEvent>;
  onPointerLeave: Handler<PointerEvent>;
  onPointerDown: Handler<PointerEvent>;
  onPointerMove: Handler<PointerEvent>;
  onPointerUp: Handler<PointerEvent>;
  onPointerCancel: Handler<PointerEvent>;
  onFocus: Handler<FocusEvent>;
  onBlur: Handler<FocusEvent>;
  onKeyDown: Handler<KeyboardEvent>;
  onContextMenu: Handler<MouseEvent>;
  onClickCapture: Handler<MouseEvent>;
}

/**
 * Shows `label` in a styled tooltip over the element that gets the returned
 * handlers: after a short rest of the mouse or keyboard focus, and, on a
 * touch screen, after holding a finger on it. Render `tooltip` next to the
 * element (it draws into `document.body`, so it adds nothing to the layout).
 *
 * The tooltip doesn't name the element for screen readers; the caller keeps
 * its own accessible name (an icon button's `aria-label`).
 */
export function useTooltip(label: string): {
  handlers: TooltipTriggerHandlers;
  tooltip: ComponentChild;
} {
  const [anchor, setAnchor] = useState<TooltipAnchor | null>(null);
  const shown = useRef(false);
  const showTimer = useRef<ReturnType<typeof setTimeout>>();
  const lingerTimer = useRef<ReturnType<typeof setTimeout>>();
  const holdTimer = useRef<ReturnType<typeof setTimeout>>();
  const holdStart = useRef<{ x: number; y: number } | null>(null);
  // Set once a held finger has shown the label, so the lift that follows isn't
  // also taken as a tap (which would run the button's action) or as the
  // browser's own long-press menu.
  const heldOpen = useRef(false);
  // The element the label is over, and whether it was already disabled when
  // the label opened (a disabled button's label is fine; one that turns
  // disabled under its label, like a send button after sending, isn't).
  const shownFor = useRef<{ element: HTMLElement; disabled: boolean } | null>(
    null
  );
  const self = useRef({ hide: () => {} }).current;

  const show = (element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    if (active && active !== self) active.hide();
    active = self;
    shown.current = true;
    shownFor.current = { element, disabled: isDisabled(element) };
    setAnchor({
      x: rect.left + rect.width / 2,
      y: rect.top,
      width: rect.width,
      height: rect.height,
    });
  };

  const hide = () => {
    clearTimeout(showTimer.current);
    clearTimeout(lingerTimer.current);
    heldOpen.current = false;
    if (shown.current) {
      shown.current = false;
      shownFor.current = null;
      if (active === self) active = null;
      lastHiddenAt = Date.now();
      setAnchor(null);
    }
  };
  self.hide = hide;

  const cancelHold = () => {
    clearTimeout(holdTimer.current);
    holdTimer.current = undefined;
    holdStart.current = null;
  };

  const showSoon = (element: HTMLElement) => {
    clearTimeout(showTimer.current);
    if (!label) return;
    const warm = Date.now() - lastHiddenAt < WARM_MS;
    if (warm) {
      show(element);
    } else {
      showTimer.current = setTimeout(() => show(element), SHOW_DELAY_MS);
    }
  };

  useEffect(
    () => () => {
      clearTimeout(showTimer.current);
      clearTimeout(lingerTimer.current);
      clearTimeout(holdTimer.current);
      if (shown.current) {
        shown.current = false;
        if (active === self) active = null;
        lastHiddenAt = Date.now();
      }
    },
    []
  );

  // Not every browser sends `blur` when the focused button becomes disabled,
  // which would leave its label up over everything.
  useEffect(() => {
    const current = shownFor.current;
    if (current && !current.disabled && isDisabled(current.element)) hide();
  });

  // A scroll moves the element out from under a tooltip that doesn't follow it.
  useEffect(() => {
    if (!anchor) return;
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
    return () => {
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
    };
  }, [anchor !== null]);

  const handlers: TooltipTriggerHandlers = {
    onPointerEnter: (event) => {
      if (event.pointerType === "touch") return;
      showSoon(event.currentTarget);
    },
    onPointerLeave: (event) => {
      if (event.pointerType === "touch") return;
      hide();
    },
    onPointerDown: (event) => {
      if (event.pointerType !== "touch") {
        // A click is the answer to what the label would have told you.
        hide();
        return;
      }
      const element = event.currentTarget;
      heldOpen.current = false;
      // With no label to show, a hold is only a slow tap and must stay one.
      if (!label) return;
      holdStart.current = { x: event.clientX, y: event.clientY };
      clearTimeout(holdTimer.current);
      holdTimer.current = setTimeout(() => {
        holdTimer.current = undefined;
        holdStart.current = null;
        heldOpen.current = true;
        show(element);
      }, HOLD_MS);
    },
    onPointerMove: (event) => {
      const start = holdStart.current;
      if (
        start &&
        Math.hypot(event.clientX - start.x, event.clientY - start.y) >
          HOLD_MOVE_PX
      ) {
        cancelHold();
      }
    },
    onPointerUp: () => {
      cancelHold();
      if (heldOpen.current) {
        clearTimeout(lingerTimer.current);
        lingerTimer.current = setTimeout(hide, HOLD_LINGER_MS);
      }
    },
    onPointerCancel: () => {
      cancelHold();
      if (heldOpen.current) hide();
    },
    onFocus: (event) => {
      let keyboard = true;
      try {
        // Focus from a click or tap shouldn't also open a label.
        keyboard = event.currentTarget.matches(":focus-visible");
      } catch {
        // A browser without :focus-visible: treat every focus as the keyboard's.
      }
      if (keyboard) showSoon(event.currentTarget);
    },
    onBlur: () => hide(),
    onKeyDown: (event) => {
      if (event.key === "Escape") hide();
    },
    onContextMenu: (event) => {
      if (heldOpen.current) event.preventDefault();
    },
    onClickCapture: (event) => {
      if (heldOpen.current) {
        heldOpen.current = false;
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
  };

  return {
    handlers,
    tooltip:
      anchor && label ? (
        <Tooltip anchor={anchor} compact>
          <span aria-hidden="true">{label}</span>
        </Tooltip>
      ) : null,
  };
}

/**
 * `own` with the tooltip handlers added. Where both define the same handler,
 * `own`'s runs first, so an element keeps its own `onClick`, `onFocus` and so on.
 */
export function withTooltipHandlers<P extends object>(
  own: P,
  handlers: TooltipTriggerHandlers
): P & TooltipTriggerHandlers {
  const ownProps = { ...own } as Record<string, unknown>;
  const merged = { ...ownProps };
  for (const [name, handler] of Object.entries(handlers)) {
    const existing = ownProps[name];
    merged[name] =
      typeof existing === "function"
        ? (event: Event) => {
            existing(event);
            (handler as (event: Event) => void)(event);
          }
        : handler;
  }
  return merged as P & TooltipTriggerHandlers;
}
