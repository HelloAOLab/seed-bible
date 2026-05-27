import { registerExtension, type SeedBibleState } from "seed-bible.app.api";
import { thisTypedBot as componentsBot } from "scriptureMap.components.botAdapter";
import { thisTypedBot as componentsContainersBot } from "scriptureMap.components.containers.botAdapter";
import { thisTypedBot as componentsUiBot } from "scriptureMap.components.ui.botAdapter";
import { thisTypedBot as configBot } from "scriptureMap.config.botAdapter";
import { thisTypedBot as configTranslationsBot } from "scriptureMap.config.translations.botAdapter";
import { thisTypedBot as contextsBot } from "scriptureMap.contexts.botAdapter";
import { thisTypedBot as contextsReadingHistoryBot } from "scriptureMap.contexts.ReadingHistory.botAdapter";
import { thisTypedBot as contextsScriptureMapBot } from "scriptureMap.contexts.ScriptureMap.botAdapter";
import { thisTypedBot as contextsTestamentBot } from "scriptureMap.contexts.Testament.botAdapter";
import { thisTypedBot as contextsTimeBot } from "scriptureMap.contexts.Time.botAdapter";
import { thisTypedBot as diBot } from "scriptureMap.di.botAdapter";
import { thisTypedBot as entrypointsBot } from "scriptureMap.entrypoints.botAdapter";
import { thisTypedBot as functionsBot } from "scriptureMap.functions.botAdapter";
import { thisTypedBot as hooksBot } from "scriptureMap.hooks.botAdapter";
import { thisTypedBot as modelsBot } from "scriptureMap.models.botAdapter";
import { thisTypedBot as servicesBot } from "scriptureMap.services.botAdapter";
import { thisTypedBot as stylesBot } from "scriptureMap.styles.botAdapter";
import { MaterialIcon } from "seed-bible.components.icons";
import { ScriptureMap } from "scriptureMap.components.ScriptureMap";
import { ScriptureMapModes } from "scriptureMap.models.scriptureMap";
import { getCustomStyles } from "../styles/adapter";
import type { BibleVizAPI } from "bibleVizUtils.infrastructure.models.seedBible";
import { addTranslations, useI18n } from "seed-bible.i18n.I18nManager";
import { translations } from "scriptureMap.config.translations.index";
import type { ScriptureMapEvents } from "../models/events";

const Icon = () => {
  return <MaterialIcon>splitscreen_portrait</MaterialIcon>;
};

const customCSS = getCustomStyles();

const bibleVizUtilsId = "bible-visualization-utils";

interface DependenciesMap {
  [bibleVizUtilsId]: BibleVizAPI;
}

const extensionId = "scripture-map";

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

      const scriptureMapEventManager = createEventManager<ScriptureMapEvents>();

      yield context.tools.registerBelowReaderTool({
        id: `${extensionId}-below-reader-tool`,
        title: {
          key: extensionId,
          defaultValue: "Scripture Map",
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
                <ScriptureMap
                  config={{
                    mode: ScriptureMapModes.Viewer,
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
                    scriptureMapEventManager,
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
          contextsScriptureMapBot,
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
