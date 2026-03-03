import { ScriptureMap2D } from "scriptureMap2D.main.ScriptureMap2D";
import { ScriptureMap2DModes } from "scriptureMap2D.main.enums";
import type {
  AppProps,
  ScriptureMap2DConfig,
} from "scriptureMap2D.main.interfaces";
import { BibleVizDataRepository } from "bibleVizUtils.data.BibleVizDataRepository";
import { ConvertDividedPsalmsToComplete } from "bibleVizUtils.functions.index";

const onChapterClickDependencies: unknown[] = [];
const onChapterClickAndHold = () => {};
const onBookNameClickAndHold = () => {};
const onBookNameClickAndHoldDependencies: unknown[] = [];

const { useCallback } = os.appHooks;

const App: (args: AppProps) => React.JSX.Element = ({ id }) => {
  const handleChapterClick = useCallback<
    ScriptureMap2DConfig["onChapterClick"]
  >((_, key) => {
    const { bookName, chapterIndex } = key;

    const bookInfo = BibleVizDataRepository.getBookStaticInfo(bookName);
    if (bookInfo) {
      let { abbreviation: bookId } = bookInfo;
      let chapter = chapterIndex + 1;

      if (bookName.includes("Psalms")) {
        ({ chapter } = ConvertDividedPsalmsToComplete({
          book: bookName,
          chapter,
        }));
        bookId = "PSA";
      }
      globalThis.Open(bookId, chapter);
    }
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
        config={{
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
