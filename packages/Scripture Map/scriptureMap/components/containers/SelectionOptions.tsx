import { useSelectionOptions } from "scriptureMap.hooks.useSelectionOptions";

export interface SelectionOptionsProps {
  handleClearSelectionClick: () => void;
  handleDoneClick: () => void;
}

export const SelectionOptions = ({
  handleDoneClick,
  handleClearSelectionClick,
}: SelectionOptionsProps) => {
  const { clearSelectionContent, acceptSelectionContent } =
    useSelectionOptions();

  return (
    <div className="selection-options">
      <button onClick={handleClearSelectionClick}>
        <span className="material-symbols-outlined">close</span>
        {clearSelectionContent}
      </button>
      <div className="divider"></div>
      <button onClick={handleDoneClick}>
        <span className="material-symbols-outlined">check</span>
        {acceptSelectionContent}
      </button>
    </div>
  );
};
