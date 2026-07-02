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
import { thisTypedBot as altarOfSacrificeBot } from "tabernacle.infrastructure.prefabs.pieces.main.altar-of-sacrifice.botAdapter";
import { thisTypedBot as arkOfCovenantBot } from "tabernacle.infrastructure.prefabs.pieces.main.ark-of-covenant.botAdapter";
import { thisTypedBot as barsBot } from "tabernacle.infrastructure.prefabs.pieces.main.bars.botAdapter";
import { thisTypedBot as bronzeLaverBot } from "tabernacle.infrastructure.prefabs.pieces.main.bronze-laver.botAdapter";
import { thisTypedBot as brownCurtainBot } from "tabernacle.infrastructure.prefabs.pieces.main.brown-curtain.botAdapter";
import { thisTypedBot as fenceBot } from "tabernacle.infrastructure.prefabs.pieces.main.fence.botAdapter";
import { thisTypedBot as frontCurtainBot } from "tabernacle.infrastructure.prefabs.pieces.main.front-curtain.botAdapter";
import { thisTypedBot as frontPillarsBot } from "tabernacle.infrastructure.prefabs.pieces.main.front-pillars.botAdapter";
import { thisTypedBot as greyCurtainBot } from "tabernacle.infrastructure.prefabs.pieces.main.grey-curtain.botAdapter";
import { thisTypedBot as groundBot } from "tabernacle.infrastructure.prefabs.pieces.main.ground.botAdapter";
import { thisTypedBot as incenseAltarBot } from "tabernacle.infrastructure.prefabs.pieces.main.incense-altar.botAdapter";
import { thisTypedBot as innerCurtainBot } from "tabernacle.infrastructure.prefabs.pieces.main.inner-curtain.botAdapter";
import { thisTypedBot as innerPillarsBot } from "tabernacle.infrastructure.prefabs.pieces.main.inner-pillars.botAdapter";
import { thisTypedBot as menorahBot } from "tabernacle.infrastructure.prefabs.pieces.main.menorah.botAdapter";
import { thisTypedBot as purpleCurtainBot } from "tabernacle.infrastructure.prefabs.pieces.main.purple-curtain.botAdapter";
import { thisTypedBot as redCurtainBot } from "tabernacle.infrastructure.prefabs.pieces.main.red-curtain.botAdapter";
import { thisTypedBot as ringsBot } from "tabernacle.infrastructure.prefabs.pieces.main.rings.botAdapter";
import { thisTypedBot as tableOfShowbreadBot } from "tabernacle.infrastructure.prefabs.pieces.main.table-of-showbread.botAdapter";
import { thisTypedBot as wallsBot } from "tabernacle.infrastructure.prefabs.pieces.main.walls.botAdapter";

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
import { PiecePositionService } from "tabernacle.application.services.PiecePositionService";
import { PiecesProvider } from "tabernacle.infrastructure.adapters.PiecesProvider";
import { PieceMapper } from "tabernacle.infrastructure.mappers.PieceMapper";
import { PiecePositionAdapter } from "../adapters/PiecePositionAdapter";
import { PiecePositionConfigProvider } from "tabernacle.infrastructure.config.PiecePositionConfigProvider";
import { HitboxConfigProvider } from "tabernacle.infrastructure.config.HitboxConfigProvider";
import { HitboxLifecycleService } from "tabernacle.application.services.HitboxLifecycleService";
import { HitboxLifecycleAdapter } from "../adapters/HitboxLifecycleAdapter";
import { HitboxMapper } from "../mappers/HitboxMapper";

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
      const piecesSequenceAdapter = new PiecesSequenceAdapter();
      const loggerAdapter = new LoggerAdapter();
      const pieceMapper = new PieceMapper();
      const piecesProvider = new PiecesProvider({
        piecesMap: {
          "altar-of-sacrifice": pieceMapper.toDomain(altarOfSacrificeBot),
          "ark-of-covenant": pieceMapper.toDomain(arkOfCovenantBot),
          bars: pieceMapper.toDomain(barsBot),
          "bronze-laver": pieceMapper.toDomain(bronzeLaverBot),
          "brown-curtain": pieceMapper.toDomain(brownCurtainBot),
          fence: pieceMapper.toDomain(fenceBot),
          "front-curtain": pieceMapper.toDomain(frontCurtainBot),
          "front-pillars": pieceMapper.toDomain(frontPillarsBot),
          "grey-curtain": pieceMapper.toDomain(greyCurtainBot),
          ground: pieceMapper.toDomain(groundBot),
          "incense-altar": pieceMapper.toDomain(incenseAltarBot),
          "inner-curtain": pieceMapper.toDomain(innerCurtainBot),
          "inner-pillars": pieceMapper.toDomain(innerPillarsBot),
          menorah: pieceMapper.toDomain(menorahBot),
          "purple-curtain": pieceMapper.toDomain(purpleCurtainBot),
          "red-curtain": pieceMapper.toDomain(redCurtainBot),
          rings: pieceMapper.toDomain(ringsBot),
          "table-of-showbread": pieceMapper.toDomain(tableOfShowbreadBot),
          walls: pieceMapper.toDomain(wallsBot),
        },
      });
      const piecePositionAdapter = new PiecePositionAdapter();
      const piecePositionConfigProvider = new PiecePositionConfigProvider();
      const hitboxConfigProvider = new HitboxConfigProvider();
      const visualizerAdapter = new TabernacleVisualizerAdapter({
        hitboxProvider: hitboxConfigProvider,
      });
      const hitboxMapper = new HitboxMapper();
      const hitboxLifecycleAdapter = new HitboxLifecycleAdapter({
        hitboxMapperPort: hitboxMapper,
        hitboxProviderPort: hitboxConfigProvider,
      });

      // 2. Application service
      const hitboxLifecycleService = new HitboxLifecycleService({
        piecesProviderPort: piecesProvider,
        hitboxProviderPort: hitboxConfigProvider,
        hitboxSpawnerPort: hitboxLifecycleAdapter,
        dimensionProvider: {
          getDimension: () => extensionId,
        },
      });
      const tabernacleService = new TabernacleService({
        visualizer: visualizerAdapter,
        scriptureData: scriptureDataProvider,
        pieceConfig: piecesConfigProvider,
        readingState: readingStateAdapter,
      });
      const piecePositionService = new PiecePositionService({
        piecesProviderPort: piecesProvider,
        dimensionProviderPort: { getDimension: () => extensionId },
        piecePositionUpdaterPort: piecePositionAdapter,
        piecePositionProviderPort: piecePositionConfigProvider,
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
        updatePiecesPositionPort: piecePositionService,
        hitboxSpawnerPort: hitboxLifecycleService,
      });
      const scriptureInteractionService = new ScriptureInteractionService({
        experienceDisplayerPort: experienceService,
      });

      // 3. Controller
      // tabernacleController = new TabernacleController({
      //   tabernacleService,
      //   navigate: (bookId, chapter) => {
      //     context.app.selectedTab.value?.readingState.selectChapter(
      //       bookId,
      //       chapter
      //     );
      //   },
      // });
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
          altarOfSacrificeBot,
          arkOfCovenantBot,
          barsBot,
          bronzeLaverBot,
          brownCurtainBot,
          fenceBot,
          frontCurtainBot,
          frontPillarsBot,
          greyCurtainBot,
          groundBot,
          incenseAltarBot,
          innerCurtainBot,
          innerPillarsBot,
          menorahBot,
          purpleCurtainBot,
          redCurtainBot,
          ringsBot,
          tableOfShowbreadBot,
          wallsBot,
        ]);
      };
    },
  });
};
