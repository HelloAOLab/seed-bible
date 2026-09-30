import { useSignal } from "@preact/signals";
import type {
  ExtensionSensitiveProxyDefinition,
  ExtensionSettingDefinition,
} from "../../managers/ExtensionManager";
import type { I18nHook } from "../../i18n/I18nManager";

function SensitiveProxyGroup(props: {
  extensionId: string;
  proxyId: string;
  proxy: ExtensionSensitiveProxyDefinition;
  settingKeys: string[];
  isSet: (key: string) => boolean;
  onSave: (values: Record<string, string>) => Promise<boolean>;
  onClear: () => Promise<boolean>;
  t: I18nHook["t"];
}) {
  const {
    extensionId,
    proxyId,
    proxy,
    settingKeys,
    isSet,
    onSave,
    onClear,
    t,
  } = props;
  // What the viewer has typed. Cleared once saved, since a stored value is
  // never shown again.
  const drafts = useSignal<Record<string, string>>({});
  const busy = useSignal(false);
  const failed = useSignal(false);
  const anySet = settingKeys.some(isSet);
  const anyTyped = settingKeys.some((key) => (drafts.value[key] ?? "") !== "");

  const run = async (action: () => Promise<boolean>) => {
    busy.value = true;
    failed.value = false;
    const ok = await action();
    busy.value = false;
    failed.value = !ok;
    if (ok) {
      drafts.value = {};
    }
  };

  return (
    <fieldset className="sb-extension-sensitive-group" disabled={busy.value}>
      <legend className="sb-settings-field-label">
        {t(`sensitive-${proxyId}-title`, {
          ns: extensionId,
          defaultValue: proxy.host,
        })}
      </legend>
      <p className="sb-settings-field-default-note">
        {t("sensitive-settings-destination", {
          defaultValue:
            "Only sent to {{host}}. Stored privately on the server and never shown again.",
          host: proxy.host,
        })}
      </p>
      {settingKeys.map((key) => {
        const fieldId = `sb-extension-setting-${extensionId}-${key}`;
        const description = t(`setting-${key}-description`, {
          ns: extensionId,
          defaultValue: "",
        });
        return (
          <div className="sb-settings-field-row" key={key}>
            <div className="sb-settings-field-title-row">
              <label className="sb-settings-field-label" htmlFor={fieldId}>
                {t(`setting-${key}-title`, {
                  ns: extensionId,
                  defaultValue: key,
                })}
              </label>
            </div>
            {description && (
              <p className="sb-settings-field-description">{description}</p>
            )}
            <p className="sb-settings-field-default-note">
              {isSet(key)
                ? t("sensitive-setting-set", { defaultValue: "Set" })
                : t("sensitive-setting-not-set", { defaultValue: "Not set" })}
            </p>
            <input
              id={fieldId}
              className="sb-settings-text-input"
              type="password"
              autoComplete="off"
              value={drafts.value[key] ?? ""}
              onInput={(event: Event) => {
                drafts.value = {
                  ...drafts.value,
                  [key]: (event.currentTarget as HTMLInputElement).value,
                };
              }}
            />
          </div>
        );
      })}
      {anySet && settingKeys.length > 1 && (
        <p className="sb-settings-field-default-note">
          {t("sensitive-settings-replace-note", {
            defaultValue:
              "Saving replaces every value above. Re-enter any you want to keep.",
          })}
        </p>
      )}
      <div className="sb-extension-sensitive-actions">
        <button
          type="button"
          className="sb-settings-action-button"
          disabled={!anyTyped}
          onClick={() => void run(() => onSave(drafts.value))}
        >
          {anySet
            ? t("sensitive-settings-replace", { defaultValue: "Replace" })
            : t("sensitive-settings-save", { defaultValue: "Save" })}
        </button>
        {anySet && (
          <button
            type="button"
            className="sb-settings-action-button"
            onClick={() => void run(onClear)}
          >
            {t("sensitive-settings-clear", { defaultValue: "Clear" })}
          </button>
        )}
      </div>
      {failed.value && (
        <p className="sb-settings-save-error" role="alert">
          {t("extension-settings-save-failed", {
            defaultValue: "Couldn't save your settings.",
          })}
        </p>
      )}
    </fieldset>
  );
}

/**
 * The masked fields for an extension's sensitive settings, one group per
 * `sensitive` entry. A stored value is never shown, only whether it is set,
 * and a group is saved as a whole because its stored values can't be read
 * back to keep the ones left untouched.
 */
export function SensitiveSettingsForm(props: {
  extensionId: string;
  settings: Record<string, ExtensionSettingDefinition>;
  sensitive: Record<string, ExtensionSensitiveProxyDefinition>;
  isSet: (key: string) => boolean;
  onSave: (proxyId: string, values: Record<string, string>) => Promise<boolean>;
  onClear: (proxyId: string) => Promise<boolean>;
  t: I18nHook["t"];
}) {
  const { extensionId, settings, sensitive, isSet, onSave, onClear, t } = props;
  return (
    <>
      {Object.entries(sensitive).map(([proxyId, proxy]) => {
        const settingKeys = Object.entries(settings)
          .filter(
            ([, definition]) =>
              definition.type === "string" && definition.sensitive === proxyId
          )
          .map(([key]) => key);
        if (settingKeys.length === 0) {
          return null;
        }
        return (
          <SensitiveProxyGroup
            key={proxyId}
            extensionId={extensionId}
            proxyId={proxyId}
            proxy={proxy}
            settingKeys={settingKeys}
            isSet={isSet}
            onSave={(values) => onSave(proxyId, values)}
            onClear={() => onClear(proxyId)}
            t={t}
          />
        );
      })}
    </>
  );
}
