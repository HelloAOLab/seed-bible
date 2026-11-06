import { useSignal } from "@preact/signals";
import { useEffect, useRef } from "preact/hooks";
import type { SeedBibleState } from "../../managers/SeedBibleStateManager";
import {
  ExtensionInitalizer,
  nonSensitiveSettings,
  type ExtensionListEntry,
} from "../../managers/ExtensionManager";
import { getBrandedAppText, useI18n } from "../../i18n/I18nManager";
import { useAppConfig } from "../../app/appConfig";
import { ExtensionSettingsForm } from "../ExtensionSettingsForm/ExtensionSettingsForm";
import { SensitiveSettingsForm } from "../ExtensionSettingsForm/SensitiveSettingsForm";
import type { ExtensionInstallState } from "./ExtensionInfoPage";

export function getExtensionInstallState(
  installed: boolean,
  pendingInstallation: boolean,
  isRegistered: boolean
): ExtensionInstallState {
  if (pendingInstallation) {
    return "pending";
  }
  if (installed && isRegistered) {
    return "installed";
  }
  if (installed && !isRegistered) {
    return "downloaded";
  }
  return "none";
}

/**
 * Adds the extensions from a hosted `ExtensionSet` (the link
 * `seed-bible-extension-scripts publish` prints) to Available. Installing
 * one is still a separate step, with its own consent dialog.
 */
export function AddExtensionFromLink(props: {
  /** Resolves with how many extensions were found, or null if none could be. */
  onAdd: (url: string) => Promise<number | null>;
}) {
  const { t } = useI18n();
  const url = useSignal("");
  const inputRef = useRef<HTMLInputElement>(null);
  // It opens in a dialog for this one field, so the field starts focused.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  const status = useSignal<
    { kind: "idle" | "adding" | "failed" } | { kind: "added"; count: number }
  >({ kind: "idle" });

  const submit = async (event: Event) => {
    event.preventDefault();
    const value = url.value.trim();
    if (!value || status.value.kind === "adding") {
      return;
    }
    status.value = { kind: "adding" };
    const count = await props.onAdd(value);
    if (count === null) {
      status.value = { kind: "failed" };
    } else {
      status.value = { kind: "added", count };
      url.value = "";
    }
  };

  return (
    <form className="sb-extension-add-link" onSubmit={(e) => void submit(e)}>
      <label htmlFor="sb-extension-add-link-url">
        {t("extension-add-link-url-label")}
      </label>
      <div className="sb-extension-add-link-row">
        <input
          id="sb-extension-add-link-url"
          className="sb-settings-text-input"
          type="url"
          inputMode="url"
          placeholder="https://"
          ref={inputRef}
          value={url.value}
          onInput={(e) => (url.value = e.currentTarget.value)}
        />
        <button
          type="submit"
          className="sb-settings-action-button"
          disabled={status.value.kind === "adding" || !url.value.trim()}
        >
          {t("extension-add-link-button")}
        </button>
      </div>
      <p className="sb-extension-add-link-status" role="status">
        {status.value.kind === "failed"
          ? t("extension-add-link-failed")
          : status.value.kind === "added"
            ? t("extension-add-link-added", { count: status.value.count })
            : t("extension-add-link-hint")}
      </p>
    </form>
  );
}

/**
 * What the Settings list and the desktop Extensions page both need: which
 * extensions to show, how to name them, and installing, uninstalling and
 * configuring one.
 */
export function useExtensionCatalog(state: SeedBibleState) {
  const { extensions, customizations, extensionSettings, login } = state;
  const { t } = useI18n();
  const { branding } = useAppConfig();
  const activeCustomization = customizations.activeCustomization.value;
  // An extension the active customization marks "hidden" is never offered
  // for install, but one that's still installed (e.g. pulled in as another
  // extension's dependency) is listed so it can be seen and removed.
  const entries = extensions.extensions.value.filter(
    (entry) =>
      entry.installed ||
      customizations.getActiveExtensionAvailability(entry.id) !== "hidden"
  );

  const install = async (extensionId: string) => {
    // While a customization is active, installs are customization-scoped:
    // the actual install happens automatically via the reconcile effect in
    // SeedBibleStateManager reacting to activeExtensionIds, not as a direct
    // result of this click.
    if (activeCustomization) {
      await customizations.addExtensionToActiveCustomization(extensionId);
      return;
    }
    const extension = extensions.extensions.value.find(
      (e) => e.extension?.meta.id === extensionId
    )?.extension;
    if (extension) {
      await extensions.loadExtension(extension);
    }
  };

  const uninstall = (extensionId: string) => {
    if (activeCustomization) {
      // A hidden extension is never one of the viewer's picks for the
      // customization, so dropping the pick wouldn't remove it. Unload it for
      // this session instead, the same way the customization's own swap does,
      // so the viewer's default profile keeps it.
      if (
        customizations.getActiveExtensionAvailability(extensionId) === "hidden"
      ) {
        extensions.unloadExtension(extensionId, { persist: false });
        return;
      }
      void customizations.removeExtensionFromActiveCustomization(extensionId);
      return;
    }
    extensions.unloadExtension(extensionId);
  };

  /** An installed extension's settings, or null when it has none. */
  const renderSettings = (extensionEntry: ExtensionListEntry) => {
    const allSettings = extensionEntry.extension?.meta.settings ?? {};
    const settings = nonSensitiveSettings(allSettings);
    const sensitive = extensionEntry.extension?.meta.sensitive ?? {};
    const hasSensitive =
      Object.keys(settings).length < Object.keys(allSettings).length;
    const customPanel = extensions.settingsPanels.value[extensionEntry.id];
    if (Object.keys(allSettings).length === 0 && !customPanel) {
      return null;
    }
    return (
      // Values are saved to the viewer's account, so a signed-out viewer is
      // asked to log in first. The body re-renders on sign-in, swapping this
      // prompt for the form in place.
      // TODO: Support offline / signed-out extension settings so this prompt isn't needed.
      login.userId.value === null ? (
        <div className="sb-settings-login-prompt">
          <p>
            {t("extension-settings-login-required", {
              defaultValue: "Please log in to configure this extension.",
            })}
          </p>
          <button
            type="button"
            className="sb-settings-action-button"
            onClick={() => void login.login()}
          >
            {t("log-in", { defaultValue: "Log in" })}
          </button>
        </div>
      ) : (
        <>
          {/* A custom panel stands in for the generic form only: sensitive
                values can't go through an extension's own UI, so they keep
                their own section either way. */}
          {customPanel
            ? customPanel()
            : (!hasSensitive || Object.keys(settings).length > 0) && (
                <ExtensionSettingsForm
                  extensionId={extensionEntry.id}
                  settings={settings}
                  getValue={(key) =>
                    extensionSettings.getValue(extensionEntry.id, key)
                  }
                  onChange={(key, value) =>
                    void extensionSettings.setValue(
                      extensionEntry.id,
                      key,
                      value
                    )
                  }
                  resetting={{
                    hasOwnValue: (key) =>
                      extensionSettings.valuesByExtensionId.value[
                        extensionEntry.id
                      ]?.[key] !== undefined,
                    onReset: (key) =>
                      void extensionSettings.clearValue(extensionEntry.id, key),
                  }}
                  t={t}
                />
              )}
          {hasSensitive && (
            <SensitiveSettingsForm
              extensionId={extensionEntry.id}
              settings={allSettings}
              sensitive={sensitive}
              isSet={(key) =>
                extensionSettings.isSensitiveValueSet(extensionEntry.id, key)
              }
              isProvided={(key) =>
                extensionSettings.getSensitiveValueSource(
                  extensionEntry.id,
                  key
                ) === "customization"
              }
              hasStored={(proxyId) =>
                extensionSettings.hasStoredSensitiveValues(
                  extensionEntry.id,
                  proxyId
                )
              }
              getDestination={(proxyId) =>
                extensionSettings.getSensitiveDestination(
                  extensionEntry.id,
                  proxyId
                )
              }
              onSave={(proxyId, values, options) =>
                extensionSettings.setSensitiveValues(
                  extensionEntry.id,
                  proxyId,
                  values,
                  options
                )
              }
              onClear={(proxyId) =>
                extensionSettings.clearSensitiveValues(
                  extensionEntry.id,
                  proxyId
                )
              }
              t={t}
            />
          )}
          {extensionSettings.hasSaveError(extensionEntry.id) && (
            <p className="sb-settings-save-error" role="alert">
              {t("extension-settings-save-failed", {
                defaultValue: "Couldn't save your settings.",
              })}
            </p>
          )}
        </>
      )
    );
  };

  const installStateOf = (extensionEntry: ExtensionListEntry) =>
    getExtensionInstallState(
      extensionEntry.installed,
      extensionEntry.pendingInstallation,
      ExtensionInitalizer.getInstance().isExtensionRegistered(extensionEntry.id)
    );

  const brandedText = (text: string) =>
    getBrandedAppText(text, t, branding, activeCustomization?.name);
  const nameOf = (id: string) =>
    // eslint-disable-next-line seed-bible-i18n/translation-missing-keys
    brandedText(t("title", { ns: id, defaultValue: id }));
  const descriptionOf = (id: string) =>
    brandedText(t("description", { ns: id, defaultValue: "" }));

  /** Ships with the app, rather than being loaded from a link. */
  const isBuiltIn = (entry: ExtensionListEntry) =>
    entry.extension !== null && !("url" in entry.extension);

  /** Whether `entry`'s name or description contains `query`. */
  const matches = (entry: ExtensionListEntry, query: string) => {
    const needle = query.trim().toLocaleLowerCase();
    return (
      !needle ||
      nameOf(entry.id).toLocaleLowerCase().includes(needle) ||
      descriptionOf(entry.id).toLocaleLowerCase().includes(needle)
    );
  };

  /**
   * Asks for a link to an `ExtensionSet`. A link to one extension calls
   * `onSingle` with its ID, so its page can open where it's installed; a link
   * to several leaves them listed under Available.
   */
  const openAddFromLink = (onSingle: (extensionId: string) => void) => {
    const id = "extension-add-link";
    state.modals.openModal({
      id,
      title: {
        key: "extension-add-link-label",
        defaultValue: "Add extensions from a link",
      },
      content: () => (
        <AddExtensionFromLink
          onAdd={async (url) => {
            const set = await extensions.discoverExtensionSet(url);
            if (set?.extensions.length === 1) {
              state.modals.closeModal(id);
              onSingle(set.extensions[0]!.meta.id);
            }
            return set?.extensions.length ?? null;
          }}
        />
      ),
    });
  };

  return {
    entries,
    activeCustomization,
    people: { userId: login.userId, friends: state.friends },
    installStateOf,
    nameOf,
    descriptionOf,
    isBuiltIn,
    matches,
    install,
    uninstall,
    renderSettings,
    openAddFromLink,
  };
}
