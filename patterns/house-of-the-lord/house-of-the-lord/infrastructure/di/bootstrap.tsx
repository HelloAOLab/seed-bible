// import { computed, effect } from "@preact/signals";
import {
  TABERNACLE_PIECE_KEYS,
  type PieceKey,
} from "../../domain/models/piece";
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
import { PieceStateService } from "../../application/services/PieceStateService";
import { PieceInteractionService } from "../../application/services/PieceInteractionService";
import { EnvironmentInteractionService } from "../../application/services/EnvironmentInteractionService";
import { VerseReferenceConfigProvider } from "../config/verseReference/VerseReferenceConfigProvider";
import { ReadingStateService } from "../../application/services/ReadingStateService";
import { PieceStateAdapter } from "../adapters/pieces/PieceStateAdapter";
import { PieceHighlightAdapter } from "../adapters/pieces/PieceHighlightAdapter";
import { PiecesInteractionController } from "../controllers/pieces/PiecesInteractionController";
import { EnvironmentInteractionController } from "../controllers/environment/EnvironmentInteractionController";
import { ScriptureInteractionService } from "../../application/services/ScriptureInteractionService";
import { ScriptureInteractionController } from "../controllers/scripture/ScriptureInteractionController";
import { ExperienceService } from "../../application/services/ExperienceService";
import { PiecesSetUpService } from "../../application/services/PiecesSetUpService";
import { EnvironmentSetUpService } from "../../application/services/EnvironmentSetUpService";
import { EnvironmentAdapter } from "../adapters/casualos/EnvironmentAdapter";
import { EnvironmentConfigProvider } from "../config/environment/EnvironmentConfigProvider";
import { PiecesSequenceAdapter } from "../adapters/sequences/PiecesSequenceAdapter";
import { LoggerAdapter } from "../adapters/casualos/LoggerAdapter";
import { PiecePositionService } from "../../application/services/PiecePositionService";
import { PiecesProvider } from "../adapters/pieces/PiecesProvider";
import { PieceMapper } from "../mappers/PieceMapper";
import { PieceAdapter } from "../adapters/pieces/PieceAdapter";
import { PiecesRenderOrderAdapter } from "../adapters/pieces/PiecesRenderOrderAdapter";
import { PiecePositionConfigProvider } from "../config/piecePosition/PiecePositionConfigProvider";
import { LayerConfigProvider } from "../config/layers/LayerConfigProvider";
import { HitboxConfigProvider } from "../config/hitboxes/HitboxConfigProvider";
import { HitboxLifecycleService } from "../../application/services/HitboxLifecycleService";
import { HitboxLifecycleAdapter } from "../adapters/pieces/HitboxLifecycleAdapter";
import { BaseEventManager } from "../../application/services/BaseEventManager";
import type { InfrastructureEventMap } from "../models/events";
import { HitboxMapper } from "../mappers/HitboxMapper";
import { EXPERIENCE_KEYS } from "../../domain/models/experience";
import { PieceStateConfigProvider } from "../config/pieceState/PieceStateConfigProvider";
import { VFXBotFactory } from "../adapters/vfx/VFXBotFactory";
import { thisTypedBot as coneBot } from "../prefabs/pieces/vfx/cone/botAdapter";
import { thisTypedBot as glowBot } from "../prefabs/pieces/vfx/glow/botAdapter";
import { ColorLerper } from "../adapters/casualos/ColorLerper";
import type { Message, PieceBot } from "../models/casualos";
import { ToExperienceKey, ToPieceKeyOf } from "../../domain/functions/keys";
import { thisTypedBot as entrypointBot } from "../entrypoints/casualos/botAdapter";
import { PieceFocusService } from "../../application/services/PieceFocusService";
import { PieceHighlightService } from "../../application/services/PieceHighlightService";
import { NavMenuStateService } from "../../application/services/NavMenuStateService";
import type { DomainEventMap } from "../../domain/models/events";
import { NAV_MENU_LEVELS } from "../../domain/models/navigation";
import { NavMenuRendererAdapter } from "../adapters/navigation/NavMenuRendererAdapter";
import { HostNotifierAdapter } from "../adapters/seed-bible/HostNotifierAdapter";
import { ScriptureNavigationAdapter } from "../adapters/seed-bible/ScriptureNavigationAdapter";
import { ScriptureNavigationService } from "../../application/services/ScriptureNavigationService";
import { NavMenuController } from "../controllers/navMenu/NavMenuController";
import { PieceCatalogConfigProvider } from "../config/pieceCatalog/PieceCatalogConfigProvider";
import { BookNameConfigProvider } from "../config/bookName/BookNameConfigProvider";

let initialized = false;

const mainPieces: {
  [K in PieceKey]: PieceBot<K>;
} = {
  "altar-of-sacrifice": altarOfSacrificeBot,
  "ark-of-covenant": arkOfCovenantBot,
  bars: barsBot,
  "bronze-laver": bronzeLaverBot,
  "brown-curtain": brownCurtainBot,
  fence: fenceBot,
  "front-curtain": frontCurtainBot,
  "front-pillars": frontPillarsBot,
  "grey-curtain": greyCurtainBot,
  ground: groundBot,
  "incense-altar": incenseAltarBot,
  "inner-curtain": innerCurtainBot,
  "inner-pillars": innerPillarsBot,
  menorah: menorahBot,
  "purple-curtain": purpleCurtainBot,
  "red-curtain": redCurtainBot,
  rings: ringsBot,
  "table-of-showbread": tableOfShowbreadBot,
  walls: wallsBot,
};

export const bootstrapExtension = async () => {
  if (initialized) return;

  initialized = true;

  const DIMENSION = configBot.tags.dimension as string;
  if (!DIMENSION) {
    throw new Error(
      "house-of-the-lord bootstrap: dimension not provided in configBot tags"
    );
  }
  const getDimension = () => DIMENSION;

  // Both tags come from the query the reader builds the iframe URL with, so they
  // are narrowed here rather than asserted. The experience goes first: which
  // piece keys are valid depends on it.
  const EXPERIENCE = ToExperienceKey(configBot.tags.experience);
  if (!EXPERIENCE) {
    throw new Error(
      `house-of-the-lord bootstrap: unknown experience in configBot tags: "${configBot.tags.experience}"`
    );
  }
  const getExperienceKey = () => EXPERIENCE;

  // An unusable highlight is not fatal the way a missing experience is — the
  // portal still opens, just without anything focused.
  const HIGHLIGHTED_PIECE = ToPieceKeyOf(
    EXPERIENCE,
    configBot.tags.highlightedPiece
  );
  if (configBot.tags.highlightedPiece && !HIGHLIGHTED_PIECE) {
    console.warn(
      `house-of-the-lord bootstrap: ignored highlightedPiece "${configBot.tags.highlightedPiece}", not a piece of "${EXPERIENCE}"`
    );
  }

  // 1. Adapters / config providers
  const colorLerper = new ColorLerper();
  const vfxBotFactory = new VFXBotFactory({
    vfxBots: {
      cone: coneBot,
      glow: glowBot,
    },
  });
  const domainEventBus = new BaseEventManager<DomainEventMap>();
  const readingStateService = new ReadingStateService({
    eventBus: domainEventBus,
  });
  const verseReferenceConfigProvider = new VerseReferenceConfigProvider();
  const pieceStateConfigProvider = new PieceStateConfigProvider();
  const loggerAdapter = new LoggerAdapter();
  const pieceCatalogConfigProvider = new PieceCatalogConfigProvider();
  const bookNameConfigProvider = new BookNameConfigProvider();
  const hostNotifierAdapter = new HostNotifierAdapter();
  const scriptureNavigationAdapter = new ScriptureNavigationAdapter();
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
  const pieceAdapter = new PieceAdapter({
    getDimension,
    pieceMapper,
  });
  const piecePositionConfigProvider = new PiecePositionConfigProvider();
  const hitboxConfigProvider = new HitboxConfigProvider();
  const pieceStateAdapter = new PieceStateAdapter({
    getDimension,
    piecesProvider,
    pieceMapper,
  });
  const layerConfigProvider = new LayerConfigProvider();
  const pieceHighlightAdapter = new PieceHighlightAdapter({
    getDimension,
    piecesProvider,
    pieceMapper,
    vfxBotFactory,
    colorLerper,
    pieceState: pieceStateAdapter,
    layerProvider: layerConfigProvider,
  });
  const piecesSequenceAdapter = new PiecesSequenceAdapter({
    pieceState: pieceStateAdapter,
    layerProvider: layerConfigProvider,
  });
  const piecesRenderOrderAdapter = new PiecesRenderOrderAdapter({
    layerConfigProvider,
    piecesProvider,
    pieceMapper,
  });
  const hitboxMapper = new HitboxMapper();
  const eventManager = new BaseEventManager<InfrastructureEventMap>();
  const hitboxLifecycleAdapter = new HitboxLifecycleAdapter({
    getDimension,
    hitboxMapperPort: hitboxMapper,
    hitboxProviderPort: hitboxConfigProvider,
    eventManager,
  });
  // 2. Application service
  const hitboxLifecycleService = new HitboxLifecycleService({
    piecesProviderPort: piecesProvider,
    hitboxProviderPort: hitboxConfigProvider,
    hitboxSpawnerPort: hitboxLifecycleAdapter,
  });
  const pieceStateService = new PieceStateService({
    pieceState: pieceStateAdapter,
    pieceStateConfigProviderPort: pieceStateConfigProvider,
    readingState: readingStateService,
    getExperienceKey,
  });
  const navMenuStateService = new NavMenuStateService({
    eventBus: domainEventBus,
    initialState: {
      isOpen: false,
      level: NAV_MENU_LEVELS.PIECES,
      selectedPiece: HIGHLIGHTED_PIECE ?? null,
      experience: EXPERIENCE,
      reading: readingStateService.getCurrentReading(),
    },
  });
  const pieceHighlightService = new PieceHighlightService({
    getExperienceKey,
    pieceHighlight: pieceHighlightAdapter,
  });
  const pieceFocusService = new PieceFocusService({
    pieceHighlightPort: pieceHighlightService,
    navMenuStatePort: navMenuStateService,
    pieceStatePort: pieceStateService,
  });
  const pieceInteractionService = new PieceInteractionService({
    pieceFocusPort: pieceFocusService,
    piecesProvider: piecesProvider,
    pieceAdapterPort: pieceAdapter,
    getExperience: getExperienceKey,
    loggerPort: loggerAdapter,
  });
  const environmentInteractionService = new EnvironmentInteractionService({
    pieceHighlight: pieceHighlightService,
    navMenuStatePort: navMenuStateService,
  });
  const piecePositionService = new PiecePositionService({
    piecesProviderPort: piecesProvider,
    piecePositionUpdaterPort: pieceAdapter,
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
    getExperienceKey,
  });
  const scriptureNavigationService = new ScriptureNavigationService({
    scriptureNavigationAdapterPort: scriptureNavigationAdapter,
  });
  const scriptureInteractionService = new ScriptureInteractionService({
    pieceFocusPort: pieceFocusService,
  });
  // 3. Controller
  const piecesInteractionController = new PiecesInteractionController({
    pieceInteractionService,
  });
  const environmentInteractionController = new EnvironmentInteractionController(
    {
      environmentInteractionService,
    }
  );
  const scriptureInteractionController = new ScriptureInteractionController({
    scriptureInteractionPort: scriptureInteractionService,
  });
  const navMenuController = new NavMenuController({
    navMenuStatePort: navMenuStateService,
    pieceFocusPort: pieceFocusService,
    scriptureNavigationPort: scriptureNavigationService,
  });

  const navMenuRendererAdapter = new NavMenuRendererAdapter({
    eventBus: domainEventBus,
    navMenuStateService,
    catalog: pieceCatalogConfigProvider,
    verseReferences: verseReferenceConfigProvider,
    bookNames: bookNameConfigProvider,
    controller: navMenuController,
  });

  // 4. React to reading state changes
  // const unsubscribeReadingState = effect(() => {
  //   const readingState = context.app.selectedTab.value?.readingState;
  //   const bookId = readingState?.bookId.value;
  //   const chapterNumber = readingState?.chapterNumber.value;
  //   if (!bookId || !chapterNumber) return;
  //   readingStateService.setCurrentReading(bookId, chapterNumber);
  //   pieceStateService.updatePiecesState();
  // });

  Object.values(mainPieces).forEach((pieceBot) => {
    os.addBotListener(pieceBot, "onClick", () => {
      piecesInteractionController.handlePieceClick(pieceBot.tags.key);
    });
  });

  eventManager.subscribe("OnHitboxClicked", (pieceKey) =>
    piecesInteractionController.handlePieceClick(pieceKey)
  );

  os.addBotListener(entrypointBot, "onGridClick", () => {
    environmentInteractionController.handleGridClick();
  });

  domainEventBus.subscribe("OnReadingStateChanged", ({ reading }) => {
    navMenuStateService.setReading(reading);
  });

  os.addBotListener(
    entrypointBot,
    "onEmbedMessage",
    ({ message }: { message: Message }) => {
      if (!message?.type) return;

      switch (message.type) {
        case "highlight-piece": {
          const key = ToPieceKeyOf(getExperienceKey(), message.key);
          if (!key) {
            console.warn(
              "house-of-the-lord pattern bootstrap: message.key is not a piece of the experience on stage",
              { message }
            );
            return;
          }
          scriptureInteractionController.handlePieceFocusRequest(key);
          break;
        }
        case "reading-changed": {
          if (!message.bookId || !message.chapterNumber) {
            console.warn(
              "house-of-the-lord pattern bootstrap: reading-changed without bookId or chapterNumber",
              { message }
            );
            return;
          }
          readingStateService.setCurrentReading(
            message.bookId,
            message.chapterNumber
          );
          break;
        }
      }
    }
  );

  // 6. Disposers

  await navMenuRendererAdapter
    .render()
    .catch((reason) =>
      console.error(
        "house-of-the-lord pattern bootstrap: Failed to display navigation menu",
        { reason }
      )
    );

  const displayed = await experienceService
    .tryDisplayExperience()
    .catch((reason) =>
      console.error(
        "house-of-the-lord pattern bootstrap: Failed to display experience",
        { reason }
      )
    );
  if (!displayed) {
    console.error(
      "house-of-the-lord pattern bootstrap: couldn't display experience"
    );
    return;
  }

  if (HIGHLIGHTED_PIECE) {
    pieceFocusService.focus(HIGHLIGHTED_PIECE);
  }

  hostNotifierAdapter.notifyReady();
};
