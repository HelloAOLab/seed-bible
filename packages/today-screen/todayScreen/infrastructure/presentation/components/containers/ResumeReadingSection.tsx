import { useResumeReadingSection } from "../../hooks/useResumeReadingSection";

export const ResumeReadingSection = () => {
  const { MaterialIcon } = useResumeReadingSection();
  return (
    <div className="today-resume-card">
      <span>CONTINUE WHERE YOU LEFT</span>
      <h1>
        Genesis <span>2</span>
      </h1>
      <button>
        <MaterialIcon>arrow_right_alt</MaterialIcon>
      </button>
    </div>
  );
};
