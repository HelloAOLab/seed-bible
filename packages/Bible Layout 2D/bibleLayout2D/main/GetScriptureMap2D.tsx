import {BibleLayout2D, BibleLayout2DModes} from "bibleLayout2D.main.BibleLayout2D"

const App = () => {
    return (
        <div style={{
            height: "100%",
            display: "flex",
            flexGrow: "1",
            flexDirection: "column",
            padding: "20px 0",
            backgroundColor: "white"
        }}>
            <BibleLayout2D parentContext={{
                mode: BibleLayout2DModes.Viewer,
                arrangementIndex: 0,
                // selection,
                // isInSelectionMode,
                onChapterClick: () => {},
                onChapterClickDependencies: [],
                onChapterClickAndHold: () => {},
                onBookNameClickAndHold: () => {},
                onBookNameClickAndHoldDependencies: [],
                // project,
                // selectedChaptersKeys,
                // onSelectionModeCheckboxClick: handleSelectionModeCheckboxClick,
                // onSelectionModeDoneButtonClick: handleSelectionModeDoneButtonClick,
                // onStateSetterOptionClick: handleStateSetterOptionClick,
                // onSelectionModeClearSelectionButtonClick: clearSelection,
                showingAllChapters: false, // !menuState.areBooksClosed,
                showLabels: true, // !menuState.hideHeadings,
                initialScaleFactor: 0.5,
                initialIsReadingHistoryEnabled: true
            }} />
        </div>
    )
}

return App;