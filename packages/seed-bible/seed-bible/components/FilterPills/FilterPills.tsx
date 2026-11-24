import "./FilterPills.css";
import type { ComponentChildren } from "preact";
import { useSignal } from "@preact/signals";
import { useCallback, useLayoutEffect, useRef } from "preact/hooks";
import { useI18n } from "../../i18n/I18nContext";
import { MaterialIcon } from "../icons";
import { IconButton } from "../IconButton/IconButton";
import { useHorizontalScroll } from "../useHorizontalScroll";

/**
 * How long after an arrow click the next one steps on from that click's
 * destination. Longer than a browser's smooth scroll, which is about 300–500ms.
 */
const PENDING_SCROLL_MS = 600;

export interface FilterPillOption<V extends string> {
  value: V;
  label: ComponentChildren;
  /**
   * Extra classes on this one pill, for a surface that styles some pills
   * apart from the rest by setting the `--sb-filter-pills-*` properties on
   * them.
   */
  className?: string;
}

export interface FilterPillsProps<V extends string> {
  options: readonly FilterPillOption<V>[];
  /** The selected option's value. */
  value: V;
  onChange: (value: V) => void;
  /** Names the row for screen readers, such as "Filter your content". */
  "aria-label"?: string;
  /** Extra classes on the outer element, for placement. */
  className?: string;
}

/**
 * A single row of pill-shaped filters, one of which is selected (All, Notes,
 * Bookmarks…). When the pills don't fit, the row scrolls sideways rather than
 * wrapping: with the trackpad, the vertical mouse wheel, or the arrows that
 * appear at each end on devices with a mouse. An edge fades while pills are
 * hidden past it.
 *
 * It's a tab list: Tab reaches the selected pill, and the arrow keys, Home
 * and End move between pills, which Enter or Space then picks.
 *
 * To restyle it for a surface, set the `--sb-filter-pills-*` custom
 * properties in `FilterPills.css` on the `className` you pass.
 */
export function FilterPills<V extends string>({
  options,
  value,
  onChange,
  "aria-label": ariaLabel,
  className,
}: FilterPillsProps<V>) {
  const { t } = useI18n();
  const rowRef = useRef<HTMLDivElement>(null);
  useHorizontalScroll(rowRef);
  // Where the arrows' last smooth scroll is headed, and when it was asked for.
  const pendingScrollRef = useRef<{ left: number; at: number } | null>(null);

  const overflows = useSignal(false);
  const canScrollStart = useSignal(false);
  const canScrollEnd = useSignal(false);
  const optionsKey = options
    .map((option) =>
      typeof option.label === "string"
        ? `${option.value}:${option.label}`
        : option.value
    )
    .join("|");

  const pills = () =>
    Array.from(
      rowRef.current?.querySelectorAll<HTMLButtonElement>(".sb-filter-pill") ??
        []
    );

  // The arrows and the edge fades both follow this, so they never disagree
  // about whether there's more to scroll.
  const updateScrollState = useCallback((isRtl: boolean) => {
    const row = rowRef.current;
    const wrapper = row?.parentElement;
    const setScrollable = (start: boolean, end: boolean) => {
      canScrollStart.value = start;
      canScrollEnd.value = end;
      // The fades are physical sides; the start is on the right in RTL.
      row?.toggleAttribute("data-fade-left", isRtl ? end : start);
      row?.toggleAttribute("data-fade-right", isRtl ? start : end);
    };
    if (!row || !wrapper) {
      overflows.value = false;
      setScrollable(false, false);
      return;
    }
    // Measured against the wrapper, not the row, which the arrows narrow:
    // otherwise showing them could be what makes the pills overflow.
    const hasOverflow = row.scrollWidth > wrapper.clientWidth + 1;
    overflows.value = hasOverflow;
    if (!hasOverflow) {
      setScrollable(false, false);
      return;
    }
    const maxScroll = Math.max(0, row.scrollWidth - row.clientWidth);
    const position = isRtl ? Math.abs(row.scrollLeft) : row.scrollLeft;
    setScrollable(position > 1, position < maxScroll - 1);
  }, []);

  const scrollPills = useCallback((direction: -1 | 1) => {
    if (direction === -1 && !canScrollStart.value) return;
    if (direction === 1 && !canScrollEnd.value) return;

    const row = rowRef.current;
    if (!row) return;
    const all = pills();
    if (all.length === 0) return;

    const isRtl = getComputedStyle(row).direction === "rtl";
    const rowRect = row.getBoundingClientRect();
    const current = row.scrollLeft;

    // Pills in `scrollLeft` units, where the visible stretch runs from
    // `scrollLeft` to `scrollLeft + clientWidth` (RTL's `scrollLeft` is
    // negative, which this handles too).
    const spans = all.map((pill) => {
      const rect = pill.getBoundingClientRect();
      const start = rect.left - rowRect.left + current;
      return { start, end: start + rect.width };
    });

    // Steps from where an earlier click's smooth scroll is headed rather than
    // from where it has got to, so quick clicks each move on another pill.
    const pending = pendingScrollRef.current;
    const base =
      pending && performance.now() - pending.at < PENDING_SCROLL_MS
        ? pending.left
        : current;
    const viewStart = base;
    const viewEnd = base + row.clientWidth;

    // Toward the end is right in LTR, left in RTL. Bring the nearest pill
    // hidden past that edge fully into view.
    let next: number | undefined;
    if ((direction === 1) !== isRtl) {
      const hidden = spans.filter((span) => span.end > viewEnd + 1);
      if (hidden.length > 0) {
        next = base + Math.min(...hidden.map((span) => span.end)) - viewEnd;
      }
    } else {
      const hidden = spans.filter((span) => span.start < viewStart - 1);
      if (hidden.length > 0) {
        next =
          base - (viewStart - Math.max(...hidden.map((span) => span.start)));
      }
    }
    if (next === undefined) return;

    const maxScroll = row.scrollWidth - row.clientWidth;
    next = isRtl
      ? Math.min(0, Math.max(-maxScroll, next))
      : Math.min(maxScroll, Math.max(0, next));
    pendingScrollRef.current = { left: next, at: performance.now() };

    row.scrollBy({
      left: next - current,
      behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches
        ? "auto"
        : "smooth",
    });
  }, []);

  const showArrows = overflows.value;
  useLayoutEffect(() => {
    const row = rowRef.current;
    if (!row) return;

    const active = row.querySelector<HTMLElement>('[aria-selected="true"]');
    if (active) {
      const rowRect = row.getBoundingClientRect();
      const pillRect = active.getBoundingClientRect();
      if (pillRect.left < rowRect.left) {
        row.scrollLeft -= rowRect.left - pillRect.left;
      } else if (pillRect.right > rowRect.right) {
        row.scrollLeft += pillRect.right - rowRect.right;
      }
    }

    const update = () =>
      updateScrollState(getComputedStyle(row).direction === "rtl");

    update();
    row.addEventListener("scroll", update, { passive: true });

    const resizeObserver =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    if (resizeObserver) {
      resizeObserver.observe(row);
      const wrapper = row.parentElement;
      if (wrapper) resizeObserver.observe(wrapper);
      pills().forEach((pill) => resizeObserver.observe(pill));
    }

    // Also covers test environments without ResizeObserver.
    window.addEventListener("resize", update);

    return () => {
      row.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      resizeObserver?.disconnect();
    };
  }, [optionsKey, value, updateScrollState, showArrows]);

  const onKeyDown = (event: KeyboardEvent) => {
    const all = pills();
    const index = all.indexOf(event.target as HTMLButtonElement);
    if (index === -1) return;
    const isRtl = rowRef.current
      ? getComputedStyle(rowRef.current).direction === "rtl"
      : false;
    let next: number;
    switch (event.key) {
      case "ArrowRight":
        next = index + (isRtl ? -1 : 1);
        break;
      case "ArrowLeft":
        next = index + (isRtl ? 1 : -1);
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = all.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    all[(next + all.length) % all.length]?.focus();
  };

  // Tab lands on the selected pill, or the first if none matches `value`.
  const focusable = options.some((option) => option.value === value)
    ? value
    : options[0]?.value;

  const arrow = (direction: -1 | 1) => (
    <IconButton
      size="sm"
      look="tinted"
      className="sb-filter-pills-arrow"
      onClick={() => scrollPills(direction)}
      aria-disabled={!(direction === -1 ? canScrollStart : canScrollEnd).value}
      icon={
        <MaterialIcon className="sb-filter-pills-arrow-icon">
          {direction === -1 ? "chevron_left" : "chevron_right"}
        </MaterialIcon>
      }
      label={
        direction === -1
          ? t("scroll-filters-start", {
              defaultValue: "Scroll filters toward start",
            })
          : t("scroll-filters-end", {
              defaultValue: "Scroll filters toward end",
            })
      }
    />
  );

  return (
    <div
      className={[
        "sb-filter-pills",
        showArrows ? "sb-filter-pills--scrollable" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {showArrows && arrow(-1)}
      <div
        className="sb-filter-pills-row"
        role="tablist"
        aria-label={ariaLabel}
        ref={rowRef}
        onKeyDown={onKeyDown}
      >
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={selected}
              tabIndex={option.value === focusable ? 0 : -1}
              className={[
                "sb-filter-pill",
                selected ? "sb-filter-pill--selected" : "",
                option.className,
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => onChange(option.value)}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      {showArrows && arrow(1)}
    </div>
  );
}
