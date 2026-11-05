import "./ExtensionConsentModal.css";
import { useSignal, type ReadonlySignal } from "@preact/signals";
import type { ComponentChildren } from "preact";
import { useI18n } from "../../i18n/I18nManager";
import type {
  ModalContentProps,
  ModalManager,
} from "../../managers/ModalManager";
import type {
  SandboxConsentRequest,
  SandboxUploader,
} from "../../managers/ExtensionPermissions";
import type { FriendsManager } from "../../managers/FriendsManager";
import type { ExtensionReviewsManager } from "../../managers/ExtensionReviewsManager";
import {
  ExtensionReviewNotice,
  useExtensionReview,
} from "../ExtensionReview/ExtensionReview";
import {
  expandSandboxPermissions,
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

/**
 * Who the viewer is and who they're friends with, to say how an uploader
 * relates to them. Without it, no badge is shown.
 */
export interface ConsentPeople {
  userId: ReadonlySignal<string | null>;
  friends: Pick<FriendsManager, "friendIds" | "isLoading">;
}

type Source = { sourceHost: string; uploader?: SandboxUploader };

/** Whether an uploader is the viewer, a friend of theirs, or neither; null until known. */
function relationKey(
  uploader: SandboxUploader,
  people: ConsentPeople | undefined
) {
  if (!people) {
    return null;
  }
  if (people.userId.value === uploader.userId) {
    return "extension-consent-uploader-you";
  }
  if (people.friends.friendIds.value.includes(uploader.userId)) {
    return "extension-consent-uploader-friend";
  }
  return people.friends.isLoading.value
    ? null
    : "extension-consent-uploader-not-friend";
}

/**
 * Where an extension comes from: who uploaded it, for one in Seed Bible's
 * own storage (whose host says nothing to a user), else the host serving it.
 */
export function SourceLabel({
  source,
  people,
}: {
  source: Source;
  people?: ConsentPeople;
}) {
  const { t } = useI18n();
  // Keyed by URL so a new picture gets a fresh attempt after an old one failed.
  const failedPicture = useSignal<string | null>(null);
  const { uploader } = source;
  if (!uploader) {
    return <>{source.sourceHost}</>;
  }
  const relation = relationKey(uploader, people);
  return (
    <span className="sb-extension-consent-uploader">
      {uploader.pictureUrl && failedPicture.value !== uploader.pictureUrl && (
        <img
          className="sb-extension-consent-uploader-picture"
          src={uploader.pictureUrl}
          alt=""
          onError={() => {
            failedPicture.value = uploader.pictureUrl;
          }}
        />
      )}
      <span className="sb-extension-consent-uploader-name">
        {uploader.name ?? t("extension-consent-uploader-unnamed")}
      </span>
      {relation && (
        <span
          className={`sb-extension-consent-relation sb-extension-consent-relation-${relation === "extension-consent-uploader-not-friend" ? "other" : "known"}`}
        >
          {relationText(t, relation)}
        </span>
      )}
    </span>
  );
}

function relationText(
  t: Translate,
  relation: NonNullable<ReturnType<typeof relationKey>>
) {
  switch (relation) {
    case "extension-consent-uploader-you":
      return t("extension-consent-uploader-you");
    case "extension-consent-uploader-friend":
      return t("extension-consent-uploader-friend");
    case "extension-consent-uploader-not-friend":
      return t("extension-consent-uploader-not-friend");
  }
}

// Stands in for the source in a translated sentence, so the label (an
// element) can go wherever the language puts it.
const SOURCE_SLOT = "\u0000";

/** `text`, translated with `{{host}}` as the slot the source label fills. */
export function withSource(
  text: (host: string) => string,
  label: ComponentChildren
) {
  const [before, after = ""] = text(SOURCE_SLOT).split(SOURCE_SLOT);
  return (
    <>
      {before}
      {label}
      {after}
    </>
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

export interface ConsentLine {
  key: string;
  label: string;
  highRisk: boolean;
  /** Null for a network host. */
  permission: SandboxPermission | null;
}

/** One card per area the extension would reach into, each listing what it may do there. */
export function PermissionCards({
  permissions,
  network,
  control,
}: {
  permissions: SandboxPermission[];
  network: string[];
  /** Drawn at the end of each line, e.g. a switch to turn it off. */
  control?: (line: ConsentLine) => ComponentChildren;
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
      permission,
    });
  }
  for (const host of network) {
    add("network", {
      key: host,
      label: t("extension-permission-network", { host }),
      highRisk: false,
      permission: null,
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
                  <li
                    key={line.key}
                    className={
                      control
                        ? "sb-extension-consent-line-with-control"
                        : undefined
                    }
                  >
                    <span>
                      {line.label}
                      {line.highRisk && (
                        <span className="sb-extension-consent-sensitive">
                          {t("extension-consent-high-risk")}
                        </span>
                      )}
                    </span>
                    {control?.(line)}
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
  return reason === "update"
    ? t("extension-consent-update-now")
    : t("extension-consent-now");
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

/** The extension's icon, or its initials on a color when it has none. */
export function ExtensionTile({
  request,
}: {
  request: { extensionId: string; title: string; icon?: string };
}) {
  // Keyed by URL so a new icon gets a fresh attempt after an old one failed.
  const failedIcon = useSignal<string | null>(null);
  const { icon } = request;
  if (icon && failedIcon.value !== icon) {
    return (
      <span
        className="sb-extension-consent-tile sb-extension-consent-tile-image"
        aria-hidden="true"
      >
        <img
          src={icon}
          alt=""
          onError={() => {
            failedIcon.value = icon;
          }}
        />
      </span>
    );
  }
  return (
    <span
      className={`sb-extension-consent-tile sb-extension-consent-tile-${tileHue(request.extensionId)}`}
      aria-hidden="true"
    >
      {initials(request.title)}
    </span>
  );
}

const PERMISSION_ICONS: Record<SandboxPermission, string> = {
  "reading:position": "menu_book",
  "reading:selection": "text_select_start",
  "reading:navigate": "open_in_new",
  "reading:history": "history",
  "highlights:read": "ink_highlighter",
  "highlights:write": "ink_highlighter",
  "notes:read": "sticky_note_2",
  "notes:write": "sticky_note_2",
  "saves:read": "bookmark",
  "saves:write": "bookmark",
  "profile:read": "account_circle",
  "chat:respond": "chat",
  "chat:shared": "forum",
  "friends:read": "group",
  "session:read": "groups",
  "audio:playback": "volume_up",
  "embed:casualos": "map",
  "clipboard:write": "content_paste",
  "device:microphone": "mic",
  "device:camera": "photo_camera",
};

/** What a permission reaches, as a noun phrase: "Verse Art wants access to …". */
function permissionNoun(t: Translate, permission: SandboxPermission): string {
  switch (permission) {
    case "reading:position":
      return t("extension-permission-noun-reading-position");
    case "reading:selection":
      return t("extension-permission-noun-reading-selection");
    case "reading:navigate":
      return t("extension-permission-noun-reading-navigate");
    case "reading:history":
      return t("extension-permission-noun-reading-history");
    case "highlights:read":
    case "highlights:write":
      return t("extension-permission-noun-highlights");
    case "notes:read":
    case "notes:write":
      return t("extension-permission-noun-notes");
    case "saves:read":
    case "saves:write":
      return t("extension-permission-noun-saves");
    case "profile:read":
      return t("extension-permission-noun-profile");
    case "chat:respond":
      return t("extension-permission-noun-chat");
    case "chat:shared":
      return t("extension-permission-noun-chat-shared");
    case "friends:read":
      return t("extension-permission-noun-friends");
    case "session:read":
      return t("extension-permission-noun-session");
    case "audio:playback":
      return t("extension-permission-noun-audio");
    case "embed:casualos":
      return t("extension-permission-noun-casualos");
    case "clipboard:write":
      return t("extension-permission-noun-clipboard");
    case "device:microphone":
      return t("extension-permission-noun-microphone");
    case "device:camera":
      return t("extension-permission-noun-camera");
  }
}

/** "your highlights, your notes and your camera", in the language's own idiom. */
function formatList(items: string[], language: string): string {
  try {
    return new Intl.ListFormat(language, {
      style: "long",
      type: "conjunction",
    }).format(items);
  } catch {
    return items.join(", ");
  }
}

/** The high-risk permissions most worth saying an extension still lacks, in order. */
const STILL_LACKS_ORDER: SandboxPermission[] = [
  "notes:read",
  "profile:read",
  "friends:read",
  "device:microphone",
  "device:camera",
  "chat:shared",
  "session:read",
  "notes:write",
  "saves:write",
  "highlights:write",
];

const STILL_LACKS_SHOWN = 3;
const STACKED_ICONS_SHOWN = 3;

/**
 * An extension asking, while it runs, for more than it has: what each
 * permission would let it do, and the sensitive things it still couldn't.
 */
function ExtensionRequestContent({
  request,
}: {
  request: SandboxConsentRequest;
}) {
  const { t, language } = useI18n();
  const requested = request.permissions;
  const alreadyAllowed = request.alreadyAllowed ?? {
    permissions: [],
    network: [],
  };
  const single = requested.length === 1;
  const isHighRisk = (permission: SandboxPermission) =>
    SANDBOX_PERMISSION_INFO[permission].risk === "high";
  const sensitive = requested.filter(isHighRisk).length;

  const nouns = [...new Set(requested.map((p) => permissionNoun(t, p)))];
  const icons = [...new Set(requested.map((p) => PERMISSION_ICONS[p]))].map(
    (icon) => ({
      icon,
      group:
        PERMISSION_GROUPS[requested.find((p) => PERMISSION_ICONS[p] === icon)!],
    })
  );
  const extraIcons = icons.length - STACKED_ICONS_SHOWN;

  // Related ones first: asking for highlights makes "not your notes" the
  // most useful thing to say.
  const held = new Set(
    expandSandboxPermissions([...alreadyAllowed.permissions, ...requested])
  );
  const requestedGroups = new Set(requested.map((p) => PERMISSION_GROUPS[p]));
  const stillLacks = STILL_LACKS_ORDER.filter((p) => !held.has(p))
    .sort(
      (a, b) =>
        Number(requestedGroups.has(PERMISSION_GROUPS[b])) -
        Number(requestedGroups.has(PERMISSION_GROUPS[a]))
    )
    .slice(0, STILL_LACKS_SHOWN);

  const alreadyLines = [
    ...alreadyAllowed.permissions.map((p) => permissionLabel(t, p)),
    ...alreadyAllowed.network.map((host) =>
      t("extension-permission-network", { host })
    ),
  ];

  return (
    <div className="sb-extension-consent sb-extension-request">
      <div className="sb-extension-request-art" aria-hidden="true">
        <ExtensionTile request={request} />
        <span className="material-symbols-outlined sb-extension-request-arrow">
          arrow_forward
        </span>
        <span className="sb-extension-request-icons">
          {icons.slice(0, STACKED_ICONS_SHOWN).map(({ icon, group }) => (
            <span
              key={icon}
              className={`sb-extension-request-icon sb-extension-consent-card-${group}`}
            >
              <span className="material-symbols-outlined">{icon}</span>
            </span>
          ))}
          {extraIcons > 0 && (
            <span className="sb-extension-request-icon sb-extension-request-icon-more">
              +{extraIcons}
            </span>
          )}
        </span>
      </div>
      <h4 className="sb-extension-request-title">
        {t("extension-request-title", {
          name: request.title,
          things: formatList(nouns, language),
        })}
      </h4>
      {single ? (
        sensitive > 0 && (
          <span className="sb-extension-consent-sensitive sb-extension-request-badge">
            {t("extension-consent-high-risk")}
          </span>
        )
      ) : (
        <p className="sb-extension-request-count">
          {sensitive > 0
            ? t("extension-request-count-sensitive", {
                count: requested.length,
                sensitive,
              })
            : t("extension-request-count", { count: requested.length })}
        </p>
      )}
      <div className="sb-extension-request-box">
        <section className="sb-extension-request-will">
          <h5 className="sb-extension-request-box-title">
            {t("extension-request-will")}
          </h5>
          <ul className="sb-extension-request-lines">
            {requested.map((permission) => (
              <li key={permission}>
                <span
                  className="material-symbols-outlined sb-extension-request-check"
                  aria-hidden="true"
                >
                  check
                </span>
                <span>
                  {permissionLabel(t, permission)}
                  {isHighRisk(permission) && (
                    <span className="sb-extension-consent-sensitive">
                      {t("extension-consent-high-risk")}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>
        {stillLacks.length > 0 && (
          <details className="sb-extension-request-wont" open>
            <summary className="sb-extension-request-box-title">
              {t("extension-request-wont")}
              <span
                className="material-symbols-outlined sb-extension-request-chevron"
                aria-hidden="true"
              >
                expand_more
              </span>
            </summary>
            <ul className="sb-extension-request-lines">
              {stillLacks.map((permission) => (
                <li key={permission}>
                  <span
                    className="material-symbols-outlined sb-extension-request-cross"
                    aria-hidden="true"
                  >
                    close
                  </span>
                  <span>{permissionLabel(t, permission)}</span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
      {single && alreadyLines.length > 0 && (
        <details className="sb-extension-request-already">
          <summary>
            <span>{t("extension-request-already")}</span>
            <span className="sb-extension-request-already-count">
              {alreadyLines.length}
            </span>
          </summary>
          <ul className="sb-extension-request-already-lines">
            {alreadyLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </details>
      )}
      <p className="sb-extension-consent-note sb-extension-request-note">
        {t("extension-request-no-remove", { name: request.title })}
      </p>
    </div>
  );
}

function ExtensionConsentContent({
  request,
  people,
  reviews,
}: {
  request: SandboxConsentRequest;
  people?: ConsentPeople;
  reviews?: ExtensionReviewsManager;
}) {
  const { t } = useI18n();
  const review = useExtensionReview(reviews, request.extensionId);
  // An update lists only what's new: the rest was already agreed to.
  const isUpdate = request.reason === "update";
  const permissions = isUpdate ? request.newPermissions : request.permissions;
  const network = isUpdate ? request.newNetwork : request.network;
  const nothingRequested = permissions.length === 0 && network.length === 0;

  return (
    <div className="sb-extension-consent">
      <div className="sb-extension-consent-identity">
        <ExtensionTile request={request} />
        <div className="sb-extension-consent-identity-text">
          <p className="sb-extension-consent-source">
            {withSource(
              (host) =>
                request.version
                  ? t("extension-consent-source-version", {
                      version: request.version,
                      host,
                    })
                  : t("extension-consent-from", { host }),
              <SourceLabel source={request} people={people} />
            )}
          </p>
          {request.reason !== "request" && request.description && (
            <p className="sb-extension-consent-description">
              {request.description}
            </p>
          )}
        </div>
      </div>
      <ExtensionReviewNotice review={review} />
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
  request: SandboxConsentRequest,
  people?: ConsentPeople,
  reviews?: ExtensionReviewsManager
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
      content: () =>
        request.reason === "request" ? (
          <ExtensionRequestContent request={request} />
        ) : (
          <ExtensionConsentContent
            request={request}
            people={people}
            reviews={reviews}
          />
        ),
      footer: () => (
        <ExtensionConsentActions reason={request.reason} onAnswer={answer} />
      ),
      onDismiss: () => answer(false),
    });
  });
}
