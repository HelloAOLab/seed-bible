import { useSignal } from "@preact/signals";
import { useI18n } from "seed-bible.i18n.I18nManager";
import type {
  TutorialManager,
  TutorialPlacement,
} from "seed-bible.managers.TutorialManager";

const { useEffect } = os.appHooks;

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
}: {
  tutorial: TutorialManager;
  className?: string;
}) {
  const { t } = useI18n();
  const running = tutorial.running.value;
  const step = tutorial.currentStep.value;
  const index = tutorial.index.value;
  const total = tutorial.steps.length;

  // Target rect in viewport coordinates, or null when the element is missing.
  const rect = useSignal<Rect | null>(null);

  useEffect(() => {
    if (!running || !step) {
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
      rect.value = {
        top: r.top,
        left: r.left,
        width: r.width,
        height: r.height,
      };
    };

    measure();
    // A couple of delayed re-measures catch layout/animation settling.
    const t1 = window.setTimeout(measure, 60);
    const t2 = window.setTimeout(measure, 250);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [running, step?.id]);

  if (!running || !step) {
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

  const popoverStyle = computePopoverStyle(spotlight, step.placement);

  return (
    <div
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
        style={popoverStyle}
        onClick={(event: MouseEvent) => event.stopPropagation()}
      >
        <div className="sb-tour-popover-progress">
          {tutorial.steps.map((s, i) => (
            <span
              key={s.id}
              className={`sb-tour-dot${i === index ? " sb-tour-dot-active" : ""}`}
            />
          ))}
        </div>

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
          <div className="sb-tour-popover-actions-right">
            {index > 0 && (
              <button
                type="button"
                className="sb-tour-btn sb-tour-btn-secondary"
                onClick={tutorial.prev}
              >
                {t("tutorial.back", { defaultValue: "Back" })}
              </button>
            )}
            <button
              type="button"
              className="sb-tour-btn sb-tour-btn-primary"
              onClick={tutorial.next}
            >
              {isLast
                ? t("tutorial.done", { defaultValue: "Done" })
                : t("tutorial.next", { defaultValue: "Next" })}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Positions the popover next to the spotlight on the preferred side, flipping
 * to the opposite side or centering when there isn't enough room. When there's
 * no target it centers on screen.
 */
function computePopoverStyle(
  spotlight: Rect | null,
  placement: TutorialPlacement = "bottom"
): Record<string, string> {
  if (typeof window === "undefined" || !spotlight) {
    return {};
  }

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const estHeight = 200;

  // Resolve a placement that fits, falling back through sensible alternatives.
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
  const resolved = order.find((p) => fits[p]) ?? placement;

  const clamp = (value: number, min: number, max: number) =>
    Math.max(min, Math.min(value, max));

  let top: number;
  let left: number;

  if (resolved === "bottom" || resolved === "top") {
    const centerLeft = spotlight.left + spotlight.width / 2 - POPOVER_WIDTH / 2;
    left = clamp(centerLeft, GAP, vw - POPOVER_WIDTH - GAP);
    top =
      resolved === "bottom"
        ? spotlight.top + spotlight.height + GAP
        : spotlight.top - GAP - estHeight;
  } else {
    const centerTop = spotlight.top + spotlight.height / 2 - estHeight / 2;
    top = clamp(centerTop, GAP, vh - estHeight - GAP);
    left =
      resolved === "right"
        ? spotlight.left + spotlight.width + GAP
        : spotlight.left - GAP - POPOVER_WIDTH;
  }

  return {
    top: `${Math.max(GAP, top)}px`,
    left: `${clamp(left, GAP, vw - POPOVER_WIDTH - GAP)}px`,
    width: `${POPOVER_WIDTH}px`,
  };
}
