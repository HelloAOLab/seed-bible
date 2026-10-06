import "./FriendsPane.css";
import type { ComponentChildren } from "preact";
import { useEffect, useId } from "preact/hooks";
import { useSignal } from "@preact/signals";
import { toFriendProfile, type Friend } from "../../managers/FriendsManager";
import type { LoginManager } from "../../managers/LoginManager";
import type { ModalManager } from "../../managers/ModalManager";
import { getUserAnimalVisual } from "../../managers/SessionsManager";
import { displayNameOf } from "../../managers/Utils";
import { useI18n } from "../../i18n/I18nManager";
import { Avatar } from "../Avatar/Avatar";
import { ExpandableText } from "../ExpandableText/ExpandableText";
import { MaterialIcon } from "../icons";

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
  login: Pick<LoginManager, "getPublicProfile">;
  modals: Pick<ModalManager, "openModal">;
}

/**
 * The profile popup. It starts from what the row already knows, then reads
 * the profile afresh: the row's copy may be old, and only a fresh read can
 * tell an account with no profile from no account at all.
 */
function PersonProfile(props: {
  person: Friend;
  login: PersonProfileDeps["login"];
}) {
  const { person, login } = props;
  const { t } = useI18n();
  const shown = useSignal<Friend>(person);
  const lookup = useSignal<"loading" | "found" | "no_account" | "failed">(
    "loading"
  );

  useEffect(() => {
    let cancelled = false;
    login.getPublicProfile(person.userId).then(
      (profile) => {
        if (cancelled) {
          return;
        }
        if (profile) {
          shown.value = { userId: person.userId, ...toFriendProfile(profile) };
          lookup.value = "found";
        } else {
          lookup.value = "no_account";
        }
      },
      (error) => {
        console.warn(`Could not load the profile for ${person.userId}:`, error);
        if (!cancelled) {
          lookup.value = "failed";
        }
      }
    );
    return () => {
      cancelled = true;
    };
  }, [person.userId]);

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
    </div>
  );
}

export function openPersonProfile(
  deps: PersonProfileDeps,
  person: Friend
): void {
  deps.modals.openModal({
    id: PERSON_PROFILE_MODAL_ID,
    title: { key: "profile", defaultValue: "Profile" },
    content: () => <PersonProfile person={person} login={deps.login} />,
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
      onClick={() => openPersonProfile(props.deps, props.person)}
    >
      <PersonIdentity
        person={props.person}
        subtitle={props.subtitle}
        subtitleId={subtitleId}
      />
    </button>
  );
}
