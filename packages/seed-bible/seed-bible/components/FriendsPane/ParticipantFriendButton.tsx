import { useSignal } from "@preact/signals";
import type { SeedBibleState } from "../../managers/SeedBibleStateManager";
import type { SessionConnectionInfo } from "../../managers/SessionsManager";
import { useI18n } from "../../i18n/I18nManager";
import { displayNameOf } from "../../managers/Utils";
import {
  answerFriendRequest,
  BusyButton,
  sendFriendRequestTo,
} from "./friendActions";
import { openPersonProfile } from "./PersonCard";

/**
 * The connection IDs of the participant rows that get a friend button: one per
 * account. Someone in the session from two tabs has a row for each, and the
 * same person shouldn't get two buttons.
 */
export function rowsWithFriendButton(
  users: readonly SessionConnectionInfo[]
): Set<string> {
  const accounts = new Set<string>();
  const rows = new Set<string>();
  for (const user of users) {
    if (user.userId && !accounts.has(user.userId)) {
      accounts.add(user.userId);
      rows.add(user.connectionId);
    }
  }
  return rows;
}

/**
 * A session participant's name, as a button that opens their profile when
 * they're signed in to an account. Anonymous participants have only a per-tab
 * connection ID, so there's no profile to open and the name stays plain text.
 */
export function ParticipantName(props: {
  state: SeedBibleState;
  userId: string | null | undefined;
  displayName: string;
  /** Runs first, for a list that has to get out of the profile's way. */
  onOpenProfile?: () => void;
  /** Runs when the user closes the profile, for that list to come back. */
  onCloseProfile?: () => void;
}) {
  const { state, userId, displayName, onOpenProfile, onCloseProfile } = props;
  const { t } = useI18n();
  if (!userId) {
    return <>{displayName}</>;
  }
  return (
    <button
      type="button"
      className="sb-participant-profile-button"
      aria-label={t("view-profile-of", {
        name: displayName,
        defaultValue: "View {{name}}'s profile",
      })}
      onClick={() => {
        onOpenProfile?.();
        openPersonProfile(state, userId, { onDismiss: onCloseProfile });
      }}
    >
      {displayName}
    </button>
  );
}

/**
 * Add friend for one session participant, showing where the signed-in user
 * already stands with them: a request to send, one of theirs to accept, one
 * already sent, or an existing friendship.
 *
 * Reading together is when someone is most likely to want to add a person,
 * and the session already knows every participant's account, so this needs
 * no link passed around.
 *
 * Renders nothing for the local user, for anonymous participants (who have
 * only a per-tab connection ID, not an account), or while signed out — the
 * sign-in dialog can't open over the session settings it may sit in.
 */
export function ParticipantFriendButton(props: {
  state: SeedBibleState;
  userId: string | null | undefined;
  displayName: string;
}) {
  const { state, userId, displayName } = props;
  const { friends, login } = state;
  const toast = state.app.toast;
  const { t } = useI18n();
  const busy = useSignal(false);

  const me = login.userId.value;
  if (!userId || !me || userId === me) {
    return null;
  }

  if (friends.friendIds.value.includes(userId)) {
    return (
      <span className="sb-participant-friend-status">
        {t("friends", { defaultValue: "Friends" })}
      </span>
    );
  }
  if (friends.outgoingRequests.value.some((r) => r.userId === userId)) {
    return (
      <span className="sb-participant-friend-status">
        {t("friend-status-requested", { defaultValue: "Requested" })}
      </span>
    );
  }

  const theirRequest = friends.incomingRequests.value.find(
    (r) => r.userId === userId
  );
  // Accepting names them as their profile does, not as they named themselves
  // in the session: anyone can call themselves anything there.
  const requesterName = theirRequest ? displayNameOf(theirRequest, t) : null;

  const run = async () => {
    busy.value = true;
    try {
      if (theirRequest) {
        await answerFriendRequest(
          friends,
          toast,
          t,
          theirRequest,
          displayNameOf(theirRequest, t),
          true
        );
        return;
      }
      // Not in the friends lists, so their profile is read here for the name,
      // alongside sending rather than before it.
      const name = login.getPublicProfile(userId).then(
        (profile) => displayNameOf({ userId, name: profile?.name }, t),
        (error) => {
          console.warn(`Could not load the profile for ${userId}:`, error);
          return displayNameOf({ userId }, t);
        }
      );
      await sendFriendRequestTo(friends, toast, t, userId, name);
    } finally {
      busy.value = false;
    }
  };

  return (
    <BusyButton
      className="sb-session-participant-action"
      busy={busy.value}
      ariaLabel={
        theirRequest
          ? t("accept-friend-user", {
              name: requesterName,
              defaultValue: "Accept {{name}}'s friend request",
            })
          : t("add-friend-user", {
              name: displayName,
              defaultValue: "Add {{name}} as a friend",
            })
      }
      onClick={() => void run()}
    >
      {theirRequest
        ? t("accept", { defaultValue: "Accept" })
        : t("add-friend-button", { defaultValue: "Add friend" })}
    </BusyButton>
  );
}
