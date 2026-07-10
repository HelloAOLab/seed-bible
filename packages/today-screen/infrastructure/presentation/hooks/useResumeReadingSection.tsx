import type { ResumeReadingCardData } from "../components/containers/ResumeReadingSection";
import { useTodayContext } from "../contexts/today/TodayContext";
import { useMemo, useCallback } from "preact/hooks";

type UseResumeReadingSection = () => {
  MaterialIcon: (props: {
    children: string;
    className?: string | undefined;
  }) => preact.JSX.Element;
  cardData: ResumeReadingCardData;
  handleButtonClick: () => void;
};

export const useResumeReadingSection: UseResumeReadingSection = () => {
  const {
    MaterialIcon,
    userLastReading,
    translate,
    bookNames,
    addTab,
    closeToday,
    getDefaultTranslation,
  } = useTodayContext();

  if (!userLastReading.value) {
    throw new Error(
      `useResumeReadingSection: userLastReading.value is undefined`
    );
  }

  const cardData = useMemo<ResumeReadingCardData>(() => {
    return {
      title: translate("resume-reading"),
      book:
        bookNames.value.get(userLastReading.value!.bookId) ??
        userLastReading.value!.bookId,
      chapter: userLastReading.value!.chapter,
      buttonIcon: "arrow_right_alt",
    };
  }, [userLastReading.value, translate, bookNames.value]);

  const handleButtonClick = useCallback(() => {
    addTab(
      userLastReading.value!.bookId,
      userLastReading.value!.chapter,
      getDefaultTranslation()
    );
    closeToday();
  }, [userLastReading.value]);

  return {
    MaterialIcon,
    cardData,
    handleButtonClick,
  };
};
