import type { ResumeReadingCardData } from "../components/containers/ResumeReadingSection";
import { useTodayContext } from "../contexts/today/TodayContext";
const { useMemo, useCallback } = os.appHooks;

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
  }, [userLastReading.value]);

  return {
    MaterialIcon,
    cardData,
    handleButtonClick,
  };
};
