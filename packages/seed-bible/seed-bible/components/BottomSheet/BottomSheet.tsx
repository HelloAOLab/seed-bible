import "./BottomSheet.css";
import type { ComponentChildren, JSX, Ref } from "preact";
import { createPortal } from "preact/compat";
import { useCallback, useEffect, useLayoutEffect, useRef } from "preact/hooks";
import { useSignal } from "@preact/signals";
import { useI18n } from "../../i18n/I18nManager";
import { useOverlayDismiss } from "../useOverlayDismiss";

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

/** Things that keep their own tap/scroll behavior instead of starting a drag. */
const DEFAULT_DRAG_IGNORE_SELECTOR =
  "button, input, select, textarea, a, label";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

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
  onClose: () => void;
  /** Accessible name of the dialog. */
  label: string;
  /** Visible title, shown in a header row with the close button. */
  title?: ComponentChildren;
  /** Material Symbols icon name shown before the title. */
  titleIcon?: string;
  /** Show the ✕ button. Defaults to true. */
  showClose?: boolean;
  /** Overrides what the ✕ button does; defaults to `onClose`. */
  onCloseButton?: () => void;
  closeLabel?: string;
  closeIcon?: string;
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

function assignRef<T>(ref: Ref<T> | undefined, value: T | null): void {
  if (!ref) return;
  if (typeof ref === "function") ref(value);
  else ref.current = value;
}

/**
 * The mobile bottom sheet every sheet in the app is built on: rises from the
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
  const overlayDismiss = useOverlayDismiss(onClose);
  // Stable, so Preact doesn't detach and reattach the ref on every render
  // (which happens once per frame during a drag).
  const setSheetEl = useCallback(
    (el: HTMLDivElement | null) => {
      sheetEl.current = el;
      assignRef(sheetRef, el);
    },
    [sheetRef]
  );

  // Handlers read through a ref so the document listener added once on mount
  // always calls the latest `onClose`.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // A modal sheet takes focus while open and hands it back when it closes, so
  // keyboard and screen-reader users land where they were.
  useLayoutEffect(() => {
    if (!modal) return;
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    sheetEl.current?.focus({ preventScroll: true });
    return () => {
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, [modal]);

  useEffect(() => {
    if (!modal) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      const sheet = sheetEl.current;
      const target = event.target as Node | null;
      // Something stacked over the sheet (a modal opened from it) owns
      // Escape while it has focus.
      if (target !== document.body && !sheet?.contains(target)) return;
      event.preventDefault();
      onCloseRef.current();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [modal]);

  const handleSheetKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape" && !modal && !event.defaultPrevented) {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== "Tab" || !modal) return;
    const sheet = sheetEl.current;
    if (!sheet) return;
    const focusables = Array.from(
      sheet.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
    );
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (!first || !last) {
      event.preventDefault();
      return;
    }
    const active = document.activeElement;
    if (event.shiftKey && (active === first || active === sheet)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
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
    if (dragDisabled) return;
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
      onClose();
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

  const closeButton = showClose && (
    <button
      type="button"
      className={`sb-bottom-sheet-close${
        title === undefined ? " sb-bottom-sheet-close-corner" : ""
      }`}
      onClick={onCloseButton ?? onClose}
      aria-label={closeLabel}
      title={closeLabel}
    >
      <span
        className={`material-symbols-outlined${
          closeIcon === "arrow_back" ? " rtl-mirror" : ""
        }`}
        aria-hidden="true"
      >
        {closeIcon}
      </span>
    </button>
  );

  const offset = dismissOffset.value;
  const sheet = (
    <>
      {backdrop && (
        <div
          className="sb-bottom-sheet-backdrop"
          aria-hidden="true"
          {...overlayDismiss}
        />
      )}
      <div
        ref={setSheetEl}
        className={`sb-bottom-sheet${
          dragSurface === "sheet" ? " sb-bottom-sheet-drag-anywhere" : ""
        }${isDragging.value ? " sb-bottom-sheet-dragging" : ""}${
          className ? ` ${className}` : ""
        }`}
        role="dialog"
        aria-modal={modal ? "true" : undefined}
        aria-label={label}
        // A portaled sheet sits outside the app root that carries `dir`.
        dir={isRtl ? "rtl" : "ltr"}
        tabIndex={-1}
        style={{
          ...style,
          transform: offset ? `translateY(${offset}px)` : undefined,
        }}
        onKeyDown={handleSheetKeyDown}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
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
