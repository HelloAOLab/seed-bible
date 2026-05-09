import { useTestamentToggle } from "scriptureMap2D.hooks.useTestamentToggle";

export interface TestamentToggleProps {
  toggleshowContent: () => void;
  showingContent: boolean;
}

export const TestamentToggle = ({
  toggleshowContent,
  showingContent,
}: TestamentToggleProps) => {
  const { toggleDescriptionContent, toggleTitleContent, toggleArrowContent } =
    useTestamentToggle({ showingContent });

  return (
    <div className="toggle toggle-testament" onClick={toggleshowContent}>
      <span className="toggle-title">{toggleTitleContent}</span>
      <span className="toggle-description">{toggleDescriptionContent}</span>
      <span className="material-symbols-outlined toggle-arrow">
        {toggleArrowContent}
      </span>
    </div>
  );
};
