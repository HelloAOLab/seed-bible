import "./SettingRow.css";
import type { ComponentChild, ComponentChildren } from "preact";
import { useId } from "preact/hooks";
import { SettingRowContext } from "./SettingRowContext";

export type SettingRowProps = {
  /** What the setting is ("Show headings"). Names the control for screen readers too. */
  label: ComponentChild;
  /** A line under the label saying more, read out with the control. */
  description?: ComponentChild;
  /** The control, at the row's end: usually a `Switch`, or a select or a button. */
  children: ComponentChildren;
  /**
   * The control's id, when it isn't a `Switch` (which picks up the row's
   * own): give the control this same id so the label points at it.
   */
  controlId?: string;
  /** Extra classes, for placement. `class` and `className` both work. */
  className?: string;
  class?: string;
};

/** One setting: its label (and description) on one side and its control on the other. */
export function SettingRow({
  label,
  description,
  children,
  controlId,
  className,
  class: classAttribute,
}: SettingRowProps) {
  const generatedId = `sb-setting-${useId()}`;
  const id = controlId ?? generatedId;
  const descriptionId = description ? `${id}-description` : undefined;
  return (
    <div
      className={["sb-setting-row", className, classAttribute]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="sb-setting-row-text">
        <label className="sb-setting-row-label" htmlFor={id}>
          {label}
        </label>
        {description && (
          <p id={descriptionId} className="sb-setting-row-description">
            {description}
          </p>
        )}
      </div>
      <SettingRowContext.Provider value={{ controlId: id, descriptionId }}>
        {children}
      </SettingRowContext.Provider>
    </div>
  );
}
