import { useSignal } from "@preact/signals";
import { useEffect, useMemo } from "preact/hooks";
import { MaterialIcon } from "../icons";
import { Skeleton, SkeletonContainer } from "../Skeleton/Skeleton";
import { TitledSection } from "./TitledSection";
import { useTimeContext } from "./TimeContext";
import { useI18n } from "../../i18n";
import type {
  TodayManager,
  TodayPassageTarget,
  TodayVerseOfTheDay,
} from "../../managers/TodayManager";

type VerseOfTheDayState =
  | { status: "loading" }
  | { status: "ready"; verse: TodayVerseOfTheDay }
  | { status: "unavailable" };

/** The local calendar date as `YYYY-MM-DD`, the form the verse is picked by. */
function localDateKey(time: number): string {
  const date = new Date(time);
  return [
    String(date.getFullYear()).padStart(4, "0"),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

/**
 * The verse of the day, in the translation the reader has open. Tapping it
 * opens the passage.
 *
 * Hidden when there's no verse to show — the request failed, or the reader's
 * translation doesn't contain the verse — rather than showing an error for
 * something the user didn't ask for.
 */
export const VerseOfTheDaySection = (props: {
  today: TodayManager;
  onOpenPassage: (target: TodayPassageTarget) => void;
}) => {
  const { getVerseOfTheDay, lastTranslationId, getDefaultTranslation } =
    props.today;
  const { t } = useI18n();
  // `TimeProvider` ticks every ten seconds, so the verse turns over at local
  // midnight while Today is left open.
  const { tick } = useTimeContext();
  const date = useMemo(() => localDateKey(tick), [tick]);
  const translationId = lastTranslationId.value ?? getDefaultTranslation();

  const state = useSignal<VerseOfTheDayState>({ status: "loading" });

  useEffect(() => {
    if (!translationId) {
      state.value = { status: "unavailable" };
      return;
    }

    let isActive = true;
    state.value = { status: "loading" };
    getVerseOfTheDay(date, translationId).then(
      (verse) => {
        if (!isActive) return;
        state.value = verse
          ? { status: "ready", verse }
          : { status: "unavailable" };
      },
      (error: unknown) => {
        if (!isActive) return;
        console.warn(
          "[VerseOfTheDaySection] Could not load the verse of the day.",
          error
        );
        state.value = { status: "unavailable" };
      }
    );

    return () => {
      isActive = false;
    };
  }, [date, translationId]);

  const current = state.value;
  if (current.status === "unavailable") {
    return null;
  }

  const title = t("verse-of-the-day", { defaultValue: "Verse of the day" });

  if (current.status === "loading") {
    return (
      <TitledSection title={title}>
        <SkeletonContainer
          label={t("verse-of-the-day-loading", {
            defaultValue: "Loading the verse of the day…",
          })}
          className="sb-today-verse-of-the-day-card"
        >
          <Skeleton shape="line" width="90%" />
          <Skeleton shape="line" width="70%" />
          <Skeleton shape="line" width="30%" />
        </SkeletonContainer>
      </TitledSection>
    );
  }

  const { verse } = current;
  const bookName =
    props.today.bookNames.value.get(verse.bookId) ?? verse.bookId;
  const reference = `${bookName} ${verse.chapter}:${verse.verse}${
    verse.endVerse !== undefined ? `–${verse.endVerse}` : ""
  }`;

  return (
    <TitledSection title={title}>
      {/* Only the reference is a button: Today turns off text selection in its
          buttons, and the verse itself should stay copyable. */}
      <div className="sb-today-verse-of-the-day-card">
        <blockquote className="sb-today-verse-of-the-day-text">
          {verse.text}
        </blockquote>
        <button
          type="button"
          className="sb-today-verse-of-the-day-reference sb-today-clickable"
          onClick={() =>
            props.onOpenPassage({
              bookId: verse.bookId,
              chapter: verse.chapter,
              verse: verse.verse,
              translationId: verse.translationId,
            })
          }
        >
          {reference}
          <MaterialIcon>arrow_right_alt</MaterialIcon>
        </button>
      </div>
    </TitledSection>
  );
};
