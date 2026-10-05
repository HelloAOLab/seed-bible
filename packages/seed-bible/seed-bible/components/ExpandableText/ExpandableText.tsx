import "./ExpandableText.css";
import { useLayoutEffect, useRef, useState } from "preact/hooks";

/**
 * Sub-pixel guard for the overflow comparison below. `scrollWidth` and
 * `clientWidth` are both rounded to whole pixels, so text that fits exactly
 * can report one pixel of overflow it does not have. A pixel of real overflow
 * is invisible, so erring towards "fits" costs nothing.
 */
const OVERFLOW_TOLERANCE_PX = 1;

/**
 * Shows text with a "Read more" / "Read less" control when it does not fit.
 * Collapsed, it reads as one line of prose — `text... Read more` — with the
 * ellipsis and the control on the same baseline as the text. Expanded, the
 * full text is shown with its line breaks preserved.
 *
 * Whether it fits is measured, not estimated: the collapsed line is clipped
 * by the browser and `scrollWidth` is compared against `clientWidth` on that
 * same element — two real measurements of one element, so nothing has to be
 * assumed about the font.
 *
 * An earlier version instead built the budget by hand: one line of
 * `getComputedStyle().lineHeight`, which is the keyword "normal" here, so it
 * fell back to `fontSize * 1.2`. That guess lands inside a pixel of a real
 * line box, and which side it lands on depends on the font's own metrics.
 * Measured at this font size in Chromium: 1.15 for the default sans stack, so
 * the guess held; 1.39 for a CJK fallback and 1.62 for a Thai one, where a
 * single short line measured over the budget and every description, however
 * short, was given a "Read more" that expanded to nothing. `--sb-font-family`
 * is themeable and `system-ui` resolves per platform, so the guess was never
 * one the component could make.
 *
 * Labels are passed in already-translated so this stays i18n-agnostic (same
 * pattern as `SkeletonContainer`).
 */
export function ExpandableText(props: {
  children: string;
  /** Already-translated "Read more" label. */
  readMoreLabel: string;
  /** Already-translated "Read less" label. */
  readLessLabel: string;
  className?: string;
}) {
  const { children: text, readMoreLabel, readLessLabel, className } = props;
  const bodyRef = useRef<HTMLSpanElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [clippedWidth, setClippedWidth] = useState(false);

  useLayoutEffect(() => {
    setExpanded(false);
  }, [text]);

  useLayoutEffect(() => {
    const body = bodyRef.current;
    // Expanded, the body wraps instead of being clipped, so there is nothing
    // to measure — and `clippedWidth` has to survive so "Read less" stays.
    if (!body || expanded) {
      return;
    }
    const measure = () => {
      setClippedWidth(
        body.scrollWidth > body.clientWidth + OVERFLOW_TOLERANCE_PX
      );
    };
    measure();
    if (typeof ResizeObserver === "undefined") {
      return;
    }
    // The body's own width changes when the control appears beside it; the
    // wrapper's changes when the pane is resized. Either can flip the answer.
    const observer = new ResizeObserver(measure);
    observer.observe(body);
    if (wrapRef.current) {
      observer.observe(wrapRef.current);
    }
    return () => observer.disconnect();
  }, [text, expanded]);

  if (!text) {
    return null;
  }

  const lines = text.split(/\r?\n/);
  const firstLine = lines[0] ?? text;
  // A description written as several lines has more to show even when its
  // first line fits, so that answer comes from the text rather than a
  // measurement.
  const overflowing = lines.length > 1 || clippedWidth;
  const collapsed = !expanded;

  const classes = [
    "sb-expandable-text",
    collapsed ? "sb-expandable-text--clamped" : null,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div ref={wrapRef} className={classes} dir="auto">
      {/*
       * Inline-level, so the surrounding `text-align` places it: centred in
       * the profile card, start-aligned in a Discover row. The collapsed row
       * used to be a block-level flex container, whose `justify-content`
       * default overrode a centred `text-align` and pinned the text to the
       * start edge until it was expanded.
       */}
      <span className="sb-expandable-text-line">
        <span ref={bodyRef} className="sb-expandable-text-body">
          {collapsed ? firstLine : text}
        </span>
        {collapsed && overflowing ? (
          <span className="sb-expandable-text-ellipsis" aria-hidden="true">
            ...
          </span>
        ) : null}
        {overflowing ? (
          <button
            type="button"
            className="sb-expandable-text-toggle"
            aria-expanded={expanded}
            onClick={(event) => {
              event.stopPropagation();
              setExpanded((current) => !current);
            }}
          >
            {expanded ? readLessLabel : readMoreLabel}
          </button>
        ) : null}
      </span>
    </div>
  );
}
