import { useBibleLayout2DContext } from "bibleLayout2D.main.BibleLayout2DContext"
import { TestamentContainer } from "bibleLayout2D.main.TestamentContainer"

export const BibleLayout2DContainer = () => {
    
    const { arrangement } = useBibleLayout2DContext();
    
    return (
        <div className="layoutContainer" >
            { arrangement.testaments.toReversed().map((testament, testamentIndex) => {
                return <TestamentContainer testament={testament} testamentIndex={testamentIndex} />
            })}
        </div>
    )
}