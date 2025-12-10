import {
  ScriptureMap2D,
  ScriptureMap2DModes,
} from "scriptureMap2D.main.ScriptureMap2D";

const { useCallback, useMemo } = os.appHooks;

const App = () => {
  const handleChapterClick = useCallback((_, key) => {
    const { bookName, chapterIndex } = key;

    let bookId = BibleVizUtils.Data.tags.booksStaticInfo[bookName].abbreviation;
    let chapter = chapterIndex + 1;

    if (bookName.includes("Psalms")) {
      ({ chapter } = BibleVizUtils.Functions.ConvertDividedPsalmsToComplete({
        book: bookName,
        chapter,
      }));
      bookId = "PSA";
    }
    globalThis.Open(bookId, chapter);
  }, []);

  const {
    onChapterClickDependencies,
    onChapterClickAndHold,
    onBookNameClickAndHold,
    onBookNameClickAndHoldDependencies,
  } = useMemo(() => {
    return {
      onChapterClickDependencies: [],
      onChapterClickAndHold: () => {},
      onBookNameClickAndHold: () => {},
      onBookNameClickAndHoldDependencies: [],
    };
  }, []);

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexGrow: "1",
        flexDirection: "column",
        backgroundColor: "white",
      }}
    >
      <ScriptureMap2D
        parentContext={{
          mode: ScriptureMap2DModes.Viewer,
          // selection,
          // isInSelectionMode,
          onChapterClick: handleChapterClick,
          onChapterClickDependencies,
          onChapterClickAndHold,
          onBookNameClickAndHold,
          onBookNameClickAndHoldDependencies,
          // project,
          // selectedChaptersKeys,
          // onSelectionModeCheckboxClick: handleSelectionModeCheckboxClick,
          // onSelectionModeDoneButtonClick: handleSelectionModeDoneButtonClick,
          // onStateSetterOptionClick: handleStateSetterOptionClick,
          // onSelectionModeClearSelectionButtonClick: clearSelection,
          showingAllChapters: true, // !menuState.areBooksClosed,
          showLabels: true, // !menuState.hideHeadings,
          initialScaleFactor: 0.6,
          initialIsReadingHistoryEnabled: true,
        }}
      />
    </div>
  );
};

return App;
