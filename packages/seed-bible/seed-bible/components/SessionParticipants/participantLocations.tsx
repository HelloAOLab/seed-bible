import "./participantLocations.css";
import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import type {
  BibleReadingSession,
  ConnectedSessionUser,
} from "../../managers/SessionsManager";
import { useI18n } from "../../i18n/I18nManager";
import { Button } from "../Button/Button";

/**
 * Display name for a book id in the session reader's translation, falling
 * back to the id while that translation's book list is still loading.
 */
export function resolveSessionBookName(
  session: BibleReadingSession,
  bookId: string | null | undefined
): string {
  if (!bookId) {
    return "";
  }
  const book = session.readingState.translationBooks.value?.books.find(
    (b) => b.id === bookId
  );
  return book?.name ?? book?.commonName ?? bookId;
}

/** "John 3" for the chapter the group is on, or null before it has one. */
export function sessionGroupPassage(
  session: BibleReadingSession
): string | null {
  const group = session.groupPosition.value;
  if (!group.bookId || !group.chapterNumber) {
    return null;
  }
  return `${resolveSessionBookName(session, group.bookId)} ${group.chapterNumber}`;
}

export interface ParticipantLocation {
  /** Reading a different chapter from the group. */
  isElsewhere: boolean;
  /** "Romans 8:12–18" (or "Romans 8" before verses are known), when known. */
  passage: string | null;
}

/**
 * Where `user` is reading relative to the group. Whether they count as
 * elsewhere comes from `session.participantsAwayFromGroup`.
 */
export function getParticipantLocation(
  session: BibleReadingSession,
  user: ConnectedSessionUser
): ParticipantLocation {
  const position = user.isSelf
    ? {
        bookId: session.readingState.bookId.value,
        chapterNumber: session.readingState.chapterNumber.value,
        firstVerse: session.readingState.visibleVerseRange.value?.first,
        lastVerse: session.readingState.visibleVerseRange.value?.last,
      }
    : session.participantPositions.value.get(user.connectionId);
  if (!position?.bookId || !position.chapterNumber) {
    return { isElsewhere: false, passage: null };
  }

  const isElsewhere = session.participantsAwayFromGroup.value.has(
    user.connectionId
  );

  let passage = `${resolveSessionBookName(session, position.bookId)} ${position.chapterNumber}`;
  const { firstVerse, lastVerse } = position;
  if (firstVerse !== undefined && lastVerse !== undefined) {
    passage +=
      firstVerse === lastVerse
        ? `:${firstVerse}`
        : `:${firstVerse}–${lastVerse}`;
  }
  return { isElsewhere, passage };
}

/**
 * A host's "Ask to come back" for one participant. Once asked it shows
 * "Asked" and can't be pressed again until the cooldown runs out (see
 * `comeBackCooldownRemainingMs`).
 */
export function AskToComeBackButton({
  session,
  user,
}: {
  session: BibleReadingSession;
  user: ConnectedSessionUser;
}) {
  const { t } = useI18n();
  // Bumped when the cooldown ends, so the button comes back without waiting
  // for some unrelated re-render.
  const cooldownEnded = useSignal(0);
  void cooldownEnded.value;

  const remainingMs = session.comeBackCooldownRemainingMs(user.connectionId);
  const isCoolingDown = remainingMs > 0;

  // Re-armed on every render, so a timer that fires with time still left
  // sets another rather than leaving the button stuck on "Asked".
  useEffect(() => {
    if (!isCoolingDown) {
      return;
    }
    const timer = setTimeout(() => {
      cooldownEnded.value++;
    }, remainingMs);
    return () => clearTimeout(timer);
  });

  if (isCoolingDown) {
    return (
      <Button
        variant="secondary"
        size="sm"
        shape="pill"
        icon="check"
        className="sb-ask-come-back"
        disabled
      >
        {t("session-asked-to-come-back", { defaultValue: "Asked" })}
      </Button>
    );
  }

  return (
    <Button
      variant="secondary"
      size="sm"
      shape="pill"
      className="sb-ask-come-back"
      onClick={() => session.askToComeBack(user.connectionId)}
    >
      {t("session-ask-to-come-back", { defaultValue: "Ask to come back" })}
    </Button>
  );
}
