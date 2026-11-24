import "../TextField/TextField.css";
import "./Select.css";
import type { ComponentChildren, JSX, Ref } from "preact";
import { Field, useFieldWiring, type FieldTextProps } from "../Field/Field";
import type { TextInputSize } from "../TextField/TextField";
import { useForwardedRef } from "../useForwardedRef";

export type SelectProps = Omit<
  JSX.SelectHTMLAttributes<HTMLSelectElement>,
  "value" | "size" | "multiple" | "class" | "className" | "children"
> & {
  value: string;
  /** Called with the chosen option's value. */
  onValueChange?: (value: string) => void;
  /** The `<option>`s (and `<optgroup>`s) to choose from. */
  children: ComponentChildren;
  /** Draws the box in the danger color and tells screen readers the choice is wrong. */
  invalid?: boolean;
  /** `md` (the default) for forms; `sm` for a box inside a row or a toolbar. */
  size?: TextInputSize;
  /** Extra classes, for placement, on the element around the `<select>`. `class` and `className` both work. */
  className?: string;
  class?: string;
  /** The `<select>` element, for code that has to focus it. */
  selectRef?: Ref<HTMLSelectElement>;
};

/**
 * A dropdown that opens the browser's own list (so a phone shows its own
 * picker), drawn in the same box as `TextInput`. For one whose label is
 * elsewhere, give it an `aria-label` or an `id` that a label points at. For a
 * dropdown with a label, hint or error of its own, use `SelectField`. For a
 * long list that needs searching, use `SearchableSelect`.
 */
export function Select({
  onValueChange,
  invalid = false,
  size = "md",
  className,
  class: classAttribute,
  selectRef,
  children,
  onChange,
  ...rest
}: SelectProps) {
  const setElement = useForwardedRef(selectRef);
  const callerInvalid = rest["aria-invalid"];
  const isInvalid =
    invalid || callerInvalid === true || callerInvalid === "true";
  return (
    <span
      className={["sb-select", className, classAttribute]
        .filter(Boolean)
        .join(" ")}
    >
      <select
        {...rest}
        ref={setElement}
        className={[
          "sb-text-input",
          "sb-select-input",
          size === "sm" && "sb-text-input-sm",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-invalid={isInvalid || undefined}
        onChange={(event) => {
          (onChange as ((event: Event) => void) | undefined)?.(event);
          onValueChange?.(event.currentTarget.value);
        }}
      >
        {children}
      </select>
    </span>
  );
}

export type SelectFieldProps = SelectProps & FieldTextProps;

/**
 * A dropdown with its label, and optionally a hint and an error, all tied to
 * it for screen readers. `className` places the whole field; every other prop
 * goes to the dropdown.
 */
export function SelectField(props: SelectFieldProps) {
  const {
    label,
    hideLabel,
    optional,
    hint,
    error,
    className,
    class: classAttribute,
    id,
    invalid = false,
    ...selectProps
  } = props;
  const { ids, hasError, describedBy } = useFieldWiring({
    id: id as string | undefined,
    hint,
    error,
    describedBy: selectProps["aria-describedby"] as string | undefined,
  });
  return (
    <Field
      ids={ids}
      label={label}
      hideLabel={hideLabel}
      optional={optional}
      hint={hint}
      error={error}
      className={[className, classAttribute].filter(Boolean).join(" ")}
    >
      <Select
        {...selectProps}
        id={ids.controlId}
        invalid={invalid || hasError}
        aria-describedby={describedBy}
      />
    </Field>
  );
}
