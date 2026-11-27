import "./BottomSheet.css";
import type { ComponentChild, ComponentChildren, JSX, Ref } from "preact";
import { createPortal } from "preact/compat";
import { useCallback, useEffect, useRef } from "preact/hooks";
import { useSignal } from "@preact/signals";
import { useI18n } from "../../i18n/I18nContext";
import { useOverlayDismiss } from "../useOverlayDismiss";
import { IconButton } from "../IconButton/IconButton";
import { useModalLayer } from "../useModalFocus";

/** A press that moves less than this is a tap, not a drag. */
const TAP_SLOP_PX = 6;
/** How far the sheet must be pushed down before releasing dismisses it. */
const DISMISS_THRESHOLD_PX = 64;
/**
 * How far an expand/collapse drag must travel before releasing commits it.
 * Half the content height instead would make a long sheet need a drag longer
 * than the screen.
 */
const EXPAND_SNAP_DISTANCE_PX = 50;

/**
 * Extra wait past the slide-out before closing anyway. `transitionend` never
 * fires if the transition is interrupted or the sheet was already off screen.
 */
const EXIT_FALLBACK_SLACK_MS = 100;

/** Things that keep their own tap/scroll behavior instead of starting a drag. */
const DEFAULT_DRAG_IGNORE_SELECTOR =
  "button, input, select, textarea, a, label";

/** Where Escape belongs to the field (clearing or cancelling an edit). */
const EDITABLE_SELECTOR =
  'textarea, select, input:not([type="checkbox"], [type="radio"], [type="button"], [type="submit"], [type="reset"], [type="range"], [type="color"]), [contenteditable]:not([contenteditable="false"])';

/**
 * Lets a sheet grow by dragging its handle up. The sheet only runs the
 * gesture; the caller owns the extra content and lays it out from the live
 * `onDragReveal` value, because only it knows what is being revealed.
 */
export interface BottomSheetExpansion {
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  /** Whether there is anything to reveal. False makes the handle inert. */
  canExpand: boolean;
  /** On-screen pixels between collapsed and fully expanded. */
  distance: number;
  /**
   * Pixels of the extra content showing while a finger is on the sheet, or
   * null once the gesture ends and the expanded state takes over again.
   */
  onDragReveal: (reveal: number | null) => void;
  expandLabel: string;
  collapseLabel: string;
}

export interface BottomSheetProps {
  /**
   * Called when the user closes the sheet. When it closes itself (✕, Escape,
   * the backdrop, or dragging it down), that's after it has slid out.
   */
  onClose: () => void;
  /**
   * Called when the sheet starts sliding out on its own (✕, Escape, the
   * backdrop, or dragging it down), before `onClose`. The page behind takes
   * taps during the slide, so a caller whose `onClose` clears state can note
   * here what to clear and leave anything the user picks meanwhile.
   */
  onCloseStart?: () => void;
  /** Accessible name of the dialog. */
  label: string;
  /** Visible title, shown in a header row with the close button. */
  title?: ComponentChildren;
  /** Material Symbols icon name shown before the title. */
  titleIcon?: string;
  /** Show the ✕ button. Defaults to true. */
  showClose?: boolean;
  /**
   * Overrides what the ✕ button does; defaults to sliding the sheet out and
   * then calling `onClose`. An override runs at once, with no slide.
   */
  onCloseButton?: () => void;
  /**
   * Overrides what Escape does; defaults to sliding out like the ✕. A sheet
   * whose ✕ goes back a step should pass the same handler, so Escape goes back
   * too.
   */
  onEscape?: () => void;
  /**
   * Whether the user may close it right now (✕, Escape, the backdrop, or
   * dragging it down). False while it is in the middle of something it
   * shouldn't be left in. Defaults to true.
   */
  dismissible?: boolean;
  closeLabel?: string;
  /**
   * The corner button's icon: a Material Symbols name, or an icon element. An
   * arrow that should point the other way in right-to-left languages is an
   * element, e.g. `<MaterialIcon className="rtl-mirror">arrow_back</MaterialIcon>`.
   */
  closeIcon?: string | ComponentChild;
  /**
   * Full-screen backdrop that closes the sheet when tapped. Defaults to true.
   * Without one the page behind stays usable, so the sheet is non-modal.
   */
  backdrop?: boolean;
  /** Render into `<body>` so no ancestor stacking context can bury it. */
  portal?: boolean;
  /**
   * Where a drag can start: only the handle and title row (the body is free to
   * scroll), or anywhere on the sheet outside `dragIgnoreSelector`.
   */
  dragSurface?: "handle" | "sheet";
  /** Extra elements, on top of buttons and inputs, that never start a drag. */
  dragIgnoreSelector?: string;
  dragDisabled?: boolean;
  expansion?: BottomSheetExpansion;
  /**
   * Wrap children in a scrolling body between the header and `footer`.
   * Turn off for a sheet that manages its own overflow.
   */
  scrollBody?: boolean;
  footer?: ComponentChildren;
  className?: string;
  style?: JSX.CSSProperties;
  sheetRef?: Ref<HTMLDivElement>;
  children?: ComponentChildren;
}

interface DragState {
  pointerId: number;
  startY: number;
  startExpanded: boolean;
  /** Extra content showing when the drag began: full when expanded, else 0. */
  startReveal: number;
  /** Furthest the pointer has travelled, used to tell a tap from a drag. */
  maxTravel: number;
  reveal: number;
}

/**
 * How long the slide-out runs, from the sheet's --sb-bottom-sheet-exit-duration.
 * 0 when it isn't set (reduced motion, or no stylesheet), which closes at once.
 */
function exitDurationMs(el: HTMLElement): number {
  const value = getComputedStyle(el)
    .getPropertyValue("--sb-bottom-sheet-exit-duration")
    .trim();
  const amount = parseFloat(value);
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return value.endsWith("ms") ? amount : amount * 1000;
}

function assignRef<T>(ref: Ref<T> | undefined, value: T | null): void {
  if (!ref) return;
  if (typeof ref === "function") ref(value);
  else ref.current = value;
}

/**
 * The shared mobile bottom sheet: rises from the
 * bottom above the toolbar layer, with a grab handle that drags it down to
 * dismiss (and up to expand, when `expansion` is given).
 */
export function BottomSheet(props: BottomSheetProps) {
  const {
    onClose,
    label,
    title,
    titleIcon,
    showClose = true,
    onCloseButton,
    closeIcon = "close",
    dismissible = true,
    backdrop = true,
    portal = true,
    dragSurface = "handle",
    dragIgnoreSelector,
    dragDisabled = false,
    expansion,
    scrollBody = true,
    footer,
    className,
    style,
    sheetRef,
    children,
  } = props;
  const { t, isRtl } = useI18n();
  const modal = backdrop;
  const closeLabel = props.closeLabel ?? t("close", { defaultValue: "Close" });

  const sheetEl = useRef<HTMLDivElement | null>(null);
  const drag = useRef<DragState | null>(null);
  const dismissOffset = useSignal(0);
  const isDragging = useSignal(false);
  /**
   * Still playing the opening rise. Dropped once it ends or a drag takes over,
   * and never put back: the drag turns the animation off, and a CSS animation
   * that comes back on replays from the start, which would drop the sheet off
   * the bottom and rise it again after every tap or drag.
   */
  const isRising = useSignal(true);
  /** Sliding out; `onClose` runs once the slide finishes. */
  const isClosing = useSignal(false);
  const cancelExit = useRef<(() => void) | null>(null);
  useEffect(() => () => cancelExit.current?.(), []);

  const close = () => {
    if (!dismissible || isClosing.value) return;
    const el = sheetEl.current;
    const duration = el ? exitDurationMs(el) : 0;
    if (!el || duration === 0) {
      onClose();
      return;
    }
    isClosing.value = true;
    props.onCloseStart?.();
    const finish = () => {
      cancelExit.current?.();
      try {
        onClose();
      } finally {
        // Normally the caller has unmounted the sheet by now. If it kept it
        // (or `onClose` threw), the sheet slides back up instead of staying
        // hidden off screen and unclosable.
        isClosing.value = false;
      }
    };
    const onTransitionEnd = (event: TransitionEvent) => {
      if (event.target === el && event.propertyName === "transform") finish();
    };
    const timer = setTimeout(finish, duration + EXIT_FALLBACK_SLACK_MS);
    el.addEventListener("transitionend", onTransitionEnd);
    cancelExit.current = () => {
      clearTimeout(timer);
      el.removeEventListener("transitionend", onTransitionEnd);
      cancelExit.current = null;
    };
  };
  const overlayDismiss = useOverlayDismiss(close);
  // Stable, so Preact doesn't detach and reattach the ref on every render
  // (which happens once per frame during a drag).
  const setSheetEl = useCallback(
    (el: HTMLDivElement | null) => {
      sheetEl.current = el;
      assignRef(sheetRef, el);
    },
    [sheetRef]
  );

  // Escape is taken even when the sheet can't be closed, so it doesn't fall
  // through to whatever is behind.
  const onEscape = () => {
    if (!dismissible) return;
    if (props.onEscape) props.onEscape();
    else close();
  };

  useModalLayer(sheetEl, { enabled: modal, onEscape });

  const handleSheetKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "Escape" || modal || event.defaultPrevented) return;
    // A non-modal sheet can hold other people's content (extension cards in
    // the verse sheet), whose fields may use Escape without preventing it.
    if ((event.target as Element | null)?.closest?.(EDITABLE_SELECTOR)) {
      return;
    }
    event.preventDefault();
    onEscape();
  };

  const canExpand = !!expansion?.canExpand;

  const endDrag = (event: PointerEvent) => {
    sheetEl.current?.releasePointerCapture?.(event.pointerId);
    drag.current = null;
    isDragging.value = false;
    dismissOffset.value = 0;
    expansion?.onDragReveal(null);
  };

  const handlePointerDown = (event: PointerEvent) => {
    if (dragDisabled || isClosing.value) return;
    const sheet = sheetEl.current;
    const target = event.target as Element | null;
    if (!sheet || !target) return;
    const ignored = target.closest(
      dragIgnoreSelector
        ? `${DEFAULT_DRAG_IGNORE_SELECTOR}, ${dragIgnoreSelector}`
        : DEFAULT_DRAG_IGNORE_SELECTOR
    );
    if (ignored && sheet.contains(ignored)) return;
    if (
      dragSurface === "handle" &&
      !target.closest(".sb-bottom-sheet-handle-area, .sb-bottom-sheet-header")
    ) {
      return;
    }

    sheet.setPointerCapture?.(event.pointerId);
    // Track the height on screen, not the full content: a sheet taller than
    // the viewport would otherwise need its whole length dragged first.
    const startExpanded = !!expansion?.expanded;
    const startReveal = startExpanded ? (expansion?.distance ?? 0) : 0;
    drag.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startExpanded,
      startReveal,
      maxTravel: 0,
      reveal: startReveal,
    };
    isDragging.value = true;
    isRising.value = false;
    // Take over from the resting state so the first move continues from where
    // the sheet is now rather than jumping.
    expansion?.onDragReveal(startReveal);
    // Keep the drag from also scrolling the page behind the sheet.
    event.preventDefault();
  };

  /*
   * The sheet follows the finger. With `expansion`, dragging up grows the extra
   * content (never past `distance`) and dragging back down shrinks it; once it
   * is fully closed, continuing down slides the whole sheet toward the bottom
   * to dismiss it, all in one motion rather than a release and a second drag.
   */
  const handlePointerMove = (event: PointerEvent) => {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    const dy = event.clientY - current.startY;
    current.maxTravel = Math.max(current.maxTravel, Math.abs(dy));

    if (expansion) {
      const reveal = Math.min(
        expansion.distance,
        Math.max(0, current.startReveal - dy)
      );
      current.reveal = reveal;
      expansion.onDragReveal(reveal);
      // How far the finger has moved past the point where the extra content
      // finished closing, so the dismiss slide starts from 0 rather than
      // jumping by however far it took to close it.
      const pastClosed = dy - current.startReveal;
      dismissOffset.value = reveal === 0 && pastClosed > 0 ? pastClosed : 0;
      return;
    }
    dismissOffset.value = Math.max(0, dy);
  };

  const handlePointerUp = (event: PointerEvent) => {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    const offset = dismissOffset.value;
    endDrag(event);

    if (current.maxTravel <= TAP_SLOP_PX) {
      if (expansion && canExpand) {
        expansion.onExpandedChange(!current.startExpanded);
      }
      return;
    }

    if (offset >= DISMISS_THRESHOLD_PX) {
      close();
      return;
    }

    if (!expansion) return;
    // Content shorter than the snap distance commits when the finger reaches
    // the end of it — there is no further to drag.
    const commitDistance = Math.min(
      EXPAND_SNAP_DISTANCE_PX,
      expansion.distance
    );
    if (!canExpand || commitDistance <= 0) {
      expansion.onExpandedChange(false);
    } else if (current.startExpanded) {
      const pulledDown = current.startReveal - current.reveal;
      expansion.onExpandedChange(pulledDown < commitDistance);
    } else {
      expansion.onExpandedChange(current.reveal >= commitDistance);
    }
  };

  const handlePointerCancel = (event: PointerEvent) => {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    endDrag(event);
    // An interrupted gesture shouldn't leave the sheet half-committed.
    expansion?.onExpandedChange(current.startExpanded);
  };

  const handleHandleKeyDown = (event: KeyboardEvent) => {
    if (!expansion || !canExpand) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      expansion.onExpandedChange(!expansion.expanded);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      expansion.onExpandedChange(true);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      expansion.onExpandedChange(false);
    } else if (event.key === "Escape" && expansion.expanded) {
      // Collapse first; a second Escape closes the sheet.
      event.preventDefault();
      expansion.onExpandedChange(false);
    }
  };

  const closePlacement = `sb-bottom-sheet-close${
    title === undefined ? " sb-bottom-sheet-close-corner" : ""
  }`;
  // One IconButton for ✕ and any other icon (such as a back arrow), not a
  // CloseButton for ✕: switching component would replace the button and drop
  // keyboard focus when a sheet swaps between the two.
  const closeButton = !showClose ? null : (
    <IconButton
      className={closePlacement}
      look="tinted"
      icon={closeIcon}
      label={closeLabel}
      disabled={!dismissible}
      onClick={onCloseButton ?? close}
    />
  );

  const offset = dismissOffset.value;
  // Closing slides the sheet off the bottom from wherever it is, including
  // partway down from a dismiss drag.
  const transform = isClosing.value
    ? "translateY(100%)"
    : offset
      ? `translateY(${offset}px)`
      : undefined;
  const sheet = (
    <>
      {backdrop && (
        <div
          className={`sb-bottom-sheet-backdrop${
            isClosing.value ? " sb-bottom-sheet-backdrop-closing" : ""
          }`}
          aria-hidden="true"
          {...overlayDismiss}
        />
      )}
      <div
        ref={setSheetEl}
        className={`sb-bottom-sheet${
          dragSurface === "sheet" ? " sb-bottom-sheet-drag-anywhere" : ""
        }${modal ? " sb-bottom-sheet-modal" : ""}${isDragging.value ? " sb-bottom-sheet-dragging" : ""}${
          isRising.value ? " sb-bottom-sheet-rising" : ""
        }${
          isClosing.value ? " sb-bottom-sheet-closing" : ""
        }${className ? ` ${className}` : ""}`}
        role="dialog"
        aria-modal={modal ? "true" : undefined}
        aria-label={label}
        // A portaled sheet sits outside the app root that carries `dir`.
        dir={isRtl ? "rtl" : "ltr"}
        tabIndex={-1}
        style={{
          ...style,
          transform,
        }}
        onKeyDown={handleSheetKeyDown}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onAnimationEnd={(event) => {
          if (event.target === event.currentTarget) isRising.value = false;
        }}
      >
        {expansion ? (
          <div
            className="sb-bottom-sheet-handle-area"
            role="button"
            tabIndex={canExpand ? 0 : -1}
            aria-expanded={expansion.expanded}
            aria-label={
              expansion.expanded
                ? expansion.collapseLabel
                : expansion.expandLabel
            }
            onKeyDown={handleHandleKeyDown}
          >
            <div className="sb-bottom-sheet-handle" />
          </div>
        ) : (
          <div className="sb-bottom-sheet-handle-area" aria-hidden="true">
            <div className="sb-bottom-sheet-handle" />
          </div>
        )}
        {title !== undefined ? (
          <div className="sb-bottom-sheet-header">
            <div className="sb-bottom-sheet-title">
              {titleIcon && (
                <span
                  className="material-symbols-outlined sb-bottom-sheet-title-icon"
                  aria-hidden="true"
                >
                  {titleIcon}
                </span>
              )}
              <span>{title}</span>
            </div>
            {closeButton}
          </div>
        ) : (
          closeButton
        )}
        {scrollBody ? (
          <div className="sb-bottom-sheet-body">{children}</div>
        ) : (
          children
        )}
        {footer}
      </div>
    </>
  );

  if (portal && typeof document !== "undefined") {
    return createPortal(sheet, document.body);
  }
  return sheet;
}
