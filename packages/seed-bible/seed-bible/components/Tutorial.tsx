import { useSignal } from "@preact/signals";
import { useI18n } from "seed-bible.i18n.I18nManager";
import type {
  TutorialManager,
  TutorialPlacement,
} from "seed-bible.managers.TutorialManager";

const { useEffect, useRef } = os.appHooks;

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const POPOVER_WIDTH = 300;
// Distance between the popover and the element it spotlights. Kept generous so
// the popover sits clearly off the target (with breathing room) rather than
// hugging it — important when the target is pinned to a screen edge (e.g. the
// bottom floating nav) and the popover would otherwise crowd it.
const GAP = 42;

/**
 * Guided coachmark tour overlay. Spotlights the current step's target element
 * (resolved from a live CSS selector) and shows a popover with prev/next/skip.
 * Re-measures on resize, scroll, and step changes. If a step's target isn't on
 * screen, the popover is centered with no spotlight.
 */
export function Tutorial({
  tutorial,
  className = "",
  groupFilter,
}: {
  tutorial: TutorialManager;
  className?: string;
  /**
   * Limits which steps this instance renders. Selector-group steps are drawn by
   * the selector itself (it owns the elements they spotlight); this instance
   * renders the rest.
   */
  groupFilter?: "selector" | "non-selector";
}) {
  const { t } = useI18n();
  const running = tutorial.running.value;
  const step = tutorial.currentStep.value;
  const canGoBack = tutorial.canGoBack.value;

  const matchesFilter =
    !groupFilter ||
    !step ||
    (groupFilter === "selector"
      ? step.group === "selector"
      : step.group !== "selector");

  // Target rect, expressed relative to the overlay element (not the viewport),
  // so positioning is correct even when the overlay lives inside a zoomed or
  // transformed ancestor (e.g. the book selector's portal). Null when missing.
  const rect = useSignal<Rect | null>(null);
  // The overlay's own size, used as the bounds for popover fit/clamping.
  const frame = useSignal<{ w: number; h: number } | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  // The popover's measured size. Positioning needs the real height (text wraps
  // and buttons reflow, especially on narrow mobile), so an estimate isn't
  // enough to guarantee the box never overlaps the highlighted element.
  const popSize = useSignal<{ w: number; h: number } | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!running || !step || !matchesFilter) {
      return;
    }

    const measure = () => {
      const el = document.querySelector(step.target);
      if (!el) {
        rect.value = null;
        return;
      }
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) {
        rect.value = null;
        return;
      }
      // Subtract the overlay's own offset so coordinates are relative to it
      // (getBoundingClientRect is always viewport-relative for both).
      const base = overlayRef.current?.getBoundingClientRect();
      const baseX = base?.left ?? 0;
      const baseY = base?.top ?? 0;
      if (base) {
        frame.value = { w: base.width, h: base.height };
      }
      rect.value = {
        top: r.top - baseY,
        left: r.left - baseX,
        width: r.width,
        height: r.height,
      };
    };

    measure();
    // Poll while the step is active so the spotlight locks on as soon as its
    // target appears/settles — the book selector, for example, lives in its own
    // app portal and opens with an animation a beat after the step begins.
    const interval = window.setInterval(measure, 150);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [running, step?.id]);

  // Measure the popover after each render and feed its real height back into
  // positioning. Guarded so it settles (only updates on an actual size change)
  // and doesn't loop.
  useEffect(() => {
    const el = popoverRef.current;
    if (!el) {
      return;
    }
    const r = el.getBoundingClientRect();
    const w = Math.round(r.width);
    const h = Math.round(r.height);
    if (!w && !h) {
      return;
    }
    const prev = popSize.value;
    if (!prev || Math.abs(prev.w - w) > 1 || Math.abs(prev.h - h) > 1) {
      popSize.value = { w, h };
    }
  });

  if (!running || !step || !matchesFilter) {
    return null;
  }

  const r = rect.value;
  const isLast = tutorial.isLast.value;
  const pad = 6;

  const spotlight: Rect | null = r
    ? {
        top: r.top - pad,
        left: r.left - pad,
        width: r.width + pad * 2,
        height: r.height + pad * 2,
      }
    : null;

  const popover = computePopover(
    spotlight,
    step.placement,
    frame.value,
    popSize.value
  );

  return (
    <div
      ref={overlayRef}
      className={`sb-tour-overlay${
        step.elevated ? " sb-tour-overlay-raised" : ""
      } ${className}`}
      role="dialog"
      aria-modal="true"
    >
      {spotlight && (
        <div
          className="sb-tour-spotlight"
          style={{
            top: `${spotlight.top}px`,
            left: `${spotlight.left}px`,
            width: `${spotlight.width}px`,
            height: `${spotlight.height}px`,
          }}
        />
      )}

      <div
        ref={popoverRef}
        className={`sb-tour-popover${spotlight ? "" : " sb-tour-popover-centered"}`}
        style={popover.style}
        onClick={(event: MouseEvent) => event.stopPropagation()}
      >
        {popover.side && (
          <span
            className={`sb-tour-arrow sb-tour-arrow-${popover.side}`}
            style={popover.arrowStyle}
            aria-hidden="true"
          />
        )}

        <h3 className="sb-tour-popover-title">
          {t(step.titleKey, { defaultValue: step.titleDefault })}
        </h3>
        <p className="sb-tour-popover-body">
          {t(step.bodyKey, { defaultValue: step.bodyDefault })}
        </p>

        <div className="sb-tour-popover-actions">
          <button
            type="button"
            className="sb-tour-btn sb-tour-btn-text"
            onClick={tutorial.finish}
          >
            {t("tutorial.skip", { defaultValue: "Skip" })}
          </button>
          <button
            type="button"
            className="sb-tour-btn sb-tour-btn-text"
            onClick={tutorial.optOut}
          >
            {t("tutorial.optOut", { defaultValue: "Don't show tutorials" })}
          </button>
          <div className="sb-tour-popover-actions-spacer" />
          {canGoBack && (
            <button
              type="button"
              className="sb-tour-btn sb-tour-btn-back"
              onClick={tutorial.prev}
            >
              {t("tutorial.back", { defaultValue: "Back" })}
            </button>
          )}
          <button
            type="button"
            className="sb-tour-btn sb-tour-btn-next"
            onClick={tutorial.next}
          >
            {isLast
              ? t("tutorial.done", { defaultValue: "Done" })
              : t("tutorial.next", { defaultValue: "Next" })}
            <span className="sb-tour-next-arrow" aria-hidden="true">
              →
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

interface PopoverLayout {
  style: Record<string, string>;
  /** Resolved side the popover sits on, or null when centered (no target). */
  side: TutorialPlacement | null;
  /** Inline position of the pointer arrow along the popover edge. */
  arrowStyle: Record<string, string>;
}

const clampValue = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(value, max));

/** Whether two rects overlap (touching edges don't count). */
function intersects(a: Rect, b: Rect): boolean {
  return (
    a.left < b.left + b.width &&
    a.left + a.width > b.left &&
    a.top < b.top + b.height &&
    a.top + a.height > b.top
  );
}

/**
 * Positions the popover next to the spotlight on the preferred side, flipping to
 * whichever side has room, and computes where the pointer arrow sits so it aims
 * at the target's center. Centers (no arrow) when there's no target on screen.
 *
 * Guarantees the popover box never overlaps the highlighted element: it places
 * the box in the gap on the chosen side and, as a last resort on cramped
 * screens (small mobile, large target), pushes it flush off the spotlight even
 * if that means clipping a viewport edge — covering the element is worse than
 * running off the edge. Uses the popover's measured size when available so a
 * tall, wrapped popover doesn't creep back over the target.
 */
function computePopover(
  spotlight: Rect | null,
  placement: TutorialPlacement = "bottom",
  frame: { w: number; h: number } | null = null,
  measured: { w: number; h: number } | null = null
): PopoverLayout {
  if (typeof window === "undefined" || !spotlight) {
    return { style: {}, side: null, arrowStyle: {} };
  }

  // Coordinates are relative to the overlay, so bounds/clamping use the
  // overlay's size (falling back to the viewport).
  const vw = frame?.w || window.innerWidth;
  const vh = frame?.h || window.innerHeight;

  // Effective popover size. Width is capped to the viewport so it can't overflow
  // a narrow screen; height comes from the real measurement once we have it.
  const pw = Math.min(POPOVER_WIDTH, Math.max(0, vw - GAP * 2));
  const ph = measured?.h || 180;

  // Free space in the gap on each side of the spotlight.
  const space: Record<TutorialPlacement, number> = {
    bottom: vh - (spotlight.top + spotlight.height) - GAP,
    top: spotlight.top - GAP,
    right: vw - (spotlight.left + spotlight.width) - GAP,
    left: spotlight.left - GAP,
  };
  const fits: Record<TutorialPlacement, boolean> = {
    bottom: space.bottom >= ph,
    top: space.top >= ph,
    right: space.right >= pw,
    left: space.left >= pw,
  };
  const order: TutorialPlacement[] = [
    placement,
    "bottom",
    "top",
    "right",
    "left",
  ];
  // Prefer a side the popover actually fits in; otherwise fall back to the side
  // with the most room so it overlaps the target as little as possible.
  const side =
    order.find((p) => fits[p]) ??
    (Object.keys(space) as TutorialPlacement[]).reduce((a, b) =>
      space[b] > space[a] ? b : a
    );

  const targetCenterX = spotlight.left + spotlight.width / 2;
  const targetCenterY = spotlight.top + spotlight.height / 2;

  const vertical = side === "bottom" || side === "top";
  let top: number;
  let left: number;

  if (vertical) {
    left = clampValue(
      targetCenterX - pw / 2,
      GAP,
      Math.max(GAP, vw - pw - GAP)
    );
    // Flush against the gap on the chosen side — never clamped back toward the
    // spotlight, so the box can't ride over the target (it clips the viewport
    // edge instead, which only happens on cramped screens).
    top =
      side === "bottom"
        ? spotlight.top + spotlight.height + GAP
        : spotlight.top - GAP - ph;
  } else {
    top = clampValue(targetCenterY - ph / 2, GAP, Math.max(GAP, vh - ph - GAP));
    left =
      side === "right"
        ? spotlight.left + spotlight.width + GAP
        : spotlight.left - GAP - pw;
  }

  // Final guard: if the box still intersects the spotlight (clamping pulled it
  // back over the target on a cramped screen), push it flush off the chosen side.
  if (intersects({ top, left, width: pw, height: ph }, spotlight)) {
    if (side === "bottom") top = spotlight.top + spotlight.height + GAP;
    else if (side === "top") top = spotlight.top - GAP - ph;
    else if (side === "right") left = spotlight.left + spotlight.width + GAP;
    else left = spotlight.left - GAP - pw;
  }

  // Point the arrow at the target's center along the facing edge.
  const arrowStyle: Record<string, string> = vertical
    ? { left: `${clampValue(targetCenterX - left, 18, pw - 18)}px` }
    : { top: `${clampValue(targetCenterY - top, 18, ph - 18)}px` };

  return {
    style: {
      top: `${top}px`,
      left: `${left}px`,
      width: `${pw}px`,
    },
    side,
    arrowStyle,
  };
}
