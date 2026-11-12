import type { JSX } from "preact";
import {
  IconButton,
  type IconButtonLook,
  type IconButtonProps,
  type IconButtonSize,
} from "../IconButton/IconButton";
import { useOptionalI18n } from "../../i18n";
import "./CloseButton.css";

export type CloseButtonSize = IconButtonSize;
export type CloseButtonLook = IconButtonLook;

type CloseButtonProps = Omit<
  IconButtonProps,
  "icon" | "label" | "pressed" | "onClick"
> & {
  onClose: (event: JSX.TargetedMouseEvent<HTMLButtonElement>) => void;
  /** What closing does, for screen readers and the tooltip. Defaults to "Close". */
  label?: string;
};

/**
 * The × that closes a pane, modal, sheet, toast or panel. A × that clears or
 * removes something (a search, a bookmark) isn't a close button: screen
 * readers should hear what it does, so it uses an IconButton with its own
 * label instead.
 */
export function CloseButton({
  onClose,
  label,
  className,
  class: classAttribute,
  ...rest
}: CloseButtonProps) {
  // Optional, so an extension rendering into its own root (no I18nProvider)
  // still gets a working button.
  const i18n = useOptionalI18n();
  const name = label ?? i18n?.t("close", { defaultValue: "Close" }) ?? "Close";
  return (
    <IconButton
      {...rest}
      icon="close"
      label={name}
      className={["sb-close-button", className, classAttribute]
        .filter(Boolean)
        .join(" ")}
      onClick={onClose}
    />
  );
}
