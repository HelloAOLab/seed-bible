import "./LoadingStatus.css";
import type { ComponentChildren, JSX } from "preact";
import { Spinner } from "../Spinner/Spinner";

export type LoadingStatusSize = "inline" | "panel";

export type LoadingStatusProps = Omit<
  JSX.HTMLAttributes<HTMLDivElement>,
  "size" | "class" | "className" | "children" | "role"
> & {
  /** What is being waited on, as a short sentence: "Loading books…". */
  children: ComponentChildren;
  /**
   * `inline` is a spinner beside its words, for a line inside a list or
   * dropdown. `panel` stacks them and centers them in the room a whole pane
   * has, for a screen that is waiting.
   */
  size?: LoadingStatusSize;
  /** Extra classes, for placement. `class` and `className` both work. */
  className?: string;
  class?: string;
};

/**
 * A spinner with the words that say what it is waiting for, announced to
 * screen readers when it appears. For a line or a screen that has nothing to
 * show until something arrives. Where the finished content has a known shape
 * (a card, a list of rows), draw `Skeleton` blocks in a `SkeletonContainer`
 * instead, and for a button that is working, give `Button` its `loading`
 * prop.
 *
 * A screen that needs it to look different sets the custom properties it
 * exposes instead of overriding its rules: `--sb-loading-status-color`,
 * `--sb-loading-status-font-size` and `--sb-loading-status-padding`.
 */
export function LoadingStatus({
  children,
  size = "inline",
  className,
  class: classAttribute,
  ...rest
}: LoadingStatusProps) {
  return (
    <div
      {...rest}
      role="status"
      className={[
        "sb-loading-status",
        `sb-loading-status-${size}`,
        className,
        classAttribute,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <Spinner size={size === "panel" ? "1.75rem" : "1em"} />
      <span>{children}</span>
    </div>
  );
}
