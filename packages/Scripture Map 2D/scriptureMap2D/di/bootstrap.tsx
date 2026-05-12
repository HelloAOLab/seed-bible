import { registerExtension, type SeedBibleState } from "seed-bible.app.api";
import { MaterialIcon } from "seed-bible.components.icons";
import { ScriptureMap2D } from "scriptureMap2D.components.ScriptureMap2D";
import { ScriptureMap2DModes } from "scriptureMap2D.models.scriptureMap";
import { getCustomStyles } from "../styles/adapter";
import type { BookName } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/models/scripture";
import type { BibleVizAPI } from "bibleVizUtils.infrastructure.models.seedBible";
import { addTranslations, useI18n } from "seed-bible.i18n.I18nManager";
import { translations } from "../data/translations";
import type { ScriptureMap2DEvents } from "../models/events";

const Icon = () => {
  return <MaterialIcon>full_stacked_bar_chart</MaterialIcon>;
};

const customCSS = getCustomStyles();

const bibleVizUtilsId = "bible-visualization-utils";

interface DependenciesMap {
  [bibleVizUtilsId]: BibleVizAPI;
}

const extensionId = "scripture-map-2d";

const dependencies: (keyof DependenciesMap)[] = [bibleVizUtilsId];

export const bootstrapExtension = () => {
  console.log(`[Debug] ScriptureMap2D: bootstrapExtension start`);

  registerExtension({
    dependencies,
    id: extensionId,
    init: function* (context: SeedBibleState, dependenciesMap) {
      console.log(
        `[Debug] ScriptureMap2D: bootstrapExtension.registerExtension`,
        { context }
      );
      addTranslations(extensionId, translations);
      const {
        bibleVizDataRepository,
        scriptureService,
        bibleVizUtilsEventManager,
        createEventManager,
        userColorStore,
        userPresenceService,
        arrangementService,
        getDayRangeSeconds,
        readingHistoryService,
        GetTextColorBasedOnBackground,
        IsValueBetween,
        ComputeRawGradientColors,
        ComputeLinearGradient,
        HexToRgb,
        GetChildrenLevelColors,
        CapitalizeFirstLetter,
        GetPastDateInfo,
        sectionInfoMapper,
        scriptureMap3DConfigProvider,
        readingHistoryConfigProvider,
      } = dependenciesMap[
        bibleVizUtilsId
      ] as DependenciesMap[typeof bibleVizUtilsId];

      const scriptureMap2DEventManager =
        createEventManager<ScriptureMap2DEvents>();

      yield context.tools.registerBelowReaderTool({
        id: `${extensionId}-below-reader-tool`,
        title: {
          key: extensionId,
          defaultValue: "Scripture Map 2D",
          ns: extensionId,
        },
        icon: Icon,
        onSelect: () => {
          context.panes.openPane({
            type: "detached",
            detachedAnchor: "side",
            component: () => {
              const { t } = useI18n(extensionId);

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
                    appId: "", // TODO: Define this
                    extensionId,
                    translate: t,
                    seedBibleState: context,
                    bibleVizUtilsEventManager,
                    scriptureMap2DEventManager,
                    scriptureService,
                    userColorStore,
                    userPresenceService,
                    arrangementService,
                    getDayRangeSeconds,
                    bibleVizDataRepository,
                    readingHistoryService,
                    GetTextColorBasedOnBackground,
                    IsValueBetween,
                    ComputeRawGradientColors,
                    ComputeLinearGradient,
                    HexToRgb,
                    GetChildrenLevelColors,
                    CapitalizeFirstLetter,
                    GetPastDateInfo,
                    sectionInfoMapper,
                    scriptureMap3DConfigProvider,
                    readingHistoryConfigProvider,
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

  console.log(`[Debug] ScriptureMap2D: bootstrapExtension end`);
};
