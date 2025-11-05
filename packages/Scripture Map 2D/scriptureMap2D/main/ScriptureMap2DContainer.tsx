import { useScriptureMap2DContext } from "scriptureMap2D.main.ScriptureMap2DContext"
import { TestamentContainer } from "scriptureMap2D.main.TestamentContainer"

export const ScriptureMap2DContainer = () => {
    
    const { scaleFactor, arrangement } = useScriptureMap2DContext();
    
    return (
        <div className="mapContainer" >
            { arrangement.testaments.toReversed().map((testament, testamentIndex) => {
                return <TestamentContainer testament={testament} testamentIndex={testamentIndex} />
            })}
        </div>
    )
}