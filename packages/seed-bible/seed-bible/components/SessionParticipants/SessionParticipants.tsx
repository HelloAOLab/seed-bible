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
  sortUsersBySessionRole,
} from "../Avatar/Avatar";
import {
  isLocalSessionHost,
  openSessionSettingsModal,
  openShareSessionModal,
  useCloseWhenSessionEnds,
} from "../SessionSettings/SessionSettings";
import { MaterialIcon } from "../icons";
import {
  ParticipantFriendButton,
  rowsWithFriendButton,
} from "../FriendsPane/ParticipantFriendButton";

/** How many avatars the compact stack shows before collapsing into a "+N" chip. */
const MAX_STACK_AVATARS = 3;

/**
 * Overlapping stack of the first few participants (host first) plus a "+N"
 * chip when there are more. Renders nothing when there are no connected users,
 * so it can be dropped into a header unconditionally for a shared tab.
 */
function SessionParticipantsStack({
  session,
  className,
  onOpen,
}: {
  session: BibleReadingSession;
  className?: string;
  onOpen: () => void;
}) {
  const { t } = useI18n();

  const options = session.options.value;
  const connectedUsers = session.connectedUsers.value;
  if (connectedUsers.length === 0) return null;

  const sortedUsers = sortUsersBySessionRole(options, connectedUsers);
  const stackUsers = sortedUsers.slice(0, MAX_STACK_AVATARS);
  const overflowCount = sortedUsers.length - stackUsers.length;

  return (
    <button
      type="button"
      className={`sb-session-participants-stack${className ? ` ${className}` : ""}`}
      onClick={onOpen}
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
  );
}

/** Everyone in the session with their role, plus Add friend per account. */
function SessionParticipantsList({
  state,
  session,
}: {
  state: SeedBibleState;
  session: BibleReadingSession;
}) {
  const { t } = useI18n();

  const options = session.options.value;
  const sortedUsers = sortUsersBySessionRole(
    options,
    session.connectedUsers.value
  );
  const friendButtonRows = rowsWithFriendButton(sortedUsers);

  return (
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
            <SessionUserAvatar user={user} role={role} roleLabel={roleLabel} />
            <span className="sb-session-participants-list-name">
              {getUserDisplayName(user)}
            </span>
            {friendButtonRows.has(user.connectionId) && (
              <ParticipantFriendButton
                state={state}
                userId={user.userId}
                displayName={getUserDisplayName(user)}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Session settings (hosts only) and Share session rows pinned below the list.
 * Each closes the participants view before opening its own dialog.
 */
function SessionParticipantsActions({
  state,
  session,
  onClose,
}: {
  state: SeedBibleState;
  session: BibleReadingSession;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const isHost = isLocalSessionHost(state, session);

  return (
    <>
      {isHost && (
        <button
          type="button"
          className="sb-session-participants-settings-button"
          onClick={() => {
            onClose();
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
          onClose();
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
    </>
  );
}

/**
 * Bottom-sheet presentation of the participants list, for mobile. Portals to
 * <body>: the mobile reader header is its own stacking context (z-index +
 * overflow:hidden), so a sheet rendered inside it would sit behind the bottom
 * nav. The portal only runs once opened, so SSR is unaffected.
 */
export function SessionParticipantsSheet({
  state,
  session,
  onClose,
}: {
  state: SeedBibleState;
  session: BibleReadingSession;
  onClose: () => void;
}) {
  const { t } = useI18n();

  return createPortal(
    <>
      <div
        className="sb-mobile-settings-sheet-overlay"
        onClick={onClose}
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
            <span>{t("participants", { defaultValue: "Participants" })}</span>
          </div>

          <button
            type="button"
            className="sb-mobile-settings-sheet-close"
            onClick={onClose}
            aria-label={t("close", { defaultValue: "Close" })}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="sb-mobile-settings-sheet-body">
          <SessionParticipantsList state={state} session={session} />
        </div>
        <div className="sb-mobile-settings-sheet-divider" />
        <SessionParticipantsActions
          state={state}
          session={session}
          onClose={onClose}
        />
      </div>
    </>,
    document.body
  );
}

function SessionParticipantsModalContent({
  state,
  session,
  onClose,
}: {
  state: SeedBibleState;
  session: BibleReadingSession;
  onClose: () => void;
}) {
  useCloseWhenSessionEnds(state, session, onClose);

  return <SessionParticipantsList state={state} session={session} />;
}

/**
 * Opens the participants list as a modal — the desktop counterpart of the
 * mobile reader's participants sheet, with the same roster and actions.
 */
export function openSessionParticipantsModal(
  state: SeedBibleState,
  session: BibleReadingSession
) {
  const modalId = `session-participants-${session.id}`;
  const close = () => state.modals.closeModal(modalId);
  state.modals.openModal({
    id: modalId,
    title: { key: "participants", defaultValue: "Participants" },
    content: () => (
      <SessionParticipantsModalContent
        state={state}
        session={session}
        onClose={close}
      />
    ),
    footer: () => (
      <div className="sb-session-participants-modal-actions">
        <SessionParticipantsActions
          state={state}
          session={session}
          onClose={close}
        />
      </div>
    ),
  });
}

/**
 * Compact, tappable presence indicator for a shared session, sized for the
 * mobile reader header. Tapping the avatar stack opens a bottom sheet listing
 * everyone with their role.
 */
export function MobileSessionParticipants({
  state,
  session,
}: {
  state: SeedBibleState;
  session: BibleReadingSession;
}) {
  const isSheetOpen = useSignal(false);
  if (session.connectedUsers.value.length === 0) return null;

  return (
    <>
      <SessionParticipantsStack
        session={session}
        onOpen={() => {
          isSheetOpen.value = true;
        }}
      />
      {isSheetOpen.value && (
        <SessionParticipantsSheet
          state={state}
          session={session}
          onClose={() => {
            isSheetOpen.value = false;
          }}
        />
      )}
    </>
  );
}

/**
 * The same avatar stack for the desktop reader's quick tools. Clicking it
 * opens the participants modal, so who's in the session is reachable even
 * with the sidebar closed.
 */
export function DesktopSessionParticipants({
  state,
  session,
}: {
  state: SeedBibleState;
  session: BibleReadingSession;
}) {
  return (
    <SessionParticipantsStack
      session={session}
      className="sb-session-participants-stack-desktop"
      onOpen={() => openSessionParticipantsModal(state, session)}
    />
  );
}
