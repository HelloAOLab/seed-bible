import { useBibleLayout2DContext } from "bibleLayout2D.main.BibleLayout2DContext"
import { TestamentContainer } from "bibleLayout2D.main.TestamentContainer"

export const BibleLayout2DContainer = () => {
    
    const { scaleFactor, arrangement } = useBibleLayout2DContext();
    
    return (
        <div className="mapContainer" style={{gap: `${Math.round(0.667 * scaleFactor)}px`}} >
            { arrangement.testaments.toReversed().map((testament, testamentIndex) => {
                return <TestamentContainer testament={testament} testamentIndex={testamentIndex} />
            })}
        </div>
    )
}