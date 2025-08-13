import { MapContainer } from "interactiveBible.managers.MapsManager.MapContainer"
import { MapSettings } from "interactiveBible.managers.MapsManager.MapSettings"
import { useMapToolContext } from "interactiveBible.managers.MapsManager.MapToolContext"
import { MapControls } from "interactiveBible.managers.MapsManager.MapControls"

export const MapWrapper = () => {

    const {
        showLabels, 
        FIXED_SIZE_POINT_TWO_FIVE,
        FIXED_SIZE_POINT_FIVE,
        FIXED_SIZE_POINT_SEVEN_FIVE,
        FIXED_SIZE_1,
        FIXED_SIZE_2, 
        FIXED_SIZE_3,
        FIXED_SIZE_4, 
        FIXED_SIZE_8, 
        FIXED_SIZE_10,
        FIXED_SIZE_12, 
        FIXED_SIZE_20,
        FIXED_SIZE_48,
        bookWidth,
        chapterGap,
        chapterWidth,
        chapterHeight
    } = useMapToolContext();
    
    return (
        <div 
            className={`mapWrapper${showLabels ? " showingLabels" : ""}`}
            style={{
                "--FIXED_SIZE_POINT_TWO_FIVE": FIXED_SIZE_POINT_TWO_FIVE,
                "--FIXED_SIZE_POINT_FIVE": FIXED_SIZE_POINT_FIVE,
                "--FIXED_SIZE_POINT_SEVEN_FIVE": FIXED_SIZE_POINT_SEVEN_FIVE,
                "--FIXED_SIZE_1": FIXED_SIZE_1,
                "--FIXED_SIZE_2": FIXED_SIZE_2,
                "--FIXED_SIZE_3": FIXED_SIZE_3,
                "--FIXED_SIZE_4": FIXED_SIZE_4,
                "--FIXED_SIZE_8": FIXED_SIZE_8,
                "--FIXED_SIZE_10": FIXED_SIZE_10,
                "--FIXED_SIZE_12": FIXED_SIZE_12,
                "--FIXED_SIZE_20": FIXED_SIZE_20,
                "--FIXED_SIZE_48": FIXED_SIZE_48,

                "--bookWidth": bookWidth,
                "--chapterGap": chapterGap,
                "--chapterWidth": chapterWidth,
                "--chapterHeight": chapterHeight,
                "--bookMaxAmountOfColumns": MapElementMeasurements.BookMaxAmountOfColumns
            }}
        >
            <MapSettings />
            <MapContainer />
            <MapControls />
        </div>
    )    
}