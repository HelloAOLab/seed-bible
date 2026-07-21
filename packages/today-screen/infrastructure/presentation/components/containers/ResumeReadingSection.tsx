import { useResumeReadingSection } from "../../hooks/useResumeReadingSection";

export interface ResumeReadingCardData {
  title: string;
  book: string;
  chapter: number;
  buttonIcon: string;
}

export const ResumeReadingSection = () => {
  const { MaterialIcon, isLoading, cardData, handleButtonClick } =
    useResumeReadingSection();

  // History still loading: show a placeholder card so a returning user sees the
  // personalized layout (never Welcome) while the resume position is fetched.
  if (isLoading || !cardData) {
    return (
      <div
        className="today-resume-card today-resume-card--loading"
        aria-hidden="true"
      >
        <span
          className="today-resume-skeleton"
          style={{ width: "45%", height: "0.75rem" }}
        />
        <span
          className="today-resume-skeleton"
          style={{ width: "60%", height: "1.5rem" }}
        />
        <span className="today-resume-skeleton today-resume-skeleton--button" />
      </div>
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
