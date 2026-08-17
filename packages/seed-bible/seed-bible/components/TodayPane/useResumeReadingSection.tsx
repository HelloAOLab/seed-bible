import type { ResumeReadingCardData } from "./ResumeReadingSection";
import { useTodayContext } from "./TodayContext";
import { useMemo, useCallback } from "preact/hooks";

type UseResumeReadingSection = () => {
  /** True while history is still loading — render a placeholder card. */
  isLoading: boolean;
  /** Already-translated status announced by the loading placeholder. */
  loadingLabel: string;
  /** The resume-card data, or `null` while loading. */
  cardData: ResumeReadingCardData | null;
  handleButtonClick: () => void;
};

export const useResumeReadingSection: UseResumeReadingSection = () => {
  const {
    readingHistory,
    t,
    bookNames,
    addTab,
    closeToday,
    getDefaultTranslation,
  } = useTodayContext();

  const state = readingHistory.value;
  // A resume position only exists in the `ready` state; in `loading` we render
  // a placeholder instead of dereferencing a value that isn't there yet.
  const lastReading = state.status === "ready" ? state.lastReading : undefined;

  const cardData = useMemo<ResumeReadingCardData | null>(() => {
    if (!lastReading) return null;
    return {
      title: t("resume-reading", {
        defaultValue: "CONTINUE WHERE YOU LEFT",
      }),
      book: bookNames.value.get(lastReading.bookId) ?? lastReading.bookId,
      chapter: lastReading.chapter,
      buttonIcon: "arrow_right_alt",
    };
  }, [lastReading, t, bookNames.value]);

  const handleButtonClick = useCallback(() => {
    if (!lastReading) return;
    addTab(lastReading.bookId, lastReading.chapter, getDefaultTranslation());
    closeToday();
  }, [lastReading, addTab, closeToday, getDefaultTranslation]);

  return {
    isLoading: state.status === "loading",
    loadingLabel: t("resume-reading-loading", {
      defaultValue: "Loading your reading history…",
    }),
    cardData,
    handleButtonClick,
  };
};
