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
    case "friends:read":
      return t("extension-permission-friends-read");
    case "session:read":
      return t("extension-permission-session-read");
    case "audio:playback":
      return t("extension-permission-audio-playback");
    case "clipboard:write":
      return t("extension-permission-clipboard-write");
    case "embed:casualos":
      return t("extension-permission-embed-casualos");
    case "device:microphone":
      return t("extension-permission-device-microphone");
    case "device:camera":
      return t("extension-permission-device-camera");
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

type PermissionGroup =
  | "reading"
  | "study"
  | "people"
  | "media"
  | "device"
  | "network";

const PERMISSION_GROUPS: Record<SandboxPermission, PermissionGroup> = {
  "reading:position": "reading",
  "reading:selection": "reading",
  "reading:navigate": "reading",
  "reading:history": "reading",
  "highlights:read": "study",
  "highlights:write": "study",
  "notes:read": "study",
  "notes:write": "study",
  "saves:read": "study",
  "saves:write": "study",
  "profile:read": "people",
  "chat:respond": "people",
  "chat:shared": "people",
  "friends:read": "people",
  "session:read": "people",
  "audio:playback": "media",
  "embed:casualos": "media",
  "clipboard:write": "device",
  "device:microphone": "device",
  "device:camera": "device",
};

/** In the order the cards are shown. */
const GROUP_ICONS: Record<PermissionGroup, string> = {
  reading: "menu_book",
  study: "edit_note",
  people: "group",
  media: "play_circle",
  device: "devices",
  network: "public",
};

function groupTitle(t: Translate, group: PermissionGroup): string {
  switch (group) {
    case "reading":
      return t("extension-consent-group-reading");
    case "study":
      return t("extension-consent-group-study");
    case "people":
      return t("extension-consent-group-people");
    case "media":
      return t("extension-consent-group-media");
    case "device":
      return t("extension-consent-group-device");
    case "network":
      return t("extension-consent-group-network");
  }
}

interface ConsentLine {
  key: string;
  label: string;
  highRisk: boolean;
}

/** One card per area the extension would reach into, each listing what it may do there. */
function PermissionCards({
  permissions,
  network,
}: {
  permissions: SandboxPermission[];
  network: string[];
}) {
  const { t } = useI18n();
  const lines = new Map<PermissionGroup, ConsentLine[]>();
  const add = (group: PermissionGroup, line: ConsentLine) =>
    lines.set(group, [...(lines.get(group) ?? []), line]);
  for (const permission of permissions) {
    add(PERMISSION_GROUPS[permission], {
      key: permission,
      label: permissionLabel(t, permission),
      highRisk: SANDBOX_PERMISSION_INFO[permission].risk === "high",
    });
  }
  for (const host of network) {
    add("network", {
      key: host,
      label: t("extension-permission-network", { host }),
      highRisk: false,
    });
  }

  return (
    <ul className="sb-extension-consent-cards">
      {(Object.keys(GROUP_ICONS) as PermissionGroup[])
        .filter((group) => lines.has(group))
        .map((group) => (
          <li
            key={group}
            className={`sb-extension-consent-card sb-extension-consent-card-${group}`}
          >
            <span className="sb-extension-consent-card-icon" aria-hidden="true">
              <span className="material-symbols-outlined">
                {GROUP_ICONS[group]}
              </span>
            </span>
            <div className="sb-extension-consent-card-body">
              <h4 className="sb-extension-consent-card-title">
                {groupTitle(t, group)}
              </h4>
              <ul className="sb-extension-consent-lines">
                {lines.get(group)!.map((line) => (
                  <li key={line.key}>
                    {line.label}
                    {line.highRisk && (
                      <span className="sb-extension-consent-sensitive">
                        {t("extension-consent-high-risk")}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </li>
        ))}
    </ul>
  );
}

function sectionTitle(t: Translate, reason: SandboxConsentRequest["reason"]) {
  switch (reason) {
    case "install":
      return t("extension-consent-now");
    case "update":
      return t("extension-consent-update-now");
    case "request":
      return t("extension-consent-request-now");
  }
}

function allowText(t: Translate, reason: SandboxConsentRequest["reason"]) {
  return reason === "install" ? t("install") : t("extension-consent-allow");
}

function cancelText(t: Translate, reason: SandboxConsentRequest["reason"]) {
  return reason === "request" ? t("extension-consent-not-now") : t("cancel");
}

/** Up to two letters standing in for the extension's icon. */
function initials(title: string): string {
  const words = title.trim().split(/\s+/).filter(Boolean);
  const letters =
    words.length > 1 ? words[0]![0]! + words[1]![0]! : title.trim().slice(0, 2);
  return letters.toUpperCase();
}

const TILE_HUES = 6;

/** The same extension always gets the same color. */
function tileHue(extensionId: string): number {
  let hash = 0;
  for (const char of extensionId) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return hash % TILE_HUES;
}

function ExtensionConsentContent({
  request,
}: {
  request: SandboxConsentRequest;
}) {
  const { t } = useI18n();
  // An update lists only what's new: the rest was already agreed to.
  const isUpdate = request.reason === "update";
  const permissions = isUpdate ? request.newPermissions : request.permissions;
  const network = isUpdate ? request.newNetwork : request.network;
  const nothingRequested = permissions.length === 0 && network.length === 0;

  return (
    <div className="sb-extension-consent">
      <div className="sb-extension-consent-identity">
        <span
          className={`sb-extension-consent-tile sb-extension-consent-tile-${tileHue(request.extensionId)}`}
          aria-hidden="true"
        >
          {initials(request.title)}
        </span>
        <div className="sb-extension-consent-identity-text">
          <p className="sb-extension-consent-source">
            {request.version
              ? t("extension-consent-source-version", {
                  version: request.version,
                  host: request.sourceHost,
                })
              : t("extension-consent-from", { host: request.sourceHost })}
          </p>
          {request.reason !== "request" && request.description && (
            <p className="sb-extension-consent-description">
              {request.description}
            </p>
          )}
        </div>
      </div>
      <p className="sb-extension-consent-notice">
        <span
          className="material-symbols-outlined sb-extension-consent-notice-icon"
          aria-hidden="true"
        >
          info
        </span>
        {t("extension-consent-unreviewed")}
      </p>
      {nothingRequested ? (
        <p className="sb-extension-consent-text">
          {request.optionalPermissions.length > 0
            ? t("extension-consent-nothing-yet")
            : t("extension-consent-nothing")}
        </p>
      ) : (
        <section className="sb-extension-consent-section">
          <h4 className="sb-extension-consent-section-title">
            {sectionTitle(t, request.reason)}
          </h4>
          <PermissionCards permissions={permissions} network={network} />
        </section>
      )}
      {request.optionalPermissions.length > 0 && (
        <section className="sb-extension-consent-section">
          <h4 className="sb-extension-consent-section-title">
            {t("extension-consent-later")}
          </h4>
          <PermissionCards
            permissions={request.optionalPermissions}
            network={[]}
          />
          <p className="sb-extension-consent-note">
            {t("extension-consent-later-note")}
          </p>
        </section>
      )}
    </div>
  );
}

function ExtensionConsentActions({
  reason,
  onAnswer,
}: {
  reason: SandboxConsentRequest["reason"];
  onAnswer: (agreed: boolean) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="sb-extension-consent-actions">
      <button
        type="button"
        className="sb-extension-consent-cancel"
        onClick={() => onAnswer(false)}
      >
        {cancelText(t, reason)}
      </button>
      <button
        type="button"
        className="sb-extension-consent-allow"
        onClick={() => onAnswer(true)}
      >
        {allowText(t, reason)}
      </button>
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
      content: () => <ExtensionConsentContent request={request} />,
      footer: () => (
        <ExtensionConsentActions reason={request.reason} onAnswer={answer} />
      ),
      onDismiss: () => answer(false),
    });
  });
}
