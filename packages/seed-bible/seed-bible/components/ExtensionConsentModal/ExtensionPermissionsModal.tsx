import "./ExtensionConsentModal.css";
import { useSignal } from "@preact/signals";
import { useI18n } from "../../i18n/I18nManager";
import type { ModalManager } from "../../managers/ModalManager";
import type { ExtensionManager } from "../../managers/ExtensionManager";
import type { SandboxPermission } from "../../extensions/protocol";
import {
  PermissionLine,
  SourceLabel,
  withSource,
  type ConsentPeople,
} from "./ExtensionConsentModal";

function ExtensionPermissionsContent({
  extensions,
  extensionId,
  people,
}: {
  extensions: Pick<
    ExtensionManager,
    "sandboxPermissions" | "setOptionalPermission"
  >;
  extensionId: string;
  people?: ConsentPeople;
}) {
  const { t } = useI18n();
  const saving = useSignal(false);
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
      await extensions.setOptionalPermission(extensionId, permission, enabled);
    } finally {
      saving.value = false;
    }
  };

  return (
    <div className="sb-extension-consent">
      <p className="sb-extension-consent-source">
        {withSource(
          (host) => t("extension-consent-source", { host }),
          <SourceLabel source={summary} people={people} />
        )}
      </p>
      {summary.required.length > 0 && (
        <>
          <p className="sb-extension-consent-text">
            {t("extension-permissions-required")}
          </p>
          <ul className="sb-extension-consent-list">
            {summary.required.map((permission) => (
              <PermissionLine key={permission} permission={permission} />
            ))}
          </ul>
        </>
      )}
      {summary.optional.length > 0 && (
        <>
          <p className="sb-extension-consent-text">
            {t("extension-permissions-optional")}
          </p>
          <ul className="sb-extension-permissions-list">
            {summary.optional.map((permission) => (
              <li key={permission}>
                <label className="sb-extension-permissions-toggle">
                  <input
                    type="checkbox"
                    checked={summary.granted.includes(permission)}
                    disabled={saving.value}
                    onChange={(event) =>
                      void toggle(
                        permission,
                        (event.currentTarget as HTMLInputElement).checked
                      )
                    }
                  />
                  <ul className="sb-extension-permissions-label">
                    <PermissionLine permission={permission} />
                  </ul>
                </label>
              </li>
            ))}
          </ul>
        </>
      )}
      {summary.required.length === 0 && summary.optional.length === 0 && (
        <p className="sb-extension-consent-text">
          {t("extension-consent-nothing")}
        </p>
      )}
      {summary.network.length > 0 && (
        <>
          <p className="sb-extension-consent-text">
            {t("extension-permissions-network")}
          </p>
          <ul className="sb-extension-consent-list">
            {summary.network.map((host) => (
              <li key={host}>{host}</li>
            ))}
          </ul>
        </>
      )}
      <p className="sb-extension-consent-note">
        {t("extension-permissions-restart-note")}
      </p>
    </div>
  );
}

/**
 * Shows what a running sandboxed extension may do, and lets the user turn
 * its optional permissions on and off.
 */
export function openExtensionPermissionsModal(
  modals: ModalManager,
  extensions: Pick<
    ExtensionManager,
    "sandboxPermissions" | "setOptionalPermission"
  >,
  extensionId: string,
  name: string,
  people?: ConsentPeople
) {
  modals.openModal({
    id: `extension-permissions-${extensionId}`,
    title: {
      key: "extension-permissions-title",
      defaultValue: "{{name}} permissions",
      options: { name },
    },
    content: () => (
      <ExtensionPermissionsContent
        extensions={extensions}
        extensionId={extensionId}
        people={people}
      />
    ),
  });
}
