import { computed, signal, type Signal } from "@preact/signals";
import {
  registerExtension,
  type SeedBibleState,
} from "../../seed-bible/seed-bible/app/api";
import { MaterialIcon } from "../../seed-bible/seed-bible/components/icons";
import { ScriptureMap } from "../components/ScriptureMap";
import { ScriptureMapModes } from "../models/scriptureMap";
// import { getCustomStyles } from "../styles/adapter";
import { LayoutConfigProvider } from "../config/LayoutConfigProvider";
import type { UtilsAPI } from "../../seed-bible-utils/infrastructure/models/seedBible";
import { useI18n } from "../../seed-bible/seed-bible/i18n/I18nManager";
import type { ScriptureMapEvents } from "../models/events";

const Icon = () => {
  return <MaterialIcon>splitscreen_portrait</MaterialIcon>;
};

// Portal target for the settings button: the pane's `header` slot can't reach
// ScriptureMap's context, since it's a sibling of the body, not a descendant.
const SettingsHeaderSlot = ({ node }: { node: Signal<HTMLElement | null> }) => (
  <div
    className="scripture-map-settings-header-slot"
    ref={(element: HTMLDivElement | null) => {
      node.value = element;
    }}
  />
);

// const customCSS = getCustomStyles();

const bibleVizUtilsId = "seed-bible-utils";

interface DependenciesMap {
  [bibleVizUtilsId]: UtilsAPI;
}

const extensionId = "scripture-map";

const dependencies: (keyof DependenciesMap)[] = [bibleVizUtilsId];

export const bootstrapExtension = () => {
  registerExtension({
    dependencies,
    id: extensionId,
    init: function* (context: SeedBibleState, dependenciesMap) {
      const {
        dataRepository,
        scriptureService,
        seedBibleUtilsEventManager,
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
        readingHistoryConfigProvider,
        sessionProvider,
        bookNames,
        ReadingHistoryTimeline,
      } = dependenciesMap[
        bibleVizUtilsId
      ] as DependenciesMap[typeof bibleVizUtilsId];

      const scriptureMapEventManager = createEventManager<ScriptureMapEvents>();
      const layoutConfigProvider = new LayoutConfigProvider();

      yield context.tools.registerBelowReaderTool({
        id: `${extensionId}-below-reader-tool`,
        title: {
          key: extensionId,
          defaultValue: "Scripture Map",
          ns: extensionId,
        },
        icon: Icon,
        onSelect: () => {
          const settingsHeaderSlot = signal<HTMLElement | null>(null);

          context.panes.openPane({
            placement: "side",
            // `title` is a signal (not a hook), so it's translated directly
            // through the i18n manager; passing the current `language.value`
            // as `lng` subscribes this computed to language changes so the
            // title stays in sync while the pane is open.
            title: () => {
              const { t } = useI18n();
              return t("scripture-map", {
                ns: "scripture-map",
                defaultValue: "Scripture Map",
              });
            },
            icon: Icon,
            header: () => <SettingsHeaderSlot node={settingsHeaderSlot} />,
            component: () => {
              const { t, language } = useI18n();

              return (
                <ScriptureMap
                  config={{
                    settingsHeaderSlot,
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
                    seedBibleUtilsEventManager,
                    scriptureMapEventManager,
                    scriptureService,
                    userColorStore,
                    userPresenceService,
                    arrangementService,
                    getDayRangeSeconds,
                    seedBibleDataRepository: dataRepository,
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
                    layoutConfigProvider,
                    readingHistoryConfigProvider,
                    language,
                    sessionProvider,
                    bookNames,
                    MaterialIcon,
                    ReadingHistoryTimeline,
                    userId: context.login.userId.value ?? undefined,
                  }}
                />
              );
            },
          });
        },
        priority: 100,
      });
    },
  });
};
