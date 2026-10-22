import "./ExtensionConsentModal.css";
import { useSignal } from "@preact/signals";
import { useI18n } from "../../i18n/I18nManager";
import type { ModalManager } from "../../managers/ModalManager";
import type { ExtensionManager } from "../../managers/ExtensionManager";
import type { SandboxPermission } from "../../extensions/protocol";
import {
  ExtensionTile,
  PermissionCards,
  SourceLabel,
  withSource,
  type ConsentLine,
  type ConsentPeople,
} from "./ExtensionConsentModal";

type PermissionsApi = Pick<
  ExtensionManager,
  "sandboxPermissions" | "setOptionalPermission"
>;

function ExtensionPermissionsContent({
  extensions,
  extensionId,
  name,
  people,
}: {
  extensions: PermissionsApi;
  extensionId: string;
  name: string;
  people?: ConsentPeople;
}) {
  const { t } = useI18n();
  const saving = useSignal(false);
  const outcome = useSignal<"saved" | "failed" | null>(null);
  const summary = extensions.sandboxPermissions.value[extensionId];
  if (!summary) {
    return (
      <p className="sb-extension-consent-text">
        {t("extension-permissions-not-running")}
      </p>
    );
  }

  const toggle = async (permission: SandboxPermission, enabled: boolean) => {
    saving.value = true;
    try {
      outcome.value = (await extensions.setOptionalPermission(
        extensionId,
        permission,
        enabled
      ))
        ? "saved"
        : "failed";
    } catch (err) {
      console.error(`Could not change ${extensionId}'s permissions:`, err);
      outcome.value = "failed";
    } finally {
      saving.value = false;
    }
  };

  const control = (line: ConsentLine) => {
    if (!line.permission || summary.required.includes(line.permission)) {
      return (
        <span className="sb-extension-permissions-needed">
          <span className="material-symbols-outlined" aria-hidden="true">
            lock
          </span>
          {t("extension-permissions-needed")}
        </span>
      );
    }
    const permission = line.permission;
    const on = summary.granted.includes(permission);
    return (
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={line.label}
        className="sb-extension-permissions-switch"
        disabled={saving.value}
        onClick={() => void toggle(permission, !on)}
      >
        <span className="sb-extension-permissions-knob" />
      </button>
    );
  };

  const hasNeeded = summary.required.length > 0 || summary.network.length > 0;

  return (
    <div className="sb-extension-consent sb-extension-permissions">
      <div className="sb-extension-consent-identity">
        <ExtensionTile request={{ extensionId, title: name }} />
        <div className="sb-extension-consent-identity-text">
          <p className="sb-extension-permissions-name">
            {summary.version
              ? t("extension-permissions-name-version", {
                  name,
                  version: summary.version,
                })
              : name}
          </p>
          <p className="sb-extension-consent-source">
            {withSource(
              (host) => t("extension-consent-from", { host }),
              <SourceLabel source={summary} people={people} />
            )}
          </p>
        </div>
      </div>
      <p
        className={`sb-extension-consent-notice sb-extension-permissions-status-${outcome.value ?? "idle"}`}
        role="status"
      >
        <span
          className="material-symbols-outlined sb-extension-consent-notice-icon"
          aria-hidden="true"
        >
          {outcome.value === "saved"
            ? "check_circle"
            : outcome.value === "failed"
              ? "error"
              : "restart_alt"}
        </span>
        {outcome.value === "saved"
          ? t("extension-permissions-saved", { name })
          : outcome.value === "failed"
            ? t("extension-permissions-failed")
            : t("extension-permissions-restart-note", { name })}
      </p>
      {summary.required.length + summary.optional.length > 0 ||
      summary.network.length > 0 ? (
        <PermissionCards
          permissions={[...summary.required, ...summary.optional]}
          network={summary.network}
          control={control}
        />
      ) : (
        <p className="sb-extension-consent-text">
          {t("extension-consent-nothing")}
        </p>
      )}
      {hasNeeded && (
        <p className="sb-extension-consent-note">
          {t("extension-permissions-needed-note", { name })}
        </p>
      )}
    </div>
  );
}

function ExtensionPermissionsActions({
  onUninstall,
  onDone,
}: {
  onUninstall?: () => void;
  onDone: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="sb-extension-consent-actions">
      {onUninstall ? (
        <button
          type="button"
          className="sb-extension-permissions-uninstall"
          onClick={onUninstall}
        >
          {t("uninstall")}
        </button>
      ) : (
        <span />
      )}
      <button
        type="button"
        className="sb-extension-consent-allow"
        onClick={onDone}
      >
        {t("extension-permissions-done")}
      </button>
    </div>
  );
}

/**
 * Shows what a running sandboxed extension may do, and lets the user turn
 * its optional permissions on and off.
 */
export function openExtensionPermissionsModal(
  modals: ModalManager,
  extensions: PermissionsApi,
  extensionId: string,
  name: string,
  options: { people?: ConsentPeople; onUninstall?: () => void } = {}
) {
  const id = `extension-permissions-${extensionId}`;
  const { onUninstall } = options;
  modals.openModal({
    id,
    title: {
      key: "extension-permissions-title",
      defaultValue: "{{name}} permissions",
      options: { name },
    },
    content: () => (
      <ExtensionPermissionsContent
        extensions={extensions}
        extensionId={extensionId}
        name={name}
        people={options.people}
      />
    ),
    footer: () => (
      <ExtensionPermissionsActions
        onUninstall={
          onUninstall &&
          (() => {
            modals.closeModal(id);
            onUninstall();
          })
        }
        onDone={() => modals.closeModal(id)}
      />
    ),
  });
}
