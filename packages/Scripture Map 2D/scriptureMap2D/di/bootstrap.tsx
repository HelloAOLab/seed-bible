import { registerExtension, type SeedBibleState } from "seed-bible.app.api";
import { MaterialIcon } from "seed-bible.components.icons";
import { ScriptureMap2D } from "scriptureMap2D.components.ScriptureMap2D";
import { ScriptureMap2DModes } from "scriptureMap2D.models.scriptureMap";
import { getCustomStyles } from "../styles/adapter";
import type { BibleVizAPI } from "bibleVizUtils.infrastructure.models.seedBible";
import { addTranslations, useI18n } from "seed-bible.i18n.I18nManager";
// import { translations } from "../config/translations";
import { translations } from "scriptureMap2D.config.translations.index";
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
  registerExtension({
    dependencies,
    id: extensionId,
    init: function* (context: SeedBibleState, dependenciesMap) {
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
        RgbToHex,
        GetChildrenLevelColors,
        GetColorType,
        RGBStringToArray,
        HexLongToShort,
        HexShortToLong,
        ColorParser,
        CapitalizeFirstLetter,
        GetPastDateInfo,
        sectionInfoMapper,
        scriptureMap3DConfigProvider,
        readingHistoryConfigProvider,
        sessionProvider,
        bookNames,
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
              const { t, language } = useI18n();

              return (
                <ScriptureMap2D
                  config={{
                    mode: ScriptureMap2DModes.Viewer,
                    onChapterClick: (_, key) => {
                      const { bookId, chapterIndex } = key;

                      let chapter = chapterIndex + 1;

                      const bookPath = arrangementService.getBookInfoPathById({
                        id: bookId,
                      });
                      if (!bookPath.found) {
                        throw new Error(
                          `bootstrap: bookPath not found at bootstrapExtension`
                        );
                      }

                      const {
                        arrangementIndex,
                        testamentIndex,
                        sectionIndex,
                        bookIndex,
                      } = bookPath;
                      const bookInfo = arrangementService.getBookByIndices({
                        arrangementIndex,
                        testamentIndex: testamentIndex!,
                        sectionIndex: sectionIndex!,
                        bookIndex: bookIndex!,
                      });

                      if (!bookInfo) {
                        throw new Error(
                          `bootstrap: bookInfo not found at bootstrapExtension`
                        );
                      }

                      if (bookInfo.type === "subset") {
                        ({ chapter } = scriptureService.mapSubsetToCompleteBook(
                          {
                            book: bookInfo,
                            chapter,
                          }
                        ));
                      }

                      context.app.selectedTab.value?.readingState.selectChapter(
                        bookId,
                        chapter
                      );
                    },
                    initialShowingAllChapters: true,
                    initialShowTestamentLabels: true,
                    initialShowSectionLabels: false,
                    initialScaleFactor: 0.6,
                    initialIsReadingHistoryEnabled: false,
                    appId: "", // TODO: Define this
                    extensionId,
                    translate: (
                      key: string,
                      options?: Record<string, unknown> | undefined
                    ) =>
                      t(key, {
                        ns: [extensionId, "seed-bible"],
                        ...(options ?? {}),
                      }),
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
                    RgbToHex,
                    GetChildrenLevelColors,
                    GetColorType,
                    RGBStringToArray,
                    HexLongToShort,
                    HexShortToLong,
                    ColorParser,
                    CapitalizeFirstLetter,
                    GetPastDateInfo,
                    sectionInfoMapper,
                    scriptureMap3DConfigProvider,
                    readingHistoryConfigProvider,
                    language,
                    sessionProvider,
                    bookNames,
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
