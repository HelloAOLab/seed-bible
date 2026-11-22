import "./EmptyState.css";
import type { ComponentChild, ComponentChildren, JSX } from "preact";
import { MaterialIcon } from "../icons";

export type EmptyStateSize = "inline" | "panel";

export type EmptyStateProps = Omit<
  JSX.HTMLAttributes<HTMLDivElement>,
  "size" | "title" | "icon" | "action" | "class" | "className" | "children"
> & {
  /** A Material Symbols name such as `"bookmark"`, or an icon element (an SVG). Decorative: screen readers skip it. */
  icon?: string | ComponentChild;
  /** The one-line headline, for an empty state with a title above its hint. */
  title?: ComponentChild;
  /** What to do about it, usually a `Button`. */
  action?: ComponentChild;
  /**
   * `inline` is a quiet note inside a list or section. `panel` is centered and
   * fills the room a whole pane has, for a screen that is empty.
   */
  size?: EmptyStateSize;
  /** Extra classes, for placement. `class` and `className` both work. */
  className?: string;
  class?: string;
  /** The hint, or the whole note when there is no title: "No bookmarks yet." */
  children?: ComponentChildren;
};

/**
 * What a list or screen shows when there is nothing in it yet: no bookmarks,
 * no friends, no search results. A one-line `inline` note by default; give it
 * `size="panel"` plus an `icon`, a `title` and an `action` for an empty screen.
 *
 * A screen that needs it to look different sets the custom properties it
 * exposes instead of overriding its rules: `--sb-empty-state-color` (the text,
 * for a screen with its own muted grey), `--sb-empty-state-font-size`,
 * `--sb-empty-state-padding`, and
 * `--sb-empty-state-background`, `-border` and `-radius` (for one that sits in
 * a box). To have screen readers announce it when it appears (a search with no
 * results), pass `role="status"`.
 */
export function EmptyState({
  icon,
  title,
  action,
  size = "inline",
  className,
  class: classAttribute,
  children,
  ...rest
}: EmptyStateProps) {
  return (
    <div
      {...rest}
      className={[
        "sb-empty-state",
        `sb-empty-state-${size}`,
        className,
        classAttribute,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {icon ? (
        <span className="sb-empty-state-icon" aria-hidden="true">
          {typeof icon === "string" ? (
            <MaterialIcon>{icon}</MaterialIcon>
          ) : (
            icon
          )}
        </span>
      ) : null}
      {title ? <p className="sb-empty-state-title">{title}</p> : null}
      {children ? <div className="sb-empty-state-hint">{children}</div> : null}
      {action ? <div className="sb-empty-state-action">{action}</div> : null}
    </div>
  );
}
