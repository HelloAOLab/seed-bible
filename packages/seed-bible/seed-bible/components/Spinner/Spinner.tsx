import "./Spinner.css";
import { MaterialIcon } from "../icons";

export interface SpinnerProps {
  /**
   * CSS length for the glyph, such as `"0.875rem"` or `"1em"`.
   * Defaults to `1em`, so it matches the text it sits beside.
   * Prefer `rem` when it should follow the UI size setting.
   */
  size?: string;
  /** Extra classes for layout (margins, color). The spin itself stays here. */
  className?: string;
  /**
   * When set, the spinner is announced. Leave it unset next to a label that
   * already says what is happening — the icon stays hidden from assistive tech.
   */
  label?: string;
}

/** A small spinning indicator. Size it to the spot it sits in. */
export function Spinner(props: SpinnerProps) {
  const { size = "1em", className, label } = props;
  return (
    <MaterialIcon
      className={["sb-spinner", className].filter(Boolean).join(" ")}
      style={{ fontSize: size }}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? "status" : undefined}
    >
      progress_activity
    </MaterialIcon>
  );
}
