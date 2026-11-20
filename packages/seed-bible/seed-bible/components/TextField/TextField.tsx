import "./TextField.css";
import type { JSX, Ref } from "preact";
import {
  Field,
  fieldDescribedBy,
  useFieldIds,
  type FieldTextProps,
} from "../Field/Field";
import { useForwardedRef } from "../useForwardedRef";

export type TextInputSize = "sm" | "md";

type OwnProps = "value" | "size" | "class" | "className" | "children";

type TextInputCommonProps = {
  value?: string;
  /** Called with the box's text each time it changes (every keystroke, paste or cut). */
  onValueInput?: (value: string) => void;
  /** Draws the box in the danger color and tells screen readers the value is wrong. */
  invalid?: boolean;
  /** `md` (the default) for forms; `sm` for a box inside a row or a toolbar. */
  size?: TextInputSize;
  /** Extra classes, for placement. `class` and `className` both work. */
  className?: string;
  class?: string;
};

export type SingleLineTextInputProps = TextInputCommonProps &
  Omit<JSX.InputHTMLAttributes<HTMLInputElement>, OwnProps> & {
    multiline?: false;
    /** The `<input>` element, for code that has to focus it. */
    inputRef?: Ref<HTMLInputElement>;
  };

export type MultilineTextInputProps = TextInputCommonProps &
  Omit<JSX.TextareaHTMLAttributes<HTMLTextAreaElement>, OwnProps> & {
    /** A `<textarea>` for longer text, which the person can make taller. */
    multiline: true;
    /** The `<textarea>` element, for code that has to focus it. */
    inputRef?: Ref<HTMLTextAreaElement>;
  };

export type TextInputProps = SingleLineTextInputProps | MultilineTextInputProps;

/**
 * The text box alone, for one whose label is elsewhere: give it an
 * `aria-label`, or an `id` that a label points at. For a box with a label,
 * hint or error of its own, use `TextField`.
 */
export function TextInput(props: TextInputProps) {
  const {
    onValueInput,
    invalid = false,
    size = "md",
    className,
    class: classAttribute,
    inputRef,
    multiline,
    onInput,
    ...rest
  } = props;
  const setElement = useForwardedRef<HTMLInputElement | HTMLTextAreaElement>(
    inputRef as Ref<HTMLInputElement | HTMLTextAreaElement> | undefined
  );
  const classes = [
    "sb-text-input",
    size === "sm" && "sb-text-input-sm",
    multiline && "sb-text-input-multiline",
    className,
    classAttribute,
  ]
    .filter(Boolean)
    .join(" ");
  const handleInput = (
    event: JSX.TargetedInputEvent<HTMLInputElement & HTMLTextAreaElement>
  ) => {
    (onInput as ((event: Event) => void) | undefined)?.(event);
    onValueInput?.(event.currentTarget.value);
  };
  const callerInvalid = rest["aria-invalid"];
  const isInvalid =
    invalid || callerInvalid === true || callerInvalid === "true";

  if (multiline) {
    return (
      <textarea
        rows={3}
        {...(rest as JSX.TextareaHTMLAttributes<HTMLTextAreaElement>)}
        ref={setElement}
        className={classes}
        aria-invalid={isInvalid || undefined}
        onInput={handleInput}
      />
    );
  }
  return (
    <input
      type="text"
      {...(rest as JSX.InputHTMLAttributes<HTMLInputElement>)}
      ref={setElement}
      className={classes}
      aria-invalid={isInvalid || undefined}
      onInput={handleInput}
    />
  );
}

export type TextFieldProps = TextInputProps &
  FieldTextProps & {
    /** Shows "12/100" under the box. Needs `maxLength` and `value`. */
    showCount?: boolean;
  };

/**
 * A text box with its label, and optionally a hint, an error and a character
 * count, all tied to the box for screen readers. `className` places the whole
 * field; every other prop goes to the box.
 */
export function TextField(props: TextFieldProps) {
  const {
    label,
    hideLabel,
    optional,
    hint,
    error,
    showCount = false,
    className,
    class: classAttribute,
    id,
    invalid = false,
    ...inputProps
  } = props;
  const ids = useFieldIds(id as string | undefined);
  const hasError = error !== undefined && error !== null && error !== false;
  const hasHint = hint !== undefined && hint !== null && hint !== false;
  const max = inputProps.maxLength as number | undefined;
  const count =
    showCount && max !== undefined
      ? { used: inputProps.value?.length ?? 0, max }
      : undefined;
  const describedBy = fieldDescribedBy(
    ids,
    { hint: hasHint, count: !!count, error: hasError },
    inputProps["aria-describedby"] as string | undefined
  );
  return (
    <Field
      ids={ids}
      label={label}
      hideLabel={hideLabel}
      optional={optional}
      hint={hint}
      error={error}
      count={count}
      className={[className, classAttribute].filter(Boolean).join(" ")}
    >
      <TextInput
        {...(inputProps as TextInputProps)}
        id={ids.controlId}
        invalid={invalid || hasError}
        aria-describedby={describedBy}
      />
    </Field>
  );
}
