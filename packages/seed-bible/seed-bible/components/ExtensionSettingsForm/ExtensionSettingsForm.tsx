import type {
  ExtensionSettingDefinition,
  ExtensionSettingValue,
} from "../../managers/ExtensionManager";
import type { I18nHook } from "../../i18n/I18nManager";

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
                <input
                  id={fieldId}
                  className="sb-settings-text-input"
                  type={definition.type === "number" ? "number" : "text"}
                  value={value === undefined ? "" : String(value)}
                  onInput={(event: Event) => {
                    const raw = (event.currentTarget as HTMLInputElement).value;
                    if (definition.type === "number") {
                      const parsed = Number(raw);
                      // Ignore an in-progress edit that isn't a valid number
                      // yet (e.g. a bare "-" or empty string) rather than
                      // clobbering the last valid value.
                      if (raw === "" || Number.isNaN(parsed)) {
                        return;
                      }
                      onChange(key, parsed);
                    } else {
                      onChange(key, raw);
                    }
                  }}
                />
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
