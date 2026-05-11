/* eslint-disable seed-bible-i18n/i18n-untranslated-content */
import { registerExtension, type SeedBibleState } from "seed-bible.app.api";
import { MaterialIcon } from "seed-bible.components.icons";
import { ScriptureMap2D } from "scriptureMap2D.components.ScriptureMap2D";
import { ScriptureMap2DModes } from "scriptureMap2D.models.scriptureMap";
import { getCustomStyles } from "../styles/adapter";
import type { BookName } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/models/scripture";
import type { BibleVizAPI } from "bibleVizUtils.infrastructure.models.seedBible";

const Icon = () => {
  // @ts-ignore
  return <MaterialIcon>full_stacked_bar_chart</MaterialIcon>;
};

const customCSS = getCustomStyles();

const bibleVizUtilsId = "bible-visualization-utils";

interface DependenciesMap {
  [bibleVizUtilsId]: BibleVizAPI;
}

const dependencies: (keyof DependenciesMap)[] = [bibleVizUtilsId];

export const bootstrapExtension = () => {
  registerExtension({
    dependencies,
    id: "scripture-map-2d",
    init: function* (context: SeedBibleState, dependenciesMap) {
      const { bibleVizDataRepository, scriptureService } = dependenciesMap[
        bibleVizUtilsId
      ] as DependenciesMap[typeof bibleVizUtilsId];

      yield context.tools.registerBelowReaderTool({
        id: "below-reader-tool",
        title: {
          key: "below-reader-tool",
          defaultValue: "Scripture Map 2D",
          ns: "scripture-map-2d",
        },
        icon: Icon,
        onSelect: () => {
          context.panes.openPane({
            type: "detached",
            detachedAnchor: "side",
            component: () => {
              return (
                <ScriptureMap2D
                  config={{
                    mode: ScriptureMap2DModes.Viewer,
                    onChapterClick: (_, key) => {
                      const { bookName, chapterIndex } = key as {
                        bookName: BookName;
                        chapterIndex: number;
                      }; // TODO: Correctly type bookName with BookName in ChapterKey

                      const bookInfo =
                        bibleVizDataRepository.getBookStaticInfo(bookName);
                      if (bookInfo) {
                        let { abbreviation: bookId } = bookInfo;
                        let chapter = chapterIndex + 1;

                        if (bookName.includes("Psalms")) {
                          ({ chapter } =
                            scriptureService.convertDividedPsalmsToComplete({
                              book: bookName,
                              chapter,
                            }));
                          bookId = "PSA" as typeof bookId; // TODO: Fix this
                        }
                        console.log(`TODO: Open ${bookId} at ${chapter}`);
                        // globalThis.Open(bookId, chapter);
                      }
                    },
                    initialShowingAllChapters: true,
                    initialShowTestamentLabels: true,
                    initialShowSectionLabels: false,
                    initialScaleFactor: 0.6,
                    initialIsReadingHistoryEnabled: false,
                    appId: "",
                  }}
                  customCSS={customCSS}
                />
              );
            },
          });
        },
        priority: 100,
      });

      yield () => {
        // TODO: destroy extension bots
      };
    },
  });
};
