import "./Checkbox.css";
import type { ComponentChild, JSX, Ref } from "preact";
import { useCallback, useLayoutEffect, useRef } from "preact/hooks";

export type CheckboxProps = Omit<
  JSX.InputHTMLAttributes<HTMLInputElement>,
  | "type"
  | "checked"
  | "onChange"
  | "indeterminate"
  | "class"
  | "className"
  | "children"
> & {
  checked: boolean;
  /** Called with the new value when it's ticked or unticked. */
  onToggled: (checked: boolean) => void;
  /** The text beside the box; clicking it ticks the box too. Without one, give the checkbox an `aria-label`. */
  label?: ComponentChild;
  /** Some but not all of what it stands for are ticked (a "Select all" over a partly ticked list): shows a dash, and screen readers hear "mixed". */
  indeterminate?: boolean;
  /** Extra classes, for placement, on the outer element (the label when there is one). `class` and `className` both work. */
  className?: string;
  class?: string;
  /** The `<input>` element, for code that has to focus it. */
  inputRef?: Ref<HTMLInputElement>;
};

/**
 * A checkbox for a choice that's submitted later or ticked alongside others
 * (agreeing to the terms, picking pages to import). For a setting that takes
 * effect at once, use `Switch`.
 */
export function Checkbox({
  checked,
  onToggled,
  label,
  indeterminate = false,
  className,
  class: classAttribute,
  inputRef,
  ...rest
}: CheckboxProps) {
  const input = useRef<HTMLInputElement | null>(null);
  // `indeterminate` has no HTML attribute, and a click clears it, so it's set
  // on the element after every render rather than passed as a prop.
  useLayoutEffect(() => {
    if (input.current) {
      input.current.indeterminate = indeterminate;
    }
  });
  // Kept the same between renders: Preact detaches and reattaches a ref that
  // changes, which would call a callback `inputRef` on every re-render.
  const setInput = useCallback(
    (element: HTMLInputElement | null) => {
      input.current = element;
      if (typeof inputRef === "function") {
        inputRef(element);
      } else if (inputRef) {
        inputRef.current = element;
      }
    },
    [inputRef]
  );
  const classes = [className, classAttribute].filter(Boolean).join(" ");
  const box = (
    <input
      {...rest}
      ref={setInput}
      type="checkbox"
      className={["sb-checkbox-input", label === undefined && classes]
        .filter(Boolean)
        .join(" ")}
      checked={checked}
      onChange={(event: Event) =>
        onToggled((event.currentTarget as HTMLInputElement).checked)
      }
    />
  );
  if (label === undefined) {
    return box;
  }
  return (
    <label className={["sb-checkbox", classes].filter(Boolean).join(" ")}>
      {box}
      <span className="sb-checkbox-label">{label}</span>
    </label>
  );
}

/**
 * The checkbox's box drawn for show only, inside a control that does the
 * ticking itself, such as a selectable card with its own (visually hidden)
 * checkbox. Hidden from screen readers, so that control has to say whether
 * it's ticked. Like `SwitchIndicator` for `Switch`.
 */
export function CheckboxIndicator({
  checked,
  indeterminate = false,
  disabled = false,
  className,
  class: classAttribute,
}: {
  checked: boolean;
  /** Some but not all of what it stands for are ticked: shows a dash. */
  indeterminate?: boolean;
  /** Dims the box, for a choice that can't be changed right now. */
  disabled?: boolean;
  /** Extra classes, for placement. `class` and `className` both work. */
  className?: string;
  class?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={[
        "sb-checkbox-input",
        "sb-checkbox-indicator",
        indeterminate ? "sb-checkbox-mixed" : checked && "sb-checkbox-on",
        disabled && "sb-checkbox-indicator-disabled",
        className,
        classAttribute,
      ]
        .filter(Boolean)
        .join(" ")}
    />
  );
}
