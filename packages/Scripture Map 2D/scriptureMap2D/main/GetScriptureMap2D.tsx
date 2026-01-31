import {
  ScriptureMap2D,
  ScriptureMap2DModes,
} from "scriptureMap2D.main.ScriptureMap2D";

const onChapterClickDependencies = [];
const onChapterClickAndHold = () => {};
const onBookNameClickAndHold = () => {};
const onBookNameClickAndHoldDependencies = [];

const { useCallback } = os.appHooks;

const App = ({ id }) => {
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
          onChapterClick: handleChapterClick,
          onChapterClickDependencies,
          onChapterClickAndHold,
          onBookNameClickAndHold,
          onBookNameClickAndHoldDependencies,
          initialShowingAllChapters: true,
          initialShowTestamentLabels: true,
          initialShowSectionLabels: false,
          initialScaleFactor: 0.6,
          initialIsReadingHistoryEnabled: false,
          appId: id,
        }}
      />
    </div>
  );
};

return App;
