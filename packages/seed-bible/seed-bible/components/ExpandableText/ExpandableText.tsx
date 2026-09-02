import "./ExpandableText.css";
import { useLayoutEffect, useRef, useState } from "preact/hooks";

function lineHeightPx(el: HTMLElement): number {
  const style = getComputedStyle(el);
  const parsed = parseFloat(style.lineHeight);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return (parseFloat(style.fontSize) || 16) * 1.2;
}

/**
 * Shows text inline with a "Read more" / "Read less" control when it
 * overflows the clamp. Collapsed, it reads as one line of prose —
 * `text... Read more` — with a real ellipsis on the same baseline as the
 * text. Expanded (and when the text already fits), line breaks are
 * preserved. Labels are passed in already-translated so this stays
 * i18n-agnostic (same pattern as `SkeletonContainer`).
 */
export function ExpandableText(props: {
  children: string;
  /** How many lines to show before clamping. Defaults to 1. */
  maxLines?: number;
  /** Already-translated "Read more" label. */
  readMoreLabel: string;
  /** Already-translated "Read less" label. */
  readLessLabel: string;
  className?: string;
}) {
  const {
    children: text,
    maxLines = 1,
    readMoreLabel,
    readLessLabel,
    className,
  } = props;
  const wrapRef = useRef<HTMLDivElement>(null);
  const probeRef = useRef<HTMLSpanElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);

  useLayoutEffect(() => {
    setExpanded(false);
  }, [text, maxLines]);

  useLayoutEffect(() => {
    const probe = probeRef.current;
    if (!probe || expanded) {
      return;
    }
    const measure = () => {
      const maxHeight = lineHeightPx(probe) * maxLines + 1;
      setOverflowing(probe.scrollHeight > maxHeight);
    };
    measure();
    if (typeof ResizeObserver === "undefined") {
      return;
    }
    const observer = new ResizeObserver(measure);
    observer.observe(probe);
    if (wrapRef.current) {
      observer.observe(wrapRef.current);
    }
    return () => observer.disconnect();
  }, [text, maxLines, expanded]);

  if (!text) {
    return null;
  }

  const clamped = overflowing && !expanded;
  const displayText = clamped ? (text.split(/\r?\n/, 1)[0] ?? text) : text;

  const classes = [
    "sb-expandable-text",
    clamped ? "sb-expandable-text--clamped" : null,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div ref={wrapRef} className={classes} dir="auto">
      <span
        ref={probeRef}
        className="sb-expandable-text-probe"
        aria-hidden="true"
      >
        {text}
      </span>
      <span
        className={
          "sb-expandable-text-body" +
          (clamped ? " sb-expandable-text-body--clamped" : "")
        }
      >
        {displayText}
      </span>
      {clamped ? (
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
    </div>
  );
}
