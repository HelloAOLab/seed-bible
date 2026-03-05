const { createContext, useRef, useState, useContext, useCallback, useEffect } =
  os.appHooks;

const MapPanelContext = createContext();

export const MapPanelProvider = ({ children }: any) => {
  const minScaleFactor = useRef(12);
  const maxScaleFactor = useRef(34);
  const [scaleFactor, setScaleFactor] = useState(minScaleFactor.current);
  const [showLabels, setShowLabels] = useState(true);
  const [showingAllChapters, setShowingAllChapters] = useState(false);
  const arrangementIndexRef = useRef(
    StacksManager.GetCurrentArrangementIndex()
  );
  const arrangementRef = useRef(
    InstanceManager.vars.fixedArrangementsInfo[arrangementIndexRef.current]
  );

  const historyUpdateListeners = useRef(new Set());
  const unsubscribeFromHistoryUpdate = useCallback((callback: any) => {
    historyUpdateListeners.current.delete(callback);
  }, []);
  const subscribeToHistoryUpdate = useCallback((callback) => {
    historyUpdateListeners.current.add(callback);
  }, []);
  globalThis.mapPanelHistoryUpdate = useCallback(() => {
    historyUpdateListeners.current.forEach((currFunction) => {
      currFunction?.();
    });
  }, []);

  const handleZoomIn = useCallback(() => {
    if (scaleFactor < maxScaleFactor.current) {
      const newValue = Math.min(maxScaleFactor.current, scaleFactor + 2);
      setScaleFactor(newValue);
    }
  }, [scaleFactor]);

  const handleZoomOut = useCallback(() => {
    if (scaleFactor > minScaleFactor.current) {
      const newValue = Math.max(minScaleFactor.current, scaleFactor - 2);
      setScaleFactor(newValue);
    }
  }, [scaleFactor]);

  const handleLabelsToggle = useCallback(() => {
    setShowLabels((prev) => !prev);
  }, []);

  const handleShowAllChaptersToggle = useCallback(() => {
    setShowingAllChapters((prev) => !prev);
  }, []);

  useEffect(() => {
    return () => {
      globalThis.mapPanelHistoryUpdate = null;
    };
  }, []);

  return (
    <MapPanelContext.Provider
      value={{
        scaleFactor,
        showLabels,
        handleZoomIn,
        handleZoomOut,
        handleLabelsToggle,
        arrangementIndexRef,
        arrangementRef,
        handleShowAllChaptersToggle,
        showingAllChapters,
        unsubscribeFromHistoryUpdate,
        subscribeToHistoryUpdate,
      }}
    >
      {children}
    </MapPanelContext.Provider>
  );
};

export const useMapPanelContext = () => {
  return useContext(MapPanelContext);
};
