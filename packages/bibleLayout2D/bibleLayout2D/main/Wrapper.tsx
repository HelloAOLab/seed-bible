import { BibleLayout2DContainer } from "bibleLayout2D.main.BibleLayout2DContainer"
import { Settings } from "bibleLayout2D.main.Settings"
import { useBibleLayout2DContext } from "bibleLayout2D.main.BibleLayout2DContext"
import { Controls } from "bibleLayout2D.main.Controls"

export const Wrapper = () => {

    const {
        showLabels,
        bookWidth,
        chapterGap,
        chapterWidth,
        chapterHeight,
        

        scaleFactor
    } = useBibleLayout2DContext();
    
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
            <BibleLayout2DContainer />
            <Controls />
        </div>
    )    
}