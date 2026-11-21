import "./Field.css";
import "../visuallyHidden.inline.css";
import type { ComponentChild, ComponentChildren } from "preact";
import { useId } from "preact/hooks";
import { useI18n } from "../../i18n/I18nContext";

/** What `TextField` and `SelectField` say around their control. */
export type FieldTextProps = {
  /** What the field is for ("Profile name"). Required: it names the control for screen readers too. */
  label: ComponentChild;
  /**
   * Keeps the label for screen readers only, for a box whose purpose is plain
   * from where it sits (a search-style box, a one-line "add" row). Give it a
   * placeholder so sighted people still see what to type.
   */
  hideLabel?: boolean;
  /** Adds "(Optional)" after the label. */
  optional?: boolean;
  /** A line under the field saying more (a format, a limit). Read out with it. */
  hint?: ComponentChild;
  /** What's wrong with the value. Shows in the danger color, marks the field invalid and is announced. */
  error?: ComponentChild;
};

export type FieldIds = {
  controlId: string;
  labelId: string;
  hintId: string;
  errorId: string;
  countId: string;
};

/** Ids for a field's control and the text around it; `id` chooses the control's. */
export function useFieldIds(id?: string): FieldIds {
  const generated = `sb-field-${useId()}`;
  const controlId = id ?? generated;
  return {
    controlId,
    labelId: `${controlId}-label`,
    hintId: `${controlId}-hint`,
    errorId: `${controlId}-error`,
    countId: `${controlId}-count`,
  };
}

/**
 * The ids a field's control should list in `aria-describedby`: the hint, the
 * count and the error, those that are shown, after any the caller gave.
 */
export function fieldDescribedBy(
  ids: FieldIds,
  shown: { hint: boolean; count: boolean; error: boolean },
  own?: string
): string | undefined {
  const list = [
    own,
    shown.hint && ids.hintId,
    shown.count && ids.countId,
    shown.error && ids.errorId,
  ].filter(Boolean);
  return list.length ? list.join(" ") : undefined;
}

const isShown = (node: ComponentChild) =>
  node !== undefined && node !== null && node !== false;

/**
 * Everything a field's control needs from the text around it: the ids, whether
 * an error is showing, and the `aria-describedby` to put on the control.
 */
export function useFieldWiring(props: {
  id?: string;
  hint?: ComponentChild;
  error?: ComponentChild;
  /** A count is showing under the control. */
  count?: boolean;
  /** An `aria-describedby` the caller gave, which stays first. */
  describedBy?: string;
}) {
  const ids = useFieldIds(props.id);
  const hasError = isShown(props.error);
  const describedBy = fieldDescribedBy(
    ids,
    { hint: isShown(props.hint), count: !!props.count, error: hasError },
    props.describedBy
  );
  return { ids, hasError, describedBy };
}

/** The label above a field's control, and the error, hint and count under it. */
export function Field({
  ids,
  label,
  hideLabel = false,
  optional = false,
  hint,
  error,
  count,
  className,
  children,
}: FieldTextProps & {
  ids: FieldIds;
  /** Characters used and allowed, for a "12/100" count under the control. */
  count?: { used: number; max: number };
  className?: string;
  children: ComponentChildren;
}) {
  const { t } = useI18n();
  const hasError = isShown(error);
  const hasHint = isShown(hint);
  return (
    <div className={["sb-field", className].filter(Boolean).join(" ")}>
      <label
        id={ids.labelId}
        className={hideLabel ? "sb-visually-hidden" : "sb-field-label"}
        htmlFor={ids.controlId}
      >
        {label}
        {optional && (
          <>
            {" "}
            <span className="sb-field-optional">
              {t("optional", { defaultValue: "(Optional)" })}
            </span>
          </>
        )}
      </label>
      {children}
      {hasError && (
        <p id={ids.errorId} className="sb-field-error" role="alert">
          {error}
        </p>
      )}
      {(hasHint || count) && (
        <div className="sb-field-footer">
          {hasHint && (
            <p id={ids.hintId} className="sb-field-hint">
              {hint}
            </p>
          )}
          {count && (
            <span className="sb-field-count">
              {/* The short "12/100" is for the eye; screen readers get a sentence. */}
              <span aria-hidden="true">
                {count.used}/{count.max}
              </span>
              <span id={ids.countId} className="sb-visually-hidden">
                {t("text-field-count", {
                  defaultValue: "{{count}} of {{max}} characters",
                  count: count.used,
                  max: count.max,
                })}
              </span>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
