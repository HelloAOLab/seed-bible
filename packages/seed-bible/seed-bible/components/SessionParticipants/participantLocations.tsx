import "./participantLocations.css";
import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import {
  comeBackRequestCooldownRemainingMs,
  type BibleReadingSession,
  type ConnectedSessionUser,
} from "../../managers/SessionsManager";
import { useI18n } from "../../i18n/I18nManager";
import { MaterialIcon } from "../icons";

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
 * Where `user` is reading relative to the group. Anyone whose position isn't
 * known yet counts as with the group, rather than being guessed elsewhere.
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

  const group = session.groupPosition.value;
  const isElsewhere =
    !!group.bookId &&
    !!group.chapterNumber &&
    (position.bookId !== group.bookId ||
      position.chapterNumber !== group.chapterNumber);

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
 * "Asked" and can't be pressed again until the cooldown runs out — counted
 * from the shared request, so every host sees the same wait.
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

  const request = session.comeBackRequests.value.get(user.connectionId);
  const remainingMs = comeBackRequestCooldownRemainingMs(request, Date.now());
  const isCoolingDown = remainingMs > 0;

  useEffect(() => {
    if (!isCoolingDown) {
      return;
    }
    const timer = setTimeout(() => {
      cooldownEnded.value++;
    }, remainingMs);
    return () => clearTimeout(timer);
  }, [request?.id, isCoolingDown]);

  if (isCoolingDown) {
    return (
      <button
        type="button"
        className="sb-ask-come-back sb-ask-come-back-asked"
        disabled
      >
        <MaterialIcon className="sb-ask-come-back-icon" aria-hidden="true">
          check
        </MaterialIcon>
        {t("session-asked-to-come-back", { defaultValue: "Asked" })}
      </button>
    );
  }

  return (
    <button
      type="button"
      className="sb-ask-come-back"
      onClick={() => session.askToComeBack(user.connectionId)}
    >
      {t("session-ask-to-come-back", { defaultValue: "Ask to come back" })}
    </button>
  );
}
