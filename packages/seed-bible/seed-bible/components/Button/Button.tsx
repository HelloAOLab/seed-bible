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
  "size" | "type" | "class" | "className" | "icon" | "href" | "target" | "rel"
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
  /**
   * While the action is in progress: a spinner covers the label and further
   * clicks are ignored. The label stays in place (invisible), so the button
   * keeps its size and screen readers still hear what it is.
   */
  loading?: boolean;
  /** `submit` for a form's main button. */
  type?: "button" | "submit" | "reset";
  /**
   * Draws a link that looks like a button, for an action that goes to
   * another page or site (Donate, Release notes), so it keeps link behavior:
   * the address on hover, "Copy link", middle-click. A link can't be
   * disabled or loading.
   */
  href?: string;
  /** With `href`: `"_blank"` opens a new tab, and adds `rel="noopener noreferrer"` unless `rel` is given. */
  target?: string;
  rel?: string;
  /** Extra classes, for placement. `class` and `className` both work. */
  className?: string;
  class?: string;
};

/** A button with a text label: Save, Cancel, Retry, Sign in. With `href`, a link drawn the same way. */
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
  href,
  target,
  rel,
  disabled,
  className,
  class: classAttribute,
  ...rest
}: ButtonProps) {
  const iconNode =
    typeof icon === "string" ? (
      <MaterialIcon className="sb-button-icon" aria-hidden="true">
        {icon}
      </MaterialIcon>
    ) : icon ? (
      <span className="sb-button-icon" aria-hidden="true">
        {icon}
      </span>
    ) : null;
  const classes = [
    "sb-button",
    `sb-button-${variant}`,
    `sb-button-${size}`,
    shape === "pill" && "sb-button-pill",
    loading && "sb-button-loading",
    tone === "danger" && "sb-button-danger",
    className,
    classAttribute,
  ]
    .filter(Boolean)
    .join(" ");
  const content = (
    <>
      {iconPosition === "start" && iconNode}
      <span className="sb-button-label">{children}</span>
      {iconPosition === "end" && iconNode}
      {loading && (
        <Spinner
          className="sb-button-spinner"
          size="var(--sb-button-icon-size)"
        />
      )}
    </>
  );
  if (href !== undefined) {
    return (
      <a
        {...(rest as JSX.HTMLAttributes<HTMLAnchorElement>)}
        href={href}
        target={target}
        rel={rel ?? (target === "_blank" ? "noopener noreferrer" : undefined)}
        className={classes}
      >
        {content}
      </a>
    );
  }
  return (
    <button
      {...rest}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={classes}
    >
      {content}
    </button>
  );
}
