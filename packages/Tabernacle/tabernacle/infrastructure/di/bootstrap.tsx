import { registerExtension, type SeedBibleState } from "seed-bible.app.api";
import { computed, effect } from "@preact/signals";
import type { PieceKey } from "tabernacle.domain.models.piece";
import { MaterialIcon } from "seed-bible.components.icons";
import { thisTypedBot as domainModelsBot } from "tabernacle.domain.models.botAdapter";
import { thisTypedBot as domainPortsBot } from "tabernacle.domain.ports.botAdapter";
import { thisTypedBot as domainFunctionsBot } from "tabernacle.domain.functions.botAdapter";
import { thisTypedBot as applicationServicesBot } from "tabernacle.application.services.botAdapter";
import { thisTypedBot as configBot } from "tabernacle.infrastructure.config.botAdapter";
import { thisTypedBot as adaptersBot } from "tabernacle.infrastructure.adapters.casualos.botAdapter";
import { thisTypedBot as controllersBot } from "tabernacle.infrastructure.controllers.tabernacle.botAdapter";
import { thisTypedBot as diBot } from "tabernacle.infrastructure.di.botAdapter";
import { thisTypedBot as entrypointsBot } from "tabernacle.infrastructure.entrypoints.casualos.botAdapter";

import { TabernacleService } from "tabernacle.application.services.TabernacleService";
import { ScriptureDataConfigProvider } from "tabernacle.infrastructure.config.ScriptureDataConfigProvider";
import { PiecesConfigProvider } from "tabernacle.infrastructure.config.PiecesConfigProvider";
import { ReadingStateAdapter } from "tabernacle.infrastructure.adapters.casualos.ReadingStateAdapter";
import { TabernacleVisualizerAdapter } from "tabernacle.infrastructure.adapters.casualos.TabernacleVisualizerAdapter";
import { TabernacleController } from "tabernacle.infrastructure.controllers.tabernacle.TabernacleController";
import { ScriptureInteractionService } from "tabernacle.application.services.ScriptureInteractionService";
import { ScriptureInteractionController } from "tabernacle.infrastructure.controllers.scripture.ScriptureInteractionController";
import { ExperienceService } from "tabernacle.application.services.ExperienceService";
import { PiecesSequenceAdapter } from "tabernacle.infrastructure.adapters.PiecesSequenceAdapter";
import { LoggerAdapter } from "tabernacle.infrastructure.adapters.LoggerAdapter";

const extensionId = "tabernacle";
const bibleVizUtilsId = "bible-visualization-utils";

export let tabernacleController: TabernacleController | undefined;

const TabernacleIcon = () => <MaterialIcon>account_balance</MaterialIcon>;

export const bootstrapExtension = () => {
  registerExtension({
    id: extensionId,
    dependencies: [bibleVizUtilsId],
    init: function* (context: SeedBibleState) {
      // 1. Adapters / config providers
      const readingStateAdapter = new ReadingStateAdapter();
      const scriptureDataProvider = new ScriptureDataConfigProvider();
      const piecesConfigProvider = new PiecesConfigProvider();
      const visualizerAdapter = new TabernacleVisualizerAdapter();
      const piecesSequenceAdapter = new PiecesSequenceAdapter();
      const loggerAdapter = new LoggerAdapter();

      // 2. Application service
      const tabernacleService = new TabernacleService({
        visualizer: visualizerAdapter,
        scriptureData: scriptureDataProvider,
        pieceConfig: piecesConfigProvider,
        readingState: readingStateAdapter,
      });
      const experienceService = new ExperienceService({
        piecesSequencePort: piecesSequenceAdapter,
        panelDisplayerPort: {
          displayPanel: () => {
            context.panes.openPane({
              type: "detached",
              id: extensionId,
              gridPortal: extensionId,
            });
          },
        },
        logger: loggerAdapter,
      });
      const scriptureInteractionService = new ScriptureInteractionService({
        experienceDisplayerPort: experienceService,
      });

      // 3. Controller
      tabernacleController = new TabernacleController({
        tabernacleService,
        navigate: (bookId, chapter) => {
          context.app.selectedTab.value?.readingState.selectChapter(
            bookId,
            chapter
          );
        },
      });
      const scriptureInteractionController = new ScriptureInteractionController(
        {
          verseMenuClickHandlerPort: scriptureInteractionService,
        }
      );

      // 4. React to reading state changes
      const unsubscribeReadingState = effect(() => {
        const readingState = context.app.selectedTab.value?.readingState;
        const bookId = readingState?.bookId.value;
        const chapterNumber = readingState?.chapterNumber.value;
        if (!bookId || !chapterNumber) return;
        readingStateAdapter.setCurrentReading(bookId, chapterNumber);
        tabernacleService.updateVisualsForChapter(bookId, chapterNumber);
      });

      // 5. Computed signal: piece keys referenced by currently selected verses
      const foundPieces = computed(() => {
        const readingState = context.app.selectedTab.value?.readingState;
        const selectedVerses = readingState?.selectedVerses.value ?? [];
        const keys = new Set<PieceKey>();
        for (const { bookId, chapterNumber, verse } of selectedVerses) {
          for (const key of scriptureDataProvider.getPiecesForVerse(
            bookId,
            chapterNumber,
            verse.number
          )) {
            keys.add(key);
          }
        }
        return [...keys];
      });

      // 6. Register verse toolbar tool
      yield context.tools.registerVerseToolbarTool({
        id: `${extensionId}-verse`,
        priority: 0,
        title: {
          key: extensionId,
          defaultValue: "Tabernacle",
          ns: extensionId,
        },
        icon: TabernacleIcon,
        isVisible: () => foundPieces.value.length > 0,
        getItems: () =>
          foundPieces.value.map((key) => ({
            id: `${extensionId}-piece-${key}`,
            title: {
              key,
              defaultValue: key
                .split("-")
                .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                .join(" "),
              ns: extensionId,
            },
            icon: TabernacleIcon,
            onSelect: () => {
              scriptureInteractionController.handleVerseMenuItemClick(key);
              // tabernacleController?.handlePieceClick(key);
            },
          })),
      });

      // 6. Disposers
      yield () => unsubscribeReadingState();
      yield () => {
        tabernacleController = undefined;
      };
      yield () => {
        destroy([
          domainModelsBot,
          domainPortsBot,
          domainFunctionsBot,
          applicationServicesBot,
          configBot,
          adaptersBot,
          controllersBot,
          diBot,
          entrypointsBot,
        ]);
      };
    },
  });
};
