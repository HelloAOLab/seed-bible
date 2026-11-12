import "./SessionParticipants.css";
import { signal, useSignal } from "@preact/signals";
import { createPortal } from "preact/compat";
import type {
  BibleReadingSession,
  ConnectedSessionUser,
} from "../../managers/SessionsManager";
import type { SeedBibleState } from "../../managers/SeedBibleStateManager";
import { useI18n } from "../../i18n/I18nManager";
import {
  Avatar,
  getUserDisplayName,
  getUserSessionRole,
  sessionRoleLabel,
  sortUsersByRole,
} from "../Avatar/Avatar";
import {
  isLocalSessionHost,
  openSessionSettingsModal,
  openShareSessionModal,
} from "../Tabs/Tabs";
import { MaterialIcon } from "../icons";
<<<<<<< HEAD
import { SessionParticipantsRoster } from "../FollowReading/ParticipantFollowButton";
=======
import {
  AskToComeBackButton,
  getParticipantLocation,
  sessionGroupPassage,
} from "./participantLocations";
import {
  ParticipantFriendButton,
  ParticipantName,
  rowsWithFriendButton,
} from "../FriendsPane/ParticipantFriendButton";
>>>>>>> b0c0c96ab898ef6e70b69ff799420cc57d2b3b86

/** How many avatars the compact stack shows before collapsing into a "+N" chip. */
const MAX_STACK_AVATARS = 3;

/**
 * Compact, tappable presence indicator for a shared session, sized for the
 * mobile reader header. Shows an overlapping stack of the first few
 * participants (host first) plus a "+N" chip when there are more; tapping it
 * opens a sheet listing everyone with their role.
 *
 * Renders nothing when there are no connected users, so it can be dropped into
 * the header unconditionally for a shared tab.
 */
export function MobileSessionParticipants({
  state,
  session,
}: {
  state: SeedBibleState;
  session: BibleReadingSession;
}) {
  const { t } = useI18n();
  const isSheetOpen = useSignal(false);

  const options = session.options.value;
  const connectedUsers = session.connectedUsers.value;
  if (connectedUsers.length === 0) return null;

  const isHost = isLocalSessionHost(state, session);

  const sortedUsers = sortUsersByRole(connectedUsers, options);

  const stackUsers = sortedUsers.slice(0, MAX_STACK_AVATARS);
  const overflowCount = sortedUsers.length - stackUsers.length;

  return (
    <>
      <button
        type="button"
        className="sb-session-participants-stack"
        onClick={() => {
          isSheetOpen.value = true;
        }}
        aria-label={t("participants", { defaultValue: "Participants" })}
        title={t("participants", { defaultValue: "Participants" })}
      >
        {stackUsers.map((user) => {
          // Host and co-hosts get an accent (orange) ring in the stack so
          // leadership reads at a glance; everyone else keeps the neutral ring.
          const role = getUserSessionRole(options, user);
          return (
            <span
              key={user.connectionId}
              className={`sb-session-participants-stack-item${
                role ? " sb-session-participants-stack-item-lead" : ""
              }`}
            >
              <Avatar
                imageUrl={user.profile?.pictureUrl ?? null}
                visual={user.visual}
                title={getUserDisplayName(user)}
                isSelf={user.isSelf}
              />
            </span>
          );
        })}
        {overflowCount > 0 && (
          <span className="sb-session-participants-stack-more">
            +{overflowCount}
          </span>
        )}
      </button>

      {/* Portal to <body>: the mobile reader header is its own stacking context
       * (z-index + overflow:hidden), so a sheet rendered inside it would sit
       * behind the bottom nav. Rendering to body lets it cover the whole
       * screen. The portal only runs on click, so SSR is unaffected. */}
      {isSheetOpen.value &&
        createPortal(
          <>
            <div
              className="sb-mobile-settings-sheet-overlay"
              onClick={() => {
                isSheetOpen.value = false;
              }}
              aria-hidden="true"
            />
            <div
              className="sb-mobile-settings-sheet sb-session-participants-sheet"
              role="dialog"
              aria-modal="true"
              aria-label={t("participants", { defaultValue: "Participants" })}
            >
              <div className="sb-mobile-settings-sheet-header">
                <div className="sb-mobile-settings-sheet-title">
                  <span
                    className="material-symbols-outlined"
                    aria-hidden="true"
                    style={{ fontSize: 22 }}
                  >
                    group
                  </span>
                  <span>
                    {t("participants", { defaultValue: "Participants" })}
                  </span>
                </div>

                <button
                  type="button"
                  className="sb-mobile-settings-sheet-close"
                  onClick={() => {
                    isSheetOpen.value = false;
                  }}
                  aria-label={t("close", { defaultValue: "Close" })}
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <div className="sb-mobile-settings-sheet-body">
<<<<<<< HEAD
                <SessionParticipantsRoster state={state} session={session} />
=======
                <SessionParticipantList
                  state={state}
                  session={session}
                  // The sheet sits above every modal, so it closes to let a
                  // participant's profile show, and comes back after.
                  onOpenProfile={() => {
                    isSheetOpen.value = false;
                  }}
                  onCloseProfile={() => {
                    isSheetOpen.value = true;
                  }}
                />
>>>>>>> b0c0c96ab898ef6e70b69ff799420cc57d2b3b86
              </div>
              <div className="sb-mobile-settings-sheet-divider" />
              {isHost && (
                <button
                  type="button"
                  className="sb-session-participants-settings-button"
                  onClick={() => {
                    isSheetOpen.value = false;
                    openSessionSettingsModal(state, session);
                  }}
                >
                  <MaterialIcon
                    className="sb-session-participants-settings-icon"
                    aria-hidden="true"
                  >
                    settings
                  </MaterialIcon>
                  <span className="sb-session-participants-settings-label">
                    {t("session-settings", {
                      defaultValue: "Session settings",
                    })}
                  </span>
                  <MaterialIcon
                    className="sb-session-participants-settings-chevron rtl-mirror"
                    aria-hidden="true"
                  >
                    chevron_right
                  </MaterialIcon>
                </button>
              )}
              <button
                type="button"
                className="sb-session-participants-share-button"
                onClick={() => {
                  isSheetOpen.value = false;
                  openShareSessionModal(state, session);
                }}
              >
                <MaterialIcon
                  className="sb-session-participants-share-icon"
                  aria-hidden="true"
                >
                  share
                </MaterialIcon>
                <span className="sb-session-participants-share-label">
                  {t("share-session", { defaultValue: "Share session" })}
                </span>
                <MaterialIcon
                  className="sb-session-participants-share-chevron rtl-mirror"
                  aria-hidden="true"
                >
                  chevron_right
                </MaterialIcon>
              </button>
            </div>
          </>,
          document.body
        )}
    </>
  );
}

/**
 * Everyone in the session, host first. Once anyone is reading a different
 * chapter, it splits into "With the group" and "Reading elsewhere", with the
 * passage under each name that's elsewhere. Hosts get "Ask to come back" for
 * people elsewhere; a reader who is elsewhere themselves gets "Rejoin" on
 * their own row. Shared by the mobile sheet and the desktop session tab.
 */
export function SessionParticipantList({
  state,
  session,
  onOpenProfile,
  onCloseProfile,
}: {
  state: SeedBibleState;
  session: BibleReadingSession;
  /** For a list that has to get out of the way of a participant's profile. */
  onOpenProfile?: () => void;
  /** Runs when that profile closes, for the list to come back. */
  onCloseProfile?: () => void;
}) {
  const { t } = useI18n();
  const options = session.options.value;
  const isHost = isLocalSessionHost(state, session);

  const sortedUsers = sortUsersByRole(session.connectedUsers.value, options);
  const friendButtonRows = rowsWithFriendButton(sortedUsers);
  const groupPassage = sessionGroupPassage(session);
  const locations = new Map(
    sortedUsers.map((user) => [
      user.connectionId,
      getParticipantLocation(session, user),
    ])
  );
  const elsewhereUsers = sortedUsers.filter(
    (user) => locations.get(user.connectionId)?.isElsewhere
  );
  const withGroupUsers = sortedUsers.filter(
    (user) => !locations.get(user.connectionId)?.isElsewhere
  );

  const renderParticipant = (user: ConnectedSessionUser) => {
    const role = getUserSessionRole(options, user);
    const roleLabel = sessionRoleLabel(role, t);
    const location = locations.get(user.connectionId);
    return (
      <li key={user.connectionId} className="sb-session-participants-list-item">
        <SessionUserAvatar user={user} role={role} roleLabel={roleLabel} />
        <span className="sb-session-participants-list-name">
          <span>
            <ParticipantName
              state={state}
              userId={user.userId}
              displayName={getUserDisplayName(user)}
              onOpenProfile={onOpenProfile}
              onCloseProfile={onCloseProfile}
            />
            {user.isSelf &&
              ` ${t("session-participant-you", { defaultValue: "(you)" })}`}
          </span>
          {location?.isElsewhere && location.passage && (
            <span className="sb-session-participants-list-location">
              {location.passage}
            </span>
          )}
        </span>
        {isHost && location?.isElsewhere && !role && !user.isSelf && (
          <AskToComeBackButton session={session} user={user} />
        )}
        {user.isSelf && session.isAwayFromGroup.value && (
          <button
            type="button"
            className="sb-ask-come-back"
            onClick={() => {
              void session.rejoinGroup();
            }}
          >
            <MaterialIcon
              className="sb-ask-come-back-icon rtl-mirror"
              aria-hidden="true"
            >
              undo
            </MaterialIcon>
            {t("session-rejoin-group", { defaultValue: "Rejoin" })}
          </button>
        )}
        {friendButtonRows.has(user.connectionId) && (
          <ParticipantFriendButton
            state={state}
            userId={user.userId}
            displayName={getUserDisplayName(user)}
          />
        )}
      </li>
    );
  };

  if (elsewhereUsers.length === 0) {
    return (
      <ul className="sb-session-participants-list">
        {sortedUsers.map(renderParticipant)}
      </ul>
    );
  }

  return (
    <>
      <h3 className="sb-session-participants-section-title">
        {groupPassage
          ? t("session-with-the-group-at", {
              defaultValue: "With the group · {{passage}}",
              passage: groupPassage,
            })
          : t("session-with-the-group", { defaultValue: "With the group" })}
      </h3>
      <ul className="sb-session-participants-list">
        {withGroupUsers.map(renderParticipant)}
      </ul>
      <h3 className="sb-session-participants-section-title">
        {t("session-reading-elsewhere", {
          defaultValue: "Reading elsewhere",
        })}
      </h3>
      <ul className="sb-session-participants-list">
        {elsewhereUsers.map(renderParticipant)}
      </ul>
    </>
  );
}

/** Whether session tabs show their participant list; remembered per device. */
export const TAB_PARTICIPANTS_EXPANDED_STORAGE_KEY =
  "sb-tab-participants-expanded";

function readStoredTabParticipantsExpanded(): boolean {
  try {
    return (
      typeof window !== "undefined" &&
      window.localStorage.getItem(TAB_PARTICIPANTS_EXPANDED_STORAGE_KEY) ===
        "true"
    );
  } catch {
    return false;
  }
}

// Read straight from storage: session tabs only ever render in the browser,
// once a session has attached, so there's no server render to keep in step.
export const isTabParticipantsListExpanded = signal(
  readStoredTabParticipantsExpanded()
);

function setTabParticipantsListExpanded(expanded: boolean) {
  isTabParticipantsListExpanded.value = expanded;
  try {
    window.localStorage.setItem(
      TAB_PARTICIPANTS_EXPANDED_STORAGE_KEY,
      expanded ? "true" : "false"
    );
  } catch {
    // Not remembered next time, but still applies for this visit.
  }
}

/**
 * The desktop session tab's participants: collapsed, a small toggle beside
 * the tab's avatar row saying how many are away; expanded, the full list
 * under the tab, with session settings (hosts) and sharing below it. Open or
 * closed applies to every session tab and is remembered on this device.
 */
export function TabSessionParticipants({
  state,
  session,
}: {
  state: SeedBibleState;
  session: BibleReadingSession;
}) {
  const { t } = useI18n();
  const users = session.connectedUsers.value;
  if (users.length === 0) return null;

  if (!isTabParticipantsListExpanded.value) {
    const awayCount = users.filter(
      (user) => getParticipantLocation(session, user).isElsewhere
    ).length;
    return (
      <button
        type="button"
        className="sb-tab-participants-toggle"
        aria-expanded="false"
        aria-label={t("show-participants", {
          defaultValue: "Show participants",
        })}
        title={t("show-participants", { defaultValue: "Show participants" })}
        onClick={() => setTabParticipantsListExpanded(true)}
      >
        {awayCount > 0 &&
          t("session-away-count", {
            defaultValue: "{{count}} away",
            count: awayCount,
          })}
        <MaterialIcon aria-hidden="true">expand_more</MaterialIcon>
      </button>
    );
  }

  return (
    <div className="sb-tab-participants">
      <div className="sb-tab-participants-header">
        <span className="sb-tab-participants-title">
          {t("session-participants-count", {
            defaultValue: "Participants · {{count}}",
            count: users.length,
          })}
        </span>
        <button
          type="button"
          className="sb-tab-participants-collapse"
          aria-expanded="true"
          aria-label={t("hide-participants", {
            defaultValue: "Hide participants",
          })}
          title={t("hide-participants", { defaultValue: "Hide participants" })}
          onClick={() => setTabParticipantsListExpanded(false)}
        >
          <MaterialIcon aria-hidden="true">expand_less</MaterialIcon>
        </button>
      </div>
      <SessionParticipantList state={state} session={session} />
      <div className="sb-tab-participants-footer">
        {isLocalSessionHost(state, session) && (
          <button
            type="button"
            className="sb-tab-participants-link"
            onClick={() => openSessionSettingsModal(state, session)}
          >
            <MaterialIcon aria-hidden="true">settings</MaterialIcon>
            {t("session-settings", { defaultValue: "Session settings" })}
          </button>
        )}
        <button
          type="button"
          className="sb-tab-participants-link"
          onClick={() => openShareSessionModal(state, session)}
        >
          <MaterialIcon aria-hidden="true">share</MaterialIcon>
          {t("share-session", { defaultValue: "Share session" })}
        </button>
      </div>
    </div>
  );
}
