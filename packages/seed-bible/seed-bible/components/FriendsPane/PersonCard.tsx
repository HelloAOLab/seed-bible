import "./FriendsPane.css";
import type { ComponentChildren } from "preact";
import { useEffect, useId } from "preact/hooks";
import { useSignal } from "@preact/signals";
import {
  toFriendProfile,
  type Friend,
  type FriendsManager,
} from "../../managers/FriendsManager";
import type { LoginManager } from "../../managers/LoginManager";
import type { ModalManager } from "../../managers/ModalManager";
import type { NavigationManager } from "../../managers/NavigationManager";
import { getUserAnimalVisual } from "../../managers/SessionsManager";
import { displayNameOf } from "../../managers/Utils";
import { useI18n } from "../../i18n/I18nManager";
import { Avatar } from "../Avatar/Avatar";
import { ExpandableText } from "../ExpandableText/ExpandableText";
import { MaterialIcon } from "../icons";
import {
  answerFriendRequest,
  BusyButton,
  cancelFriendRequest,
  CopyButton,
  openRemoveFriendConfirm,
  sendFriendRequestTo,
} from "./friendActions";
import { getFriendRequestUrl } from "./friendLinks";

type T = ReturnType<typeof useI18n>["t"];

export function PersonIdentity(props: {
  person: Pick<Friend, "userId" | "name" | "pictureUrl">;
  subtitle?: ComponentChildren;
  /** Put on the subtitle, for a control that wants it as its description. */
  subtitleId?: string;
}) {
  const { t } = useI18n();
  const name = displayNameOf(props.person, t);
  return (
    <>
      <Avatar
        imageUrl={props.person.pictureUrl}
        visual={getUserAnimalVisual(props.person.userId)}
        title={name}
      />
      <span className="sb-friends-person-text">
        <span className="sb-friends-person-name">{name}</span>
        {props.subtitle ? (
          <span className="sb-friends-person-subtitle" id={props.subtitleId}>
            {props.subtitle}
          </span>
        ) : null}
      </span>
    </>
  );
}

/** True when the person never filled in any part of their profile. */
export function hasEmptyProfile(person: Friend): boolean {
  return (
    !person.name &&
    !person.pictureUrl &&
    !person.location &&
    !person.description
  );
}

/**
 * Someone's picture and name, plus the location and description from their
 * profile when they've set them, so whoever is looking has more to go on than
 * a name. `note` adds a line inside the card, for when there's something to
 * say about the profile itself.
 */
export function PersonCard(props: { person: Friend; note?: string }) {
  const { t } = useI18n();
  const { location, description } = props.person;
  return (
    <div className="sb-friend-link-about">
      <div className="sb-friend-link-person">
        <PersonIdentity
          person={props.person}
          subtitle={
            location ? (
              <span className="sb-friend-link-location">
                <MaterialIcon aria-hidden="true">location_on</MaterialIcon>
                {location}
              </span>
            ) : undefined
          }
        />
      </div>
      {description ? (
        <ExpandableText
          className="sb-friend-link-description"
          readMoreLabel={t("read-more", { defaultValue: "Read more" })}
          readLessLabel={t("read-less", { defaultValue: "Read less" })}
        >
          {description}
        </ExpandableText>
      ) : null}
      {props.note ? <p className="sb-friend-link-note">{props.note}</p> : null}
    </div>
  );
}

export function emptyProfileNote(t: T): string {
  return t("person-profile-empty", {
    defaultValue: "This person hasn't set up their profile yet.",
  });
}

const PERSON_PROFILE_MODAL_ID = "person-profile";

export interface PersonProfileDeps {
  login: Pick<LoginManager, "userId" | "getPublicProfile">;
  friends: FriendsManager;
  modals: Pick<ModalManager, "openModal" | "closeModal">;
  navigation: Pick<NavigationManager, "linkToBareRoot">;
  app: { toast: (message: string) => void };
}

type ProfileLookup = "loading" | "found" | "no_account" | "failed";
type FriendAction = "send" | "accept" | "decline" | "cancel";

/**
 * What the signed-in user can do about their connection with `person`. Read
 * live from the friends lists, so it follows along as a request is answered,
 * whether from here or anywhere else.
 */
function FriendshipActions(props: {
  person: Friend;
  lookup: ProfileLookup;
  deps: PersonProfileDeps;
}) {
  const { person, lookup, deps } = props;
  const { friends, login, modals, navigation } = deps;
  const toast = deps.app.toast;
  const { t } = useI18n();
  // Which action is in flight, so only that button spins while the rest wait.
  const busy = useSignal<FriendAction | null>(null);

  const me = login.userId.value;
  const { userId } = person;
  if (!me || userId === me) {
    return null;
  }

  const name = displayNameOf(person, t);
  const run = async (action: FriendAction, work: () => Promise<unknown>) => {
    busy.value = action;
    try {
      await work();
    } finally {
      busy.value = null;
    }
  };
  const incoming = friends.incomingRequests.value.find(
    (r) => r.userId === userId
  );
  const outgoing = friends.outgoingRequests.value.find(
    (r) => r.userId === userId
  );

  let message: string | null = null;
  let actions: ComponentChildren = null;
  if (friends.friendIds.value.includes(userId)) {
    message = t("person-profile-friends", {
      name,
      defaultValue: "You're friends with {{name}}.",
    });
    actions = (
      <button
        type="button"
        className="sb-session-settings-cancel"
        disabled={busy.value !== null}
        aria-label={t("remove-friend-user", {
          name,
          defaultValue: "Remove {{name}} as a friend",
        })}
        onClick={() =>
          openRemoveFriendConfirm({ friends, modals, toast }, person)
        }
      >
        {t("remove", { defaultValue: "Remove" })}
      </button>
    );
  } else if (incoming) {
    message = t("friend-request-link-confirm", {
      name,
      defaultValue: "{{name}} wants to be friends.",
    });
    actions = (
      <>
        <BusyButton
          className="sb-session-settings-cancel"
          busy={busy.value === "decline"}
          disabled={busy.value !== null}
          ariaLabel={t("decline-friend-user", {
            name,
            defaultValue: "Decline {{name}}'s friend request",
          })}
          onClick={() =>
            void run("decline", () =>
              answerFriendRequest(friends, toast, t, incoming, name, false)
            )
          }
        >
          {t("decline", { defaultValue: "Decline" })}
        </BusyButton>
        <BusyButton
          className="sb-session-settings-end"
          busy={busy.value === "accept"}
          disabled={busy.value !== null}
          ariaLabel={t("accept-friend-user", {
            name,
            defaultValue: "Accept {{name}}'s friend request",
          })}
          onClick={() =>
            void run("accept", () =>
              answerFriendRequest(friends, toast, t, incoming, name, true)
            )
          }
        >
          {t("accept", { defaultValue: "Accept" })}
        </BusyButton>
      </>
    );
  } else if (outgoing) {
    // Offered even when no account has their ID: the request is still there
    // to take back.
    message = t("friend-request-waiting", {
      defaultValue: "Waiting for them to accept",
    });
    actions = (
      <>
        <CopyButton
          className="sb-session-settings-cancel"
          toast={toast}
          text={getFriendRequestUrl(navigation, outgoing.id)}
          label={t("copy-friend-request-link", { defaultValue: "Copy link" })}
          ariaLabel={t("copy-friend-request-link-user", {
            name,
            defaultValue: "Copy the link to your friend request to {{name}}",
          })}
        />
        <BusyButton
          className="sb-session-settings-cancel"
          busy={busy.value === "cancel"}
          disabled={busy.value !== null}
          ariaLabel={t("cancel-friend-request-user", {
            name,
            defaultValue: "Cancel your friend request to {{name}}",
          })}
          onClick={() =>
            void run("cancel", () =>
              cancelFriendRequest(friends, toast, t, outgoing, name)
            )
          }
        >
          {t("cancel", { defaultValue: "Cancel" })}
        </BusyButton>
      </>
    );
  } else if (
    (lookup === "found" || lookup === "failed") &&
    !(friends.isLoading.value && friends.friendIds.value.length === 0)
  ) {
    // Not offered while the lookup runs, nor once it finds no account: there
    // may be no one to ask. A failed lookup can't tell, so it lets them try.
    // Nor while the lists are first loading, when a friend or someone who
    // already asked would look like a stranger.
    actions = (
      <BusyButton
        className="sb-session-settings-end"
        busy={busy.value === "send"}
        ariaLabel={t("add-friend-user", {
          name,
          defaultValue: "Add {{name}} as a friend",
        })}
        onClick={() =>
          void run("send", () =>
            sendFriendRequestTo(friends, toast, t, userId, name)
          )
        }
      >
        {t("add-friend-button", { defaultValue: "Add friend" })}
      </BusyButton>
    );
  }

  if (!actions) {
    return null;
  }
  return (
    <>
      {message ? <p className="sb-confirm-delete-message">{message}</p> : null}
      <div className="sb-confirm-delete-actions">{actions}</div>
    </>
  );
}

/** Whatever the friends lists already know about `userId`'s profile. */
function knownProfile(friends: FriendsManager, userId: string): Friend {
  const known = [
    ...friends.friends.peek(),
    ...friends.incomingRequests.peek(),
    ...friends.outgoingRequests.peek(),
  ].find((person) => person.userId === userId);
  return {
    userId,
    name: known?.name ?? null,
    pictureUrl: known?.pictureUrl ?? null,
    location: known?.location ?? null,
    description: known?.description ?? null,
  };
}

/**
 * The profile popup. It starts from what the friends lists already know,
 * then reads the profile afresh: their copy may be old, and only a fresh read
 * can tell an account with no profile from no account at all.
 */
function PersonProfile(props: { userId: string; deps: PersonProfileDeps }) {
  const { userId, deps } = props;
  const { login } = deps;
  const { t } = useI18n();
  const shown = useSignal<Friend>(knownProfile(deps.friends, userId));
  const lookup = useSignal<ProfileLookup>("loading");

  useEffect(() => {
    let cancelled = false;
    login.getPublicProfile(userId).then(
      (profile) => {
        if (cancelled) {
          return;
        }
        if (profile) {
          shown.value = { userId, ...toFriendProfile(profile) };
          lookup.value = "found";
        } else {
          lookup.value = "no_account";
        }
      },
      (error) => {
        console.warn(`Could not load the profile for ${userId}:`, error);
        if (!cancelled) {
          lookup.value = "failed";
        }
      }
    );
    return () => {
      cancelled = true;
    };
  }, [userId]);

  let note: string | undefined;
  if (lookup.value === "no_account") {
    note = t("person-profile-no-account", {
      defaultValue:
        "We couldn't find anyone with this user ID. It may have been copied incorrectly.",
    });
  } else if (lookup.value === "found" && hasEmptyProfile(shown.value)) {
    note = emptyProfileNote(t);
  }

  return (
    <div className="sb-confirm-delete" aria-busy={lookup.value === "loading"}>
      <PersonCard person={shown.value} note={note} />
      <FriendshipActions
        person={shown.value}
        lookup={lookup.value}
        deps={deps}
      />
    </div>
  );
}

/**
 * Opens someone's profile, with whatever the signed-in user can do about
 * their friendship. Their name and picture come from their own profile, never
 * the caller, so a name someone gave themselves in a session can't stand in.
 */
export function openPersonProfile(
  deps: PersonProfileDeps,
  userId: string
): void {
  deps.modals.openModal({
    id: PERSON_PROFILE_MODAL_ID,
    title: { key: "profile", defaultValue: "Profile" },
    content: () => <PersonProfile key={userId} userId={userId} deps={deps} />,
  });
}

/**
 * A person's picture and name as a button that opens their profile, for the
 * rows of the Friends screen.
 */
export function PersonButton(props: {
  deps: PersonProfileDeps;
  person: Friend;
  subtitle?: ComponentChildren;
}) {
  const { t } = useI18n();
  const subtitleId = useId();
  const name = displayNameOf(props.person, t);
  return (
    <button
      type="button"
      className="sb-friends-person-button"
      aria-label={t("view-profile-of", {
        name,
        defaultValue: "View {{name}}'s profile",
      })}
      // The label replaces what the button shows, so the subtitle ("Waiting
      // for them to accept") is read as its description instead.
      aria-describedby={props.subtitle ? subtitleId : undefined}
      onClick={() => openPersonProfile(props.deps, props.person.userId)}
    >
      <PersonIdentity
        person={props.person}
        subtitle={props.subtitle}
        subtitleId={subtitleId}
      />
    </button>
  );
}
