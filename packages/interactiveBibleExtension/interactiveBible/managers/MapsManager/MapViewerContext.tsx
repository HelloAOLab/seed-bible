const { createContext, useContext } = os.appHooks;

export const MapViewerContext = createContext();

export const useMapViewerContext = () => {
    return useContext(MapViewerContext);
}