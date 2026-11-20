import "./Switch.css";
import type { JSX, Ref } from "preact";
import { useContext } from "preact/hooks";
import { SettingRowContext } from "../SettingRow/SettingRowContext";

export type SwitchProps = Omit<
  JSX.InputHTMLAttributes<HTMLInputElement>,
  "type" | "role" | "checked" | "onChange" | "class" | "className" | "children"
> & {
  checked: boolean;
  /** Called with the new value when the switch is flipped. */
  onToggled: (checked: boolean) => void;
  /** Extra classes, for placement. `class` and `className` both work. */
  className?: string;
  class?: string;
  /** The `<input>` element, for code that has to focus it. */
  inputRef?: Ref<HTMLInputElement>;
};

/**
 * An on/off switch for a setting that takes effect at once (Show headings,
 * Keep screen awake). For a choice that's submitted later or one of several
 * ticked together (agreeing to the terms, picking pages), use `Checkbox`.
 *
 * It has no text of its own. Inside a `SettingRow` it's named by the row's
 * label; anywhere else, give it an `aria-label`, or an `id` that a `<label>`
 * points at.
 */
export function Switch({
  checked,
  onToggled,
  className,
  class: classAttribute,
  inputRef,
  id,
  "aria-describedby": describedBy,
  ...rest
}: SwitchProps) {
  const row = useContext(SettingRowContext);
  return (
    <input
      {...rest}
      ref={inputRef}
      type="checkbox"
      role="switch"
      id={id ?? row?.controlId}
      aria-describedby={describedBy ?? row?.descriptionId}
      className={["sb-switch", className, classAttribute]
        .filter(Boolean)
        .join(" ")}
      checked={checked}
      onChange={(event: Event) =>
        onToggled((event.currentTarget as HTMLInputElement).checked)
      }
    />
  );
}

/**
 * A switch drawn for show only, inside a control that does the switching
 * itself, such as a menu item with `role="menuitemcheckbox"` (a real switch
 * can't go inside another control). Hidden from screen readers, so that
 * control has to say whether it's on.
 */
export function SwitchIndicator({
  on,
  className,
  class: classAttribute,
}: {
  on: boolean;
  /** Extra classes, for placement. `class` and `className` both work. */
  className?: string;
  class?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={[
        "sb-switch",
        "sb-switch-indicator",
        on && "sb-switch-on",
        className,
        classAttribute,
      ]
        .filter(Boolean)
        .join(" ")}
    />
  );
}
