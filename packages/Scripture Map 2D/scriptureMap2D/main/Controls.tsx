import { useScriptureMap2DContext } from "scriptureMap2D.main.ScriptureMap2DContext";

const { useSideBarContext } = await import("app.hooks.sideBar");

const { useState, useCallback, useMemo, useRef, useEffect } = os.appHooks;
const { forwardRef } = os.appCompat;

const ZoomLevelOption = ({ value, handleZoomLevelClick }) => {
  const { scaleFactor } = useScriptureMap2DContext();

  const zoom = useMemo(() => {
    return value * 100;
  }, [scaleFactor]);

  const selected = useMemo(() => {
    return value === scaleFactor;
  }, [scaleFactor]);

  return (
    <button
      onClick={(e) => {
        handleZoomLevelClick(e, value);
      }}
    >
      <span>{`${zoom} %`}</span>
      {selected && <span></span>}
    </button>
  );
};

const ZoomLevelSelector = ({ setShowOptions, toggleButtonRef }) => {
  const { t } = useSideBarContext();
  const { setScaleFactor } = useScriptureMap2DContext();
  const containerRef = useRef(null);

  const handleZoomLevelClick = useCallback((e, value) => {
    setShowOptions(false);
    setScaleFactor(value);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target) &&
        toggleButtonRef.current &&
        !toggleButtonRef.current.contains(e.target)
      ) {
        setShowOptions(false);
      }
    };

    const handleFocusOutside = (e) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target) &&
        toggleButtonRef.current &&
        !toggleButtonRef.current.contains(e.target)
      ) {
        setShowOptions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("focusin", handleFocusOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("focusin", handleFocusOutside);
    };
  }, [setShowOptions]);

  return (
    <div
      ref={containerRef}
      onClick={(e) => {
        e.stopPropagation();
      }}
      className="zoom-level-selector"
    >
      <span>{t("zoomLevel")}</span>
      <ZoomLevelOption
        value={1.5}
        handleZoomLevelClick={handleZoomLevelClick}
      />
      <ZoomLevelOption
        value={1.25}
        handleZoomLevelClick={handleZoomLevelClick}
      />
      <ZoomLevelOption value={1} handleZoomLevelClick={handleZoomLevelClick} />
      <ZoomLevelOption
        value={0.75}
        handleZoomLevelClick={handleZoomLevelClick}
      />
      <ZoomLevelOption
        value={0.5}
        handleZoomLevelClick={handleZoomLevelClick}
      />
      <ZoomLevelOption
        value={0.25}
        handleZoomLevelClick={handleZoomLevelClick}
      />
    </div>
  );
};

const ZoomButton = forwardRef(({ onClick, children }, ref) => {
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
});

export const Controls = () => {
  const { scaleFactor } = useScriptureMap2DContext();

  const currZoom = useMemo(() => {
    return Math.round(scaleFactor * 100);
  }, [scaleFactor]);

  const [showOptions, setShowOptions] = useState(false);

  const { handleZoomIn, handleZoomOut } = useScriptureMap2DContext();

  const toggleButtonRef = useRef(null);

  return (
    <div className="scripture-map-2d-controls">
      <div className="zoom-container">
        <ZoomButton onClick={handleZoomOut}>
          <span className="material-symbols-outlined">remove</span>
        </ZoomButton>
        <ZoomButton
          ref={toggleButtonRef}
          onClick={() => {
            setShowOptions((prev) => !prev);
          }}
        >
          <span>{`${currZoom}%`}</span>
          {showOptions && (
            <ZoomLevelSelector
              toggleButtonRef={toggleButtonRef}
              setShowOptions={setShowOptions}
            />
          )}
        </ZoomButton>
        <ZoomButton onClick={handleZoomIn}>
          <span className="material-symbols-outlined">add</span>
        </ZoomButton>
      </div>
    </div>
  );
};
