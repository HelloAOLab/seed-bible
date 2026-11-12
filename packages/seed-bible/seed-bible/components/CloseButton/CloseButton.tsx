import "./CloseButton.css";
import type { JSX } from "preact";
import { MaterialIcon } from "../icons";
import { useI18n } from "../../i18n";

export type CloseButtonSize = "sm" | "md" | "lg";
export type CloseButtonLook = "plain" | "tinted";

type CloseButtonProps = Omit<
  JSX.ButtonHTMLAttributes<HTMLButtonElement>,
  "size" | "onClick" | "children" | "aria-label" | "title" | "type"
> & {
  onClose: (event: JSX.TargetedMouseEvent<HTMLButtonElement>) => void;
  /** What closing does, for screen readers and the tooltip. Defaults to "Close". */
  label?: string;
  /** sm (28px) for toasts and small floating panels, md (32px) for pane headers and modals, lg (40px) for phone screen headers. */
  size?: CloseButtonSize;
  /** `plain` has no background until hovered; `tinted` sits on a soft circle, for a button floating over content. */
  look?: CloseButtonLook;
};

/**
 * The × that closes a pane, modal, sheet, toast or panel. A × that clears or
 * removes something (a search, a bookmark) isn't a close button: screen
 * readers should hear what it does, so it isn't built on this.
 */
export function CloseButton({
  onClose,
  label,
  size = "md",
  look = "plain",
  className,
  ...rest
}: CloseButtonProps) {
  const { t } = useI18n();
  const name = label ?? t("close", { defaultValue: "Close" });
  return (
    <button
      {...rest}
      type="button"
      className={[
        "sb-close-button",
        `sb-close-button-${size}`,
        `sb-close-button-${look}`,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={onClose}
      aria-label={name}
      title={name}
    >
      <MaterialIcon aria-hidden="true">close</MaterialIcon>
    </button>
  );
}
