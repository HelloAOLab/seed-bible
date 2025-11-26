import { MapContainer } from "managers.MapsManager.MapContainerComponent"
import { MapControls } from "managers.MapsManager.MapControlsComponent"
import { useMapPanelContext } from "managers.MapsManager.MapPanelContext"
const { useMemo, useCallback } = os.appHooks;

export const MapWrapper = () => {

    const { scaleFactor, showLabels } = useMapPanelContext();

    const getFixedSizeByRatio = useCallback((ratio) => {
        return `${Math.round(ratio * scaleFactor)}px`
    }, [scaleFactor])
    
    const SIZE_RATIO_2 = 0.1667;
    const SIZE_RATIO_4 = 0.334;
    const SIZE_RATIO_8 = 0.667;
    const SIZE_RATIO_12 = 1;
    const SIZE_RATIO_20 = 1.667;

    const FIXED_SIZE_2 = useMemo(() => { return getFixedSizeByRatio(SIZE_RATIO_2) }, [scaleFactor])
    const FIXED_SIZE_4 = useMemo(() => { return getFixedSizeByRatio(SIZE_RATIO_4) }, [scaleFactor])
    const FIXED_SIZE_8 = useMemo(() => { return getFixedSizeByRatio(SIZE_RATIO_8) }, [scaleFactor])
    const FIXED_SIZE_12 = useMemo(() => { return getFixedSizeByRatio(SIZE_RATIO_12) }, [scaleFactor])
    const FIXED_SIZE_20 = useMemo(() => { return getFixedSizeByRatio(SIZE_RATIO_20) }, [scaleFactor])
    const bookWidth = useMemo(() => { return getFixedSizeByRatio(MapElementMeasurements.BookScaleX) }, [scaleFactor])
    const chapterGap = useMemo(() => { return getFixedSizeByRatio(MapElementMeasurements.ChapterGap) }, [scaleFactor])
    const chapterWidth = useMemo(() => { return getFixedSizeByRatio(MapElementMeasurements.ChapterWidth) }, [scaleFactor])
    const chapterHeight = useMemo(() => { return getFixedSizeByRatio(MapElementMeasurements.ChapterHeight) }, [scaleFactor])
    
    return (
        <div 
            className={`mapWrapper${showLabels ? " showingLabels" : ""}`}
            style={{
                "--FIXED_SIZE_2": FIXED_SIZE_2,
                "--FIXED_SIZE_4": FIXED_SIZE_4,
                "--FIXED_SIZE_8": FIXED_SIZE_8,
                "--FIXED_SIZE_12": FIXED_SIZE_12,
                "--FIXED_SIZE_20": FIXED_SIZE_20,

                "--bookWidth": bookWidth,
                "--chapterGap": chapterGap,
                "--chapterWidth": chapterWidth,
                "--chapterHeight": chapterHeight
            }}
        >
            <MapContainer />
            <MapControls />
        </div>
    )    
}