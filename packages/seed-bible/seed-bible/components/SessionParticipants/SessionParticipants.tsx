import "./SessionParticipants.css";
import { useSignal } from "@preact/signals";
import { createPortal } from "preact/compat";
import type { BibleReadingSession } from "../../managers/SessionsManager";
import type { SeedBibleState } from "../../managers/SeedBibleStateManager";
import { useI18n } from "../../i18n/I18nManager";
import {
  Avatar,
  SessionUserAvatar,
  getUserDisplayName,
  getUserSessionRole,
  sessionRoleRank,
} from "../Avatar/Avatar";
import {
  isLocalSessionHost,
  openSessionSettingsModal,
  openShareSessionModal,
} from "../Tabs/Tabs";
import { MaterialIcon } from "../icons";

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

  // Host first, then co-hosts, then everyone else. Array.sort is stable so
  // peers keep their existing order within a rank — matches the sidebar tab row.
  const sortedUsers = [...connectedUsers].sort(
    (a, b) =>
      sessionRoleRank(getUserSessionRole(options, a)) -
      sessionRoleRank(getUserSessionRole(options, b))
  );

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
              <ul className="sb-session-participants-list">
                {sortedUsers.map((user) => {
                  const role = getUserSessionRole(options, user);
                  const roleLabel =
                    role === "host"
                      ? t("host", { defaultValue: "Host" })
                      : role === "co-host"
                        ? t("co-host", { defaultValue: "Co-host" })
                        : undefined;
                  return (
                    <li
                      key={user.connectionId}
                      className="sb-session-participants-list-item"
                    >
                      <SessionUserAvatar
                        user={user}
                        role={role}
                        roleLabel={roleLabel}
                      />
                      <span className="sb-session-participants-list-name">
                        {getUserDisplayName(user)}
                      </span>
                    </li>
                  );
                })}
              </ul>
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
                    className="sb-session-participants-settings-chevron"
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
                  className="sb-session-participants-share-chevron"
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
