import { useMapToolContext } from "interactiveBible.managers.MapsManager.MapToolContext"
import { TestamentContainer } from "interactiveBible.managers.MapsManager.TestamentContainer"

export const MapContainer = () => {
    
    const { scaleFactor, arrangement } = useMapToolContext();
    
    return (
        <div className="mapContainer" style={{gap: `${Math.round(0.667 * scaleFactor)}px`}} >
            { arrangement.testaments.toReversed().map((testament, testamentIndex) => {
                return <TestamentContainer testament={testament} testamentIndex={testamentIndex} />
            })}
        </div>
    )
}