import { useScriptureMapContext } from "scriptureMap.contexts.ScriptureMap.ScriptureMapContext";
import type { MutableRef } from "../../../../typings/AuxLibraryDefinitions";
import type { ZoomLevelSelectorProps } from "scriptureMap.components.containers.Controls";
import type { ScriptureMapContextType } from "scriptureMap.contexts.ScriptureMap.ScriptureMapContext";

interface UseControlsType {
  handleZoomOutButtonClick: () => void;
  handleZoomInButtonClick: () => void;
  toggleButtonRef: MutableRef<HTMLButtonElement | null>;
  toggleButtonClick: () => void;
  currZoom: number;
  showOptions: boolean;
  zoomLevelSelectorTitle: string;
  handleZoomLevelClick: ZoomLevelSelectorProps["handleZoomLevelClick"];
  zoomLevelSelectorRef: MutableRef<HTMLDivElement | null>;
  handleZoomLevelSelectorClick: ZoomLevelSelectorProps["handleZoomLevelSelectorClick"];
  scaleFactor: ScriptureMapContextType["scaleFactor"];
}

type UseControls = () => UseControlsType;

const { useMemo, useState, useRef, useCallback, useEffect } = os.appHooks;

export const useControls: UseControls = () => {
  const { scaleFactor, setScaleFactor, translate, CapitalizeFirstLetter } =
    useScriptureMapContext();

  const currZoom = useMemo(() => {
    return Math.round(scaleFactor * 100);
  }, [scaleFactor]);

  const [showOptions, setShowOptions] = useState<boolean>(false);

  const { handleZoomIn, handleZoomOut } = useScriptureMapContext();

  const toggleButtonRef = useRef<HTMLButtonElement | null>(null);

  const toggleButtonClick = useCallback(() => {
    setShowOptions((prev) => !prev);
  }, [setShowOptions]);

  const zoomLevelSelectorTitle = useMemo(() => {
    return translate
      ? CapitalizeFirstLetter(translate("zoom-level"))
      : "Zoom level";
  }, [translate]);

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
    zoomLevelSelectorTitle,
    handleZoomLevelClick,
    zoomLevelSelectorRef,
    handleZoomLevelSelectorClick,
    scaleFactor,
  };
};
