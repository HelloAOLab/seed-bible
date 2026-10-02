import "./FriendsPane.css";
import { useEffect } from "preact/hooks";
import { useSignal } from "@preact/signals";
import type { SeedBibleState } from "../../managers/SeedBibleStateManager";
import type {
  Friend,
  FriendRequest,
  FriendsManager,
  SendFriendRequestResult,
} from "../../managers/FriendsManager";
import type { ModalManager } from "../../managers/ModalManager";
import { displayNameOf } from "../../managers/Utils";
import { MaterialIcon } from "../icons";
import { useI18n } from "../../i18n/I18nManager";
import { getAddFriendUrl, getFriendRequestUrl } from "./friendLinks";
import { PersonButton, type PersonProfileDeps } from "./PersonCard";

export const FRIENDS_PANE_ID = "friends-pane";

/**
 * Whether Add a friend also takes an email address. Off until
 * casual-simulation/casualos#890 is fixed: the server looks emails up outside
 * the Seed Bible comID, so a request by email either finds no one or reaches a
 * different account with the same address. Flip this once it lands.
 */
const ADD_FRIEND_BY_EMAIL_ENABLED = false;

/** CasualOS user IDs are UUIDs; checked so a typo doesn't send a request to nobody. */
const USER_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Toast = SeedBibleState["app"]["toast"];
type T = ReturnType<typeof useI18n>["t"];

/** Pane header title. A component so it can call `useI18n`. */
export function FriendsPaneTitle() {
  const { t } = useI18n();
  return <>{t("friends", { defaultValue: "Friends" })}</>;
}

function FriendsHeading(props: { icon?: string; children: string }) {
  return (
    <h2 className="sb-friends-heading">
      {props.icon ? (
        <MaterialIcon aria-hidden="true">{props.icon}</MaterialIcon>
      ) : null}
      <span className="sb-friends-heading-text">{props.children}</span>
    </h2>
  );
}

/** Copies `text`, flipping the button label to "Copied" for a moment. */
function CopyButton(props: {
  text: string;
  label: string;
  className?: string;
}) {
  const { t } = useI18n();
  const copied = useSignal(false);
  return (
    <button
      type="button"
      className={props.className ?? "sb-friends-button"}
      onClick={() => {
        void navigator.clipboard
          .writeText(props.text)
          .then(() => {
            copied.value = true;
            setTimeout(() => (copied.value = false), 2000);
          })
          .catch((error) => console.error("Failed to copy:", error));
      }}
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

/** The outcome of the last send, shown under the Add a friend form. */
type SendOutcome = {
  message: string;
  /** Something the user has to fix or retry, shown as an error. */
  isError?: boolean;
  /** Set when there's a pending request whose link is worth sending them. */
  requestId?: string;
};

function sendOutcomeMessage(
  result: SendFriendRequestResult,
  t: T
): SendOutcome {
  switch (result.status) {
    case "sent":
      return {
        message: t("friend-request-sent", {
          defaultValue:
            "Request sent. Send them the link so they can accept it.",
        }),
        requestId: result.requestId,
      };
    case "already_requested":
      return {
        message: t("friend-request-already-sent", {
          defaultValue: "You've already sent them a request.",
        }),
        requestId: result.requestId,
      };
    case "accepted":
      return {
        message: t("friend-request-accepted-theirs", {
          defaultValue: "They'd already asked you, so you're now friends.",
        }),
      };
    case "already_friends":
      return {
        message: t("friend-already-friends", {
          defaultValue: "You're already friends.",
        }),
      };
    case "self":
      return {
        message: t("friend-request-self", {
          defaultValue: "That's your own account.",
        }),
        isError: true,
      };
    case "user_not_found":
      return {
        message: t("friend-request-user-not-found", {
          defaultValue: "No account uses that email.",
        }),
        isError: true,
      };
    case "not_signed_in":
      return {
        message: t("friends-signed-out", {
          defaultValue: "Sign in to add friends and see what they're reading.",
        }),
        isError: true,
      };
  }
}

function AddFriendCard(props: { state: SeedBibleState; userId: string }) {
  const { friends, navigation } = props.state;
  const toast = props.state.app.toast;
  const { t } = useI18n();
  const value = useSignal("");
  const busy = useSignal(false);
  const outcome = useSignal<SendOutcome | null>(null);

  const submit = async (event: Event) => {
    event.preventDefault();
    const input = value.value.trim();
    if (!input || busy.value) {
      return;
    }
    let target: { userId: string } | { email: string };
    if (ADD_FRIEND_BY_EMAIL_ENABLED && input.includes("@")) {
      target = { email: input };
    } else if (USER_ID_PATTERN.test(input)) {
      target = { userId: input.toLowerCase() };
    } else {
      outcome.value = {
        message: ADD_FRIEND_BY_EMAIL_ENABLED
          ? t("add-friend-invalid-input", {
              defaultValue: "Enter an email address or a user ID.",
            })
          : t("add-friend-invalid-id", {
              defaultValue: "That doesn't look like a user ID.",
            }),
        isError: true,
      };
      return;
    }

    busy.value = true;
    try {
      const result = await friends.sendRequest(target);
      outcome.value = sendOutcomeMessage(result, t);
      if (result.status === "sent") {
        // Their profile loads in the background after the send, so the name
        // is only there if it was already known.
        const name = friends.outgoingRequests
          .peek()
          .find((r) => r.id === result.requestId)?.name;
        toast(
          name
            ? t("friend-request-sent-to", {
                name,
                defaultValue: "Friend request sent to {{name}}.",
              })
            : t("friend-request-sent-toast", {
                defaultValue: "Friend request sent.",
              })
        );
      }
      if (result.status !== "user_not_found") {
        value.value = "";
      }
    } catch (error) {
      console.error("Failed to send friend request:", error);
      outcome.value = {
        message: t("friend-request-failed", {
          defaultValue: "Couldn't send the request. Try again.",
        }),
        isError: true,
      };
    } finally {
      busy.value = false;
    }
  };

  return (
    <section className="sb-friends-card">
      <FriendsHeading icon="person_add">
        {t("add-friend", { defaultValue: "Add a friend" })}
      </FriendsHeading>
      <form className="sb-friends-add-form" onSubmit={submit}>
        <input
          type="text"
          className="sb-friends-add-input"
          value={value.value}
          onInput={(e) => (value.value = e.currentTarget.value)}
          placeholder={
            ADD_FRIEND_BY_EMAIL_ENABLED
              ? t("add-friend-placeholder", {
                  defaultValue: "Email or user ID",
                })
              : t("add-friend-placeholder-id", { defaultValue: "User ID" })
          }
          aria-label={t("add-friend", { defaultValue: "Add a friend" })}
          autoComplete="off"
          spellcheck={false}
        />
        <BusyButton
          type="submit"
          className="sb-friends-button sb-friends-button--primary"
          busy={busy.value}
          disabled={value.value.trim().length === 0}
        >
          {t("send-friend-request", { defaultValue: "Send request" })}
        </BusyButton>
      </form>
      {outcome.value ? (
        <div
          className={
            outcome.value.isError
              ? "sb-friends-add-outcome sb-friends-add-outcome--error"
              : "sb-friends-add-outcome"
          }
          role={outcome.value.isError ? "alert" : "status"}
        >
          <span>{outcome.value.message}</span>
          {outcome.value.requestId ? (
            <CopyButton
              text={getFriendRequestUrl(navigation, outcome.value.requestId)}
              label={t("copy-friend-request-link", {
                defaultValue: "Copy link",
              })}
            />
          ) : null}
        </div>
      ) : null}
      <div className="sb-friends-share">
        <div className="sb-friends-share-row sb-friends-my-link">
          <span className="sb-friends-share-text sb-friends-share-label">
            {t("your-friend-link-description", {
              defaultValue:
                "Share your friend link. Anyone who opens it can send you a request.",
            })}
          </span>
          <CopyButton
            text={getAddFriendUrl(navigation, props.userId)}
            label={t("copy-your-friend-link", {
              defaultValue: "Copy your friend link",
            })}
          />
        </div>
        <div className="sb-friends-share-row sb-friends-my-id">
          <span className="sb-friends-share-text">
            <span className="sb-friends-share-label">
              {t("your-user-id", { defaultValue: "Your user ID" })}
            </span>
            <code className="sb-friends-my-id-value">{props.userId}</code>
          </span>
          <CopyButton
            text={props.userId}
            label={t("copy-your-user-id", {
              defaultValue: "Copy your user ID",
            })}
          />
        </div>
      </div>
    </section>
  );
}

function IncomingRequestRow(props: {
  request: FriendRequest;
  friends: FriendsManager;
  profiles: PersonProfileDeps;
  toast: Toast;
}) {
  const { request, friends, profiles, toast } = props;
  const { t } = useI18n();
  // Which answer is in flight, so only that button spins while both are
  // disabled.
  const answering = useSignal<"accept" | "decline" | null>(null);

  const answer = async (accept: boolean) => {
    const name = displayNameOf(request, t);
    answering.value = accept ? "accept" : "decline";
    try {
      if (!accept) {
        await friends.declineRequest(request.id);
        toast(
          t("friend-request-declined", {
            name,
            defaultValue: "Declined {{name}}'s friend request.",
          })
        );
        return;
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
    } catch (error) {
      console.error("Failed to answer friend request:", error);
      toast(
        t("friend-request-answer-failed", {
          defaultValue: "Couldn't answer the request. Try again.",
        })
      );
    } finally {
      answering.value = null;
    }
  };

  return (
    <li className="sb-friends-row">
      <PersonButton deps={profiles} person={request} />
      <span className="sb-friends-row-actions">
        <BusyButton
          className="sb-friends-button sb-friends-button--primary"
          busy={answering.value === "accept"}
          disabled={answering.value !== null}
          onClick={() => void answer(true)}
        >
          {t("accept", { defaultValue: "Accept" })}
        </BusyButton>
        <BusyButton
          className="sb-friends-button"
          busy={answering.value === "decline"}
          disabled={answering.value !== null}
          onClick={() => void answer(false)}
        >
          {t("decline", { defaultValue: "Decline" })}
        </BusyButton>
      </span>
    </li>
  );
}

function OutgoingRequestRow(props: {
  request: FriendRequest;
  friends: FriendsManager;
  navigation: SeedBibleState["navigation"];
  profiles: PersonProfileDeps;
  toast: Toast;
}) {
  const { request, friends, navigation, profiles, toast } = props;
  const { t } = useI18n();
  const busy = useSignal(false);

  return (
    <li className="sb-friends-row">
      <PersonButton
        deps={profiles}
        person={request}
        subtitle={t("friend-request-waiting", {
          defaultValue: "Waiting for them to accept",
        })}
      />
      <span className="sb-friends-row-actions">
        <CopyButton
          text={getFriendRequestUrl(navigation, request.id)}
          label={t("copy-friend-request-link", { defaultValue: "Copy link" })}
        />
        <BusyButton
          className="sb-friends-button"
          busy={busy.value}
          onClick={() => {
            busy.value = true;
            void friends
              .cancelRequest(request.id)
              .then(() =>
                toast(
                  t("friend-request-canceled", {
                    name: displayNameOf(request, t),
                    defaultValue: "Canceled your friend request to {{name}}.",
                  })
                )
              )
              .catch((error) => {
                console.error("Failed to cancel friend request:", error);
                toast(
                  t("friend-request-cancel-failed", {
                    defaultValue: "Couldn't cancel the request. Try again.",
                  })
                );
              })
              .finally(() => (busy.value = false));
          }}
        >
          {t("cancel", { defaultValue: "Cancel" })}
        </BusyButton>
      </span>
    </li>
  );
}

function ConfirmRemoveFriend(props: {
  friend: Friend;
  friends: FriendsManager;
  toast: Toast;
  onClose: () => void;
}) {
  const { friend, friends, toast, onClose } = props;
  const { t } = useI18n();

  const confirm = async () => {
    onClose();
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
          onClick={() => void confirm()}
        >
          {t("remove", { defaultValue: "Remove" })}
        </button>
      </div>
    </div>
  );
}

function FriendRow(props: {
  friend: Friend;
  friends: FriendsManager;
  modals: ModalManager;
  profiles: PersonProfileDeps;
  toast: Toast;
}) {
  const { friend, friends, modals, profiles, toast } = props;
  const { t } = useI18n();

  const openConfirm = () => {
    const modalId = `remove-friend-${friend.userId}`;
    modals.openModal({
      id: modalId,
      title: {
        key: "remove-friend-confirm-title",
        defaultValue: "Remove friend?",
      },
      content: () => (
        <ConfirmRemoveFriend
          friend={friend}
          friends={friends}
          toast={toast}
          onClose={() => modals.closeModal(modalId)}
        />
      ),
    });
  };

  return (
    <li className="sb-friends-row">
      <PersonButton deps={profiles} person={friend} />
      <span className="sb-friends-row-actions">
        <button
          type="button"
          className="sb-friends-button"
          onClick={openConfirm}
        >
          {t("remove", { defaultValue: "Remove" })}
        </button>
      </span>
    </li>
  );
}

/**
 * The Friends screen, reached from Profile: requests to answer, the friends
 * list, requests still waiting on the other person, and a way to add someone.
 */
export function FriendsPane(props: { state: SeedBibleState }) {
  const { state } = props;
  const { friends, login, modals, navigation } = state;
  const toast = state.app.toast;
  const { t } = useI18n();

  // Opening the screen is when someone expects names and pictures to be
  // current, so this also re-reads profiles that are already cached.
  useEffect(() => {
    void friends.refresh({ reloadProfiles: true });
  }, []);

  const userId = login.userId.value;
  if (!userId) {
    return (
      <div className="sb-friends-screen">
        <div className="sb-friends-inner sb-friends-signed-out">
          <p>
            {t("friends-signed-out", {
              defaultValue:
                "Sign in to add friends and see what they're reading.",
            })}
          </p>
          <button
            type="button"
            className="sb-friends-button sb-friends-button--primary"
            onClick={() => void login.login()}
          >
            {t("log-in", { defaultValue: "Log in" })}
          </button>
        </div>
      </div>
    );
  }

  const friendList = friends.friends.value;
  const incoming = friends.incomingRequests.value;
  const outgoing = friends.outgoingRequests.value;
  const loading = friends.isLoading.value;

  return (
    <div className="sb-friends-screen">
      <div className="sb-friends-inner">
        {incoming.length > 0 ? (
          <section className="sb-friends-section">
            <FriendsHeading icon="how_to_reg">
              {t("friend-requests", { defaultValue: "Friend requests" })}
            </FriendsHeading>
            <ul className="sb-friends-list">
              {incoming.map((request) => (
                <IncomingRequestRow
                  key={request.id}
                  request={request}
                  friends={friends}
                  profiles={state}
                  toast={toast}
                />
              ))}
            </ul>
          </section>
        ) : null}

        <section className="sb-friends-section">
          <FriendsHeading icon="group">
            {t("friends", { defaultValue: "Friends" })}
          </FriendsHeading>
          {friendList.length > 0 ? (
            <ul className="sb-friends-list">
              {friendList.map((friend) => (
                <FriendRow
                  key={friend.userId}
                  friend={friend}
                  friends={friends}
                  modals={modals}
                  profiles={state}
                  toast={toast}
                />
              ))}
            </ul>
          ) : (
            <p className="sb-friends-empty">
              {loading
                ? t("loading", { defaultValue: "Loading…" })
                : t("friends-empty", {
                    defaultValue:
                      "No friends yet. Share your friend link, or add someone by their user ID.",
                  })}
            </p>
          )}
        </section>

        <AddFriendCard state={state} userId={userId} />

        {outgoing.length > 0 ? (
          <section className="sb-friends-section">
            <FriendsHeading icon="schedule_send">
              {t("sent-friend-requests", { defaultValue: "Sent requests" })}
            </FriendsHeading>
            <ul className="sb-friends-list">
              {outgoing.map((request) => (
                <OutgoingRequestRow
                  key={request.id}
                  request={request}
                  friends={friends}
                  navigation={navigation}
                  profiles={state}
                  toast={toast}
                />
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  );
}

/** The Profile row's subtitle: how many friends, and any requests to answer. */
export function friendsRowSubtitle(friends: FriendsManager, t: T): string {
  const friendCount = friends.friendIds.value.length;
  const requestCount = friends.incomingRequests.value.length;
  if (friendCount === 0 && requestCount === 0) {
    return t("friends-row-subtitle-empty", {
      defaultValue: "Add friends and see what they're reading",
    });
  }
  const parts = [
    friendCount === 1
      ? t("friends-count", {
          count: friendCount,
          defaultValue: "{{count}} friend",
        })
      : t("friends-count-plural", {
          count: friendCount,
          defaultValue: "{{count}} friends",
        }),
  ];
  if (requestCount > 0) {
    parts.push(
      requestCount === 1
        ? t("friend-requests-count", {
            count: requestCount,
            defaultValue: "{{count}} request",
          })
        : t("friend-requests-count-plural", {
            count: requestCount,
            defaultValue: "{{count}} requests",
          })
    );
  }
  return parts.join(" · ");
}
