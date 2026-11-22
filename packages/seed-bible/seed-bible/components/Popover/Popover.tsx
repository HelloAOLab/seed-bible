import "./Popover.css";
import type { ComponentChildren, JSX, RefObject } from "preact";
import { createPortal } from "preact/compat";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MutableRef,
} from "preact/hooks";

/** Gap between the anchor and the popover, in px. */
const DEFAULT_GAP_PX = 6;

/**
 * The popovers that are open. Only the newest answers Escape and Tab, and a
 * press inside a newer one (a menu opened from this popover) isn't a press
 * outside this one.
 */
const openPopovers: Array<{
  order: number;
  contentRef: RefObject<HTMLElement>;
}> = [];

/** Handed out in render, so a popover and the one it opens in the same render come out in order. */
let nextOrder = 0;

export interface UsePopoverOptions {
  open: boolean;
  /** The element the popover opens beside, usually its trigger or the trigger's wrapper. */
  anchorRef: RefObject<HTMLElement>;
  /** The popover's own element, so a press on it doesn't count as outside. */
  contentRef: RefObject<HTMLElement>;
  /** Asks to close: Escape, Tab, or a press outside. */
  onClose: () => void;
  /** Where focus goes when Escape or Tab closes it, usually the trigger. */
  returnFocusRef?: RefObject<HTMLElement>;
  gap?: number;
  /**
   * Whether Escape, Tab and a press outside close it. Turn it off while
   * something else holds it open and owns the keyboard (a tour step).
   */
  dismissible?: boolean;
}

/**
 * Where a popover goes and how it goes away. It opens below the anchor, or
 * above when there is more room there, lined up with the anchor's nearer edge
 * of the screen, and follows the anchor on scroll and resize. Escape, a press
 * outside, or Tab closes it; Escape and Tab also hand focus back to
 * `returnFocusRef`. With several open (a menu from a popover), only the newest
 * answers the keys.
 *
 * `Popover` and `ContextMenuWithButton` are built on this. Spread `style` on a
 * `position: fixed` element that is portaled to `document.body`.
 */
export function usePopover(options: UsePopoverOptions): {
  style: JSX.CSSProperties | undefined;
} {
  const {
    open,
    anchorRef,
    contentRef,
    returnFocusRef,
    gap = DEFAULT_GAP_PX,
    dismissible = true,
  } = options;
  const order = useRef(0);
  const wasOpen = useRef(false);
  if (open && !wasOpen.current) order.current = ++nextOrder;
  wasOpen.current = open;
  const [style, setStyle] = useState<JSX.CSSProperties | undefined>();
  const onClose = useRef(options.onClose);
  onClose.current = options.onClose;

  // A layout effect, so the popover is placed before its first paint: it has
  // no sensible place to sit while waiting a frame.
  useLayoutEffect(() => {
    if (!open) {
      setStyle(undefined);
      return;
    }

    const position = () => {
      const anchor = anchorRef.current;
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      const next: JSX.CSSProperties = { position: "fixed" };

      const alignLeft = rect.left < window.innerWidth - rect.right;
      if (alignLeft) {
        next.left = `${rect.left}px`;
      } else {
        next.right = `${window.innerWidth - rect.right}px`;
      }

      const openBelow = window.innerHeight - rect.bottom >= rect.top;
      if (openBelow) {
        next.top = `${rect.bottom + gap}px`;
      } else {
        next.bottom = `${window.innerHeight - rect.top + gap}px`;
      }

      // The opening animation grows it out of the corner by the anchor.
      next.transformOrigin = `${alignLeft ? "left" : "right"} ${
        openBelow ? "top" : "bottom"
      }`;
      setStyle(next);
    };

    position();
    const reposition = () => requestAnimationFrame(position);
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [open, gap]);

  useEffect(() => {
    if (!open || !dismissible) return;
    const entry = { order: order.current, contentRef };
    openPopovers.push(entry);
    const newer = () =>
      openPopovers.filter((other) => other.order > entry.order);

    // Portaled to <body>, a press on the popover doesn't bubble through the
    // app root, so the app-level click handlers can't tell what was pressed.
    const handlePress = (event: Event) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (anchorRef.current?.contains(target)) return;
      if (contentRef.current?.contains(target)) return;
      if (newer().some((other) => other.contentRef.current?.contains(target))) {
        return;
      }
      onClose.current();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (newer().length > 0) return;
      if (event.defaultPrevented) return;
      const target = event.target as Node | null;
      if (event.key === "Escape") {
        // Not Escape pressed somewhere else entirely (a text box focused by a
        // shortcut), which isn't asking about this popover.
        const here =
          !target ||
          target === document.body ||
          target === document.documentElement ||
          anchorRef.current?.contains(target) ||
          contentRef.current?.contains(target);
        if (!here) return;
        event.preventDefault();
        onClose.current();
        returnFocusRef?.current?.focus();
      } else if (event.key === "Tab" && contentRef.current?.contains(target)) {
        // Tab would leave a popover that sits at the end of the page for the
        // browser's own controls. Close it and put focus on the trigger. Tab
        // then carries on from there to the next control; Shift+Tab is held
        // back, or it would skip the trigger for the one before it.
        if (event.shiftKey) event.preventDefault();
        onClose.current();
        returnFocusRef?.current?.focus();
      }
    };

    document.addEventListener("mousedown", handlePress, true);
    document.addEventListener("pointerdown", handlePress, true);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePress, true);
      document.removeEventListener("pointerdown", handlePress, true);
      document.removeEventListener("keydown", handleKeyDown);
      const at = openPopovers.indexOf(entry);
      if (at >= 0) openPopovers.splice(at, 1);
    };
  }, [open, dismissible]);

  return { style };
}

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export type PopoverProps = Omit<
  JSX.HTMLAttributes<HTMLDivElement>,
  "class" | "className" | "children" | "ref" | "style"
> &
  Pick<
    UsePopoverOptions,
    "open" | "anchorRef" | "onClose" | "returnFocusRef" | "gap" | "dismissible"
  > & {
    /** The popover's element, for code that has to measure or focus inside it. */
    contentRef?: MutableRef<HTMLDivElement | null>;
    /**
     * What gets focus when it opens: a CSS selector, tried inside the popover
     * (the chosen option), then the first thing that can take focus. `false`
     * leaves focus where it was.
     */
    initialFocus?: string | false;
    /** Extra inline styles, merged under the placement the popover sets itself. */
    style?: JSX.CSSProperties;
    /** Extra classes: the popover's size, padding and surface. */
    className?: string;
    class?: string;
    children?: ComponentChildren;
  };

/**
 * A small panel that opens beside the button that opened it: draws into
 * `document.body` so no scroll area clips it, sits over the page, and closes
 * on Escape, Tab or a press outside. It has no look of its own beyond how it
 * opens; give it a `className` that sets the surface, and a `role` and name
 * that say what it is (a `dialog` of controls, a `listbox`, ...).
 *
 * Open it from a trigger that sets `aria-haspopup` and `aria-expanded`, and
 * pass the trigger as `returnFocusRef` so a keyboard user lands back on it.
 * For a menu of actions use `ContextMenuWithButton`, which is built on the
 * same behavior.
 */
export function Popover({
  open,
  onClose,
  anchorRef,
  returnFocusRef,
  gap,
  dismissible,
  contentRef,
  initialFocus = '[aria-checked="true"], [aria-selected="true"]',
  className,
  class: classAttribute,
  style: styleProp,
  children,
  ...rest
}: PopoverProps) {
  const ownRef = useRef<HTMLDivElement | null>(null);
  const ref = contentRef ?? ownRef;
  const { style } = usePopover({
    open,
    anchorRef,
    contentRef: ref,
    onClose,
    returnFocusRef,
    gap,
    dismissible,
  });

  useEffect(() => {
    if (!open || initialFocus === false) return;
    const element = ref.current;
    if (!element || element.contains(document.activeElement)) return;
    (
      element.querySelector<HTMLElement>(initialFocus) ??
      element.querySelector<HTMLElement>(FOCUSABLE) ??
      element
    ).focus();
  }, [open]);

  if (!open) return null;
  return createPortal(
    <div
      {...rest}
      ref={ref}
      tabIndex={rest.tabIndex ?? -1}
      className={["sb-popover", className, classAttribute]
        .filter(Boolean)
        .join(" ")}
      style={{ ...styleProp, ...style }}
    >
      {children}
    </div>,
    document.body
  );
}
