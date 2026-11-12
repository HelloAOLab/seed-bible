import "./Button.css";
import type { ComponentChild, ComponentChildren, JSX } from "preact";
import { MaterialIcon } from "../icons";
import { Spinner } from "../Spinner/Spinner";

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonTone = "neutral" | "danger";
export type ButtonSize = "sm" | "md" | "lg";
export type ButtonShape = "rect" | "pill";

export type ButtonProps = Omit<
  JSX.ButtonHTMLAttributes<HTMLButtonElement>,
  "size" | "type" | "class" | "className" | "icon"
> & {
  children: ComponentChildren;
  /** `primary` is the one main action (filled); `secondary` is outlined, for Cancel and other actions beside it; `ghost` has no outline, for quiet actions in a row or toolbar. */
  variant?: ButtonVariant;
  /** `danger` turns any variant red, for actions that delete or end something. */
  tone?: ButtonTone;
  /** sm (32px) for inline actions, md (36px) for dialogs and forms, lg (44px) for the main action of a page or prompt. */
  size?: ButtonSize;
  /** `rect` has rounded corners; `pill` is fully round, for the pages whose buttons are already pills. */
  shape?: ButtonShape;
  /** A Material Symbols name such as `"add"`, or an icon element (an SVG). */
  icon?: string | ComponentChild;
  /** Which side of the label the icon goes on. */
  iconPosition?: "start" | "end";
  /** Shows a spinner in place of the icon and stops further clicks, while the action is in progress. */
  loading?: boolean;
  /** `submit` for a form's main button. */
  type?: "button" | "submit" | "reset";
  /** Extra classes, for placement. `class` and `className` both work. */
  className?: string;
  class?: string;
};

/** A button with a text label: Save, Cancel, Retry, Sign in. */
export function Button({
  children,
  variant = "secondary",
  tone = "neutral",
  size = "md",
  shape = "rect",
  icon,
  iconPosition = "start",
  loading = false,
  type = "button",
  disabled,
  className,
  class: classAttribute,
  ...rest
}: ButtonProps) {
  const iconNode = loading ? (
    <Spinner className="sb-button-icon" size="var(--sb-button-icon-size)" />
  ) : typeof icon === "string" ? (
    <MaterialIcon className="sb-button-icon" aria-hidden="true">
      {icon}
    </MaterialIcon>
  ) : icon ? (
    <span className="sb-button-icon" aria-hidden="true">
      {icon}
    </span>
  ) : null;
  return (
    <button
      {...rest}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={[
        "sb-button",
        `sb-button-${variant}`,
        `sb-button-${size}`,
        shape === "pill" && "sb-button-pill",
        tone === "danger" && "sb-button-danger",
        className,
        classAttribute,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {iconPosition === "start" && iconNode}
      <span className="sb-button-label">{children}</span>
      {iconPosition === "end" && iconNode}
    </button>
  );
}
