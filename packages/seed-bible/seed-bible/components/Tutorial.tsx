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
const GAP = 14;

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
  const index = tutorial.index.value;
  const total = tutorial.steps.length;

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

  if (!running || !step || !matchesFilter) {
    return null;
  }

  const r = rect.value;
  const isLast = index >= total - 1;
  const pad = 6;

  const spotlight: Rect | null = r
    ? {
        top: r.top - pad,
        left: r.left - pad,
        width: r.width + pad * 2,
        height: r.height + pad * 2,
      }
    : null;

  const popover = computePopover(spotlight, step.placement, frame.value);

  return (
    <div
      ref={overlayRef}
      className={`sb-tour-overlay ${className}`}
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
            {t("tutorial.skip", { defaultValue: "Skip Tutorial" })}
          </button>
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

/**
 * Positions the popover next to the spotlight on the preferred side, flipping
 * to the opposite side when there isn't room, and computes where the pointer
 * arrow sits so it aims at the target's center. Centers (no arrow) when there's
 * no target on screen.
 */
function computePopover(
  spotlight: Rect | null,
  placement: TutorialPlacement = "bottom",
  frame: { w: number; h: number } | null = null
): PopoverLayout {
  if (typeof window === "undefined" || !spotlight) {
    return { style: {}, side: null, arrowStyle: {} };
  }

  // Coordinates are relative to the overlay, so bounds/clamping use the
  // overlay's size (falling back to the viewport).
  const vw = frame?.w || window.innerWidth;
  const vh = frame?.h || window.innerHeight;
  const estHeight = 180;

  const fits: Record<TutorialPlacement, boolean> = {
    bottom: spotlight.top + spotlight.height + GAP + estHeight < vh,
    top: spotlight.top - GAP - estHeight > 0,
    right: spotlight.left + spotlight.width + GAP + POPOVER_WIDTH < vw,
    left: spotlight.left - GAP - POPOVER_WIDTH > 0,
  };
  const order: TutorialPlacement[] = [
    placement,
    "bottom",
    "top",
    "right",
    "left",
  ];
  const side = order.find((p) => fits[p]) ?? placement;

  const targetCenterX = spotlight.left + spotlight.width / 2;
  const targetCenterY = spotlight.top + spotlight.height / 2;

  let top: number;
  let left: number;

  if (side === "bottom" || side === "top") {
    left = clampValue(
      targetCenterX - POPOVER_WIDTH / 2,
      GAP,
      vw - POPOVER_WIDTH - GAP
    );
    top =
      side === "bottom"
        ? spotlight.top + spotlight.height + GAP
        : spotlight.top - GAP - estHeight;
  } else {
    top = clampValue(targetCenterY - estHeight / 2, GAP, vh - estHeight - GAP);
    left =
      side === "right"
        ? spotlight.left + spotlight.width + GAP
        : spotlight.left - GAP - POPOVER_WIDTH;
  }

  top = Math.max(GAP, top);
  left = clampValue(left, GAP, vw - POPOVER_WIDTH - GAP);

  // Point the arrow at the target's center along the facing edge.
  const arrowStyle: Record<string, string> =
    side === "bottom" || side === "top"
      ? {
          left: `${clampValue(targetCenterX - left, 18, POPOVER_WIDTH - 18)}px`,
        }
      : { top: `${clampValue(targetCenterY - top, 18, estHeight - 18)}px` };

  return {
    style: {
      top: `${top}px`,
      left: `${left}px`,
      width: `${POPOVER_WIDTH}px`,
    },
    side,
    arrowStyle,
  };
}
