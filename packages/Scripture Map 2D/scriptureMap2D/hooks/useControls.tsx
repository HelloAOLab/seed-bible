import { useScriptureMap2DContext } from "scriptureMap2D.contexts.ScriptureMap2D.ScriptureMap2DContext";
import type {
  MutableRef,
  StateUpdater,
} from "../../../../typings/AuxLibraryDefinitions";
import { useSideBarContext } from "app.hooks.sideBar";
import type { ZoomLevelSelectorProps } from "scriptureMap2D.components.containers.Controls";
import type { ScriptureMap2DContextType } from "scriptureMap2D.contexts.ScriptureMap2D.ScriptureMap2DContext";

interface UseControlsType {
  handleZoomOutButtonClick: () => void;
  handleZoomInButtonClick: () => void;
  toggleButtonRef: MutableRef<HTMLButtonElement | null>;
  toggleButtonClick: () => void;
  currZoom: number;
  showOptions: boolean;
  t: ZoomLevelSelectorProps["t"];
  handleZoomLevelClick: ZoomLevelSelectorProps["handleZoomLevelClick"];
  zoomLevelSelectorRef: MutableRef<HTMLDivElement | null>;
  handleZoomLevelSelectorClick: ZoomLevelSelectorProps["handleZoomLevelSelectorClick"];
  scaleFactor: ScriptureMap2DContextType["scaleFactor"];
}

type UseControls = () => UseControlsType;

const { useMemo, useState, useRef, useCallback, useEffect } = os.appHooks;

export const useControls: UseControls = () => {
  const { scaleFactor, setScaleFactor } = useScriptureMap2DContext();

  const currZoom = useMemo(() => {
    return Math.round(scaleFactor * 100);
  }, [scaleFactor]);

  const [showOptions, setShowOptions] = useState<boolean>(false);

  const { handleZoomIn, handleZoomOut } = useScriptureMap2DContext();

  const toggleButtonRef = useRef<HTMLButtonElement | null>(null);

  const toggleButtonClick = useCallback(() => {
    setShowOptions((prev) => !prev);
  }, [setShowOptions]);

  const { t } = useSideBarContext() as { t: ZoomLevelSelectorProps["t"] };

  const handleZoomLevelClick = useCallback<(value: number) => void>(
    (value) => {
      setShowOptions(false);
      setScaleFactor(value);
    },
    [setShowOptions, setScaleFactor]
  );

  const zoomLevelSelectorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleOutsideInteraction = (e: FocusEvent | MouseEvent) => {
      if (
        zoomLevelSelectorRef.current &&
        !zoomLevelSelectorRef.current.contains(e.target as Node) &&
        toggleButtonRef.current &&
        !toggleButtonRef.current.contains(e.target as Node)
      ) {
        setShowOptions(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideInteraction);
    document.addEventListener("focusin", handleOutsideInteraction);

    return () => {
      document.removeEventListener("mousedown", handleOutsideInteraction);
      document.removeEventListener("focusin", handleOutsideInteraction);
    };
  }, [setShowOptions]);

  const handleZoomLevelSelectorClick = useCallback<
    UseControlsType["handleZoomLevelSelectorClick"]
  >((e) => {
    e.stopPropagation();
  }, []);

  return {
    handleZoomOutButtonClick: handleZoomOut,
    handleZoomInButtonClick: handleZoomIn,
    toggleButtonRef,
    toggleButtonClick,
    currZoom,
    showOptions,
    t,
    handleZoomLevelClick,
    zoomLevelSelectorRef,
    handleZoomLevelSelectorClick,
    scaleFactor,
  };
};
