import type { ResumeReadingCardData } from "../components/containers/ResumeReadingSection";
import { useTodayContext } from "../contexts/today/TodayContext";
import { useMemo, useCallback } from "preact/hooks";

type UseResumeReadingSection = () => {
  MaterialIcon: (props: {
    children: string;
    className?: string | undefined;
  }) => preact.JSX.Element;
  /** True while history is still loading — render a placeholder card. */
  isLoading: boolean;
  /** The resume-card data, or `null` while loading. */
  cardData: ResumeReadingCardData | null;
  handleButtonClick: () => void;
};

export const useResumeReadingSection: UseResumeReadingSection = () => {
  const {
    MaterialIcon,
    readingHistory,
    translate,
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
      title: translate("resume-reading"),
      book: bookNames.value.get(lastReading.bookId) ?? lastReading.bookId,
      chapter: lastReading.chapter,
      buttonIcon: "arrow_right_alt",
    };
  }, [lastReading, translate, bookNames.value]);

  const handleButtonClick = useCallback(() => {
    if (!lastReading) return;
    addTab(lastReading.bookId, lastReading.chapter, getDefaultTranslation());
    closeToday();
  }, [lastReading, addTab, closeToday, getDefaultTranslation]);

  return {
    MaterialIcon,
    isLoading: state.status === "loading",
    cardData,
    handleButtonClick,
  };
};
