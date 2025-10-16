import { ScriptureMap2DContainer } from "scriptureMap2D.main.ScriptureMap2DContainer"
import { Settings } from "scriptureMap2D.main.Settings"
import { useScriptureMap2DContext } from "scriptureMap2D.main.ScriptureMap2DContext"
import { Controls } from "scriptureMap2D.main.Controls"

export const Wrapper = () => {

    const {
        showLabels,
        bookWidth,
        chapterGap,
        chapterWidth,
        chapterHeight,
        scaleFactor
    } = useScriptureMap2DContext();
    
    return (
        <div 
            className={`mapWrapper${showLabels ? " showingLabels" : ""}`}
            style={{
                "--scaleFactor": scaleFactor,
                "--bookWidth": `${bookWidth}px`,
                "--chapterGap": `${chapterGap}px`,
                "--chapterWidth": `${chapterWidth}px`,
                "--chapterHeight": `${chapterHeight}px`,
                "--bookMaxAmountOfColumns": BibleVizUtils.Data.tags.BibleLayoutMeasurements.Book2DMaxAmountOfColumns
            }}
        >
            <Settings />
            <ScriptureMap2DContainer />
            <Controls />
        </div>
    )    
}