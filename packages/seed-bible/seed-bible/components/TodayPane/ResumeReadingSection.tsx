import { MaterialIcon } from "../icons";
import { Skeleton, SkeletonContainer } from "../Skeleton/Skeleton";
import { useI18n } from "../../i18n";
import type {
  TodayManager,
  TodayPassageTarget,
} from "../../managers/TodayManager";

export const ResumeReadingSection = (props: {
  today: TodayManager;
  onOpenPassage: (target: TodayPassageTarget) => void;
}) => {
  const { readingHistory, bookNames } = props.today;
  const { t } = useI18n();

  const state = readingHistory.value;
  // A resume position only exists in the `ready` state; anything else renders a
  // placeholder rather than dereferencing a value that isn't there yet. That
  // keeps a returning user on the personalized layout (never Welcome) while
  // their reading history is fetched.
  const lastReading = state.status === "ready" ? state.lastReading : undefined;

  if (!lastReading) {
    return (
      <SkeletonContainer
        label={t("resume-reading-loading", {
          defaultValue: "Loading your reading history…",
        })}
        className="sb-today-resume-card sb-today-resume-card--loading"
      >
        <div className="sb-today-resume-card-loading-text">
          <Skeleton shape="line" width="45%" />
          <Skeleton shape="line" width="60%" height="1.5rem" />
        </div>
        <Skeleton shape="circle" width="3rem" height="3rem" />
      </SkeletonContainer>
    );
  }

  return (
    <div className="sb-today-resume-card">
      <span>
        {t("resume-reading", { defaultValue: "CONTINUE WHERE YOU LEFT OFF" })}
      </span>
      <h1>
        {`${bookNames.value.get(lastReading.bookId) ?? lastReading.bookId} `}
        <span>{lastReading.chapter}</span>
      </h1>
      <button
        onClick={() =>
          props.onOpenPassage({
            bookId: lastReading.bookId,
            chapter: lastReading.chapter,
          })
        }
        className="sb-today-clickable"
      >
        <MaterialIcon>arrow_right_alt</MaterialIcon>
      </button>
    </div>
  );
};
