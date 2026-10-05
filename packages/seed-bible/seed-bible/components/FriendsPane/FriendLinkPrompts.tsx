import type { ComponentChildren } from "preact";
import { useRef } from "preact/hooks";
import { useSignal } from "@preact/signals";
import {
  toFriendProfile,
  type Friend,
  type FriendsManager,
} from "../../managers/FriendsManager";
import type { LoginManager } from "../../managers/LoginManager";
import type { ModalManager } from "../../managers/ModalManager";
import type { NavigationManager } from "../../managers/NavigationManager";
import { displayNameOf } from "../../managers/Utils";
import { useI18n } from "../../i18n/I18nManager";
import { BusyButton } from "./FriendsPane";
import { emptyProfileNote, hasEmptyProfile, PersonCard } from "./PersonCard";
import {
  ADD_FRIEND_PARAM,
  FRIEND_REQUEST_PARAM,
  parseUserId,
} from "./friendLinks";

type Toast = (message: string) => void;
type ProfileLookup = "found" | "no_account" | "failed";

export interface FriendLinkDeps {
  navigation: Pick<NavigationManager, "currentUrl" | "updateQueryParams">;
  login: Pick<LoginManager, "userId" | "login" | "getPublicProfile">;
  friends: FriendsManager;
  modals: Pick<ModalManager, "openModal" | "closeModal">;
  toast: Toast;
}

function PromptActions(props: { children: ComponentChildren }) {
  return <div className="sb-confirm-delete-actions">{props.children}</div>;
}

function CloseButton(props: { onClose: () => void; primary?: boolean }) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      className={
        props.primary ? "sb-session-settings-end" : "sb-session-settings-cancel"
      }
      onClick={props.onClose}
    >
      {t("close", { defaultValue: "Close" })}
    </button>
  );
}

/** Shown in place of a prompt that needs an account to act. */
function SignInPrompt(props: {
  message: string;
  onSignIn: () => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="sb-confirm-delete">
      <p className="sb-confirm-delete-message">{props.message}</p>
      <PromptActions>
        <CloseButton onClose={props.onClose} />
        <button
          type="button"
          className="sb-session-settings-end"
          onClick={props.onSignIn}
        >
          {t("log-in", { defaultValue: "Log in" })}
        </button>
      </PromptActions>
    </div>
  );
}

/**
 * The `?addFriend=` prompt. What it offers depends on how the signed-in user
 * already relates to this person, read live so it stays right as the friends
 * lists load or change underneath it.
 */
function AddFriendLinkPrompt(props: {
  person: Friend;
  /** How reading their profile went, which decides what the card can say. */
  lookup: ProfileLookup;
  deps: FriendLinkDeps;
  onSignIn: () => void;
  onClose: () => void;
}) {
  const { person, lookup, deps, onSignIn, onClose } = props;
  const { friends, login, toast } = deps;
  const { t } = useI18n();
  const busy = useSignal(false);
  // What the prompt showed when its button was pressed. The action refreshes
  // the friends lists, and redrawing from them mid-action would flash
  // "Loading…" (or "already sent") just before the prompt closes.
  const shownWhileBusy = useRef<{
    message: string;
    action: { label: string; run: () => Promise<void> } | null;
  } | null>(null);
  const name = displayNameOf(person, t);

  // Checked before sign-in: there's no one to send a request to, so signing
  // in wouldn't help.
  if (lookup === "no_account") {
    return (
      <div className="sb-confirm-delete">
        <p className="sb-confirm-delete-message">
          {t("add-friend-link-no-account", {
            defaultValue:
              "This friend link doesn't match anyone's account. Check that it was copied correctly.",
          })}
        </p>
        <PromptActions>
          <CloseButton onClose={onClose} primary />
        </PromptActions>
      </div>
    );
  }

  if (!login.userId.value) {
    return (
      <SignInPrompt
        message={t("add-friend-link-sign-in", {
          name,
          defaultValue: "Sign in to send {{name}} a friend request.",
        })}
        onSignIn={onSignIn}
        onClose={onClose}
      />
    );
  }

  const theirRequest = friends.incomingRequests.value.find(
    (r) => r.userId === person.userId
  );
  let message: string;
  let action: { label: string; run: () => Promise<void> } | null = null;

  if (person.userId === login.userId.value) {
    message = t("add-friend-link-own", {
      defaultValue:
        "This is your own friend link. Share it so people can send you a friend request.",
    });
  } else if (friends.isLoading.value && friends.friendIds.value.length === 0) {
    message = t("loading", { defaultValue: "Loading…" });
  } else if (friends.friendIds.value.includes(person.userId)) {
    message = t("add-friend-link-already-friends", {
      name,
      defaultValue: "You're already friends with {{name}}.",
    });
  } else if (
    friends.outgoingRequests.value.some((r) => r.userId === person.userId)
  ) {
    message = t("add-friend-link-already-sent", {
      name,
      defaultValue: "You've already sent {{name}} a friend request.",
    });
  } else if (theirRequest) {
    message = t("add-friend-link-they-asked", {
      name,
      defaultValue: "{{name}} has already sent you a friend request.",
    });
    action = {
      label: t("accept", { defaultValue: "Accept" }),
      run: async () => {
        const result = await friends.acceptRequest(theirRequest.id);
        toast(
          result.success
            ? t("now-friends-with", {
                name,
                defaultValue: "You're now friends with {{name}}.",
              })
            : t("friend-request-unavailable", {
                defaultValue: "That request is no longer available.",
              })
        );
      },
    };
  } else {
    message = t("add-friend-link-confirm", {
      name,
      defaultValue: "Send {{name}} a friend request?",
    });
    action = {
      label: t("send-friend-request", { defaultValue: "Send request" }),
      run: async () => {
        const result = await friends.sendRequest({ userId: person.userId });
        if (result.status === "sent") {
          toast(
            t("friend-request-sent-to", {
              name,
              defaultValue: "Friend request sent to {{name}}.",
            })
          );
        } else if (result.status === "accepted") {
          toast(
            t("now-friends-with", {
              name,
              defaultValue: "You're now friends with {{name}}.",
            })
          );
        } else if (result.status === "already_friends") {
          toast(
            t("add-friend-link-already-friends", {
              name,
              defaultValue: "You're already friends with {{name}}.",
            })
          );
        } else if (result.status === "already_requested") {
          toast(
            t("add-friend-link-already-sent", {
              name,
              defaultValue: "You've already sent {{name}} a friend request.",
            })
          );
        }
        // The rest can't come from this prompt: your own link is caught
        // above, a user ID is never "not found", and sending needs sign-in.
      },
    };
  }

  if (busy.value && shownWhileBusy.current) {
    ({ message, action } = shownWhileBusy.current);
  }

  const runAction = async () => {
    if (!action) {
      return;
    }
    shownWhileBusy.current = { message, action };
    busy.value = true;
    try {
      await action.run();
      onClose();
    } catch (error) {
      console.error("Friend link action failed:", error);
      toast(
        t("friend-request-failed", {
          defaultValue: "Couldn't send the request. Try again.",
        })
      );
    } finally {
      busy.value = false;
      shownWhileBusy.current = null;
    }
  };

  return (
    <div className="sb-confirm-delete">
      <PersonCard
        person={person}
        note={
          lookup === "found" && hasEmptyProfile(person)
            ? emptyProfileNote(t)
            : undefined
        }
      />
      <p className="sb-confirm-delete-message">{message}</p>
      <PromptActions>
        {action ? (
          <>
            <button
              type="button"
              className="sb-session-settings-cancel"
              disabled={busy.value}
              onClick={onClose}
            >
              {t("cancel", { defaultValue: "Cancel" })}
            </button>
            <BusyButton
              className="sb-session-settings-end"
              busy={busy.value}
              onClick={() => void runAction()}
            >
              {action.label}
            </BusyButton>
          </>
        ) : (
          <CloseButton onClose={onClose} primary />
        )}
      </PromptActions>
    </div>
  );
}

/**
 * The `?friendRequest=` prompt. A request can only be looked up by the
 * account it was sent to, so one that isn't in the signed-in user's pending
 * list is reported as unavailable rather than guessed at.
 */
function FriendRequestLinkPrompt(props: {
  requestId: string;
  deps: FriendLinkDeps;
  onSignIn: () => void;
  onClose: () => void;
}) {
  const { requestId, deps, onSignIn, onClose } = props;
  const { friends, login, toast } = deps;
  const { t } = useI18n();
  const answering = useSignal<"accept" | "decline" | null>(null);

  if (!login.userId.value) {
    return (
      <SignInPrompt
        message={t("friend-request-link-sign-in", {
          defaultValue: "Sign in to see this friend request.",
        })}
        onSignIn={onSignIn}
        onClose={onClose}
      />
    );
  }

  const request = friends.incomingRequests.value.find(
    (r) => r.id === requestId
  );

  if (!request) {
    return (
      <div className="sb-confirm-delete">
        <p className="sb-confirm-delete-message">
          {friends.isLoading.value
            ? t("loading", { defaultValue: "Loading…" })
            : t("friend-request-link-unavailable", {
                defaultValue:
                  "This friend request isn't available. It may have been sent to a different account, already been answered, or expired.",
              })}
        </p>
        <PromptActions>
          <CloseButton onClose={onClose} primary />
        </PromptActions>
      </div>
    );
  }

  const name = displayNameOf(request, t);
  const answer = async (accept: boolean) => {
    answering.value = accept ? "accept" : "decline";
    try {
      if (accept) {
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
      } else {
        await friends.declineRequest(request.id);
        toast(
          t("friend-request-declined", {
            name,
            defaultValue: "Declined {{name}}'s friend request.",
          })
        );
      }
      onClose();
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
    <div className="sb-confirm-delete">
      <PersonCard person={request} />
      <p className="sb-confirm-delete-message">
        {t("friend-request-link-confirm", {
          name,
          defaultValue: "{{name}} wants to be friends.",
        })}
      </p>
      <PromptActions>
        <BusyButton
          className="sb-session-settings-cancel"
          busy={answering.value === "decline"}
          disabled={answering.value !== null}
          onClick={() => void answer(false)}
        >
          {t("decline", { defaultValue: "Decline" })}
        </BusyButton>
        <BusyButton
          className="sb-session-settings-end"
          busy={answering.value === "accept"}
          disabled={answering.value !== null}
          onClick={() => void answer(true)}
        >
          {t("accept", { defaultValue: "Accept" })}
        </BusyButton>
      </PromptActions>
    </div>
  );
}

const ADD_FRIEND_MODAL_ID = "friend-link-add";
const FRIEND_REQUEST_MODAL_ID = "friend-link-request";

/**
 * Closes the prompt, waits for sign-in, then opens it again. The sign-in
 * dialog isn't one of the managed modals, so it isn't stacked over the prompt.
 */
async function signInThen(
  deps: FriendLinkDeps,
  modalId: string,
  reopen: () => void
) {
  deps.modals.closeModal(modalId);
  await deps.login.login();
  if (deps.login.userId.peek()) {
    reopen();
  }
}

export async function openAddFriendLinkPrompt(
  deps: FriendLinkDeps,
  linkedUserId: string
): Promise<void> {
  // A link mangled in copying can't match an account, so it's answered as
  // one that doesn't without asking the server.
  const userId = parseUserId(linkedUserId);
  let person: Friend = {
    userId: userId ?? linkedUserId,
    ...toFriendProfile(null),
  };
  let lookup: ProfileLookup = "no_account";
  if (userId) {
    // What the prompt offers depends on the friends lists, which may have
    // loaded long before this link was opened.
    if (deps.login.userId.peek()) {
      void deps.friends.refresh();
    }
    // Their name and picture make the prompt meaningful, but an account that
    // never set them can still be befriended, so a failed lookup isn't fatal.
    lookup = "failed";
    try {
      const profile = await deps.login.getPublicProfile(userId);
      person = { userId, ...toFriendProfile(profile) };
      lookup = profile ? "found" : "no_account";
    } catch (error) {
      console.warn("Could not load the profile for a friend link:", error);
    }
  }

  const reopen = () => void openAddFriendLinkPrompt(deps, linkedUserId);
  deps.modals.openModal({
    id: ADD_FRIEND_MODAL_ID,
    title: { key: "add-friend", defaultValue: "Add a friend" },
    content: () => (
      <AddFriendLinkPrompt
        person={person}
        lookup={lookup}
        deps={deps}
        onSignIn={() => void signInThen(deps, ADD_FRIEND_MODAL_ID, reopen)}
        onClose={() => deps.modals.closeModal(ADD_FRIEND_MODAL_ID)}
      />
    ),
  });
}

export function openFriendRequestLinkPrompt(
  deps: FriendLinkDeps,
  requestId: string
): void {
  // A link usually arrives straight after the request was sent, so read the
  // pending list now rather than trusting whatever loaded at startup.
  if (deps.login.userId.peek()) {
    void deps.friends.refresh();
  }
  const reopen = () => openFriendRequestLinkPrompt(deps, requestId);
  deps.modals.openModal({
    id: FRIEND_REQUEST_MODAL_ID,
    title: { key: "friend-request", defaultValue: "Friend request" },
    content: () => (
      <FriendRequestLinkPrompt
        requestId={requestId}
        deps={deps}
        onSignIn={() => void signInThen(deps, FRIEND_REQUEST_MODAL_ID, reopen)}
        onClose={() => deps.modals.closeModal(FRIEND_REQUEST_MODAL_ID)}
      />
    ),
  });
}

/**
 * Handles a friend link the app was opened with. The link is never acted on
 * without a prompt — it can come from anywhere — and its parameter is cleared
 * straight away (replacing the history entry) so a reload or Back doesn't
 * show the prompt again.
 */
export async function setupFriendLinks(deps: FriendLinkDeps): Promise<void> {
  // Needs the network and a modal, neither of which exists during SSR.
  if (typeof window === "undefined") {
    return;
  }
  const params = deps.navigation.currentUrl.peek().searchParams;
  const addFriend = params.get(ADD_FRIEND_PARAM)?.trim();
  const friendRequest = params.get(FRIEND_REQUEST_PARAM)?.trim();
  if (!addFriend && !friendRequest) {
    return;
  }
  deps.navigation.updateQueryParams(
    { [ADD_FRIEND_PARAM]: null, [FRIEND_REQUEST_PARAM]: null },
    true
  );

  if (friendRequest) {
    openFriendRequestLinkPrompt(deps, friendRequest);
  } else if (addFriend) {
    await openAddFriendLinkPrompt(deps, addFriend);
  }
}
