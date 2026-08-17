// import { computed, effect } from "@preact/signals";
import { TABERNACLE_PIECE_KEYS } from "../../domain/models/piece";
import { thisTypedBot as altarOfSacrificeBot } from "../prefabs/pieces/main/altar-of-sacrifice/botAdapter";
import { thisTypedBot as arkOfCovenantBot } from "../prefabs/pieces/main/ark-of-covenant/botAdapter";
import { thisTypedBot as barsBot } from "../prefabs/pieces/main/bars/botAdapter";
import { thisTypedBot as bronzeLaverBot } from "../prefabs/pieces/main/bronze-laver/botAdapter";
import { thisTypedBot as brownCurtainBot } from "../prefabs/pieces/main/brown-curtain/botAdapter";
import { thisTypedBot as fenceBot } from "../prefabs/pieces/main/fence/botAdapter";
import { thisTypedBot as frontCurtainBot } from "../prefabs/pieces/main/front-curtain/botAdapter";
import { thisTypedBot as frontPillarsBot } from "../prefabs/pieces/main/front-pillars/botAdapter";
import { thisTypedBot as greyCurtainBot } from "../prefabs/pieces/main/grey-curtain/botAdapter";
import { thisTypedBot as groundBot } from "../prefabs/pieces/main/ground/botAdapter";
import { thisTypedBot as incenseAltarBot } from "../prefabs/pieces/main/incense-altar/botAdapter";
import { thisTypedBot as innerCurtainBot } from "../prefabs/pieces/main/inner-curtain/botAdapter";
import { thisTypedBot as innerPillarsBot } from "../prefabs/pieces/main/inner-pillars/botAdapter";
import { thisTypedBot as menorahBot } from "../prefabs/pieces/main/menorah/botAdapter";
import { thisTypedBot as purpleCurtainBot } from "../prefabs/pieces/main/purple-curtain/botAdapter";
import { thisTypedBot as redCurtainBot } from "../prefabs/pieces/main/red-curtain/botAdapter";
import { thisTypedBot as ringsBot } from "../prefabs/pieces/main/rings/botAdapter";
import { thisTypedBot as tableOfShowbreadBot } from "../prefabs/pieces/main/table-of-showbread/botAdapter";
import { thisTypedBot as wallsBot } from "../prefabs/pieces/main/walls/botAdapter";
// import { TabernacleService } from "../../application/services/TabernacleService";
// import { ScriptureDataConfigProvider, VerseReferenceConfigProvider } from "../config/verseReference/VerseReferenceConfigProvider";
// import { ReadingStateAdapter } from "../adapters/casualos/ReadingStateAdapter";
import { TabernacleVisualizerAdapter } from "../adapters/casualos/TabernacleVisualizerAdapter";
// import { TabernacleController } from "../controllers/tabernacle/TabernacleController";
// import { ScriptureInteractionService } from "../../application/services/ScriptureInteractionService";
// import { ScriptureInteractionController } from "../controllers/scripture/ScriptureInteractionController";
import { ExperienceService } from "../../application/services/ExperienceService";
import { PiecesSetUpService } from "../../application/services/PiecesSetUpService";
import { EnvironmentSetUpService } from "../../application/services/EnvironmentSetUpService";
import { EnvironmentAdapter } from "../adapters/casualos/EnvironmentAdapter";
import { EnvironmentConfigProvider } from "../config/environment/EnvironmentConfigProvider";
import { PiecesSequenceAdapter } from "../adapters/sequences/PiecesSequenceAdapter";
import { LoggerAdapter } from "../adapters/casualos/LoggerAdapter";
import { PiecePositionService } from "../../application/services/PiecePositionService";
import { PiecesProvider } from "../adapters/PiecesProvider";
import { PieceMapper } from "../mappers/PieceMapper";
import { PieceAdapter } from "../adapters/pieces/PieceAdapter";
import { PiecesRenderOrderAdapter } from "../adapters/pieces/PiecesRenderOrderAdapter";
import { PiecePositionConfigProvider } from "../config/piecePosition/PiecePositionConfigProvider";
import { LayerConfigProvider } from "../config/layers/LayerConfigProvider";
import { HitboxConfigProvider } from "../config/hitboxes/HitboxConfigProvider";
import { HitboxLifecycleService } from "../../application/services/HitboxLifecycleService";
import { HitboxLifecycleAdapter } from "../adapters/HitboxLifecycleAdapter";
import { HitboxMapper } from "../mappers/HitboxMapper";
import { EXPERIENCE_KEYS } from "../../domain/models/experience";
// import { PieceStateConfigProvider } from "../config/pieceState/PieceStateConfigProvider";
import { VFXBotFactory } from "../adapters/vfx/VFXBotFactory";
import { thisTypedBot as coneBot } from "../prefabs/pieces/environment/cone/botAdapter";
import { thisTypedBot as glowBot } from "../prefabs/pieces/environment/glow/botAdapter";
import { ColorLerper } from "../adapters/casualos/ColorLerper";

// const extensionId = "tabernacle";

let initialized = false;

export const bootstrapExtension = () => {
  if (initialized) return;

  initialized = true;

  const DIMENSION = configBot.tags.dimension as string;
  if (!DIMENSION) {
    throw new Error(
      "bible-stack bootstrap: dimension not provided in configBot tags"
    );
  }
  const getDimension = () => DIMENSION;

  // 1. Adapters / config providers
  const colorLerper = new ColorLerper();
  const vfxBotFactory = new VFXBotFactory({
    vfxBots: {
      cone: coneBot,
      glow: glowBot,
    },
  });
  // const readingStateAdapter = new ReadingStateAdapter();
  // const verseReferenceConfigProvider = new VerseReferenceConfigProvider();
  // const pieceStateConfigProvider = new PieceStateConfigProvider();
  const loggerAdapter = new LoggerAdapter();
  const pieceMapper = new PieceMapper();
  const piecesProvider = new PiecesProvider({
    piecesMap: {
      [EXPERIENCE_KEYS.TABERNACLE]: {
        [TABERNACLE_PIECE_KEYS.ALTAR_OF_SACRIFICE]:
          pieceMapper.toDomain(altarOfSacrificeBot),
        [TABERNACLE_PIECE_KEYS.ARK_OF_COVENANT]:
          pieceMapper.toDomain(arkOfCovenantBot),
        [TABERNACLE_PIECE_KEYS.BARS]: pieceMapper.toDomain(barsBot),
        [TABERNACLE_PIECE_KEYS.BRONZE_LAVER]:
          pieceMapper.toDomain(bronzeLaverBot),
        [TABERNACLE_PIECE_KEYS.BROWN_CURTAIN]:
          pieceMapper.toDomain(brownCurtainBot),
        [TABERNACLE_PIECE_KEYS.FRONT_CURTAIN]:
          pieceMapper.toDomain(frontCurtainBot),
        [TABERNACLE_PIECE_KEYS.FRONT_PILLARS]:
          pieceMapper.toDomain(frontPillarsBot),
        [TABERNACLE_PIECE_KEYS.GREY_CURTAIN]:
          pieceMapper.toDomain(greyCurtainBot),
        [TABERNACLE_PIECE_KEYS.INCENSE_ALTAR]:
          pieceMapper.toDomain(incenseAltarBot),
        [TABERNACLE_PIECE_KEYS.INNER_CURTAIN]:
          pieceMapper.toDomain(innerCurtainBot),
        [TABERNACLE_PIECE_KEYS.INNER_PILLARS]:
          pieceMapper.toDomain(innerPillarsBot),
        [TABERNACLE_PIECE_KEYS.MENORAH]: pieceMapper.toDomain(menorahBot),
        [TABERNACLE_PIECE_KEYS.PURPLE_CURTAIN]:
          pieceMapper.toDomain(purpleCurtainBot),
        [TABERNACLE_PIECE_KEYS.RED_CURTAIN]:
          pieceMapper.toDomain(redCurtainBot),
        [TABERNACLE_PIECE_KEYS.RINGS]: pieceMapper.toDomain(ringsBot),
        [TABERNACLE_PIECE_KEYS.TABLE_OF_SHOWBREAD]:
          pieceMapper.toDomain(tableOfShowbreadBot),
        [TABERNACLE_PIECE_KEYS.WALLS]: pieceMapper.toDomain(wallsBot),
        [TABERNACLE_PIECE_KEYS.GROUND]: pieceMapper.toDomain(groundBot),
        [TABERNACLE_PIECE_KEYS.FENCE]: pieceMapper.toDomain(fenceBot),
      },
    },
  });
  const piecePositionAdapter = new PieceAdapter({
    getDimension,
    pieceMapper,
  });
  const piecePositionConfigProvider = new PiecePositionConfigProvider();
  const hitboxConfigProvider = new HitboxConfigProvider();
  const visualizerAdapter = new TabernacleVisualizerAdapter({
    piecesProvider,
    pieceMapper,
    vfxBotFactory,
    colorLerper,
    getDimension,
  });
  const layerConfigProvider = new LayerConfigProvider();
  const piecesSequenceAdapter = new PiecesSequenceAdapter({
    visualizer: visualizerAdapter,
    layerProvider: layerConfigProvider,
  });
  const piecesRenderOrderAdapter = new PiecesRenderOrderAdapter({
    layerConfigProvider,
    piecesProvider,
    pieceMapper,
  });
  const hitboxMapper = new HitboxMapper();
  const hitboxLifecycleAdapter = new HitboxLifecycleAdapter({
    getDimension,
    hitboxMapperPort: hitboxMapper,
    hitboxProviderPort: hitboxConfigProvider,
  });

  // 2. Application service
  const hitboxLifecycleService = new HitboxLifecycleService({
    piecesProviderPort: piecesProvider,
    hitboxProviderPort: hitboxConfigProvider,
    hitboxSpawnerPort: hitboxLifecycleAdapter,
  });
  // const tabernacleService = new TabernacleService({
  //   visualizer: visualizerAdapter,
  //   scriptureData: scriptureDataProvider,
  //   pieceConfig: piecesConfigProvider,
  //   readingState: readingStateAdapter,
  // });
  const piecePositionService = new PiecePositionService({
    piecesProviderPort: piecesProvider,
    piecePositionUpdaterPort: piecePositionAdapter,
    piecePositionProviderPort: piecePositionConfigProvider,
  });
  const piecesSetUpService = new PiecesSetUpService({
    updatePiecesPositionPort: piecePositionService,
    hitboxSpawnerPort: hitboxLifecycleService,
    piecesRenderOrderPort: piecesRenderOrderAdapter,
  });
  const environmentConfigProvider = new EnvironmentConfigProvider();
  const environmentAdapter = new EnvironmentAdapter({
    environmentConfigProvider,
  });
  const environmentSetUpService = new EnvironmentSetUpService({
    environmentAdapterPort: environmentAdapter,
  });
  const experienceService = new ExperienceService({
    piecesSequencePort: piecesSequenceAdapter,
    logger: loggerAdapter,
    piecesSetUpPort: piecesSetUpService,
    environmentSetUpPort: environmentSetUpService,
    getExperienceKey: () => EXPERIENCE_KEYS.TABERNACLE,
  });
  // const scriptureInteractionService = new ScriptureInteractionService({
  //   experienceDisplayerPort: experienceService,
  // });

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
  // const scriptureInteractionController = new ScriptureInteractionController(
  //   {
  //     verseMenuClickHandlerPort: scriptureInteractionService,
  //   }
  // );

  // 4. React to reading state changes
  // const unsubscribeReadingState = effect(() => {
  //   const readingState = context.app.selectedTab.value?.readingState;
  //   const bookId = readingState?.bookId.value;
  //   const chapterNumber = readingState?.chapterNumber.value;
  //   if (!bookId || !chapterNumber) return;
  //   readingStateAdapter.setCurrentReading(bookId, chapterNumber);
  //   tabernacleService.updateVisualsForChapter(bookId, chapterNumber);
  // });

  // 5. Computed signal: piece keys referenced by currently selected verses
  // const foundPieces = computed(() => {
  //   const readingState = context.app.selectedTab.value?.readingState;
  //   const selectedVerses = readingState?.selectedVerses.value ?? [];
  //   const keys = new Set<PieceKey>();
  //   for (const { bookId, chapterNumber, verse } of selectedVerses) {
  //     for (const key of scriptureDataProvider.getPiecesForVerse(
  //       bookId,
  //       chapterNumber,
  //       verse.number
  //     )) {
  //       keys.add(key);
  //     }
  //   }
  //   return [...keys];
  // });

  // 6. Register verse toolbar tool
  // yield context.tools.registerVerseToolbarTool({
  //   id: `${extensionId}-verse`,
  //   priority: 0,
  //   title: {
  //     key: extensionId,
  //     defaultValue: "Tabernacle",
  //     ns: extensionId,
  //   },
  //   icon: TabernacleIcon,
  //   isVisible: () => foundPieces.value.length > 0,
  //   getItems: () =>
  //     foundPieces.value.map((key) => ({
  //       id: `${extensionId}-piece-${key}`,
  //       title: {
  //         key,
  //         defaultValue: key
  //           .split("-")
  //           .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
  //           .join(" "),
  //         ns: extensionId,
  //       },
  //       icon: TabernacleIcon,
  //       onSelect: () => {
  //         scriptureInteractionController.handleVerseMenuItemClick(key);
  //         // tabernacleController?.handlePieceClick(key);
  //       },
  //     })),
  // });

  // 6. Disposers

  experienceService.tryDisplayExperience();
};
