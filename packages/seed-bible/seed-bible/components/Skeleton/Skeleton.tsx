import "./Skeleton.css";
import type { ComponentChildren } from "preact";

export type SkeletonShape = "block" | "line" | "circle" | "button";

/**
 * A single shimmering placeholder block. Purely decorative — it carries
 * `aria-hidden` so screen readers announce only the surrounding
 * `SkeletonContainer`'s status message, not each block.
 *
 * Sizes are plain CSS length strings applied inline. **Author them in `rem`
 * (or `%` for fluid widths), never `px`**, so the block scales with the app's
 * "UI Size" setting like the rest of the chrome (see `app/styles/base.css` —
 * `1rem` tracks `--sb-ui-scale`). The `shape` prop only supplies sensible
 * default height/radius; any explicit `width`/`height`/`radius` wins.
 */
export function Skeleton(props: {
  /** Picks default height/radius. Defaults to `"block"`. */
  shape?: SkeletonShape;
  /** CSS width, e.g. `"8.5rem"` or `"40%"`. */
  width?: string;
  /** CSS height, e.g. `"3rem"`. */
  height?: string;
  /** Border-radius override, e.g. `"0.625rem"`. */
  radius?: string;
  /** Extra classes for layout (margins, flex, etc.). */
  className?: string;
}) {
  const { shape = "block", width, height, radius, className } = props;
  const classes = ["sb-skeleton", `sb-skeleton--${shape}`, className]
    .filter(Boolean)
    .join(" ");
  return (
    <div
      className={classes}
      aria-hidden="true"
      style={{ width, height, borderRadius: radius }}
    />
  );
}

/**
 * Accessible wrapper for a group of `Skeleton` blocks. Marks the region as a
 * busy live status and exposes a single visually-hidden message, so a slow
 * load reads as "loading" to assistive tech while the decorative blocks stay
 * silent.
 *
 * `label` is passed in already-translated (e.g. `t("loading-profile")`) so this
 * component stays i18n-agnostic and reusable anywhere.
 */
export function SkeletonContainer(props: {
  /** Already-translated loading message announced to screen readers. */
  label: string;
  /** Layout classes for the wrapper (e.g. the surface's own grid/flex class). */
  className?: string;
  children: ComponentChildren;
}) {
  const { label, className, children } = props;
  const classes = ["sb-skeleton-status", className].filter(Boolean).join(" ");
  return (
    <div className={classes} role="status" aria-busy="true">
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}
