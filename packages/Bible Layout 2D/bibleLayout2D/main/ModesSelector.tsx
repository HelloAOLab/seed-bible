import { useBibleLayout2DContext } from "bibleLayout2D.main.BibleLayout2DContext";
import { ToggleButton } from "bibleLayout2D.main.ToggleButton";

export const ModesSelector = () => {
  const { modes, handleModeButtonClick } = useBibleLayout2DContext();

  return (
    <div className="modesSelector">
      {Array.from(modes).map(([mode, enabled]) => {
        return (
          <ToggleButton
            name={mode}
            enabled={enabled}
            onClick={() => {
              handleModeButtonClick({ mode });
            }}
          />
        );
      })}
    </div>
  );
};
