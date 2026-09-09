import "./ExpandableText.css";
import { useLayoutEffect, useState } from "preact/hooks";

/**
 * Characters to show before "Read more" appears. Long enough that an ordinary
 * one-sentence bio is never truncated, short enough that the collapsed text
 * stays something you glance at rather than read.
 */
export const DEFAULT_MAX_LENGTH = 140;

/**
 * Cuts `chars` down to `maxLength`, backing off to the last word boundary in
 * the final quarter of the budget so the text doesn't end mid-word. A single
 * word longer than that quarter is hard-cut instead — backing off further
 * would leave almost nothing on screen.
 */
function truncate(chars: string[], maxLength: number): string {
  if (chars.length <= maxLength) {
    return chars.join("");
  }

  const kept = chars.slice(0, maxLength);
  let end = kept.length;
  for (let i = kept.length - 1; i >= Math.floor(maxLength * 0.75); i--) {
    if (/\s/.test(kept[i] ?? "")) {
      end = i;
      break;
    }
  }

  return kept.slice(0, end).join("").replace(/\s+$/, "");
}

/**
 * The collapsed rendering of `text`, or null when it already fits and so
 * needs no toggle at all.
 *
 * `Array.from` counts code points rather than UTF-16 units, so the limit
 * counts an emoji or accented character as one and a cut never splits one in
 * half.
 */
function collapseText(
  text: string,
  maxLines: number,
  maxLength: number
): string | null {
  const lines = text.split(/\r?\n/);
  const head = Array.from(lines.slice(0, maxLines).join("\n"));

  if (lines.length <= maxLines && head.length <= maxLength) {
    return null;
  }

  return truncate(head, maxLength);
}

/**
 * Shows text with a "Read more" / "Read less" control when it is longer than
 * the limit. Collapsed, it reads as `text... Read more`; expanded (and when
 * the text already fits), line breaks are preserved.
 *
 * The limit is a real character count, checked against the text itself, so a
 * short description never gets a "Read more" that expands to nothing. An
 * earlier version measured rendered height against a guessed line height
 * instead, which over-reported overflow and showed the control on text of any
 * length. Labels are passed in already-translated so this stays i18n-agnostic
 * (same pattern as `SkeletonContainer`).
 */
export function ExpandableText(props: {
  children: string;
  /**
   * How many hard line breaks to show before collapsing. Defaults to 1, so a
   * description written as several lines collapses to its first.
   */
  maxLines?: number;
  /** Characters to show before collapsing. Defaults to {@link DEFAULT_MAX_LENGTH}. */
  maxLength?: number;
  /** Already-translated "Read more" label. */
  readMoreLabel: string;
  /** Already-translated "Read less" label. */
  readLessLabel: string;
  className?: string;
}) {
  const {
    children: text,
    maxLines = 1,
    maxLength = DEFAULT_MAX_LENGTH,
    readMoreLabel,
    readLessLabel,
    className,
  } = props;
  const [expanded, setExpanded] = useState(false);

  useLayoutEffect(() => {
    setExpanded(false);
  }, [text, maxLines, maxLength]);

  if (!text) {
    return null;
  }

  const collapsed = collapseText(text, maxLines, maxLength);
  const clamped = collapsed !== null && !expanded;

  const classes = [
    "sb-expandable-text",
    clamped ? "sb-expandable-text--clamped" : null,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes} dir="auto">
      <span className="sb-expandable-text-body">
        {clamped ? collapsed : text}
      </span>
      {clamped ? (
        <span className="sb-expandable-text-ellipsis" aria-hidden="true">
          ...
        </span>
      ) : null}
      {collapsed !== null ? (
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
