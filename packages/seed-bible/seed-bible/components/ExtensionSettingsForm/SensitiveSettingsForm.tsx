import { useSignal } from "@preact/signals";
import type {
  ExtensionSensitiveProxyDefinition,
  ExtensionSensitiveProxyVisibility,
  ExtensionSettingDefinition,
} from "../../managers/ExtensionManager";
import {
  isValidSensitiveHost,
  normalizeSensitiveHost,
} from "../../managers/extensionSettingConstraints";
import type {
  SensitiveDestination,
  SensitiveSaveOptions,
  UnusedSensitiveProxy,
} from "../../managers/ExtensionSensitiveSettings";
import type { I18nHook } from "../../i18n/I18nManager";

/**
 * Whose values the form edits: the viewer's own, or those of the
 * Customization being edited, which everyone using it sends with.
 */
export type SensitiveSettingsFormScope = "viewer" | "customization";

function SensitiveProxyGroup(props: {
  scope: SensitiveSettingsFormScope;
  extensionId: string;
  proxyId: string;
  proxy: ExtensionSensitiveProxyDefinition;
  settingKeys: string[];
  /** The saved destination, or the manifest's when nothing current is saved. */
  destination: SensitiveDestination;
  /** True when values are saved for this entry, whether or not they still count as set. */
  hasStored: boolean;
  isSet: (key: string) => boolean;
  isProvided?: (key: string) => boolean;
  onSave: (
    values: Record<string, string>,
    options: SensitiveSaveOptions
  ) => Promise<boolean>;
  onClear: () => Promise<boolean>;
  t: I18nHook["t"];
}) {
  const {
    scope,
    extensionId,
    proxyId,
    proxy,
    settingKeys,
    destination,
    hasStored,
    isSet,
    isProvided,
    onSave,
    onClear,
    t,
  } = props;
  // What the viewer has typed. Cleared once saved, since a stored value is
  // never shown again.
  const drafts = useSignal<Record<string, string>>({});
  // Null until edited, so the field follows the saved destination until then.
  const hostDraft = useSignal<string | null>(null);
  const visibilityDraft = useSignal<ExtensionSensitiveProxyVisibility | null>(
    null
  );
  const busy = useSignal(false);
  const failed = useSignal(false);
  const anySet = settingKeys.some(isSet);
  const anyTyped = settingKeys.some((key) => (drafts.value[key] ?? "") !== "");
  const host = normalizeSensitiveHost(hostDraft.value ?? destination.host);
  const visibility = visibilityDraft.value ?? destination.visibility;
  const hostValid = isValidSensitiveHost(host);
  const hostFieldId = `sb-extension-sensitive-${extensionId}-${proxyId}-host`;
  const visibilityFieldId = `sb-extension-sensitive-${extensionId}-${proxyId}-visibility`;

  const run = async (action: () => Promise<boolean>) => {
    busy.value = true;
    failed.value = false;
    const ok = await action();
    busy.value = false;
    failed.value = !ok;
    if (ok) {
      drafts.value = {};
      hostDraft.value = null;
      visibilityDraft.value = null;
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
        {visibility === "public" && scope === "customization"
          ? t("sensitive-settings-destination-customization", {
              defaultValue:
                "Only sent to {{host}}. Everyone using this customization sends requests with these values, unless they set their own, but nobody can see them.",
              host,
            })
          : visibility === "public"
            ? t("sensitive-settings-destination-public", {
                defaultValue:
                  "Only sent to {{host}}. Anyone with this proxy's address can send requests with these values, but nobody can see them.",
                host,
              })
            : t("sensitive-settings-destination", {
                defaultValue:
                  "Only sent to {{host}}. Stored privately on the server and never shown again.",
                host,
              })}
      </p>
      <div className="sb-settings-field-row">
        <div className="sb-settings-field-title-row">
          <label className="sb-settings-field-label" htmlFor={hostFieldId}>
            {t("sensitive-settings-host", { defaultValue: "Host" })}
          </label>
        </div>
        {host !== normalizeSensitiveHost(proxy.host) && (
          <p className="sb-settings-field-default-note">
            {t("setting-default-value", {
              defaultValue: "Default value: {{value}}",
              value: proxy.host,
            })}
          </p>
        )}
        <input
          id={hostFieldId}
          className="sb-settings-text-input"
          type="text"
          autoComplete="off"
          spellcheck={false}
          aria-invalid={!hostValid}
          value={hostDraft.value ?? destination.host}
          onInput={(event: Event) => {
            hostDraft.value = (event.currentTarget as HTMLInputElement).value;
          }}
        />
        {!hostValid && (
          <p className="sb-settings-save-error" role="alert">
            {t("sensitive-settings-host-invalid", {
              defaultValue:
                "Enter a host name with an optional port, like api.example.com, without https:// or a path.",
            })}
          </p>
        )}
      </div>
      <div className="sb-settings-field-row">
        <div className="sb-settings-field-title-row">
          <label
            className="sb-settings-field-label"
            htmlFor={visibilityFieldId}
          >
            {t("sensitive-settings-visibility", {
              defaultValue: "Who can use it",
            })}
          </label>
        </div>
        <select
          id={visibilityFieldId}
          className="sb-settings-language-select"
          value={visibility}
          onChange={(event: Event) => {
            const next = (event.currentTarget as HTMLSelectElement).value;
            if (next === "private" || next === "public") {
              visibilityDraft.value = next;
            }
          }}
        >
          <option value="private">
            {t("sensitive-settings-visibility-private", {
              defaultValue: "Only me",
            })}
          </option>
          <option value="public">
            {scope === "customization"
              ? t("sensitive-settings-visibility-customization", {
                  defaultValue: "Everyone using this customization",
                })
              : t("sensitive-settings-visibility-public", {
                  defaultValue: "Anyone with the proxy's address",
                })}
          </option>
        </select>
      </div>
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
                : isProvided?.(key)
                  ? t("sensitive-setting-provided-by-customization", {
                      defaultValue: "Provided by the customization",
                    })
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
      {hasStored && !anySet && (
        <p className="sb-settings-field-default-note">
          {t("sensitive-settings-outdated-note", {
            defaultValue:
              "Values saved for an earlier version of this extension aren't used any more. Enter them again, or clear them.",
          })}
        </p>
      )}
      {anySet && (
        <p className="sb-settings-field-default-note">
          {t("sensitive-settings-replace-note", {
            defaultValue:
              "Saving replaces every value above, and changing the host or who can use it needs them entered again. Re-enter any you want to keep.",
          })}
        </p>
      )}
      <div className="sb-extension-sensitive-actions">
        <button
          type="button"
          className="sb-settings-action-button"
          disabled={!anyTyped || !hostValid}
          onClick={() =>
            void run(() => onSave(drafts.value, { host, visibility }))
          }
        >
          {anySet
            ? t("sensitive-settings-replace", { defaultValue: "Replace" })
            : t("sensitive-settings-save", { defaultValue: "Save" })}
        </button>
        {hasStored && (
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
  /** Defaults to `viewer`. */
  scope?: SensitiveSettingsFormScope;
  extensionId: string;
  settings: Record<string, ExtensionSettingDefinition>;
  sensitive: Record<string, ExtensionSensitiveProxyDefinition>;
  getDestination: (proxyId: string) => SensitiveDestination | null;
  hasStored: (proxyId: string) => boolean;
  isSet: (key: string) => boolean;
  /**
   * True when a setting the viewer hasn't set is filled in by the active
   * Customization instead.
   */
  isProvided?: (key: string) => boolean;
  onSave: (
    proxyId: string,
    values: Record<string, string>,
    options: SensitiveSaveOptions
  ) => Promise<boolean>;
  onClear: (proxyId: string) => Promise<boolean>;
  t: I18nHook["t"];
}) {
  const {
    scope = "viewer",
    extensionId,
    settings,
    sensitive,
    getDestination,
    hasStored,
    isSet,
    isProvided,
    onSave,
    onClear,
    t,
  } = props;
  return (
    <>
      {Object.entries(sensitive).map(([proxyId, proxy]) => {
        const settingKeys = Object.entries(settings)
          .filter(
            ([, definition]) =>
              definition.type === "string" && definition.sensitive === proxyId
          )
          .map(([key]) => key);
        const destination = getDestination(proxyId);
        if (settingKeys.length === 0 || !destination) {
          return null;
        }
        return (
          <SensitiveProxyGroup
            key={proxyId}
            scope={scope}
            extensionId={extensionId}
            proxyId={proxyId}
            proxy={proxy}
            settingKeys={settingKeys}
            destination={destination}
            hasStored={hasStored(proxyId)}
            isSet={isSet}
            isProvided={isProvided}
            onSave={(values, options) => onSave(proxyId, values, options)}
            onClear={() => onClear(proxyId)}
            t={t}
          />
        );
      })}
    </>
  );
}

/**
 * Saved values the Configure window can no longer reach, because their
 * extension was uninstalled or stopped declaring the entry. The proxy record
 * keeps the secret on the server until it is cleared, so this is the only way
 * left to revoke it.
 */
export function UnusedSensitiveSettingsList(props: {
  unused: UnusedSensitiveProxy[];
  getExtensionTitle: (extensionId: string) => string;
  onClear: (extensionId: string, proxyId: string) => Promise<boolean>;
  t: I18nHook["t"];
}) {
  const { unused, getExtensionTitle, onClear, t } = props;
  const clearing = useSignal<string | null>(null);
  const failed = useSignal<string | null>(null);
  if (unused.length === 0) {
    return null;
  }

  return (
    <section className="sb-extension-sensitive-group">
      <h3 className="sb-settings-field-label">
        {t("sensitive-settings-unused-title", {
          defaultValue: "Saved secrets no extension is using",
        })}
      </h3>
      <p className="sb-settings-field-default-note">
        {t("sensitive-settings-unused-description", {
          defaultValue:
            "These belong to extensions that aren't installed, or that no longer ask for them. They stay on the server until you clear them.",
        })}
      </p>
      {unused.map(({ extensionId, proxyId, host }) => {
        const id = `${extensionId}/${proxyId}`;
        return (
          <div className="sb-extension-sensitive-unused-row" key={id}>
            <span>
              {t("sensitive-settings-unused-entry", {
                defaultValue: "{{extension}}: sent to {{host}}",
                extension: getExtensionTitle(extensionId),
                host,
              })}
            </span>
            <button
              type="button"
              className="sb-settings-action-button"
              disabled={clearing.value === id}
              onClick={async () => {
                clearing.value = id;
                failed.value = null;
                const ok = await onClear(extensionId, proxyId);
                clearing.value = null;
                failed.value = ok ? null : id;
              }}
            >
              {t("sensitive-settings-clear", { defaultValue: "Clear" })}
            </button>
            {failed.value === id && (
              <p className="sb-settings-save-error" role="alert">
                {t("extension-settings-save-failed", {
                  defaultValue: "Couldn't save your settings.",
                })}
              </p>
            )}
          </div>
        );
      })}
    </section>
  );
}
