import "./FriendsPane.css";
import { useSignal } from "@preact/signals";
import type {
  Friend,
  FriendRequest,
  FriendsManager,
} from "../../managers/FriendsManager";
import type { ModalManager } from "../../managers/ModalManager";
import { displayNameOf } from "../../managers/Utils";
import { useI18n } from "../../i18n/I18nManager";

type Toast = (message: string) => void;
type T = ReturnType<typeof useI18n>["t"];

/**
 * Copies `text`, flipping the button label to "Copied" for a moment, or
 * saying so in a toast when it can't.
 */
export function CopyButton(props: {
  text: string;
  label: string;
  toast: Toast;
  className?: string;
  /** For when the visible label alone doesn't say whose link it copies. */
  ariaLabel?: string;
}) {
  const { t } = useI18n();
  const copied = useSignal(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(props.text);
    } catch (error) {
      // Also covers no clipboard at all (an insecure origin, some webviews),
      // where reading `writeText` throws before there's a promise to reject.
      console.error("Failed to copy:", error);
      props.toast(
        t("copy-failed", { defaultValue: "Couldn't copy to your clipboard." })
      );
      return;
    }
    copied.value = true;
    setTimeout(() => (copied.value = false), 2000);
  };
  return (
    <>
      <button
        type="button"
        className={props.className ?? "sb-friends-button"}
        aria-label={props.ariaLabel}
        onClick={() => void copy()}
      >
        {/* Both labels share one grid cell, so the button is as wide as the
          longer one and doesn't resize when it flips to "Copied". */}
        <span className="sb-friends-copy-labels">
          <span className={copied.value ? "sb-friends-copy-label--hidden" : ""}>
            {props.label}
          </span>
          <span className={copied.value ? "" : "sb-friends-copy-label--hidden"}>
            {t("copied", { defaultValue: "Copied" })}
          </span>
        </span>
      </button>
      {/* The label flipping to "Copied" isn't announced on its own. Kept
        outside the button so it doesn't become part of the button's name. */}
      <span className="sr-only" role="status">
        {copied.value ? t("copied", { defaultValue: "Copied" }) : ""}
      </span>
    </>
  );
}

/**
 * A button that shows a spinner while its request is in flight. The label
 * stays in place (just invisible) under the spinner, so the button keeps its
 * size and screen readers still hear what it is.
 */
export function BusyButton(props: {
  busy: boolean;
  disabled?: boolean;
  className: string;
  type?: "button" | "submit";
  onClick?: () => void;
  /** For when the visible label alone doesn't say who it acts on. */
  ariaLabel?: string;
  children: string;
}) {
  return (
    <button
      type={props.type ?? "button"}
      className={`${props.className} sb-friends-busy-button`}
      disabled={props.busy || props.disabled}
      aria-busy={props.busy}
      aria-label={props.ariaLabel}
      onClick={props.onClick}
    >
      <span
        className={
          props.busy
            ? "sb-friends-busy-label sb-friends-busy-label--hidden"
            : "sb-friends-busy-label"
        }
      >
        {props.children}
      </span>
      {props.busy ? (
        <span
          className="material-symbols-outlined sb-friends-busy-spinner"
          aria-hidden="true"
        >
          progress_activity
        </span>
      ) : null}
    </button>
  );
}

/*
 * The friendship actions offered in more than one place, each saying how it
 * went in a toast. `name` is who the toast names, which callers take from a
 * profile: a name someone gave themselves elsewhere (in a session, say) could
 * be anything.
 */

/**
 * Accepts or declines `request`. Resolves false when it failed outright (and
 * the toast said so), true otherwise, including a request that turned out to
 * be gone.
 */
export async function answerFriendRequest(
  friends: FriendsManager,
  toast: Toast,
  t: T,
  request: FriendRequest,
  name: string,
  accept: boolean
): Promise<boolean> {
  try {
    if (!accept) {
      await friends.declineRequest(request.id);
      toast(
        t("friend-request-declined", {
          name,
          defaultValue: "Declined {{name}}'s friend request.",
        })
      );
      return true;
    }
    const result = await friends.acceptRequest(request.id);
    toast(
      result.success
        ? t("now-friends-with", {
            name,
            defaultValue: "You're now friends with {{name}}.",
          })
        : result.reason === "expired"
          ? t("friend-request-expired", {
              defaultValue: "That request has expired.",
            })
          : t("friend-request-unavailable", {
              defaultValue: "That request is no longer available.",
            })
    );
    return true;
  } catch (error) {
    console.error("Failed to answer friend request:", error);
    toast(
      t("friend-request-answer-failed", {
        defaultValue: "Couldn't answer the request. Try again.",
      })
    );
    return false;
  }
}

/** Withdraws a request the signed-in user sent. */
export async function cancelFriendRequest(
  friends: FriendsManager,
  toast: Toast,
  t: T,
  request: FriendRequest,
  name: string
): Promise<void> {
  try {
    await friends.cancelRequest(request.id);
    toast(
      t("friend-request-canceled", {
        name,
        defaultValue: "Canceled your friend request to {{name}}.",
      })
    );
  } catch (error) {
    console.error("Failed to cancel friend request:", error);
    toast(
      t("friend-request-cancel-failed", {
        defaultValue: "Couldn't cancel the request. Try again.",
      })
    );
  }
}

/**
 * Asks `userId` to be friends, or accepts their request if they already asked.
 * Resolves false when it failed outright (and the toast said so), true
 * otherwise, including finding they're already a friend or already asked.
 */
export async function sendFriendRequestTo(
  friends: FriendsManager,
  toast: Toast,
  t: T,
  userId: string,
  name: string
): Promise<boolean> {
  try {
    const result = await friends.sendRequest({ userId });
    switch (result.status) {
      case "sent":
        toast(
          t("friend-request-sent-to", {
            name,
            defaultValue: "Friend request sent to {{name}}.",
          })
        );
        break;
      case "accepted":
        toast(
          t("now-friends-with", {
            name,
            defaultValue: "You're now friends with {{name}}.",
          })
        );
        break;
      case "already_friends":
        toast(
          t("add-friend-link-already-friends", {
            name,
            defaultValue: "You're already friends with {{name}}.",
          })
        );
        break;
      case "already_requested":
        toast(
          t("add-friend-link-already-sent", {
            name,
            defaultValue: "You've already sent {{name}} a friend request.",
          })
        );
        break;
      case "user_not_found":
        toast(
          t("person-profile-no-account", {
            defaultValue:
              "We couldn't find anyone with this user ID. It may have been copied incorrectly.",
          })
        );
        break;
      // "self" isn't offered, and "not_signed_in" means they closed the
      // sign-in dialog, which needs no telling.
    }
    return true;
  } catch (error) {
    console.error("Failed to send friend request:", error);
    toast(
      t("friend-request-failed", {
        defaultValue: "Couldn't send the request. Try again.",
      })
    );
    return false;
  }
}

/** Runs a confirmed removal, for a caller that shows it in progress. */
type TrackRemoval = (remove: () => Promise<void>) => Promise<void>;

function ConfirmRemoveFriend(props: {
  friend: Friend;
  friends: FriendsManager;
  toast: Toast;
  track?: TrackRemoval;
  onClose: () => void;
}) {
  const { friend, friends, toast, track, onClose } = props;
  const { t } = useI18n();

  const remove = async () => {
    try {
      await friends.unfriend(friend.userId);
    } catch (error) {
      console.error("Failed to remove friend:", error);
      toast(
        t("remove-friend-failed", {
          defaultValue: "Couldn't remove the friend. Try again.",
        })
      );
    }
  };
  const confirm = () => {
    onClose();
    void (track ? track(remove) : remove());
  };

  return (
    <div className="sb-confirm-delete">
      <p className="sb-confirm-delete-message">
        {t("remove-friend-confirm-message", {
          name: displayNameOf(friend, t),
          defaultValue:
            "Remove {{name}} as a friend? You'll both stop seeing each other's reading.",
        })}
      </p>
      <div className="sb-confirm-delete-actions">
        <button
          type="button"
          className="sb-session-settings-cancel"
          onClick={onClose}
        >
          {t("cancel", { defaultValue: "Cancel" })}
        </button>
        <button
          type="button"
          className="sb-session-settings-end"
          onClick={confirm}
        >
          {t("remove", { defaultValue: "Remove" })}
        </button>
      </div>
    </div>
  );
}

/**
 * Asks before ending the friendship with `friend`, then ends it. The
 * confirmation closes straight away, so `track` is how the button that opened
 * it can show the removal in progress.
 */
export function openRemoveFriendConfirm(
  deps: {
    friends: FriendsManager;
    modals: Pick<ModalManager, "openModal" | "closeModal">;
    toast: Toast;
  },
  friend: Friend,
  track?: TrackRemoval
): void {
  const modalId = `remove-friend-${friend.userId}`;
  deps.modals.openModal({
    id: modalId,
    title: {
      key: "remove-friend-confirm-title",
      defaultValue: "Remove friend?",
    },
    content: () => (
      <ConfirmRemoveFriend
        friend={friend}
        friends={deps.friends}
        toast={deps.toast}
        track={track}
        onClose={() => deps.modals.closeModal(modalId)}
      />
    ),
  });
}
