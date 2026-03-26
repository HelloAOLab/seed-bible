import { useSideBarContext } from "app.hooks.sideBar";
import type { SelectionOptionsType } from "scriptureMap2D.main.types";

export const SelectionOptions: SelectionOptionsType = ({
  handleDoneClick,
  handleClearSelectionClick,
}) => {
  const { t } = useSideBarContext();
  return (
    <div className="selection-options">
      <button onClick={handleClearSelectionClick}>
        <span className="material-symbols-outlined">close</span>
        {t("clearSelection")}
      </button>
      <div className="divider"></div>
      <button onClick={handleDoneClick}>
        <span className="material-symbols-outlined">check</span>
        {t("done")}
      </button>
    </div>
  );
};
