import { useResumeReadingSection } from "../../hooks/useResumeReadingSection";

export interface ResumeReadingCardData {
  title: string;
  book: string;
  chapter: number;
  buttonIcon: string;
}

export const ResumeReadingSection = () => {
  const { MaterialIcon, cardData, handleButtonClick } =
    useResumeReadingSection();

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
