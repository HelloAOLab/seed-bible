import "./ExtensionConsentModal.css";
import { useI18n } from "../../i18n/I18nManager";
import type {
  ModalContentProps,
  ModalManager,
} from "../../managers/ModalManager";
import type { SandboxConsentRequest } from "../../managers/ExtensionPermissions";
import {
  SANDBOX_PERMISSION_INFO,
  type SandboxPermission,
} from "../../extensions/protocol";

type Translate = ModalContentProps["t"];

function permissionLabel(t: Translate, permission: SandboxPermission): string {
  switch (permission) {
    case "reading:position":
      return t("extension-permission-reading-position");
    case "reading:selection":
      return t("extension-permission-reading-selection");
    case "reading:navigate":
      return t("extension-permission-reading-navigate");
    case "reading:history":
      return t("extension-permission-reading-history");
    case "highlights:read":
      return t("extension-permission-highlights-read");
    case "highlights:write":
      return t("extension-permission-highlights-write");
    case "notes:read":
      return t("extension-permission-notes-read");
    case "notes:write":
      return t("extension-permission-notes-write");
    case "saves:read":
      return t("extension-permission-saves-read");
    case "saves:write":
      return t("extension-permission-saves-write");
    case "profile:read":
      return t("extension-permission-profile-read");
    case "chat:respond":
      return t("extension-permission-chat-respond");
    case "chat:shared":
      return t("extension-permission-chat-shared");
  }
}

/** One permission's line, marked when it's high risk. */
export function PermissionLine({
  permission,
}: {
  permission: SandboxPermission;
}) {
  const { t } = useI18n();
  const highRisk = SANDBOX_PERMISSION_INFO[permission].risk === "high";
  return (
    <li className={highRisk ? "sb-extension-consent-high-risk" : undefined}>
      {highRisk && (
        <span
          className="material-symbols-outlined sb-extension-consent-warning"
          role="img"
          aria-label={t("extension-consent-high-risk")}
        >
          warning
        </span>
      )}
      {permissionLabel(t, permission)}
    </li>
  );
}

function introText(t: Translate, reason: SandboxConsentRequest["reason"]) {
  switch (reason) {
    case "install":
      return t("extension-consent-intro");
    case "update":
      return t("extension-consent-update-intro");
    case "request":
      return t("extension-consent-request-intro");
  }
}

function allowText(t: Translate, reason: SandboxConsentRequest["reason"]) {
  return reason === "install" ? t("install") : t("extension-consent-allow");
}

function cancelText(t: Translate, reason: SandboxConsentRequest["reason"]) {
  return reason === "request" ? t("extension-consent-not-now") : t("cancel");
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
  const isUpdate = request.reason === "update";
  const permissions = isUpdate ? request.newPermissions : request.permissions;
  const network = isUpdate ? request.newNetwork : request.network;
  const nothingRequested = permissions.length === 0 && network.length === 0;

  return (
    <div className="sb-extension-consent">
      <p className="sb-extension-consent-source">
        {t("extension-consent-source", { host: request.sourceHost })}
      </p>
      {request.reason !== "request" && request.description && (
        <p className="sb-extension-consent-description">
          {request.description}
        </p>
      )}
      {nothingRequested ? (
        <p className="sb-extension-consent-text">
          {request.optionalPermissions.length > 0
            ? t("extension-consent-nothing-yet")
            : t("extension-consent-nothing")}
        </p>
      ) : (
        <>
          <p className="sb-extension-consent-text">
            {introText(t, request.reason)}
          </p>
          <ul className="sb-extension-consent-list">
            {permissions.map((permission) => (
              <PermissionLine key={permission} permission={permission} />
            ))}
            {network.map((host) => (
              <li key={host}>{t("extension-permission-network", { host })}</li>
            ))}
          </ul>
        </>
      )}
      {request.optionalPermissions.length > 0 && (
        <>
          <p className="sb-extension-consent-text">
            {t("extension-consent-optional-intro")}
          </p>
          <ul className="sb-extension-consent-list">
            {request.optionalPermissions.map((permission) => (
              <PermissionLine key={permission} permission={permission} />
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
          {cancelText(t, request.reason)}
        </button>
        <button
          type="button"
          className="sb-extension-consent-allow"
          onClick={() => onAnswer(true)}
        >
          {allowText(t, request.reason)}
        </button>
      </div>
    </div>
  );
}

function modalTitle(request: SandboxConsentRequest) {
  const options = { name: request.title };
  switch (request.reason) {
    case "install":
      return {
        key: "extension-consent-title",
        defaultValue: "Install {{name}}?",
        options,
      };
    case "update":
      return {
        key: "extension-consent-update-title",
        defaultValue: "{{name}} wants new permissions",
        options,
      };
    case "request":
      return {
        key: "extension-consent-request-title",
        defaultValue: "Allow {{name}} more access?",
        options,
      };
  }
}

/**
 * Asks the user whether a sandboxed extension may have what it asks for:
 * what its manifest requires (at install, or for an update), or optional
 * permissions it asked for while running. Resolves true only when they
 * choose Install or Allow; closing the dialog any other way declines.
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
      title: modalTitle(request),
      content: () => (
        <ExtensionConsentContent request={request} onAnswer={answer} />
      ),
      onDismiss: () => answer(false),
    });
  });
}
