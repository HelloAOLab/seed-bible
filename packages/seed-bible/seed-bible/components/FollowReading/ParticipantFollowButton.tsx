import type { BibleReadingSession } from "../../managers/SessionsManager";
import type { ConnectedSessionUser } from "../../managers/SessionsManager";
import type { SeedBibleState } from "../../managers/SeedBibleStateManager";
import { useI18n } from "../../i18n/I18nManager";
import {
  SessionUserAvatar,
  getUserDisplayName,
  getUserSessionRole,
  sessionRoleRank,
} from "../Avatar/Avatar";
import {
  ParticipantFriendButton,
  rowsWithFriendButton,
} from "../FriendsPane/ParticipantFriendButton";

/**
 * Follow control for one participant row. Hidden when the session mode does
 * not allow following this person, and for the reader themselves.
 */
export function ParticipantFollowButton(props: {
  session: BibleReadingSession;
  user: ConnectedSessionUser;
}) {
  const { session, user } = props;
  const { t } = useI18n();
  if (!session.canFollowUser?.(user)) {
    return null;
  }
  const follow = session.follow?.value ?? null;
  const followingThis = follow?.connectionId === user.connectionId;
  const active = followingThis && follow?.status === "active";

  return (
    <button
      type="button"
      className={`sb-session-participant-action${
        active ? " sb-session-participant-action-active" : ""
      }`}
      onClick={() => {
        if (active) {
          session.stopFollowing();
          return;
        }
        session.followUser(user.connectionId);
      }}
    >
      {active
        ? t("stop-following", { defaultValue: "Stop following" })
        : t("follow", { defaultValue: "Follow" })}
    </button>
  );
}

/** Everyone in the session, host first, with follow where the mode allows it. */
export function SessionParticipantsRoster(props: {
  state: SeedBibleState;
  session: BibleReadingSession;
}) {
  const { state, session } = props;
  const { t } = useI18n();
  const options = session.options.value;
  const sortedUsers = [...session.connectedUsers.value].sort(
    (a, b) =>
      sessionRoleRank(getUserSessionRole(options, a)) -
      sessionRoleRank(getUserSessionRole(options, b))
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
            <ParticipantFollowButton session={session} user={user} />
          </li>
        );
      })}
    </ul>
  );
}

export function openSessionParticipantsModal(
  state: SeedBibleState,
  session: BibleReadingSession
) {
  const modalId = `session-participants-${session.id}`;
  state.modals.openModal({
    id: modalId,
    title: { key: "participants", defaultValue: "Participants" },
    mobileSheet: true,
    content: () => (
      <SessionParticipantsRoster state={state} session={session} />
    ),
  });
}
