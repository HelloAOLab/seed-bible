import type {} from "scriptureMap2D.main.types";

import { useControls } from "scriptureMap2D.hooks.useControls";
import type {
  MutableRef,
  Ref,
} from "../../../../../typings/AuxLibraryDefinitions";

const { useState, useMemo } = os.appHooks;
const { forwardRef } = os.appCompat;

export interface ZoomButtonProps {
  onClick: () => void;
  children: React.ReactNode;
}

export interface ZoomLevelSelectorProps {
  t: (text: string) => string;
  handleZoomLevelClick: (value: number) => void;
  zoomLevelSelectorRef: MutableRef<HTMLDivElement | null>;
  handleZoomLevelSelectorClick: (
    e: React.JSX.TargetedPointerEvent<HTMLDivElement>
  ) => void;
  scaleFactor: number;
}

export interface ZoomLevelOptionProps {
  value: number;
  handleZoomLevelClick: (value: number) => void;
  scaleFactor: number;
}

const ZoomLevelOption = ({
  value,
  handleZoomLevelClick,
  scaleFactor,
}: ZoomLevelOptionProps) => {
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

const ZoomLevelSelector = ({
  t,
  handleZoomLevelClick,
  zoomLevelSelectorRef,
  handleZoomLevelSelectorClick,
  scaleFactor,
}: ZoomLevelSelectorProps) => {
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

const ZoomButtonRaw = (
  { onClick, children }: ZoomButtonProps,
  ref: Ref<HTMLButtonElement>
) => {
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
