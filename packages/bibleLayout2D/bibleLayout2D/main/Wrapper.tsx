import { BibleLayout2DContainer } from "bibleLayout2D.main.BibleLayout2DContainer"
import { Settings } from "bibleLayout2D.main.Settings"
import { useBibleLayout2DContext } from "bibleLayout2D.main.BibleLayout2DContext"
import { Controls } from "bibleLayout2D.main.Controls"

export const Wrapper = () => {

    const {
        showLabels, 
        fixedSize,
        bookWidth,
        chapterGap,
        chapterWidth,
        chapterHeight
    } = useBibleLayout2DContext();
    
    return (
        <div 
            className={`mapWrapper${showLabels ? " showingLabels" : ""}`}
            style={{
                "--FIXED_SIZE_POINT_TWO_FIVE": fixedSize["0.25"],
                "--FIXED_SIZE_POINT_FIVE": fixedSize["0.5"],
                "--FIXED_SIZE_POINT_SEVEN_FIVE": fixedSize["0.75"],
                "--FIXED_SIZE_1": fixedSize[1],
                "--FIXED_SIZE_2": fixedSize[2],
                "--FIXED_SIZE_3": fixedSize[3],
                "--FIXED_SIZE_4": fixedSize[4],
                "--FIXED_SIZE_8": fixedSize[8],
                "--FIXED_SIZE_10": fixedSize[10],
                "--FIXED_SIZE_12": fixedSize[12],
                "--FIXED_SIZE_20": fixedSize[20],
                "--FIXED_SIZE_48": fixedSize[48],

                "--bookWidth": bookWidth,
                "--chapterGap": chapterGap,
                "--chapterWidth": chapterWidth,
                "--chapterHeight": chapterHeight,
                "--bookMaxAmountOfColumns": BibleVizUtils.Data.tags.BibleLayoutMeasurements.Book2DMaxAmountOfColumns
            }}
        >
            <Settings />
            <BibleLayout2DContainer />
            <Controls />
        </div>
    )    
}