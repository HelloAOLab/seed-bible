import { registerExtension, type SeedBibleState } from "seed-bible.app.api";
import { thisTypedBot as componentsBot } from "scriptureMap2D.components.botAdapter";
import { thisTypedBot as componentsContainersBot } from "scriptureMap2D.components.containers.botAdapter";
import { thisTypedBot as componentsUiBot } from "scriptureMap2D.components.ui.botAdapter";
import { thisTypedBot as configBot } from "scriptureMap2D.config.botAdapter";
import { thisTypedBot as configTranslationsBot } from "scriptureMap2D.config.translations.botAdapter";
import { thisTypedBot as contextsBot } from "scriptureMap2D.contexts.botAdapter";
import { thisTypedBot as contextsReadingHistoryBot } from "scriptureMap2D.contexts.ReadingHistory.botAdapter";
import { thisTypedBot as contextsScriptureMap2DBot } from "scriptureMap2D.contexts.ScriptureMap2D.botAdapter";
import { thisTypedBot as contextsTestamentBot } from "scriptureMap2D.contexts.Testament.botAdapter";
import { thisTypedBot as contextsTimeBot } from "scriptureMap2D.contexts.Time.botAdapter";
import { thisTypedBot as diBot } from "scriptureMap2D.di.botAdapter";
import { thisTypedBot as entrypointsBot } from "scriptureMap2D.entrypoints.botAdapter";
import { thisTypedBot as functionsBot } from "scriptureMap2D.functions.botAdapter";
import { thisTypedBot as hooksBot } from "scriptureMap2D.hooks.botAdapter";
import { thisTypedBot as modelsBot } from "scriptureMap2D.models.botAdapter";
import { thisTypedBot as servicesBot } from "scriptureMap2D.services.botAdapter";
import { thisTypedBot as stylesBot } from "scriptureMap2D.styles.botAdapter";
import { MaterialIcon } from "seed-bible.components.icons";
import { ScriptureMap2D } from "scriptureMap2D.components.ScriptureMap2D";
import { ScriptureMap2DModes } from "scriptureMap2D.models.scriptureMap";
import { getCustomStyles } from "../styles/adapter";
import type { BibleVizAPI } from "bibleVizUtils.infrastructure.models.seedBible";
import { addTranslations, useI18n } from "seed-bible.i18n.I18nManager";
import { translations } from "scriptureMap2D.config.translations.index";
import type { ScriptureMap2DEvents } from "../models/events";

const Icon = () => {
  return <MaterialIcon>splitscreen_portrait</MaterialIcon>;
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
                      let { bookId } = key;
                      const { chapterIndex } = key;

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
                        bookId = bookInfo.completeBookId;
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
        destroy([
          componentsBot,
          componentsContainersBot,
          componentsUiBot,
          configBot,
          configTranslationsBot,
          contextsBot,
          contextsReadingHistoryBot,
          contextsScriptureMap2DBot,
          contextsTestamentBot,
          contextsTimeBot,
          diBot,
          entrypointsBot,
          functionsBot,
          hooksBot,
          modelsBot,
          servicesBot,
          stylesBot,
        ]);
      };
    },
  });
};
