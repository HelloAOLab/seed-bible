// import { effect } from "@preact/signals";
import { registerExtension, type SeedBibleState } from "seed-bible.app.api";
import { MaterialIcon } from "seed-bible.components.icons";
import { getCustomStyles } from "todayScreen.infrastructure.presentation.styles.adapter";
// import type { BibleVizAPI } from "bibleVizUtils.infrastructure.models.seedBible";
// import { addTranslations, useI18n } from "seed-bible.i18n.I18nManager";
// import { translations } from "scriptureMap.config.translations.index";
import { Today } from "../presentation/components/Today";
import { useI18n } from "seed-bible.i18n.I18nManager";

const Icon = () => {
  return <MaterialIcon>home</MaterialIcon>;
};

const customCSS = getCustomStyles();

// const bibleVizUtilsId = "bible-visualization-utils";

// interface DependenciesMap {
//   [bibleVizUtilsId]: BibleVizAPI;
// }

const extensionId = "today-screen";

// const dependencies: (keyof DependenciesMap)[] = [bibleVizUtilsId];

export const bootstrapExtension = () => {
  registerExtension({
    // dependencies,
    id: extensionId,
    init: function* (context: SeedBibleState /*, dependenciesMap */) {
      // addTranslations(extensionId, translations);
      // const {
      //   bibleVizDataRepository,
      //   scriptureService,
      //   bibleVizUtilsEventManager,
      //   createEventManager,
      //   userColorStore,
      //   userPresenceService,
      //   arrangementService,
      //   getDayRangeSeconds,
      //   readingHistoryService,
      //   GetTextColorBasedOnBackground,
      //   IsValueBetween,
      //   ComputeRawGradientColors,
      //   ComputeLinearGradient,
      //   HexToRgb,
      //   RgbToHex,
      //   GetChildrenLevelColors,
      //   GetColorType,
      //   RGBStringToArray,
      //   HexLongToShort,
      //   HexShortToLong,
      //   ColorParser,
      //   CapitalizeFirstLetter,
      //   GetPastDateInfo,
      //   sectionInfoMapper,
      //   scriptureMap3DConfigProvider,
      //   readingHistoryConfigProvider,
      //   sessionProvider,
      //   bookNames,
      // } = dependenciesMap[
      //   bibleVizUtilsId
      // ] as DependenciesMap[typeof bibleVizUtilsId];

      yield context.tools.registerToolbarTool({
        id: "today",
        priority: 0,
        title: "Today",
        icon: Icon,
        onSelect: () => {
          const component = () => {
            const { language } = useI18n();
            return (
              <Today
                config={{
                  MaterialIcon,
                  language,
                  username: context.login.profile.value?.name,
                  userId: context.login.userId.value ?? undefined,
                }}
                customCSS={customCSS}
              />
            );
          };

          const paneId = context.panes.selectedPaneId.value;
          if (paneId) {
            context.tabs.selectTab("");
            context.panes.openInPane(paneId, { component });
          }
        },
      });

      yield () => {
        destroy([]);
      };
    },
  });
};
