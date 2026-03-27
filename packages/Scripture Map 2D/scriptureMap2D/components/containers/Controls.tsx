import type {
  ZoomLevelOptionType,
  ZoomLevelSelectorType,
  ZoomButtonType,
} from "scriptureMap2D.main.types";
import type { ZoomButtonProps } from "scriptureMap2D.main.interfaces";

import { useControls } from "scriptureMap2D.hooks.useControls";

const { useState, useMemo } = os.appHooks;
const { forwardRef } = os.appCompat;

const ZoomLevelOption: ZoomLevelOptionType = ({
  value,
  handleZoomLevelClick,
  scaleFactor,
}) => {
  const zoom = value * 100;

  const selected = useMemo<boolean>(() => {
    return value === scaleFactor;
  }, [scaleFactor, value]);

  return (
    <button
      onClick={() => {
        handleZoomLevelClick(value);
      }}
    >
      <span>{`${zoom} %`}</span>
      {selected && <span></span>}
    </button>
  );
};

const ZoomLevelSelector: ZoomLevelSelectorType = ({
  t,
  handleZoomLevelClick,
  zoomLevelSelectorRef,
  handleZoomLevelSelectorClick,
  scaleFactor,
}) => {
  const values = [1.5, 1.25, 1, 0.75, 0.5, 0.25];

  return (
    <div
      ref={zoomLevelSelectorRef}
      onClick={handleZoomLevelSelectorClick}
      className="zoom-level-selector"
    >
      <span>{t("zoomLevel")}</span>
      {values.map((value) => {
        return (
          <ZoomLevelOption
            key={value}
            value={value}
            handleZoomLevelClick={handleZoomLevelClick}
            scaleFactor={scaleFactor}
          />
        );
      })}
    </div>
  );
};

const ZoomButtonRaw: ZoomButtonType = ({ onClick, children }, ref) => {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      ref={ref}
      onPointerEnter={() => {
        setHovered(true);
      }}
      onPointerLeave={() => {
        setHovered(false);
      }}
      onClick={onClick}
      className={hovered ? "hovered" : ""}
    >
      {children}
    </button>
  );
};

const ZoomButton = forwardRef(
  ZoomButtonRaw
) as React.FunctionComponent<ZoomButtonProps>;

export const Controls = () => {
  const {
    handleZoomOutButtonClick,
    handleZoomInButtonClick,
    toggleButtonRef,
    toggleButtonClick,
    currZoom,
    showOptions,
    t,
    handleZoomLevelClick,
    zoomLevelSelectorRef,
    handleZoomLevelSelectorClick,
    scaleFactor,
  } = useControls();

  return (
    <div className="scripture-map-2d-controls">
      <div className="zoom-container">
        <ZoomButton onClick={handleZoomOutButtonClick}>
          <span className="material-symbols-outlined">remove</span>
        </ZoomButton>
        <ZoomButton ref={toggleButtonRef} onClick={toggleButtonClick}>
          <span>{`${currZoom}%`}</span>
          {showOptions && (
            <ZoomLevelSelector
              t={t}
              handleZoomLevelClick={handleZoomLevelClick}
              zoomLevelSelectorRef={zoomLevelSelectorRef}
              handleZoomLevelSelectorClick={handleZoomLevelSelectorClick}
              scaleFactor={scaleFactor}
            />
          )}
        </ZoomButton>
        <ZoomButton onClick={handleZoomInButtonClick}>
          <span className="material-symbols-outlined">add</span>
        </ZoomButton>
      </div>
    </div>
  );
};
