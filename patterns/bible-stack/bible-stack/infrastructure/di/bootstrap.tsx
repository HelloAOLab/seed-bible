import { PieceMapper } from "../mappers/PieceMapper";
import { LayoutConfigProvider } from "../config/layout/LayoutConfigProvider";
import { ObjectPooler } from "../adapters/environment/ObjectPooler";
import type {
  BibleStackObjectPoolerMap,
  PieceListeners,
  PoolData,
} from "../models/objectPooler";
import { ListenTagEventManager } from "../adapters/events/ListenTagEventManager";
import type {
  BookBot,
  BotTypeMap,
  ChapterBot,
  CrossLineBot,
  SectionBot,
  TestamentBot,
  VerseBot,
  VersesBundleBot,
} from "../models/stack";
import {
  BiblePieces,
  SelectionModalities,
  type BiblePiece,
  type Piece,
} from "../../domain/models/canvas";
import { thisTypedBot as testamentPrefab } from "../prefabs/testament/botAdapter";
import { AudioAdapter } from "../adapters/audio/AudioAdapter";
import { BibleSetupCameraAdapter } from "../adapters/environment/BibleSetupCameraAdapter";
import { CameraAdapter } from "../adapters/environment/CameraAdapter";
import { EnvironmentAdapter } from "../adapters/environment/EnvironmentAdapter";
import { ExperienceAdapter } from "../adapters/experience/ExperienceAdapter";
import { BibleSequenceAdapter } from "../adapters/sequences/BibleSequenceAdapter";
import { BibleDataRepository } from "../adapters/stacks/BibleDataRepository";
import { PieceDataRepository } from "../adapters/stacks/PieceDataRepository";
import { VersesBundleRepository } from "../adapters/stacks/VersesBundleDataRepository";
import { VisualStateRegistry } from "../adapters/stacks/VisualStateRegistry";
import { InteractionRegistry } from "../adapters/stacks/InteractionRegistry";
import { BibleSetupAdapter } from "../adapters/stacks/BibleSetupAdapter";
import { BibleStackUpdaterAdapter } from "../adapters/stacks/BibleStackUpdaterAdapter";
import { TestamentStackUpdaterAdapter } from "../adapters/stacks/TestamentStackUpdaterAdapter";
import { SectionStackUpdaterAdapter } from "../adapters/stacks/SectionStackUpdaterAdapter";
import { BookStackUpdaterAdapter } from "../adapters/stacks/BookStackUpdaterAdapter";
import { BookStackLayoutAdapter } from "../adapters/stacks/BookStackLayoutAdapter";
import { SelectedBookLayoutAdapter } from "../adapters/stacks/SelectedBookLayoutAdapter";
import { BookShapeAdapter } from "../adapters/stacks/BookShapeAdapter";
import { BookSetupAdapter } from "../adapters/stacks/BookSetupAdapter";
import { StackPieceLifecycleAdapter } from "../adapters/stacks/StackPieceLifecycleAdapter";
import { PieceAdapter } from "../adapters/stacks/PieceAdapter";
import { PieceHighlightAdapter } from "../adapters/stacks/PieceHighlightAdapter";
import { PieceUnhighlightSchedulerAdapter } from "../adapters/stacks/PieceUnhighlightSchedulerAdapter";
import { SectionSelectionAdapter } from "../adapters/stacks/SectionSelectionAdapter";
import { ChapterSelectionAdapter } from "../adapters/stacks/ChapterSelectionAdapter";
import { VersesAdapter } from "../adapters/stacks/VersesAdapter";
import { VersesBundleAdapter } from "../adapters/stacks/VersesBundleAdapter";
import { TourGuideAdapter } from "../adapters/stacks/TourGuideAdapter";
import { BibleRecenterAdapter } from "../adapters/stacks/BibleRecenterAdapter";
import { BookInteractionConfigProvider } from "../config/bookInteraction/BookInteractionConfigProvider";
import { StackUpdateConfigProvider } from "../config/stackUpdate/StackUpdateConfigProvider";
import { AudioConfigProvider } from "../config/audio/AudioConfigProvider";
import { ExperienceConfigProvider } from "../config/experience/ExperienceConfigProvider";
import { SectionInteractionConfigProvider } from "../config/sectionInteraction/SectionInteractionConfigProvider";
import { ChapterSelectionConfigProvider } from "../config/chapterSelection/ChapterSelectionConfigProvider";
import { HighlightConfigProvider } from "../config/highlight/HighlightConfigProvider";
import { SequenceConfigProvider } from "../config/sequences/SequenceConfigProvider";
import { BookSetupConfigProvider } from "../config/bookSetup/BookSetupConfigProvider";
import { SectionSelectionConfigProvider } from "../config/sectionSelection/SectionSelectionConfigProvider";
// import type { PoolData } from "../models/objectPooler";
import { thisTypedBot as sectionPrefab } from "../prefabs/section/botAdapter";
import { thisTypedBot as bookPrefab } from "../prefabs/book/botAdapter";
import { thisTypedBot as chapterPrefab } from "../prefabs/chapter/botAdapter";
import { thisTypedBot as versesBunblePrefab } from "../prefabs/versesBundle/botAdapter";
import { thisTypedBot as versePrefab } from "../prefabs/verse/botAdapter";
import { thisTypedBot as coverPrefab } from "../prefabs/cover/botAdapter";
import { thisTypedBot as crossLinePrefab } from "../prefabs/crossLine/botAdapter";
import { thisTypedBot as sectionShadowPrefab } from "../prefabs/sectionShadow/botAdapter";
import { thisTypedBot as bibleTransformerPrefab } from "../prefabs/bibleTransformer/botAdapter";
import { thisTypedBot as bibleShadowPrefab } from "../prefabs/shadow/botAdapter";
import { thisTypedBot as entrypointBot } from "../entrypoints/botAdapter";
import { StackTestamentMapper } from "../mappers/StackTestamentMapper";
import { StackSectionMapper } from "../mappers/StackSectionMapper";
import { StackSectionBookMapper } from "../mappers/StackSectionBookMapper";
import { StackBookMapper } from "../mappers/StackBookMapper";
import { StackChapterMapper } from "../mappers/StackChapterMapper";
import { StackSectionShadowMapper } from "../mappers/StackSectionShadowMapper";
import { StackShadowMapper } from "../mappers/StackShadowMapper";
import { StackTransformerMapper } from "../mappers/StackTransformerMapper";
import { StackCoverMapper } from "../mappers/StackCoverMapper";
import { StackLowerCoverMapper } from "../mappers/StackLowerCoverMapper";
import { StackCrossLineMapper } from "../mappers/StackCrossLineMapper";
import { VersesBundleMapper } from "../mappers/VersesBundleMapper";
import { VerseMapper } from "../mappers/VerseMapper";
import { InfoLabelTransformerMapper } from "../mappers/InfoLabelTransformerMapper";
import { InfoLabelTailMapper } from "../mappers/InfoLabelTailMapper";
import { InfoLabelDateMapper } from "../mappers/InfoLabelDateMapper";
import { InfoLabelTextMapper } from "../mappers/InfoLabelTextMapper";
import { ActivityIndicatorMapper } from "../mappers/ActivityIndicatorMapper";
import { ActivityNotificationMapper } from "../mappers/ActivityNotificationMapper";
import { LabelFeedbackConfigProvider } from "../config/labels/LabelFeedbackConfigProvider";
import { ColorLerper } from "../adapters/environment/ColorLerper";
import { LoggerAdapter } from "../adapters/environment/LoggerAdapter";
import { LabelDataStore } from "../adapters/labels/LabelDataStore";
import { LabelFeedbackAdapter } from "../adapters/labels/LabelFeedbackAdapter";
import { BookInfoMapper } from "../mappers/BookInfoMapper";
import { SectionInfoMapper } from "../mappers/SectionInfoMapper";
import { BooksStaticInfoRepository } from "../adapters/arrangement/BooksStaticInfoRepository";
import { BookNamesProvider } from "../adapters/arrangement/BookNamesProvider";
import type {
  ArrangementInfoConfig,
  BookStaticInfoConfig,
} from "../models/arrangement";
import {
  SetStrictTag,
  AnimateStrictTag,
  ApplyStrictMod,
  GetBotScales,
} from "../functions/casualos";
import { PieceHierarchyService } from "../../application/services/PieceHierarchyService";
import { ViewportService } from "../../application/services/ViewportService";
import { TourGuideService } from "../../application/services/TourGuideService";
import { SequenceStateService } from "../../application/services/SequenceStateService";
import { ExplodedViewService } from "../../application/services/ExplodedVIewService";
import { TestamentSelectionService } from "../../application/services/TestamentSelectionService";
import { ScripturePiecesStateService } from "../../application/services/ScripturePiecesStateService";
import { PieceInteractabilityService } from "../../application/services/PieceInteractabilityService";
import { BookChaptersManagementService } from "../../application/services/BookChaptersManagementService";
import { ChapterSelectionService } from "../../application/services/ChapterSelectionService";
import { VersesBundleSelectionService } from "../../application/services/VersesBundleSelectionService";
import { VersesInteractionService } from "../../application/services/VersesInteractionService";
import { SpatialNavigationService } from "../../application/services/SpatialNavigationService";
import { ScripturePieceDraggingService } from "../../application/services/ScripturePieceDraggingService";
import { ScripturePieceSelectionReleaseService } from "../../application/services/ScripturePieceSelectionReleaseService";
import { StackStructureService } from "../../application/services/StackStructureService";
import { PieceLifecycleService } from "../../application/services/PieceLifecycleService";
import { PieceHighlightService } from "../../application/services/PieceHighlightService";
import { ScripturePieceDragService } from "../../application/services/ScripturePieceDragService";
import { ScripturePieceDropService } from "../../application/services/ScripturePieceDropService";
import { BookStackUpdaterService } from "../../application/services/BookStackUpdaterService";
import { SectionStackUpdaterService } from "../../application/services/SectionStackUpdaterService";
import { TestamentStackUpdaterService } from "../../application/services/TestamentStackUpdaterService";
import { BibleStackUpdaterService } from "../../application/services/BibleStackUpdaterService";
import { StackUpdateService } from "../../application/services/StackUpdateService";
import { BookSelectionService } from "../../application/services/BookSelectionService";
import { SectionSelectionService } from "../../application/services/SectionSelectionService";
import { BibleLifecycleService } from "../../application/services/BibleLifecycleService";
import { StackManagementService } from "../../application/services/StackManagementService";
import { BibleSequenceService } from "../../application/services/BibleSequenceService";
import { BookInteractionService } from "../../application/services/BookInteractionService";
import { SectionInteractionService } from "../../application/services/SectionInteractionService";
import { TestamentInteractionService } from "../../application/services/TestamentInteractionService";
import { ChapterInteractionService } from "../../application/services/ChapterInteractionService";
import { VersesBundleInteractionService } from "../../application/services/VersesBundleInteractionService";
import { StackPresenceNavigationService } from "../../application/services/StackPresenceNavigationService";
import { ExperienceService } from "../../application/services/ExperienceService";
import { BaseEventManager } from "../../application/services/BaseEventManager";
import type { BibleStackEvents } from "../../domain/models/events";
import { PieceActivityService } from "../../application/services/PieceActivityService";
import { ArrangementService } from "../../application/services/ArrangementService";
import { ArrangementMapper } from "../mappers/ArrangementMapper";
import { UserPresenceService } from "../../application/services/UserPresenceService";
import { ActivityIndicatorsAdapter } from "../adapters/pieceActivity/ActivityIndicatorsAdapter";
import { ActivityIndicatorsConfigProvider } from "../config/activityIndicators/ActivityIndicatorsConfigProvider";
import { ActivityIndicatorBotsRepository } from "../config/activityIndicators/ActivityIndicatorBotsRepository";
import { ActivityNotificationAdapter } from "../adapters/pieceActivity/ActivityNotificationAdapter";
import { PieceLabelService } from "../../application/services/PieceLabelService";
import { LabelAdapter } from "../adapters/labels/LabelAdapter";
import { LabelsConfigProvider } from "../config/labels/LabelsConfigProvider";
import { LabelDateService } from "../../application/services/LabelDateService";
import { PiecesConfigProvider } from "../config/pieces.tsx/PiecesConfigProvider";
import { TranslationsConfigProvider } from "../config/translation/TranslationsConfigProvider";
import { ScriptureService } from "../../application/services/ScriptureService";
import type { ArrangementInfo } from "../../domain/models/arrangement";
import { RenderOrderAdapter } from "../adapters/environment/RenderOrderAdapter";
import { CameraController } from "../controllers/casualos/CameraController";
import { CanvasInteractionController } from "../controllers/casualos/CanvasInteractionController";
import { ExperienceController } from "../controllers/experience/ExperienceController";
import { BookInteractionController } from "../controllers/stack/BookInteractionController";
import { ChapterInteractionController } from "../controllers/stack/ChapterInteractionController";
import { CoverInteractionController } from "../controllers/stack/CoverInteractionController";
import { SectionInteractionController } from "../controllers/stack/SectionInteractionController";
import { TestamentInteractionController } from "../controllers/stack/TestamentInteractionController";
import { VerseInteractionController } from "../controllers/stack/VerseInteractionController";
import { VersesBundleInteractionController } from "../controllers/stack/VersesBundleInteractionController";
import { RelocationEventMapper } from "../mappers/RelocationEventMapper";
import { BotStateController } from "../controllers/stack/BotStateController";
import { CrossLineInteractionController } from "../controllers/stack/CrossLineInteractionController";
import { createPieceStateMap } from "../controllers/stack/pieceStateMap";
import { createBotStateChangeStrategyFactory } from "../controllers/stack/botStateChangeStrategy";
import { makeLabelPropertiesStrategies } from "../config/labels/makeLabelPropertiesStrategies";
import { PieceStateService } from "../../application/services/PieceStateService";
import { onClickArg } from "@casual-simulation/aux-common";
import type { Vector2 } from "../../../../pattern-typings/AuxLibraryDefinitions";
import type { BotListenerParametersMap, PieceBot } from "../models/casualos";
import { ObjectPoolerConfigProvider } from "../config/objectPool/ObjectPoolConfigProvider";

let initialized = false;

export const bootstrapExtension = () => {
  if (initialized) return;

  initialized = true;

  // // 1. Instantiating mappers

  const pieceMapper = new PieceMapper();
  const stackTestamentMapper = new StackTestamentMapper();
  const stackSectionMapper = new StackSectionMapper();
  const stackSectionBookMapper = new StackSectionBookMapper();
  const stackBookMapper = new StackBookMapper();
  const stackChapterMapper = new StackChapterMapper();
  const stackSectionShadowMapper = new StackSectionShadowMapper();
  const stackShadowMapper = new StackShadowMapper();
  const stackTransformerMapper = new StackTransformerMapper();
  const stackCoverMapper = new StackCoverMapper();
  const stackLowerCoverMapper = new StackLowerCoverMapper();
  const stackCrossLineMapper = new StackCrossLineMapper();
  const versesBundleMapper = new VersesBundleMapper();
  const verseMapper = new VerseMapper();
  const infoLabelTransformerMapper = new InfoLabelTransformerMapper({
    pieceMapperPort: pieceMapper,
  });
  const infoLabelTailMapper = new InfoLabelTailMapper({
    pieceMapperPort: pieceMapper,
  });
  const infoLabelDateMapper = new InfoLabelDateMapper({
    pieceMapperPort: pieceMapper,
  });
  const infoLabelTextMapper = new InfoLabelTextMapper({
    pieceMapperPort: pieceMapper,
  });
  const activityIndicatorMapper = new ActivityIndicatorMapper();
  const activityNotificationMapper = new ActivityNotificationMapper();

  // // 2. Instantiating config providers

  const layoutConfigProvider = new LayoutConfigProvider();
  const bookInteractionConfigProvider = new BookInteractionConfigProvider();
  const stackUpdateConfigProvider = new StackUpdateConfigProvider();
  const audioConfigProvider = new AudioConfigProvider();
  const experienceConfigProvider = new ExperienceConfigProvider();
  const sectionInteractionConfigProvider =
    new SectionInteractionConfigProvider();
  const chapterSelectionConfigProvider = new ChapterSelectionConfigProvider();
  const highlightConfigProvider = new HighlightConfigProvider();
  const sequenceConfigProvider = new SequenceConfigProvider();
  const bookSetupConfigProvider = new BookSetupConfigProvider();
  const sectionSelectionConfigProvider = new SectionSelectionConfigProvider();
  const activityIndicatorsConfigProvider =
    new ActivityIndicatorsConfigProvider();
  const labelsConfigProvider = new LabelsConfigProvider();
  const piecesConfigProvider = new PiecesConfigProvider();
  const translationsConfigProvider = new TranslationsConfigProvider(
    configBot.tags.language
  );
  const objectPoolerConfigProvider = new ObjectPoolerConfigProvider();

  // // 3. Instantiating adapters

  const scripturePiecesStateService = new ScripturePiecesStateService();

  const listenTagEventBus = new ListenTagEventManager();

  const makeListeners = <K extends BiblePiece>(
    tags: (keyof BotListenerParametersMap<BotTypeMap[K]>)[]
  ): PieceListeners<BotTypeMap[K]> => {
    const listeners = {} as PieceListeners<BotTypeMap[K]>;

    for (const tag of tags) {
      listeners[tag] = (params, bot) =>
        listenTagEventBus.emit(tag, { bot, params });
    }

    return listeners;
  };

  const makePoolData = <K extends keyof BotTypeMap>(
    key: K,
    prefab: BotTypeMap[K],
    size: number
  ): PoolData<K, BotTypeMap[K]> => ({
    key,
    prefab,
    customTags: piecesConfigProvider.getInitialConfig(key),
    listeners: makeListeners(
      objectPoolerConfigProvider.getListenTags(key) ?? []
    ),
    size,
  });

  const objectPooler = new ObjectPooler<BibleStackObjectPoolerMap>(
    [
      makePoolData(BiblePieces.StackTestament, testamentPrefab, 2),
      makePoolData(BiblePieces.StackSection, sectionPrefab, 8),
      makePoolData(BiblePieces.StackBook, bookPrefab, 20),
      makePoolData(BiblePieces.StackSectionBook, bookPrefab, 8),
      makePoolData(BiblePieces.StackChapter, chapterPrefab, 20),
      makePoolData(BiblePieces.StackSectionShadow, sectionShadowPrefab, 8),
      makePoolData(BiblePieces.VersesBundle, versesBunblePrefab, 3),
      makePoolData(BiblePieces.Verse, versePrefab, 3),
      makePoolData(BiblePieces.StackCover, coverPrefab, 3),
      makePoolData(BiblePieces.StackCrossLine, crossLinePrefab, 2),
      makePoolData(BiblePieces.StackTransformer, bibleTransformerPrefab, 1),
      makePoolData(BiblePieces.StackShadow, bibleShadowPrefab, 1),
    ],
    {
      getDimension: () => os.getCurrentDimension(),
    }
  );
  const bibleDataRepository = new BibleDataRepository();
  const pieceDataRepository = new PieceDataRepository();
  const versesBundleRepository = new VersesBundleRepository();
  const visualStateRegistry = new VisualStateRegistry();
  const interactionRegistry = new InteractionRegistry();

  // Arrangement config comes from the core app via configBot tags (snapshot at
  // open): a single selected arrangement plus the book static info / names.
  const arrangementConfig = configBot.tags.arrangement
    ? (JSON.parse(
        configBot.tags.arrangement as string
      ) as ArrangementInfoConfig)
    : undefined;
  if (!arrangementConfig) {
    throw new Error(
      "bootstrap: arrangementConfig not found at bootstrapExtension"
    );
  }
  const getArrangement = () => arrangementConfig;
  const booksStaticInfo = JSON.parse(
    (configBot.tags.booksStaticInfo as string | undefined) ?? "{}"
  ) as Record<string, BookStaticInfoConfig>;
  const booksStaticInfoRepository = new BooksStaticInfoRepository(
    booksStaticInfo
  );
  const bookInfoMapper = new BookInfoMapper({
    getArrangement,
    booksStaticInfoRepository: booksStaticInfoRepository,
  });
  const sectionInfoMapper = new SectionInfoMapper({
    bookInfoMapper: bookInfoMapper,
    getArrangement,
  });
  const arrangementMapper = new ArrangementMapper({
    booksStaticInfoRepository: booksStaticInfoRepository,
    sectionInfoMapperPort: sectionInfoMapper,
  });
  const arrangementDomain = arrangementMapper.toDomain(arrangementConfig);
  const bookNames = JSON.parse(
    (configBot.tags.bookNames as string | undefined) ?? "{}"
  ) as Record<string, string>;
  const bookNamesProvider = new BookNamesProvider(bookNames);

  const loggerAdapter = new LoggerAdapter();
  const colorLerper = new ColorLerper();
  const labelDataStore = new LabelDataStore({});
  const labelFeedbackConfigProvider = new LabelFeedbackConfigProvider();
  const labelFeedbackAdapter = new LabelFeedbackAdapter({
    dimensionProvider: () => os.getCurrentDimension(),
    labelFeedbackConfigProviderPort: labelFeedbackConfigProvider,
    infoLabelTextMapperPort: infoLabelTextMapper,
    activityIndicatorMapperPort: activityIndicatorMapper,
    infoLabelTransformerMapperPort: infoLabelTransformerMapper,
    infoLabelTailMapperPort: infoLabelTailMapper,
    infoLabelDateMapperPort: infoLabelDateMapper,
  });
  const stackPieceLifecycleAdapter = new StackPieceLifecycleAdapter({
    objectPoolerPort: objectPooler,
    testamentMapperPort: stackTestamentMapper,
    sectionMapperPort: stackSectionMapper,
    bookMapperPort: stackBookMapper,
    chapterMapperPort: stackChapterMapper,
    sectionShadowMapperPort: stackSectionShadowMapper,
    sectionBookMapperPort: stackSectionBookMapper,
    versesBundleMapperPort: versesBundleMapper,
    verseMapperPort: verseMapper,
    stackTransformerMapperPort: stackTransformerMapper,
    coverMapperPort: stackCoverMapper,
    crossLineMapperPort: stackCrossLineMapper,
    stackShadowMapperPort: stackShadowMapper,
  });

  const bibleSetupAdapter = new BibleSetupAdapter({
    configProviderPort: layoutConfigProvider,
    visualStateRegistryPort: visualStateRegistry,
    pieceMapperPort: pieceMapper,
    stackPieceLifecycleAdapterPort: stackPieceLifecycleAdapter,
    testamentMapperPort: stackTestamentMapper,
    dimensionProviderPort: {
      getCurrentDimension: () => os.getCurrentDimension(),
    },
  });
  // Book layout/shape/setup have no cross-adapter deps (or only backward ones),
  // so they are built first — the stack updaters below consume them.
  const bookStackLayoutAdapter = new BookStackLayoutAdapter();
  const selectedBookLayoutAdapter = new SelectedBookLayoutAdapter({
    sectionBookVisualStateRegistryPort: visualStateRegistry,
    stackConfigProviderPort: layoutConfigProvider,
  });
  const bookShapeAdapter = new BookShapeAdapter({
    stackUpdateConfigProvider: stackUpdateConfigProvider,
    visualStateRegistry: visualStateRegistry,
    getBotScales: GetBotScales,
    setStrictTag: SetStrictTag,
    animateStrictTag: AnimateStrictTag,
    loggerPort: loggerAdapter,
  });
  const bookSetupAdapter = new BookSetupAdapter({
    getDimension: () => os.getCurrentDimension(),
    bookMapper: stackBookMapper,
    sectionMapper: stackSectionMapper,
    bookStackLayoutAdapter: bookStackLayoutAdapter,
    visualStateRegistry: visualStateRegistry,
    bookSetupConfigProvider: bookSetupConfigProvider,
    loggerPort: loggerAdapter,
    stackConfigProvider: layoutConfigProvider,
    bookInfoMapper: bookInfoMapper,
  });

  // Stack updaters are wired bottom-up (book -> section -> testament -> bible)
  // so each dependency is already instantiated when referenced.
  const bookStackUpdaterAdapter = new BookStackUpdaterAdapter({
    getDimension: () => os.getCurrentDimension(),
    stackUpdateConfigProvider: stackUpdateConfigProvider,
    bookMapper: stackBookMapper,
    sectionBookMapper: stackSectionBookMapper,
    sectionMapper: stackSectionMapper,
    bookStackLayoutAdapter: bookStackLayoutAdapter,
    bookShapeAdapter: bookShapeAdapter,
    selectedBookLayoutAdapter: selectedBookLayoutAdapter,
    visualStateRegistry: visualStateRegistry,
    setStrictTag: SetStrictTag,
    animateStrictTag: AnimateStrictTag,
    loggerPort: loggerAdapter,
    stackConfigProvider: layoutConfigProvider,
  });
  const sectionStackUpdaterAdapter = new SectionStackUpdaterAdapter({
    getDimension: () => os.getCurrentDimension(),
    stackUpdateConfigProvider: stackUpdateConfigProvider,
    sectionMapper: stackSectionMapper,
    sectionShadowMapper: stackSectionShadowMapper,
    bookStackUpdaterAdapter: bookStackUpdaterAdapter,
    visualStateRegistry: visualStateRegistry,
    getBotScales: GetBotScales,
    setStrictTag: SetStrictTag,
    applyStrictMod: ApplyStrictMod,
    animateStrictTag: AnimateStrictTag,
    loggerPort: loggerAdapter,
    stackConfigProvider: layoutConfigProvider,
  });
  const testamentStackUpdaterAdapter = new TestamentStackUpdaterAdapter({
    getDimension: () => os.getCurrentDimension(),
    stackUpdateConfigProvider: stackUpdateConfigProvider,
    testamentMapper: stackTestamentMapper,
    sectionBookMapper: stackSectionBookMapper,
    sectionStackUpdaterAdapter: sectionStackUpdaterAdapter,
    bookStackUpdaterAdapter: bookStackUpdaterAdapter,
    visualStateRegistry: visualStateRegistry,
    setStrictTag: SetStrictTag,
    animateStrictTag: AnimateStrictTag,
    loggerPort: loggerAdapter,
    stackConfigProvider: layoutConfigProvider,
  });
  const bibleStackUpdaterAdapter = new BibleStackUpdaterAdapter({
    getDimension: () => os.getCurrentDimension(),
    stackUpdateConfigProvider: stackUpdateConfigProvider,
    lowerCoverMapper: stackLowerCoverMapper,
    defaultCoverMapper: stackCoverMapper,
    crossLineMapper: stackCrossLineMapper,
    testamentStackUpdaterAdapter: testamentStackUpdaterAdapter,
    setStrictTag: SetStrictTag,
    animateStrictTag: AnimateStrictTag,
    loggerPort: loggerAdapter,
    stackConfigProvider: layoutConfigProvider,
  });

  const pieceAdapter = new PieceAdapter({
    pieceMapperPort: pieceMapper,
    dimensionProviderPort: {
      getCurrentDimension: () => os.getCurrentDimension(),
    },
  });
  const pieceHighlightAdapter = new PieceHighlightAdapter({
    testamentMapperPort: stackTestamentMapper,
    sectionMapperPort: stackSectionMapper,
    sectionBookMapperPort: stackSectionBookMapper,
    bookMapperPort: stackBookMapper,
    chapterMapperPort: stackChapterMapper,
    visualStatePort: visualStateRegistry,
    animationConfigProviderPort: highlightConfigProvider,
    pieceDataRepositoryPort: pieceDataRepository,
  });
  const pieceUnhighlightSchedulerAdapter =
    new PieceUnhighlightSchedulerAdapter();

  // Verses before verses-bundle before chapter-selection (chapter selection
  // consumes the verses-bundle adapter).
  const versesAdapter = new VersesAdapter({ mapper: verseMapper });
  const versesBundleAdapter = new VersesBundleAdapter({
    mapper: versesBundleMapper,
    visualStateRegistry: visualStateRegistry,
    versesAdapter: versesAdapter,
  });
  const sectionSelectionAdapter = new SectionSelectionAdapter({
    getDimension: () => os.getCurrentDimension(),
    selectionConfigProvider: sectionSelectionConfigProvider,
    shadowMapper: stackSectionShadowMapper,
    sectionMapper: stackSectionMapper,
    visualStateRegistry: visualStateRegistry,
    bookSetupAdapter: bookSetupAdapter,
    bookMapper: stackBookMapper,
    bookStackLayoutAdapter: bookStackLayoutAdapter,
    stackConfigProvider: layoutConfigProvider,
  });
  const chapterSelectionAdapter = new ChapterSelectionAdapter({
    getDimension: () => os.getCurrentDimension(),
    configProvider: chapterSelectionConfigProvider,
    mapper: stackChapterMapper,
    visualStateRegistry: visualStateRegistry,
    versesBundleMapper: versesBundleMapper,
    versesBundleAdapter: versesBundleAdapter,
    colorLerper: colorLerper,
    labelDataStore: labelDataStore,
    labelFeedbackAdapter: labelFeedbackAdapter,
    stackConfigProvider: layoutConfigProvider,
    getBookName: bookNamesProvider.getBookName,
  });
  const tourGuideAdapter = new TourGuideAdapter();
  const bibleRecenterAdapter = new BibleRecenterAdapter({
    getDimension: () => os.getCurrentDimension(),
    transformerMapper: stackTransformerMapper,
    coverMapper: stackCoverMapper,
  });

  const cameraAdapter = new CameraAdapter({
    sequenceConfigProviderPort: sequenceConfigProvider,
  });
  const bibleSetupCameraAdapter = new BibleSetupCameraAdapter({
    cameraAdapterPort: cameraAdapter,
  });
  const environmentAdapter = new EnvironmentAdapter();
  const experienceAdapter = new ExperienceAdapter({
    experienceConfigProviderPort: experienceConfigProvider,
    environmentAdapterPort: environmentAdapter,
  });
  const bibleSequenceAdapter = new BibleSequenceAdapter({
    configProviderPort: sequenceConfigProvider,
    dimensionProviderPort: {
      getCurrentDimension: () => os.getCurrentDimension(),
    },
    visualStateRegistryPort: visualStateRegistry,
    coverMapperPort: stackCoverMapper,
    lowerCoverMapperPort: stackLowerCoverMapper,
    crossLineMapperPort: stackCrossLineMapper,
    testamentMapperPort: stackTestamentMapper,
    sectionMapperPort: stackSectionMapper,
    sectionBookMapperPort: stackSectionBookMapper,
    bookMapperPort: stackBookMapper,
    sectionShadowMapperPort: stackSectionShadowMapper,
    pieceMapperPort: pieceMapper,
    pieceAdapterPort: pieceAdapter,
    sectionInfoMapperPort: sectionInfoMapper,
  });
  const audioAdapter = new AudioAdapter({
    audioConfigProvider: audioConfigProvider,
  });
  const activityIndicatorBotsRepository = new ActivityIndicatorBotsRepository();
  const activityIndicatorsAdapter = new ActivityIndicatorsAdapter({
    objectPooler: objectPooler,
    configProviderPort: activityIndicatorsConfigProvider,
    botsRepositoryPort: activityIndicatorBotsRepository,
    activityIndicatorMapperPort: activityIndicatorMapper,
    labelTextMapperPort: infoLabelTextMapper,
    dimensionProviderPort: {
      getDimension: () => os.getCurrentDimension(),
    },
  });
  const activityNotificationAdapter = new ActivityNotificationAdapter({
    objectPooler,
    dimensionProviderPort: {
      getDimension: () => os.getCurrentDimension(),
    },
    pieceMapperPort: pieceMapper,
    activityNotificationMapper,
  });
  const labelAdapter = new LabelAdapter({
    objectPooler,
    labelConfigProviderPort: labelsConfigProvider,
    dimensionProviderPort: {
      getDimension: () => os.getCurrentDimension(),
    },
    infoLabelTextMapperPort: infoLabelTextMapper,
    infoLabelTransformerMapperPort: infoLabelTransformerMapper,
    infoLabelDateMapperPort: infoLabelDateMapper,
    infoLabelTailMapperPort: infoLabelTailMapper,
    pieceMapperPort: pieceMapper,
  });
  const renderOrderAdapter = new RenderOrderAdapter({
    dimensionProviderPort: {
      getCurrentDimension: () => os.getCurrentDimension(),
    },
    pieceMapperPort: pieceMapper,
  });

  // 4. Instantiating services
  //
  // Ordered leaf -> composite so acyclic (forward) service deps resolve. The
  // only true cycle is PieceLifecycleService <-> StackStructureService: we build
  // StackStructureService first with its pieceLifecycleServicePort left as a
  // TODO (cyclic). TODOs also mark deps with no instance in the pattern (event
  // ports, id/awaiter, and core-only services: arrangement/scripture/
  // userPresence/pieceLabel).

  // Single event bus for the whole stack, typed with the domain event map.
  // Satisfies every `*EventPort` (each is a narrower view over BibleStackEvents).
  const bibleStackEventManager = new BaseEventManager<BibleStackEvents>();
  const labelDateService = new LabelDateService({
    eventPort: bibleStackEventManager,
  });
  const userPresenceService = new UserPresenceService({
    userPresenceProviderPort: {
      getSelectedReadingInstance: () => undefined,
      getRemotesPresence: () => new Map(),
      getCurrUserId: () => authBot?.id ?? configBot.id,
    },
  });
  const arrangementService = new ArrangementService({
    arrangementConfigProviderPort: {
      getStaticArrangements: () => [arrangementDomain],
    },
    eventManager: bibleStackEventManager,
    arrangementIndex: 0,
    customArrangementStorePort: {
      tryAddArrangement: (arrangement: ArrangementInfo) => false,
      tryRemoveArrangement: (arrangement: ArrangementInfo) => false,
      getArrangements: () => [],
    },
  });
  const pieceActivityService = new PieceActivityService({
    dataRegistryPort: pieceDataRepository,
    arrangementServicePort: arrangementService,
    labelDataStorePort: labelDataStore,
    userPresenceServicePort: userPresenceService,
    activityIndicatorsAdapterPort: activityIndicatorsAdapter,
    activityNotificationAdapterPort: activityNotificationAdapter,
    userColorStorePort: {
      getUserColor: () => undefined,
    },
    readingInstanceProviderPort: {
      getOwnReadingInstances: () => [],
      getRemotesReadingInstances: () => [],
    },
    loggerPort: loggerAdapter,
  });
  const pieceLabelService = new PieceLabelService({
    labelAdapterPort: labelAdapter,
    labelDataStorePort: labelDataStore,
    indicatorsUpdaterPort: pieceActivityService,
    dateFormatGetterPort: labelDateService,
    idGeneratorPort: {
      getId: () => uuid(),
    },
    activityIndicatorsAdapterPort: activityIndicatorsAdapter,
    labelAnimationAdapterPort: labelFeedbackAdapter,
    labelPropertiesStrategies: makeLabelPropertiesStrategies({
      pieceDataRepository,
      visualStateRegistry,
      translationsConfigProvider,
      bookNamesProvider,
      booksStaticInfoRepository,
      labelDateService,
      scripturePiecesStateService,
    }),
  });

  const pieceHierarchyService = new PieceHierarchyService({
    pieceDataRepositoryPort: pieceDataRepository,
    bibleDataRepositoryPort: bibleDataRepository,
  });
  const viewportService = new ViewportService({
    bibleDataRepositoryPort: bibleDataRepository,
    pieceDataRepositoryPort: pieceDataRepository,
  });
  const tourGuideService = new TourGuideService({
    tourGuieAdapterPort: tourGuideAdapter,
  });
  const sequenceStateService = new SequenceStateService({
    sequenceEventPort: bibleStackEventManager,
  });
  const explodedViewService = new ExplodedViewService();
  const testamentSelectionService = new TestamentSelectionService();
  const pieceInteractabilityService = new PieceInteractabilityService();
  const bookChaptersManagementService = new BookChaptersManagementService();

  const chapterSelectionService = new ChapterSelectionService({
    loggerPort: loggerAdapter,
    chapterSelectionAdapterPort: chapterSelectionAdapter,
    versesBundleLifecycleAdapterPort: stackPieceLifecycleAdapter,
    indicatorsDeleterPort: pieceActivityService,
    indicatorsUpdaterPort: pieceActivityService,
    notificationDeleterPort: pieceActivityService,
    labelManagerPort: pieceLabelService,
  });
  const versesBundleSelectionService = new VersesBundleSelectionService({
    sequenceStateServicePort: sequenceStateService,
  });
  const versesInteractionService = new VersesInteractionService({
    sequenceStateServicePort: sequenceStateService,
  });
  const spatialNavigationService = new SpatialNavigationService({
    sequenceStateServicePort: sequenceStateService,
    bibleDataRepositoryPort: bibleDataRepository,
    bibleRecenterAdapterPort: bibleRecenterAdapter,
  });
  const scripturePieceDraggingService = new ScripturePieceDraggingService({
    pieceAdapterPort: pieceAdapter,
    pieceDataRepositoryPort: pieceDataRepository,
    sequenceStateServicePort: sequenceStateService,
    pieceHierarchyServicePort: pieceHierarchyService,
  });
  const scripturePieceSelectionReleaseService =
    new ScripturePieceSelectionReleaseService({
      pieceAdapterPort: pieceAdapter,
      pieceDataRepositoryPort: pieceDataRepository,
      sequenceStateServicePort: sequenceStateService,
      pieceHierarchyServicePort: pieceHierarchyService,
    });

  const scriptureService = new ScriptureService(
    booksStaticInfoRepository,
    arrangementMapper.toDomain(arrangementConfig)
  );
  const pieceLifecycleService = new PieceLifecycleService({
    pieceDataRepositoryPort: pieceDataRepository,
    stackPieceLifecycleAdapterPort: stackPieceLifecycleAdapter,
    versesBundleDataRepositoryPort: versesBundleRepository,
    pieceLifecycleEventPort: bibleStackEventManager,
    pieceLabelServicePort: pieceLabelService,
    scriptureServicePort: scriptureService,
    arrangementServicePort: arrangementService,
    idGenerator: {
      getId: () => uuid(),
    },
    configProviderPort: layoutConfigProvider,
  });
  const stackStructureService = new StackStructureService({
    pieceAdapterPort: pieceAdapter,
    stackStructureEventPort: bibleStackEventManager,
    pieceLifecycleServicePort: pieceLifecycleService,
    // TODO (manual, cyclic): pieceLifecycleServicePort (<-> PieceLifecycleService).
  });
  const pieceHighlightService = new PieceHighlightService({
    pieceHighlightAdapterPort: pieceHighlightAdapter,
    schedulerAdapterPort: pieceUnhighlightSchedulerAdapter,
    configProviderPort: highlightConfigProvider,
    pieceDataRepositoryPort: pieceDataRepository,
    pieceHierarchyServicePort: pieceHierarchyService,
    sequenceStateServicePort: sequenceStateService,
    eventPort: bibleStackEventManager,
    activityNotificationAdapterPort: activityNotificationAdapter,
    pieceActivityServicePort: pieceActivityService,
    pieceLabelServicePort: pieceLabelService,
  });
  const scripturePieceDragService = new ScripturePieceDragService({
    sequenceStateServicePort: sequenceStateService,
    pieceAdapterPort: pieceAdapter,
    scripturePieceDataRepositoryPort: pieceDataRepository,
    pieceHierarchyServicePort: pieceHierarchyService,
    pieceHighlightServicePort: pieceHighlightService,
    stackStructureServicePort: stackStructureService,
  });
  const scripturePieceDropService = new ScripturePieceDropService({
    pieceAdapterPort: pieceAdapter,
    pieceDataRepositoryPort: pieceDataRepository,
    sequenceStateServicePort: sequenceStateService,
    pieceHierarchyServicePort: pieceHierarchyService,
    chapterSelectionServicePort: chapterSelectionService,
    pieceHighlightServicePort: pieceHighlightService,
    pieceDropEventPort: bibleStackEventManager,
  });

  // Stack updater services (leaf -> composite).
  const bookStackUpdaterService = new BookStackUpdaterService({
    updaterAdapterPort: bookStackUpdaterAdapter,
    bookChaptersManagementServicePort: bookChaptersManagementService,
    pieceLabelServicePort: pieceLabelService,
  });
  const sectionStackUpdaterService = new SectionStackUpdaterService({
    updaterAdapterPort: sectionStackUpdaterAdapter,
    bookStackUpdaterPort: bookStackUpdaterService,
    pieceLifecyclePort: stackPieceLifecycleAdapter,
    pieceLabelServicePort: pieceLabelService,
  });
  const testamentStackUpdaterService = new TestamentStackUpdaterService({
    updaterAdapterPort: testamentStackUpdaterAdapter,
    sectionUpdaterPort: sectionStackUpdaterService,
    bookStackUpdaterPort: bookStackUpdaterService,
  });
  const bibleStackUpdaterService = new BibleStackUpdaterService({
    updaterAdapterPort: bibleStackUpdaterAdapter,
    testamentUpdaterPort: testamentStackUpdaterService,
    loggerPort: loggerAdapter,
  });
  const stackUpdateService = new StackUpdateService({
    pieceInteractabilityPort: pieceInteractabilityService,
    bibleStackUpdaterPort: bibleStackUpdaterService,
    bibleDataRepositoryPort: bibleDataRepository,
    pieceDataRepositoryPort: pieceDataRepository,
    testamentStackUpdaterPort: testamentStackUpdaterService,
    sectiontackUpdaterPort: sectionStackUpdaterService,
    bookStackUpdaterPort: bookStackUpdaterService,
  });

  const bookSelectionService = new BookSelectionService({
    pieceAdapterPort: pieceAdapter,
    stackUpdateServicePort: stackUpdateService,
    pieceHighlighterPort: pieceHighlightService,
    loggerPort: loggerAdapter,
    bookSelectionEventPort: bibleStackEventManager,
  });
  const sectionSelectionService = new SectionSelectionService({
    labelDataStorePort: labelDataStore,
    pieceHighlighterPort: pieceHighlightService,
    bookSelectionServicePort: bookSelectionService,
    pieceLifecycleServicePort: pieceLifecycleService,
    stackUpdateServicePort: stackUpdateService,
    sectionSelectionAdapterPort: sectionSelectionAdapter,
    explodedViewServicePort: explodedViewService,
    bookSpawnerPort: stackPieceLifecycleAdapter,
    sectionSelectionEventPort: bibleStackEventManager,
    pieceLabelServicePort: pieceLabelService,
  });
  const bibleLifecycleService = new BibleLifecycleService({
    pieceLifecycleServicePort: pieceLifecycleService,
    bibleDataRepositoryPort: bibleDataRepository,
    stackPieceLifecycleAdapterPort: stackPieceLifecycleAdapter,
    bibleSetupAdapterPort: bibleSetupAdapter,
    bibleLifecycleEventPort: bibleStackEventManager,
    pieceLifecycleAdapterPort: stackPieceLifecycleAdapter,
    idGeneratorPort: {
      getId: () => uuid(),
    },
    arrangementServicePort: arrangementService,
  });
  const stackManagementService = new StackManagementService({
    bibleLifecycleServicePort: bibleLifecycleService,
    pieceLifecycleServicePort: pieceLifecycleService,
    bibleDataRepositoryPort: bibleDataRepository,
    pieceDataRepositoryPort: pieceDataRepository,
  });
  const bibleSequenceService = new BibleSequenceService({
    bibleSequenceAdapterPort: bibleSequenceAdapter,
    scripturePiecesStateServicePort: scripturePiecesStateService,
    configProviderPort: sequenceConfigProvider,
    pieceHighlightServicePort: pieceHighlightService,
    stackPieceLifecycleAdapterPort: stackPieceLifecycleAdapter,
    pieceAdapterPort: pieceAdapter,
    bookChaptersManagementServicePort: bookChaptersManagementService,
    pieceDataRepositoryPort: pieceDataRepository,
    eventPort: bibleStackEventManager,
    awaiterPort: {
      sleep: (ms) => os.sleep(ms),
    },
    pieceLabelServicePort: pieceLabelService,
    labelDataRepositoryPort: labelDataStore,
    renderOrderAdapterPort: renderOrderAdapter,
  });

  // Interaction services.
  const bookInteractionService = new BookInteractionService({
    bookDataRepositoryPort: pieceDataRepository,
    pieceHierarchyServicePort: pieceHierarchyService,
    tourGuideServicePort: tourGuideService,
    bookSelectionServicePort: bookSelectionService,
    pieceHighlightServicePort: pieceHighlightService,
    explodedViewServicePort: explodedViewService,
    sequenceStateServicePort: sequenceStateService,
    bookInteractionConfigProviderPort: bookInteractionConfigProvider,
    pieceAdapterPort: pieceAdapter,
  });
  const sectionInteractionService = new SectionInteractionService({
    sectionDataRepositoryPort: pieceDataRepository,
    pieceHierarchyServicePort: pieceHierarchyService,
    tourGuideServicePort: tourGuideService,
    pieceHighlightServicePort: pieceHighlightService,
    sectionInteractionConfigProviderPort: sectionInteractionConfigProvider,
    sectionSelectionServicePort: sectionSelectionService,
    sequenceStateServicePort: sequenceStateService,
  });
  const testamentInteractionService = new TestamentInteractionService({
    sequenceStateServicePort: sequenceStateService,
    testamentDataRepositoryPort: pieceDataRepository,
    pieceHierarchyServicePort: pieceHierarchyService,
    tourGuideServicePort: tourGuideService,
    testamentSelectionServicePort: testamentSelectionService,
    pieceHighlightServicePort: pieceHighlightService,
  });
  const chapterInteractionService = new ChapterInteractionService({
    chapterDataRepositoryPort: pieceDataRepository,
    pieceHierarchyServicePort: pieceHierarchyService,
    chapterSelectionServicePort: chapterSelectionService,
    pieceHighlighterPort: pieceHighlightService,
    userPresenceServicePort: {
      updateUserPresence: () => {},
    },
    chapterNavigationServicePort: {
      openChapter: () => {},
    },
  });
  const versesBundleInteractionService = new VersesBundleInteractionService({
    sequenceStateServicePort: sequenceStateService,
    versesBundleDataRepositoryPort: versesBundleRepository,
    versesBundleSelectionServicePort: versesBundleSelectionService,
    versesBundleAdapterPort: versesBundleAdapter,
  });
  const stackPresenceNavigationService = new StackPresenceNavigationService({
    bibleDataRepositoryPort: bibleDataRepository,
    pieceAdapterPort: pieceAdapter,
    pieceDataRepositoryPort: pieceDataRepository,
    sequenceStateServicePort: sequenceStateService,
    chapterSelectionServicePort: chapterSelectionService,
    pieceHierarchyServicePort: pieceHierarchyService,
    bibleSequenceServicePort: bibleSequenceService,
    bookSelectionServicePort: bookSelectionService,
    testamentSelectionServicePort: testamentSelectionService,
    sectionSelectionServicePort: sectionSelectionService,
    explodedViewServicePort: explodedViewService,
    presenceProviderPort: {
      getActiveTab: () => undefined,
    },
    scriptureServicePort: scriptureService,
    awaiterPort: {
      sleep: (ms) => os.sleep(ms),
    },
    arrangementServicePort: arrangementService,
  });
  const experienceService = new ExperienceService({
    environmentAdapterPort: environmentAdapter,
    stackManagementServicePort: stackManagementService,
    pieceHighlightServicePort: pieceHighlightService,
    interactionRegistryServicePort: interactionRegistry,
    experienceAdapterPort: experienceAdapter,
    scripturePiecesStateServicePort: scripturePiecesStateService,
    experienceConfigProviderPort: experienceConfigProvider,
    sequenceStateServicePort: sequenceStateService,
    cameraAdapterPort: cameraAdapter,
    bibleLifecycleServicePort: bibleLifecycleService,
    bibleSequenceServicePort: bibleSequenceService,
    stackPresenceNavigationServicePort: stackPresenceNavigationService,
    awaiterPort: {
      sleep: (ms) => os.sleep(ms),
    },
  });
  const pieceStateService = new PieceStateService({
    labelPositionUpdaterPort: pieceLabelService,
    pieceDataRepositoryPort: pieceDataRepository,
    bookChaptersManagementServicePort: bookChaptersManagementService,
    activityIndicatorsAdapterPort: activityIndicatorsAdapter,
    activityNotificationAdapterPort: activityNotificationAdapter,
  });

  // 5. Instantiating controllers

  const relocationEventMapper = new RelocationEventMapper({
    pieceMapperPort: pieceMapper,
    getDimension: () => os.getCurrentDimension(),
  });

  const cameraController = new CameraController({
    viewportPort: viewportService,
    renderOrderAdapter,
  });
  const canvasInteractionController = new CanvasInteractionController({
    spatialNavigationPort: spatialNavigationService,
  });
  const experienceController = new ExperienceController({
    experienceServicePort: experienceService,
  });
  const coverInteractionController = new CoverInteractionController({
    experienceServicePort: experienceService,
  });
  const testamentInteractionController = new TestamentInteractionController({
    testamentInteractionServicePort: testamentInteractionService,
    pieceMapperPort: pieceMapper,
    dragServicePort: scripturePieceDragService,
    draggingServicePort: scripturePieceDraggingService,
    selectionReleaseServicePort: scripturePieceSelectionReleaseService,
    dropServicePort: scripturePieceDropService,
    draggingEventMapperPort: relocationEventMapper,
    dropEventMapperPort: relocationEventMapper,
  });
  const sectionInteractionController = new SectionInteractionController({
    sectionInteractionServicePort: sectionInteractionService,
    pieceMapperPort: pieceMapper,
    dragServicePort: scripturePieceDragService,
    draggingServicePort: scripturePieceDraggingService,
    selectionReleaseServicePort: scripturePieceSelectionReleaseService,
    dropServicePort: scripturePieceDropService,
    draggingEventMapperPort: relocationEventMapper,
    dropEventMapperPort: relocationEventMapper,
  });
  const bookInteractionController = new BookInteractionController({
    bookInteractionServicePort: bookInteractionService,
    pieceMapperPort: pieceMapper,
    dragServicePort: scripturePieceDragService,
    draggingServicePort: scripturePieceDraggingService,
    selectionReleaseServicePort: scripturePieceSelectionReleaseService,
    dropServicePort: scripturePieceDropService,
    draggingEventMapperPort: relocationEventMapper,
    dropEventMapperPort: relocationEventMapper,
  });
  const chapterInteractionController = new ChapterInteractionController({
    chapterInteractionServicePort: chapterInteractionService,
    pieceMapperPort: pieceMapper,
    dragServicePort: scripturePieceDragService,
    draggingServicePort: scripturePieceDraggingService,
    selectionReleaseServicePort: scripturePieceSelectionReleaseService,
    dropServicePort: scripturePieceDropService,
    draggingEventMapperPort: relocationEventMapper,
    dropEventMapperPort: relocationEventMapper,
  });
  const verseInteractionController = new VerseInteractionController({
    versesInteractionServicePort: versesInteractionService,
    pieceMapperPort: pieceMapper,
  });
  const versesBundleInteractionController =
    new VersesBundleInteractionController({
      versesBundleInteractionServicePort: versesBundleInteractionService,
      pieceMapperPort: pieceMapper,
    });

  const dimension = os.getCurrentDimension();

  const pieceStateMap = createPieceStateMap(dimension);

  const makeBotStateChangeStrategy = createBotStateChangeStrategyFactory({
    pieceStateMap,
    pieceStateService,
  });

  const botStateController = new BotStateController({
    stateChangeStrategies: {
      StackTestament: makeBotStateChangeStrategy(stackTestamentMapper),
      StackSection: makeBotStateChangeStrategy(stackSectionMapper),
      StackBook: makeBotStateChangeStrategy(stackBookMapper),
      StackChapter: makeBotStateChangeStrategy(stackChapterMapper),
      StackSectionShadow: makeBotStateChangeStrategy({
        toDomain: (bot: typeof sectionShadowPrefab) =>
          stackSectionShadowMapper.toDomain(bot, bot.tags.sectionDataId),
      }),
    },
  });

  const crossLineInteractionController = new CrossLineInteractionController({
    pieceMapperPort: pieceMapper,
  });

  // 6. Event wiring

  listenTagEventBus.subscribe("onBotChanged", ({ bot, params }) => {
    botStateController.handleStateChanged(bot, params.tags);
  });

  listenTagEventBus.subscribe("onClick", ({ bot, params }) => {
    switch (bot.tags.type) {
      case "StackTestament":
        testamentInteractionController.handleTestamentClick({
          testament: bot as TestamentBot,
          interaction: params.modality,
        });
        break;
      case "StackSection":
        sectionInteractionController.handleSectionClick({
          section: bot as SectionBot,
          typeOfInteraction: params.modality,
        });
        break;
      case "StackBook":
      case "StackSectionBook":
        bookInteractionController.handleBookClick({
          book: bot as BookBot,
          interaction: params.modality,
        });
        break;
      case "StackChapter":
        chapterInteractionController.handleChapterClick({
          chapter: bot as ChapterBot,
          interaction: params.modality,
        });
        break;
      case "StackCover":
        coverInteractionController.handleCoverClick();
        break;
      case "Verse":
        verseInteractionController.handleVerseClick(bot as VerseBot);
        break;
      case "VersesBundle":
        versesBundleInteractionController.handleBundleClick(
          bot as VersesBundleBot
        );
        break;
      default:
        break;
    }
  });

  listenTagEventBus.subscribe("onDrag", ({ bot }) => {
    switch (bot.tags.type) {
      case "StackTestament":
        testamentInteractionController.handleTestamentDrag(bot as TestamentBot);
        break;
      case "StackSection":
        sectionInteractionController.handleSectionDrag(bot as SectionBot);
        break;
      case "StackBook":
      case "StackSectionBook":
        bookInteractionController.handleBookDrag({ book: bot as BookBot });
        break;
      case "StackChapter":
        chapterInteractionController.handleChapterDrag(bot as ChapterBot);
        break;
      default:
        break;
    }
    os.enableCustomDragging();
  });

  listenTagEventBus.subscribe("onDragging", ({ bot, params }) => {
    switch (bot.tags.type) {
      case "StackTestament":
        testamentInteractionController.handleTestamentDragging({
          testament: bot as TestamentBot,
          draggingEvent: params,
        });
        break;
      case "StackSection":
        sectionInteractionController.handleSectionDragging({
          section: bot as SectionBot,
          draggingEvent: params,
        });
        break;
      case "StackBook":
      case "StackSectionBook":
        bookInteractionController.handleBookDragging({
          book: bot as BookBot,
          draggingEvent: params,
        });
        break;
      case "StackChapter":
        chapterInteractionController.handleChapterDragging({
          chapter: bot as ChapterBot,
          draggingEvent: params,
        });
        break;
      default:
        break;
    }
  });

  listenTagEventBus.subscribe("onDrop", ({ bot, params }) => {
    switch (bot.tags.type) {
      case "StackTestament":
        testamentInteractionController.handleTestamentDrop({
          testament: bot as TestamentBot,
          dropEvent: params,
        });
        break;
      case "StackSection":
        sectionInteractionController.handleSectionDrop({
          section: bot as SectionBot,
          dropEvent: params,
        });
        break;
      case "StackBook":
      case "StackSectionBook":
        bookInteractionController.handleBookDrop({
          book: bot as BookBot,
          dropEvent: params,
        });
        break;
      case "StackChapter":
        chapterInteractionController.handleChapterDrop({
          chapter: bot as ChapterBot,
          dropEvent: params,
        });
        break;
      default:
        break;
    }
  });

  listenTagEventBus.subscribe("onPointerEnter", ({ bot }) => {
    switch (bot.tags.type) {
      case "StackTestament":
        testamentInteractionController.handleTestamentPointerEnter(
          bot as TestamentBot
        );
        break;
      case "StackSection":
        sectionInteractionController.handleSectionPointerEnter(
          bot as SectionBot
        );
        break;
      case "StackBook":
      case "StackSectionBook":
        bookInteractionController.handleBookPointerEnter(bot as BookBot);
        break;
      case "StackChapter":
        chapterInteractionController.handleChapterPointerEnter(
          bot as ChapterBot
        );
        break;
      case "VersesBundle":
        versesBundleInteractionController.handleVersesBundlePointerEnter(
          bot as VersesBundleBot
        );
        break;
      default:
        break;
    }
  });

  listenTagEventBus.subscribe("onPointerExit", ({ bot }) => {
    switch (bot.tags.type) {
      case "StackSection":
        sectionInteractionController.handleSectionPointerExit(
          bot as SectionBot
        );
        break;
      case "StackBook":
      case "StackSectionBook":
        bookInteractionController.handleBookPointerExit(bot as BookBot);
        break;
      case "StackChapter":
        chapterInteractionController.handleChapterPointerExit(
          bot as ChapterBot
        );
        break;
      case "VersesBundle":
        versesBundleInteractionController.handleVersesBundlePointerExit(
          bot as VersesBundleBot
        );
        break;
      default:
        break;
    }
  });

  listenTagEventBus.subscribe("onPointerUp", ({ bot }) => {
    switch (bot.tags.type) {
      case "StackTestament":
        testamentInteractionController.handleTestamentPointerUp({
          testament: bot as TestamentBot,
        });
        break;
      case "StackSection":
        sectionInteractionController.handleSectionPointerUp(bot as SectionBot);
        break;
      case "StackBook":
      case "StackSectionBook":
        bookInteractionController.handleBookPointerUp(bot as BookBot);
        break;
      case "StackChapter":
        chapterInteractionController.handleChapterPointerUp(bot as ChapterBot);
        break;
      case "StackCrossLine":
        crossLineInteractionController.handleCrossLinePointerUp(
          bot as CrossLineBot
        );
        break;
      default:
        break;
    }
  });

  listenTagEventBus.subscribe("onPointerDown", ({ bot }) => {
    switch (bot.tags.type) {
      case "StackCrossLine":
        crossLineInteractionController.handleCrossLinePointerDown(
          bot as CrossLineBot
        );
        break;
      default:
        break;
    }
  });

  // Global grid events fire on the entrypoint bot (not a pooled piece), so its
  // listener is attached here directly, calling the controller straight from the
  // native callback — no listen-tag bus in between.
  os.addBotListener(entrypointBot, "onGridUp", () =>
    canvasInteractionController.handleOnGridUp()
  );

  // TODO: Add an onBotChanged event listener to the configBot to listen to camera rotation changes.
  // call to an environment or camera controller to update all the activity notifications.

  // 7. Disposers
};
