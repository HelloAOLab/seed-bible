import { useSignal } from "@preact/signals";
import { MaterialIcon } from "../icons";
import {
  numberFieldLimits,
  settingValueSatisfiesDefinition,
  type ExtensionSettingDefinition,
  type ExtensionSettingValue,
} from "../../managers/ExtensionManager";
import type { I18nHook } from "../../i18n/I18nManager";

function NumberSettingInput(props: {
  id: string;
  value: number | undefined;
  definition: Extract<ExtensionSettingDefinition, { type: "number" }>;
  onChange: (value: number) => void;
}) {
  const { id, value, definition, onChange } = props;
  const limits = numberFieldLimits(definition);
  // The text as typed, held while the field is focused. Showing the parsed
  // number instead would rewrite an in-progress "1.0" to "1" on the next
  // render, so a decimal like 1.05 could never be typed.
  const draft = useSignal<string | null>(null);

  return (
    <input
      id={id}
      className="sb-settings-text-input"
      type="number"
      min={limits.min}
      max={limits.max}
      step={limits.step}
      value={draft.value ?? (value === undefined ? "" : String(value))}
      onInput={(event: Event) => {
        const raw = (event.currentTarget as HTMLInputElement).value;
        draft.value = raw;
        const parsed = Number(raw);
        // An in-progress edit that isn't a number yet (e.g. empty, or a bare
        // "-"), or one outside the setting's bounds, keeps the last valid
        // value rather than clobbering it.
        if (
          raw.trim() !== "" &&
          settingValueSatisfiesDefinition(parsed, definition)
        ) {
          onChange(parsed);
        }
      }}
      onBlur={() => {
        draft.value = null;
      }}
    />
  );
}

function EnumSettingSelect(props: {
  id: string;
  settingKey: string;
  extensionId: string;
  choices: string[];
  value: string | undefined;
  onChange: (value: string) => void;
  t: I18nHook["t"];
}) {
  const { id, settingKey, extensionId, choices, value, onChange, t } = props;
  const selected = value !== undefined && choices.includes(value) ? value : "";

  return (
    <select
      id={id}
      className="sb-settings-language-select"
      value={selected}
      onChange={(event: Event) => {
        const next = (event.currentTarget as HTMLSelectElement).value;
        if (choices.includes(next)) {
          onChange(next);
        }
      }}
    >
      {selected === "" && <option value=""></option>}
      {choices.map((option) => (
        <option key={option} value={option}>
          {t(`setting-${settingKey}-option-${option}`, {
            ns: extensionId,
            defaultValue: option,
          })}
        </option>
      ))}
    </select>
  );
}

/**
 * One field per declared setting, typed by `ExtensionSettingDefinition.type`.
 * Shared between the per-viewer "Configure" modal in `SettingsPage` and the
 * per-Customization "Defaults" modal in `CustomizationEditPane` — both need
 * the same form, just wired to a different `getValue`/`onChange`/`onReset`.
 */
export function ExtensionSettingsForm(props: {
  extensionId: string;
  settings: Record<string, ExtensionSettingDefinition>;
  /** The value to show for a field: the effective value (an explicit override, a Customization default, or the setting's own default). */
  getValue: (key: string) => ExtensionSettingValue | undefined;
  /**
   * The default this field overrides, noted under the setting's description so
   * the viewer can see what it falls back to. Omit to show nothing.
   */
  getDefault?: (key: string) => ExtensionSettingValue | undefined;
  onChange: (key: string, value: ExtensionSettingValue) => void;
  /**
   * Lets a field be reverted to whatever it falls back to when nothing is
   * explicitly set here — the reset action only shows for a field where
   * `hasOwnValue` is true. Omit entirely to hide the reset action.
   */
  resetting?: {
    hasOwnValue: (key: string) => boolean;
    onReset: (key: string) => void;
  };
  /**
   * Makes storing a value an explicit choice: each setting gets a checkbox, and
   * a setting that isn't checked shows the default it leaves in place instead of
   * a field. `onOverrideChange` is what stores or removes the value, so a
   * checked setting always has one. Omit for a form whose fields always store a
   * value, and use `resetting` there instead.
   */
  overriding?: {
    isOverridden: (key: string) => boolean;
    onOverrideChange: (key: string, overridden: boolean) => void;
  };
  t: I18nHook["t"];
}) {
  const {
    extensionId,
    settings,
    getValue,
    getDefault,
    onChange,
    resetting,
    overriding,
    t,
  } = props;
  const entries = Object.entries(settings);

  if (entries.length === 0) {
    return (
      <div className="sb-settings-empty-state">
        <p>
          {t("no-extension-settings", {
            defaultValue: "This extension has no configurable settings.",
          })}
        </p>
      </div>
    );
  }

  return (
    <div className="sb-extension-settings-fields">
      {entries.map(([key, definition]) => {
        const fieldId = `sb-extension-setting-${extensionId}-${key}`;
        const title = t(`setting-${key}-title`, {
          ns: extensionId,
          defaultValue: key,
        });
        const description = t(`setting-${key}-description`, {
          ns: extensionId,
          defaultValue: "",
        });
        const value = getValue(key);
        // Rendered under the setting's title in both layouts, so the
        // explanation reads as part of the title rather than of the field.
        const descriptionNode = description ? (
          <p className="sb-settings-field-description">{description}</p>
        ) : null;
        // A field only stores a value when it is overridden; without the
        // checkbox every field stores one.
        const overridden = overriding ? overriding.isOverridden(key) : true;
        const overrideNode = overriding ? (
          <label className="sb-settings-field-override">
            {/* The real checkbox stays for keyboard and screen readers; the
                Material glyph beside it is what's actually seen. */}
            <input
              type="checkbox"
              className="sb-settings-field-override-input"
              checked={overridden}
              aria-label={t("override-setting", {
                defaultValue: "Override {{name}}",
                name: title,
              })}
              onChange={(event: Event) =>
                overriding.onOverrideChange(
                  key,
                  (event.currentTarget as HTMLInputElement).checked
                )
              }
            />
            <MaterialIcon className="sb-settings-field-override-icon">
              {overridden ? "check_box" : "check_box_outline_blank"}
            </MaterialIcon>
            {t("override-setting-label", { defaultValue: "Override" })}
          </label>
        ) : null;
        const defaultValue = getDefault?.(key);
        const defaultNode =
          getDefault && defaultValue === undefined ? (
            <p className="sb-settings-field-default-note">
              {t("setting-no-default", { defaultValue: "No default" })}
            </p>
          ) : defaultValue !== undefined ? (
            <p className="sb-settings-field-default-note">
              {t("setting-default-value", {
                defaultValue: "Default value: {{value}}",
                value:
                  typeof defaultValue === "boolean"
                    ? t(
                        defaultValue ? "setting-value-on" : "setting-value-off",
                        { defaultValue: defaultValue ? "On" : "Off" }
                      )
                    : String(defaultValue),
              })}
            </p>
          ) : null;
        const resetNode = resetting?.hasOwnValue(key) ? (
          <button
            type="button"
            className="sb-theme-color-reset"
            title={t("reset-to-default", {
              defaultValue: "Reset to default",
            })}
            aria-label={t("reset-to-default", {
              defaultValue: "Reset to default",
            })}
            onClick={() => resetting.onReset(key)}
          >
            <span className="material-symbols-outlined">restart_alt</span>
          </button>
        ) : null;

        return (
          <div className="sb-settings-field-row" key={key}>
            {definition.type === "boolean" ? (
              <>
                <div className="sb-settings-toggle-row">
                  <div className="sb-settings-field-title-row">
                    <label
                      className="sb-settings-field-label"
                      htmlFor={overridden ? fieldId : undefined}
                    >
                      {title}
                    </label>
                    {resetNode}
                  </div>
                  {overridden && (
                    <input
                      id={fieldId}
                      type="checkbox"
                      checked={Boolean(value)}
                      onChange={(event: Event) =>
                        onChange(
                          key,
                          (event.currentTarget as HTMLInputElement).checked
                        )
                      }
                    />
                  )}
                </div>
                {descriptionNode}
                {defaultNode}
                {overrideNode}
              </>
            ) : (
              <>
                <div className="sb-settings-field-title-row">
                  <label
                    className="sb-settings-field-label"
                    htmlFor={overridden ? fieldId : undefined}
                  >
                    {title}
                  </label>
                  {resetNode}
                </div>
                {descriptionNode}
                {defaultNode}
                {overrideNode}
                {overridden &&
                  (definition.type === "number" ? (
                    <NumberSettingInput
                      id={fieldId}
                      definition={definition}
                      value={typeof value === "number" ? value : undefined}
                      onChange={(parsed) => onChange(key, parsed)}
                    />
                  ) : definition.enum && definition.enum.length > 0 ? (
                    <EnumSettingSelect
                      id={fieldId}
                      settingKey={key}
                      extensionId={extensionId}
                      choices={definition.enum}
                      value={typeof value === "string" ? value : undefined}
                      onChange={(next) => onChange(key, next)}
                      t={t}
                    />
                  ) : (
                    <input
                      id={fieldId}
                      className="sb-settings-text-input"
                      type="text"
                      value={value === undefined ? "" : String(value)}
                      onInput={(event: Event) =>
                        onChange(
                          key,
                          (event.currentTarget as HTMLInputElement).value
                        )
                      }
                    />
                  ))}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
