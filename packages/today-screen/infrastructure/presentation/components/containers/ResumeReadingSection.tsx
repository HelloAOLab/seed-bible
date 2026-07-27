import { useResumeReadingSection } from "../../hooks/useResumeReadingSection";

export interface ResumeReadingCardData {
  title: string;
  book: string;
  chapter: number;
  buttonIcon: string;
}

export const ResumeReadingSection = () => {
  const {
    MaterialIcon,
    Skeleton,
    SkeletonContainer,
    isLoading,
    loadingLabel,
    cardData,
    handleButtonClick,
  } = useResumeReadingSection();

  // History still loading: show a placeholder card so a returning user sees the
  // personalized layout (never Welcome) while the resume position is fetched.
  if (isLoading || !cardData) {
    return (
      <SkeletonContainer
        label={loadingLabel}
        className="today-resume-card today-resume-card--loading"
      >
        <div className="today-resume-card-loading-text">
          <Skeleton shape="line" width="45%" />
          <Skeleton shape="line" width="60%" height="1.5rem" />
        </div>
        <Skeleton shape="circle" width="3rem" height="3rem" />
      </SkeletonContainer>
    );
  }

  return (
    <div className="today-resume-card">
      <span>{cardData.title}</span>
      <h1>
        {`${cardData.book} `}
        <span>{cardData.chapter}</span>
      </h1>
      <button onClick={handleButtonClick} className="clickable">
        <MaterialIcon>{cardData.buttonIcon}</MaterialIcon>
      </button>
    </div>
  );
};
