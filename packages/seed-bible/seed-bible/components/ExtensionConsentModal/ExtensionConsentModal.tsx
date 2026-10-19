import "./ExtensionConsentModal.css";
import { useI18n } from "../../i18n/I18nManager";
import type {
  ModalContentProps,
  ModalManager,
} from "../../managers/ModalManager";
import type { SandboxConsentRequest } from "../../managers/ExtensionPermissions";
import type { SandboxPermission } from "../../extensions/protocol";

type Translate = ModalContentProps["t"];

function permissionLabel(t: Translate, permission: SandboxPermission): string {
  switch (permission) {
    case "reading:position":
      return t("extension-permission-reading-position");
    case "reading:selection":
      return t("extension-permission-reading-selection");
    case "reading:navigate":
      return t("extension-permission-reading-navigate");
  }
}

function ExtensionConsentContent({
  request,
  onAnswer,
}: {
  request: SandboxConsentRequest;
  onAnswer: (agreed: boolean) => void;
}) {
  const { t } = useI18n();
  // An update lists only what's new: the rest was already agreed to.
  const permissions = request.isUpdate
    ? request.newPermissions
    : request.permissions;
  const network = request.isUpdate ? request.newNetwork : request.network;
  const nothingRequested = permissions.length === 0 && network.length === 0;

  return (
    <div className="sb-extension-consent">
      <p className="sb-extension-consent-source">
        {t("extension-consent-source", { host: request.sourceHost })}
      </p>
      {request.description && (
        <p className="sb-extension-consent-description">
          {request.description}
        </p>
      )}
      {nothingRequested ? (
        <p className="sb-extension-consent-text">
          {t("extension-consent-nothing")}
        </p>
      ) : (
        <>
          <p className="sb-extension-consent-text">
            {request.isUpdate
              ? t("extension-consent-update-intro")
              : t("extension-consent-intro")}
          </p>
          <ul className="sb-extension-consent-list">
            {permissions.map((permission) => (
              <li key={permission}>{permissionLabel(t, permission)}</li>
            ))}
            {network.map((host) => (
              <li key={host}>{t("extension-permission-network", { host })}</li>
            ))}
          </ul>
        </>
      )}
      <p className="sb-extension-consent-note">
        {t("extension-consent-sandbox-note")}
      </p>
      <div className="sb-extension-consent-actions">
        <button
          type="button"
          className="sb-extension-consent-cancel"
          onClick={() => onAnswer(false)}
        >
          {t("cancel")}
        </button>
        <button
          type="button"
          className="sb-extension-consent-allow"
          onClick={() => onAnswer(true)}
        >
          {request.isUpdate ? t("extension-consent-allow") : t("install")}
        </button>
      </div>
    </div>
  );
}

/**
 * Asks the user whether a sandboxed extension may have what its manifest
 * asks for. Resolves true only when they choose Install (or Allow, for an
 * update); closing the dialog any other way declines.
 */
export function openExtensionConsentModal(
  modals: ModalManager,
  request: SandboxConsentRequest
): Promise<boolean> {
  const id = `extension-consent-${request.extensionId}`;
  return new Promise((resolve) => {
    let answered = false;
    const answer = (agreed: boolean) => {
      if (answered) {
        return;
      }
      answered = true;
      modals.closeModal(id);
      resolve(agreed);
    };
    modals.openModal({
      id,
      title: request.isUpdate
        ? {
            key: "extension-consent-update-title",
            defaultValue: "{{name}} wants new permissions",
            options: { name: request.title },
          }
        : {
            key: "extension-consent-title",
            defaultValue: "Install {{name}}?",
            options: { name: request.title },
          },
      content: () => (
        <ExtensionConsentContent request={request} onAnswer={answer} />
      ),
      onDismiss: () => answer(false),
    });
  });
}
