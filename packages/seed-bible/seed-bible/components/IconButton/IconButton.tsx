import "./IconButton.css";
import type { ComponentChild, JSX } from "preact";
import { MaterialIcon } from "../icons";

export type IconButtonSize = "sm" | "md" | "lg";
export type IconButtonLook = "plain" | "tinted";

export type IconButtonProps = Omit<
  JSX.ButtonHTMLAttributes<HTMLButtonElement>,
  | "size"
  | "children"
  | "aria-label"
  | "aria-pressed"
  | "title"
  | "type"
  | "class"
  | "className"
> & {
  /** A Material Symbols name such as `"bookmark"`, or an icon element (an SVG). */
  icon: string | ComponentChild;
  /** What the button does, for screen readers and the tooltip. Required, since the icon alone says nothing to a screen reader. */
  label: string;
  /** sm (28px) for toasts and small floating panels, md (32px) for pane headers and toolbars, lg (40px) for phone screen headers. */
  size?: IconButtonSize;
  /** `plain` has no background until hovered; `tinted` sits on a soft circle, for a button floating over content. */
  look?: IconButtonLook;
  /** For an on/off button (bookmark, mute): tells screen readers whether it's on, and draws it in the primary color while it is. */
  pressed?: boolean;
  /** `submit` for a form's send button. */
  type?: "button" | "submit";
  /** Extra classes, for placement. `class` and `className` both work. */
  className?: string;
  class?: string;
};

/** A button that shows only an icon, such as a pane header's or toolbar's actions. */
export function IconButton({
  icon,
  label,
  size = "md",
  look = "plain",
  pressed,
  type = "button",
  className,
  class: classAttribute,
  ...rest
}: IconButtonProps) {
  return (
    <button
      {...rest}
      type={type}
      className={[
        "sb-icon-button",
        `sb-icon-button-${size}`,
        `sb-icon-button-${look}`,
        pressed && "sb-icon-button-pressed",
        className,
        classAttribute,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={label}
      aria-pressed={pressed}
      title={label}
    >
      {typeof icon === "string" ? (
        <MaterialIcon aria-hidden="true">{icon}</MaterialIcon>
      ) : (
        <span className="sb-icon-button-icon" aria-hidden="true">
          {icon}
        </span>
      )}
    </button>
  );
}
