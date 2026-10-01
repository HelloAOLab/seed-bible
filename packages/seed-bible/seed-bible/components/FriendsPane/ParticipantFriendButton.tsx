import { useSignal } from "@preact/signals";
import type { SeedBibleState } from "../../managers/SeedBibleStateManager";
import { useI18n } from "../../i18n/I18nManager";
import { BusyButton } from "./FriendsPane";

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

  const run = async () => {
    busy.value = true;
    try {
      if (theirRequest) {
        const result = await friends.acceptRequest(theirRequest.id);
        toast(
          result.success
            ? t("now-friends-with", {
                name: displayName,
                defaultValue: "You're now friends with {{name}}.",
              })
            : t("friend-request-unavailable", {
                defaultValue: "That request is no longer available.",
              })
        );
        return;
      }
      const result = await friends.sendRequest({ userId });
      if (result.status === "sent") {
        toast(
          t("friend-request-sent-to", {
            name: displayName,
            defaultValue: "Friend request sent to {{name}}.",
          })
        );
      } else if (result.status === "accepted") {
        toast(
          t("now-friends-with", {
            name: displayName,
            defaultValue: "You're now friends with {{name}}.",
          })
        );
      }
    } catch (error) {
      console.error("Failed to add friend from session:", error);
      toast(
        t("friend-request-failed", {
          defaultValue: "Couldn't send the request. Try again.",
        })
      );
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
              name: displayName,
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
