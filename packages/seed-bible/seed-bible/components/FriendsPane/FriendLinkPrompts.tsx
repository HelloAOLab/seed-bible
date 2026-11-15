import type { ComponentChildren } from "preact";
import { useRef } from "preact/hooks";
import { useSignal } from "@preact/signals";
import {
  toFriendProfile,
  type Friend,
  type FriendsManager,
} from "../../managers/FriendsManager";
import type { LoginManager, UserProfile } from "../../managers/LoginManager";
import type { ModalManager } from "../../managers/ModalManager";
import type { NavigationManager } from "../../managers/NavigationManager";
import { displayNameOf } from "../../managers/Utils";
import { useI18n } from "../../i18n/I18nManager";
import { answerFriendRequest, sendFriendRequestTo } from "./friendActions";
import { emptyProfileNote, hasEmptyProfile, PersonCard } from "./PersonCard";
import {
  ADD_FRIEND_PARAM,
  FRIEND_REQUEST_PARAM,
  parseUserId,
} from "./friendLinks";
import type { FriendLinkPreviewLoader } from "../../managers/FriendLinkPreviewLoader";
import { Button } from "../Button/Button";

type Toast = (message: string) => void;
type ProfileLookup = "found" | "no_account" | "failed";

/**
 * What the add-friend prompt's button does. `run` resolves false when it
 * failed (its toast says so), which keeps the prompt open to try again.
 */
type LinkAction = { label: string; run: () => Promise<boolean> };

export interface FriendLinkDeps {
  navigation: Pick<NavigationManager, "currentUrl" | "updateQueryParams">;
  login: Pick<LoginManager, "userId" | "login" | "getPublicProfile">;
  friends: FriendsManager;
  modals: Pick<ModalManager, "openModal" | "closeModal">;
  toast: Toast;
  friendLinkPreview: Pick<
    FriendLinkPreviewLoader,
    "result" | "initialLoadPromise"
  >;
}

function PromptActions(props: { children: ComponentChildren }) {
  return <div className="sb-confirm-delete-actions">{props.children}</div>;
}

function CloseButton(props: { onClose: () => void; primary?: boolean }) {
  const { t } = useI18n();
  return (
    <Button
      variant={props.primary ? "primary" : "secondary"}
      onClick={props.onClose}
    >
      {t("close", { defaultValue: "Close" })}
    </Button>
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
        <Button variant="primary" onClick={props.onSignIn}>
          {t("log-in", { defaultValue: "Log in" })}
        </Button>
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
  // "already sent" just before the prompt closes.
  const shownWhileBusy = useRef<{
    message: string;
    action: LinkAction | null;
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
  let action: LinkAction | null = null;

  if (person.userId === login.userId.value) {
    message = t("add-friend-link-own", {
      defaultValue:
        "This is your own friend link. Share it so people can send you a friend request.",
    });
  } else if (!friends.hasLoaded.value && friends.isLoading.value) {
    // Only the first read: a later one keeps what's known. If the first read
    // fails, Send is still offered, and sending reads the lists again first.
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
      run: () =>
        answerFriendRequest(friends, toast, t, theirRequest, name, true),
    };
  } else {
    message = t("add-friend-link-confirm", {
      name,
      defaultValue: "Send {{name}} a friend request?",
    });
    action = {
      label: t("send-friend-request", { defaultValue: "Send request" }),
      run: () => sendFriendRequestTo(friends, toast, t, person.userId, name),
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
      if (await action.run()) {
        onClose();
      }
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
            <Button disabled={busy.value} onClick={onClose}>
              {t("cancel", { defaultValue: "Cancel" })}
            </Button>
            <Button
              variant="primary"
              loading={busy.value}
              onClick={() => void runAction()}
            >
              {action.label}
            </Button>
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
  // The sender opening their own link, to check it, say: "isn't available"
  // would read as if sending had failed.
  const sent = request
    ? undefined
    : friends.outgoingRequests.value.find((r) => r.id === requestId);

  if (sent) {
    return (
      <div className="sb-confirm-delete">
        <PersonCard person={sent} />
        <p className="sb-confirm-delete-message">
          {t("friend-request-link-own", {
            name: displayNameOf(sent, t),
            defaultValue:
              "This is the link to your friend request to {{name}}. Send it to them so they can accept.",
          })}
        </p>
        <PromptActions>
          <CloseButton onClose={onClose} primary />
        </PromptActions>
      </div>
    );
  }

  if (!request) {
    // The link is already gone from the address, so reloading wouldn't bring
    // this prompt back: a failed read gets its own way to try again.
    const loadFailed = !friends.hasLoaded.value && !friends.isLoading.value;
    return (
      <div className="sb-confirm-delete">
        <p className="sb-confirm-delete-message">
          {loadFailed
            ? t("friend-request-link-load-failed", {
                defaultValue:
                  "Couldn't load your friend requests. Check your connection and try again.",
              })
            : !friends.hasLoaded.value
              ? t("loading", { defaultValue: "Loading…" })
              : t("friend-request-link-unavailable", {
                  defaultValue:
                    "This friend request isn't available. It may have been sent to a different account, already been answered, or expired.",
                })}
        </p>
        <PromptActions>
          {loadFailed ? (
            <>
              <CloseButton onClose={onClose} />
              <Button variant="primary" onClick={() => void friends.refresh()}>
                {t("try-again", { defaultValue: "Try again" })}
              </Button>
            </>
          ) : (
            <CloseButton onClose={onClose} primary />
          )}
        </PromptActions>
      </div>
    );
  }

  const name = displayNameOf(request, t);
  const answer = async (accept: boolean) => {
    answering.value = accept ? "accept" : "decline";
    try {
      if (await answerFriendRequest(friends, toast, t, request, name, accept)) {
        onClose();
      }
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
        <Button
          loading={answering.value === "decline"}
          disabled={answering.value !== null}
          onClick={() => void answer(false)}
        >
          {t("decline", { defaultValue: "Decline" })}
        </Button>
        <Button
          variant="primary"
          loading={answering.value === "accept"}
          disabled={answering.value !== null}
          onClick={() => void answer(true)}
        >
          {t("accept", { defaultValue: "Accept" })}
        </Button>
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

/**
 * The linked person's profile, from the friend link loader when it already
 * has it (seeded by SSR, or its own load) so opening the prompt doesn't
 * read it a second time.
 */
async function lookUpLinkedProfile(
  deps: FriendLinkDeps,
  userId: string
): Promise<UserProfile | null> {
  await deps.friendLinkPreview.initialLoadPromise;
  const loaded = deps.friendLinkPreview.result.peek();
  if (loaded?.userId === userId) {
    return loaded.profile;
  }
  return deps.login.getPublicProfile(userId);
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
      const profile = await lookUpLinkedProfile(deps, userId);
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
