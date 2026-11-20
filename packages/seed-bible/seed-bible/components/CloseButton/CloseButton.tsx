import type { JSX } from "preact";
import {
  IconButton,
  type IconButtonLook,
  type IconButtonProps,
  type IconButtonSize,
} from "../IconButton/IconButton";
import { useI18n } from "../../i18n/I18nContext";

export type CloseButtonSize = IconButtonSize;
export type CloseButtonLook = IconButtonLook;

/** What `CloseButton` takes: an `IconButton`'s props, minus the icon. */
export type CloseButtonProps = Omit<
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
  const { t } = useI18n();
  const name = label ?? t("close", { defaultValue: "Close" });
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
