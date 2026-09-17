import { useSignal } from "@preact/signals";
import type {
  ExtensionSettingDefinition,
  ExtensionSettingValue,
} from "../../managers/ExtensionManager";
import type { I18nHook } from "../../i18n/I18nManager";

function NumberSettingInput(props: {
  id: string;
  value: number | undefined;
  onChange: (value: number) => void;
}) {
  const { id, value, onChange } = props;
  // The text as typed, held while the field is focused. Showing the parsed
  // number instead would rewrite an in-progress "1.0" to "1" on the next
  // render, so a decimal like 1.05 could never be typed.
  const draft = useSignal<string | null>(null);

  return (
    <input
      id={id}
      className="sb-settings-text-input"
      type="number"
      value={draft.value ?? (value === undefined ? "" : String(value))}
      onInput={(event: Event) => {
        const raw = (event.currentTarget as HTMLInputElement).value;
        draft.value = raw;
        const parsed = Number(raw);
        // An in-progress edit that isn't a number yet (e.g. empty, or a bare
        // "-") keeps the last valid value rather than clobbering it.
        if (raw.trim() !== "" && Number.isFinite(parsed)) {
          onChange(parsed);
        }
      }}
      onBlur={() => {
        draft.value = null;
      }}
    />
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
  t: I18nHook["t"];
}) {
  const { extensionId, settings, getValue, onChange, resetting, t } = props;
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
    <>
      {entries.map(([key, definition]) => {
        const fieldId = `sb-extension-setting-${extensionId}-${key}`;
        const title =
          // eslint-disable-next-line seed-bible-i18n/translation-missing-keys
          t(`setting-${key}-title`, { ns: extensionId, defaultValue: key });
        const description = t(`setting-${key}-description`, {
          ns: extensionId,
          defaultValue: "",
        });
        const value = getValue(key);

        return (
          <div className="sb-settings-field-row" key={key}>
            {definition.type === "boolean" ? (
              <div className="sb-settings-toggle-row">
                <label className="sb-settings-toggle-label" htmlFor={fieldId}>
                  {title}
                </label>
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
              </div>
            ) : (
              <>
                <label className="sb-settings-field-label" htmlFor={fieldId}>
                  {title}
                </label>
                {definition.type === "number" ? (
                  <NumberSettingInput
                    id={fieldId}
                    value={typeof value === "number" ? value : undefined}
                    onChange={(parsed) => onChange(key, parsed)}
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
                )}
              </>
            )}
            {description && (
              <p className="sb-settings-field-description">{description}</p>
            )}
            {resetting?.hasOwnValue(key) && (
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
            )}
          </div>
        );
      })}
    </>
  );
}
