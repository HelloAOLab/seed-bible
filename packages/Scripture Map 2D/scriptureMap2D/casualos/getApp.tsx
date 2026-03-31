import {
  ScriptureMap2D,
  type ScriptureMap2DConfig,
} from "scriptureMap2D.components.ScriptureMap2D";
import { ScriptureMap2DModes } from "scriptureMap2D.models.scriptureMap";
import { BibleVizDataRepository } from "bibleVizUtils.data.BibleVizDataRepository";
import { scriptureService } from "bibleVizUtils.services.index";
import { getCustomStyles } from "scriptureMap2D.styles.adapter";

const { useCallback, useMemo } = os.appHooks;

interface AppProps {
  id: string;
}

const App = ({ id }: AppProps) => {
  const handleChapterClick = useCallback<
    ScriptureMap2DConfig["onChapterClick"]
  >((_, key) => {
    const { bookName, chapterIndex } = key;

    const bookInfo = BibleVizDataRepository.getBookStaticInfo(bookName);
    if (bookInfo) {
      let { abbreviation: bookId } = bookInfo;
      let chapter = chapterIndex + 1;

      if (bookName.includes("Psalms")) {
        ({ chapter } = scriptureService.convertDividedPsalmsToComplete({
          book: bookName,
          chapter,
        }));
        bookId = "PSA";
      }
      globalThis.Open(bookId, chapter);
    }
  }, []);

  const customCSS = useMemo<string | undefined>(() => {
    return getCustomStyles();
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
          initialShowingAllChapters: true,
          initialShowTestamentLabels: true,
          initialShowSectionLabels: false,
          initialScaleFactor: 0.6,
          initialIsReadingHistoryEnabled: false,
          appId: id,
        }}
        customCSS={customCSS}
      />
    </div>
  );
};

return App;
