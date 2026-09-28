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
  CoverBot,
  CrossLineBot,
  InfoLabelTailBot,
  InfoLabelTextBot,
  SectionBot,
  TestamentBot,
  VerseBot,
  VersesBundleBot,
} from "../models/stack";
import { BiblePieces, type BiblePiece } from "../../domain/models/canvas";
import { thisTypedBot as testamentPrefab } from "../prefabs/testament/botAdapter";
import { AudioAdapter } from "../adapters/audio/AudioAdapter";
// import { BibleSetupCameraAdapter } from "../adapters/environment/BibleSetupCameraAdapter";
import { CameraAdapter } from "../adapters/environment/CameraAdapter";
import { EnvironmentAdapter } from "../adapters/environment/EnvironmentAdapter";
import { ExperienceAdapter } from "../adapters/experience/ExperienceAdapter";
import { BibleSequenceAdapter } from "../adapters/sequences/BibleSequenceAdapter";
import { BibleDataRepository } from "../adapters/stacks/BibleDataRepository";
import { PieceDataRepository } from "../adapters/stacks/PieceDataRepository";
import { VersesBundleRepository } from "../adapters/stacks/VersesBundleDataRepository";
import { VerseRepository } from "../adapters/stacks/VerseDataRepository";
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
import { TestamentSelectionAdapter } from "../adapters/stacks/TestamentSelectionAdapter";
import { VersesAdapter } from "../adapters/stacks/VersesAdapter";
import { VersesBundleAdapter } from "../adapters/stacks/VersesBundleAdapter";
import { TourGuideAdapter } from "../adapters/stacks/TourGuideAdapter";
import { TourGuideConfigProvider } from "../config/tourGuide/TourGuideConfigProvider";
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
import { thisTypedBot as activityIndicatorPrefab } from "../prefabs/activityIndicator/botAdapter";
import { thisTypedBot as activityNotificationPrefab } from "../prefabs/activityNotification/botAdapter";
import { thisTypedBot as infoLabelDatePrefab } from "../prefabs/infoLabelDate/botAdapter";
import { thisTypedBot as infoLabelTailPrefab } from "../prefabs/infoLabelTail/botAdapter";
import { thisTypedBot as infoLabelTextPrefab } from "../prefabs/infoLabelText/botAdapter";
import { thisTypedBot as infoLabelTransformerPrefab } from "../prefabs/infoLabelTransformer/botAdapter";
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
import { ScriptureConfigProvider } from "../config/scripture/ScriptureConfigProvider";
import { ArrangementConfigProvider } from "../config/arrangement/ArrangementConfigProvider";
import { SetStrictTag, GetBotScales } from "../functions/casualos";
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
import { PiecesConfigProvider } from "../config/pieces/PiecesConfigProvider";
import { TranslationsConfigProvider } from "../config/translation/TranslationsConfigProvider";
import { ScriptureService } from "../../application/services/ScriptureService";
import type { ArrangementInfo } from "../../domain/models/arrangement";
import { RenderOrderAdapter } from "../adapters/environment/RenderOrderAdapter";
import { CameraController } from "../controllers/casualos/CameraController";
import { CanvasInteractionController } from "../controllers/casualos/CanvasInteractionController";
import { BookInteractionController } from "../controllers/stack/BookInteractionController";
import { ChapterInteractionController } from "../controllers/stack/ChapterInteractionController";
import { CoverInteractionController } from "../controllers/stack/CoverInteractionController";
import { CoverInteractionService } from "../../application/services/CoverInteractionService";
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
import type { BotListenerParametersMap } from "../models/casualos";
import { ObjectPoolerConfigProvider } from "../config/objectPool/ObjectPoolConfigProvider";
import { PaintService } from "../../application/services/PaintService";
import { PaintAdapter } from "../adapters/stacks/PaintAdapter";
import { BookChapterManagementAdapter } from "../adapters/stacks/BookChaptersManagementAdapter";
import { TestamentSelectionConfigProvider } from "../config/testamentSelection/TestamentSelectionConfigProvider";
import { VersesBundleSelectionAdapter } from "../adapters/stacks/VersesBundleSelectionAdapter";
import { VersesBundleConfigProvider } from "../config/versesBundleSelection/VersesBundleConfigProvider";
import { BibleModeService } from "../../application/services/BibleModeService";
import { BibleModeSequenceAdapter } from "../adapters/sequences/BibleModeSequenceAdapter";
import { LabelInteractionController } from "../controllers/stack/LabelInteractionController";
import { LabelInteractionService } from "../../application/services/InteractionLabelService";
import { SectionShadowInteractionService } from "../../application/services/SectionShadowInteractionService";
import type { BibleStackInfrastructureEvents } from "../models/events";
import { UpperCoverOpacityAdapter } from "../adapters/stacks/UpperCoverOpacityAdapter";

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

  // 1. Instantiating mappers

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
  const testamentSelectionConfigProvider =
    new TestamentSelectionConfigProvider();
  const versesBundleConfigProvider = new VersesBundleConfigProvider();

  // // 3. Instantiating adapters

  const scripturePiecesStateService = new ScripturePiecesStateService();

  const infrastructureEventManager =
    new BaseEventManager<BibleStackInfrastructureEvents>();
  const listenTagEventBus = new ListenTagEventManager();

  function makeListeners<K extends BiblePiece>(
    tags: (keyof BotListenerParametersMap<BotTypeMap[K]>)[]
  ): PieceListeners<BotTypeMap[K]> {
    const listeners = {} as PieceListeners<BotTypeMap[K]>;

    for (const tag of tags) {
      listeners[tag] = (params, bot) =>
        listenTagEventBus.emit(tag, { bot, params });
    }

    return listeners;
  }

  function makePoolData<K extends keyof BotTypeMap>(
    key: K,
    prefab: BotTypeMap[K],
    size: number
  ): PoolData<K, BotTypeMap[K]> {
    return {
      key,
      prefab,
      customTags: piecesConfigProvider.getInitialConfig(key),
      listeners: makeListeners(
        objectPoolerConfigProvider.getListenTags(key) ?? []
      ),
      size,
    };
  }
  const visualStateRegistry = new VisualStateRegistry();
  const objectPooler = new ObjectPooler<BibleStackObjectPoolerMap>({
    poolsData: {
      [BiblePieces.StackTestament]: makePoolData(
        BiblePieces.StackTestament,
        testamentPrefab,
        2
      ),
      [BiblePieces.StackSection]: makePoolData(
        BiblePieces.StackSection,
        sectionPrefab,
        8
      ),
      [BiblePieces.StackBook]: makePoolData(
        BiblePieces.StackBook,
        bookPrefab,
        20
      ),
      [BiblePieces.StackSectionBook]: makePoolData(
        BiblePieces.StackSectionBook,
        bookPrefab,
        8
      ),
      [BiblePieces.StackChapter]: makePoolData(
        BiblePieces.StackChapter,
        chapterPrefab,
        20
      ),
      [BiblePieces.StackSectionShadow]: makePoolData(
        BiblePieces.StackSectionShadow,
        sectionShadowPrefab,
        8
      ),
      [BiblePieces.VersesBundle]: makePoolData(
        BiblePieces.VersesBundle,
        versesBunblePrefab,
        3
      ),
      [BiblePieces.Verse]: makePoolData(BiblePieces.Verse, versePrefab, 3),
      [BiblePieces.StackCover]: makePoolData(
        BiblePieces.StackCover,
        coverPrefab,
        3
      ),
      [BiblePieces.StackCrossLine]: makePoolData(
        BiblePieces.StackCrossLine,
        crossLinePrefab,
        2
      ),
      [BiblePieces.StackTransformer]: makePoolData(
        BiblePieces.StackTransformer,
        bibleTransformerPrefab,
        1
      ),
      [BiblePieces.StackShadow]: makePoolData(
        BiblePieces.StackShadow,
        bibleShadowPrefab,
        1
      ),
      [BiblePieces.ActivityIndicator]: makePoolData(
        BiblePieces.ActivityIndicator,
        activityIndicatorPrefab,
        8
      ),
      [BiblePieces.ActivityNotification]: makePoolData(
        BiblePieces.ActivityNotification,
        activityNotificationPrefab,
        5
      ),
      [BiblePieces.InfoLabelDate]: makePoolData(
        BiblePieces.InfoLabelDate,
        infoLabelDatePrefab,
        8
      ),
      [BiblePieces.InfoLabelTail]: makePoolData(
        BiblePieces.InfoLabelTail,
        infoLabelTailPrefab,
        8
      ),
      [BiblePieces.InfoLabelText]: makePoolData(
        BiblePieces.InfoLabelText,
        infoLabelTextPrefab,
        8
      ),
      [BiblePieces.InfoLabelTransformer]: makePoolData(
        BiblePieces.InfoLabelTransformer,
        infoLabelTransformerPrefab,
        8
      ),
    },
    dimensionGetter: {
      getDimension: getDimension,
    },
    eventManager: infrastructureEventManager,
  });
  const bibleDataRepository = new BibleDataRepository();
  const pieceDataRepository = new PieceDataRepository();
  const versesBundleRepository = new VersesBundleRepository();
  const verseRepository = new VerseRepository();
  const interactionRegistry = new InteractionRegistry();

  // The scripture arrangement and per-book static info are bundled inside the
  // pattern (via config providers) instead of being sent through configBot
  // tags: together they overflowed the iframe URL's size limit. Only the book
  // names stay dynamic (still passed via configBot tags).
  const arrangementConfigProvider = new ArrangementConfigProvider();
  const arrangementConfig = arrangementConfigProvider.getDefaultArrangement();
  const getArrangement = () => arrangementConfig;
  const scriptureConfigProvider = new ScriptureConfigProvider();
  const booksStaticInfoRepository = new BooksStaticInfoRepository(
    scriptureConfigProvider.getBooksStaticInfo()
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
    dimensionProvider: getDimension,
    labelFeedbackConfigProviderPort: labelFeedbackConfigProvider,
    infoLabelTextMapperPort: infoLabelTextMapper,
    activityIndicatorMapperPort: activityIndicatorMapper,
    infoLabelTransformerMapperPort: infoLabelTransformerMapper,
    infoLabelTailMapperPort: infoLabelTailMapper,
    infoLabelDateMapperPort: infoLabelDateMapper,
    visualStateRegistryPort: visualStateRegistry,
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
      getCurrentDimension: getDimension,
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
    loggerPort: loggerAdapter,
    colorLerper: colorLerper,
  });
  const bookSetupAdapter = new BookSetupAdapter({
    getDimension: getDimension,
    bookMapper: stackBookMapper,
    sectionMapper: stackSectionMapper,
    bookStackLayoutAdapter: bookStackLayoutAdapter,
    visualStateRegistry: visualStateRegistry,
    bookSetupConfigProvider: bookSetupConfigProvider,
    loggerPort: loggerAdapter,
    layoutConfigProvider: layoutConfigProvider,
    bookInfoMapper: bookInfoMapper,
    piecesConfigProvider,
  });

  // Stack updaters are wired bottom-up (book -> section -> testament -> bible)
  // so each dependency is already instantiated when referenced.
  const bookStackUpdaterAdapter = new BookStackUpdaterAdapter({
    getDimension: getDimension,
    stackUpdateConfigProvider: stackUpdateConfigProvider,
    bookMapper: stackBookMapper,
    sectionBookMapper: stackSectionBookMapper,
    sectionMapper: stackSectionMapper,
    bookStackLayoutAdapter: bookStackLayoutAdapter,
    bookShapeAdapter: bookShapeAdapter,
    selectedBookLayoutAdapter: selectedBookLayoutAdapter,
    visualStateRegistry: visualStateRegistry,
    loggerPort: loggerAdapter,
    stackConfigProvider: layoutConfigProvider,
    bookSetupConfigProvider: bookSetupConfigProvider,
  });
  const sectionStackUpdaterAdapter = new SectionStackUpdaterAdapter({
    getDimension: getDimension,
    stackUpdateConfigProvider: stackUpdateConfigProvider,
    sectionMapper: stackSectionMapper,
    sectionShadowMapper: stackSectionShadowMapper,
    bookStackUpdaterAdapter: bookStackUpdaterAdapter,
    visualStateRegistry: visualStateRegistry,
    getBotScales: GetBotScales,
    loggerPort: loggerAdapter,
    stackConfigProvider: layoutConfigProvider,
  });
  const testamentStackUpdaterAdapter = new TestamentStackUpdaterAdapter({
    getDimension: getDimension,
    stackUpdateConfigProvider: stackUpdateConfigProvider,
    testamentMapper: stackTestamentMapper,
    sectionBookMapper: stackSectionBookMapper,
    sectionStackUpdaterAdapter: sectionStackUpdaterAdapter,
    bookStackUpdaterAdapter: bookStackUpdaterAdapter,
    visualStateRegistry: visualStateRegistry,
    loggerPort: loggerAdapter,
    stackConfigProvider: layoutConfigProvider,
  });
  const bibleStackUpdaterAdapter = new BibleStackUpdaterAdapter({
    getDimension: getDimension,
    stackUpdateConfigProvider: stackUpdateConfigProvider,
    lowerCoverMapper: stackLowerCoverMapper,
    defaultCoverMapper: stackCoverMapper,
    crossLineMapper: stackCrossLineMapper,
    testamentStackUpdaterAdapter: testamentStackUpdaterAdapter,
    loggerPort: loggerAdapter,
    layoutConfigProvider: layoutConfigProvider,
  });

  const pieceAdapter = new PieceAdapter({
    pieceMapperPort: pieceMapper,
    dimensionProviderPort: {
      getDimension: getDimension,
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
  const cameraAdapter = new CameraAdapter({
    sequenceConfigProviderPort: sequenceConfigProvider,
  });

  const sectionSelectionAdapter = new SectionSelectionAdapter({
    getDimension: getDimension,
    selectionConfigProvider: sectionSelectionConfigProvider,
    shadowMapper: stackSectionShadowMapper,
    sectionMapper: stackSectionMapper,
    visualStateRegistry: visualStateRegistry,
    bookSetupAdapter: bookSetupAdapter,
    bookMapper: stackBookMapper,
    bookStackLayoutAdapter: bookStackLayoutAdapter,
    stackConfigProvider: layoutConfigProvider,
    cameraAdapterPort: cameraAdapter,
    bibleDataRepository: bibleDataRepository,
    pieceDataRepository: pieceDataRepository,
    pieceMapper: pieceMapper,
  });
  const chapterSelectionAdapter = new ChapterSelectionAdapter({
    getDimension: getDimension,
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
    piecesConfigProvider,
  });
  const bibleRecenterAdapter = new BibleRecenterAdapter({
    getDimension: getDimension,
    transformerMapper: stackTransformerMapper,
    coverMapper: stackCoverMapper,
  });

  // const bibleSetupCameraAdapter = new BibleSetupCameraAdapter({
  //   cameraAdapterPort: cameraAdapter,
  // });
  const environmentAdapter = new EnvironmentAdapter();
  const experienceAdapter = new ExperienceAdapter({
    experienceConfigProviderPort: experienceConfigProvider,
    environmentAdapterPort: environmentAdapter,
  });
  const bibleSequenceAdapter = new BibleSequenceAdapter({
    configProviderPort: sequenceConfigProvider,
    dimensionProviderPort: {
      getDimension: getDimension,
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
    layoutConfigProviderPort: layoutConfigProvider,
    piecesConigProvider: piecesConfigProvider,
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
      getDimension: getDimension,
    },
  });
  const activityNotificationAdapter = new ActivityNotificationAdapter({
    objectPooler,
    dimensionProviderPort: {
      getDimension: getDimension,
    },
    pieceMapperPort: pieceMapper,
    activityNotificationMapper,
  });
  const labelAdapter = new LabelAdapter({
    objectPooler,
    labelConfigProviderPort: labelsConfigProvider,
    dimensionProviderPort: {
      getDimension: getDimension,
    },
    infoLabelTextMapperPort: infoLabelTextMapper,
    infoLabelTransformerMapperPort: infoLabelTransformerMapper,
    infoLabelDateMapperPort: infoLabelDateMapper,
    infoLabelTailMapperPort: infoLabelTailMapper,
    pieceMapperPort: pieceMapper,
    visualStateRegistry,
  });
  const renderOrderAdapter = new RenderOrderAdapter({
    dimensionProviderPort: {
      getCurrentDimension: getDimension,
    },
    pieceMapperPort: pieceMapper,
  });
  const paintAdapter = new PaintAdapter({
    pieceMapper,
    visualStateRegistry,
  });
  const bookChapterManagementAdapter = new BookChapterManagementAdapter({
    bookMapper: stackBookMapper,
    sectionBookMapper: stackSectionBookMapper,
    layoutConfigProvider,
    getDimension: getDimension,
    visualStateRegistry,
    piecesConfigProvider,
    chapterMapper: stackChapterMapper,
    transformerMapper: stackTransformerMapper,
  });
  const versesBundleSelectionAdapter = new VersesBundleSelectionAdapter({
    getDimension: getDimension,
    versesBundleConfigProvider,
    versesBundleMapper,
    verseMapper,
    visualStateRegistry,
  });
  const bibleModeSequenceAdapter = new BibleModeSequenceAdapter({
    sequenceConfigProvider: sequenceConfigProvider,
    crossLineMapper: stackCrossLineMapper,
    colorLerper: colorLerper,
    piecesConfigProvider: piecesConfigProvider,
  });
  const upperCoverOpacityAdapter = new UpperCoverOpacityAdapter({
    bibleDataRepository,
    coverMapper: stackCoverMapper,
  });

  // 4. Instantiating services

  const paintService = new PaintService({
    stackDataRepository: pieceDataRepository,
    verseDataRepository: verseRepository,
    versesBundleDataRepository: versesBundleRepository,
    paintAdapterPort: paintAdapter,
  });
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
      //eslint-disable-next-line
      tryAddArrangement: (arrangement: ArrangementInfo) => false,
      //eslint-disable-next-line
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
  const sequenceStateService = new SequenceStateService({
    sequenceEventPort: bibleStackEventManager,
  });

  const pieceInteractabilityService = new PieceInteractabilityService({
    bibleDataRepositoryPort: bibleDataRepository,
    pieceDataRepositoryPort: pieceDataRepository,
    pieceAdapterPort: pieceAdapter,
    scripturePiecesStateServicePort: scripturePiecesStateService,
  });

  const chapterSelectionService = new ChapterSelectionService({
    loggerPort: loggerAdapter,
    chapterSelectionAdapterPort: chapterSelectionAdapter,
    versesBundleLifecycleAdapterPort: stackPieceLifecycleAdapter,
    pieceActivityServicePort: pieceActivityService,
    labelManagerPort: pieceLabelService,
  });
  const versesBundleSelectionService = new VersesBundleSelectionService({
    pieceLifecycleAdapterPort: stackPieceLifecycleAdapter,
    paintAdapter: paintAdapter,
    selectionAdapterPort: versesBundleSelectionAdapter,
  });
  const versesInteractionService = new VersesInteractionService({
    sequenceStateServicePort: sequenceStateService,
    paintPort: paintService,
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
  const bookChaptersManagementService = new BookChaptersManagementService({
    biggerChapterProviderPort: scriptureService,
    chapterSpawnerPort: stackPieceLifecycleAdapter,
    chaptersManagementAdapterPort: bookChapterManagementAdapter,
    scripturePiecesStateServicePort: scripturePiecesStateService,
    bibleDataRepositoryPort: bibleDataRepository,
    pieceLabelServicePort: pieceLabelService,
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
  const tourGuideConfigProvider = new TourGuideConfigProvider();
  const tourGuideAdapter = new TourGuideAdapter({
    getDimension: getDimension,
    sectionMapper: stackSectionMapper,
    visualStateRegistry: visualStateRegistry,
    cameraAdapterPort: cameraAdapter,
    pieceHighlighterPort: pieceHighlightService,
    audioAdapter: audioAdapter,
    tourGuideConfigProvider: tourGuideConfigProvider,
    loggerPort: loggerAdapter,
  });
  const tourGuideService = new TourGuideService({
    tourGuieAdapterPort: tourGuideAdapter,
  });
  const pieceLifecycleService = new PieceLifecycleService({
    pieceDataRepositoryPort: pieceDataRepository,
    stackPieceLifecycleAdapterPort: stackPieceLifecycleAdapter,
    versesBundleDataRepositoryPort: versesBundleRepository,
    verseDataRepositoryPort: verseRepository,
    pieceLifecycleEventPort: bibleStackEventManager,
    pieceLabelServicePort: pieceLabelService,
    scriptureServicePort: scriptureService,
    arrangementServicePort: arrangementService,
    idGenerator: {
      getId: () => uuid(),
    },
    configProviderPort: layoutConfigProvider,
    pieceHighlightServicePort: pieceHighlightService,
  });
  const stackStructureService = new StackStructureService({
    pieceAdapterPort: pieceAdapter,
    stackStructureEventPort: bibleStackEventManager,
    pieceLifecycleServicePort: pieceLifecycleService,
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
    loggerPort: loggerAdapter,
  });
  const sectionStackUpdaterService = new SectionStackUpdaterService({
    updaterAdapterPort: sectionStackUpdaterAdapter,
    bookStackUpdaterPort: bookStackUpdaterService,
    pieceLifecyclePort: stackPieceLifecycleAdapter,
    pieceLabelServicePort: pieceLabelService,
    loggerPort: loggerAdapter,
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

  const testamentSelectionAdapter = new TestamentSelectionAdapter({
    getDimension: getDimension,
    testamentMapper: stackTestamentMapper,
    sectionMapper: stackSectionMapper,
    sectionBookMapper: stackSectionBookMapper,
    configProvider: layoutConfigProvider,
    visualStateRegistry,
    selectionConfigProvider: testamentSelectionConfigProvider,
    sectionInfoMapper,
    cameraAdapterPort: cameraAdapter,
    renderOrderAdapterPort: renderOrderAdapter,
    bibleDataRepository,
    pieceDataRepository,
    pieceMapper,
    pieceAdapter,
    piecesConfigProviderPort: piecesConfigProvider,
  });
  const testamentSelectionService = new TestamentSelectionService({
    testamentSelectionAdapterPort: testamentSelectionAdapter,
    testamentSelectionEventPort: bibleStackEventManager,
    pieceHighlighterPort: pieceHighlightService,
    sectionSpawnerPort: stackPieceLifecycleAdapter,
    stackUpdateServicePort: stackUpdateService,
    awaiterPort: {
      sleep: (ms) => os.sleep(ms),
    },
    labelSequenceConfigProviderPort: {
      getShowSequenceDurationSeconds: (pacing) =>
        labelsConfigProvider.getShowAnimationDuration(pacing),
    },
    pieceAdapterPort: pieceAdapter,
  });

  const bookSelectionService = new BookSelectionService({
    pieceAdapterPort: pieceAdapter,
    stackUpdateServicePort: stackUpdateService,
    pieceHighlighterPort: pieceHighlightService,
    loggerPort: loggerAdapter,
    bookSelectionEventPort: bibleStackEventManager,
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
  const testamentInteractionService = new TestamentInteractionService({
    sequenceStateServicePort: sequenceStateService,
    testamentDataRepositoryPort: pieceDataRepository,
    pieceHierarchyServicePort: pieceHierarchyService,
    tourGuideServicePort: tourGuideService,
    testamentSelectionServicePort: testamentSelectionService,
    pieceHighlightServicePort: pieceHighlightService,
    paintPort: paintService,
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
    paintPort: paintService,
  });
  const versesBundleInteractionService = new VersesBundleInteractionService({
    sequenceStateServicePort: sequenceStateService,
    versesBundleDataRepositoryPort: versesBundleRepository,
    versesBundleSelectionServicePort: versesBundleSelectionService,
    versesBundleAdapterPort: versesBundleAdapter,
    paintPort: paintService,
  });

  const explodedViewService = new ExplodedViewService({
    pieceHierarchyServicePort: pieceHierarchyService,
    stackUpdateServicePort: stackUpdateService,
    pieceActivityServicePort: pieceActivityService,
    bibleStackEventPort: bibleStackEventManager,
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
    tourGuideServicePort: tourGuideService,
    pieceHierarchyServicePort: pieceHierarchyService,
  });

  const stackPresenceNavigationService = new StackPresenceNavigationService({
    loggerPort: loggerAdapter,
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

  const sectionInteractionService = new SectionInteractionService({
    sectionDataRepositoryPort: pieceDataRepository,
    pieceHierarchyServicePort: pieceHierarchyService,
    tourGuideServicePort: tourGuideService,
    pieceHighlightServicePort: pieceHighlightService,
    sectionInteractionConfigProviderPort: sectionInteractionConfigProvider,
    sectionSelectionServicePort: sectionSelectionService,
    sequenceStateServicePort: sequenceStateService,
    paintPort: paintService,
  });

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
    paintPort: paintService,
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
  const bibleModeService = new BibleModeService({
    sequenceStateServicePort: sequenceStateService,
    sequenceAdapterPort: bibleModeSequenceAdapter,
    bibleStackUpdaterPort: bibleStackUpdaterService,
    explodedViewServicePort: explodedViewService,
    pieceDataRepository: pieceDataRepository,
    sectionSelectionServicePort: sectionSelectionService,
    testamentSelectionServicePort: testamentSelectionService,
  });
  const sectionShadowInteractionService = new SectionShadowInteractionService({
    pieceDataRepositoryPort: pieceDataRepository,
    sectionSelectionServicePort: sectionSelectionService,
    sequenceStateServicePort: sequenceStateService,
    tourGuideServicePort: tourGuideService,
  });
  const labelInteractionService = new LabelInteractionService({
    labelDataRepositoryPort: labelDataStore,
    sectionInteractionServicePort: sectionInteractionService,
    sectionShadowInteractionPort: sectionShadowInteractionService,
    bookInteractionServicePort: bookInteractionService,
    testamentInteractionServicePort: testamentInteractionService,
    chapterInteractionServicePort: chapterInteractionService,
  });

  // 5. Instantiating controllers

  const relocationEventMapper = new RelocationEventMapper({
    pieceMapperPort: pieceMapper,
    getDimension: getDimension,
  });

  const cameraController = new CameraController({
    viewportPort: viewportService,
    renderOrderAdapter,
    upperCoverOpacityAdapter,
  });
  const canvasInteractionController = new CanvasInteractionController({
    spatialNavigationPort: spatialNavigationService,
  });
  const coverInteractionService = new CoverInteractionService({
    bibleDataRepositoryPort: bibleDataRepository,
    bibleSequenceServicePort: bibleSequenceService,
    sequenceStateServicePort: sequenceStateService,
  });
  const coverInteractionController = new CoverInteractionController({
    coverInteractionServicePort: coverInteractionService,
    coverMapper: stackCoverMapper,
  });
  const testamentInteractionController = new TestamentInteractionController({
    testamentInteractionServicePort: testamentInteractionService,
    pieceMapperPort: pieceMapper,
    dragServicePort: scripturePieceDragService,
    draggingServicePort: scripturePieceDraggingService,
    selectionReleaseServicePort: scripturePieceSelectionReleaseService,
    dropServicePort: scripturePieceDropService,
    relocationEventMapper: relocationEventMapper,
  });
  const sectionInteractionController = new SectionInteractionController({
    sectionInteractionServicePort: sectionInteractionService,
    pieceMapperPort: pieceMapper,
    dragServicePort: scripturePieceDragService,
    draggingServicePort: scripturePieceDraggingService,
    selectionReleaseServicePort: scripturePieceSelectionReleaseService,
    dropServicePort: scripturePieceDropService,
    relocationEventMapperPort: relocationEventMapper,
  });
  const bookInteractionController = new BookInteractionController({
    bookInteractionServicePort: bookInteractionService,
    pieceMapperPort: pieceMapper,
    dragServicePort: scripturePieceDragService,
    draggingServicePort: scripturePieceDraggingService,
    selectionReleaseServicePort: scripturePieceSelectionReleaseService,
    dropServicePort: scripturePieceDropService,
    relocationEventMapper: relocationEventMapper,
  });
  const chapterInteractionController = new ChapterInteractionController({
    chapterInteractionServicePort: chapterInteractionService,
    pieceMapperPort: pieceMapper,
    dragServicePort: scripturePieceDragService,
    draggingServicePort: scripturePieceDraggingService,
    selectionReleaseServicePort: scripturePieceSelectionReleaseService,
    dropServicePort: scripturePieceDropService,
    relocationEventMapper: relocationEventMapper,
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

  const pieceStateMap = createPieceStateMap(DIMENSION);

  const makeBotStateChangeStrategy = createBotStateChangeStrategyFactory({
    pieceStateMap,
    pieceStateService,
  });

  const botStateController = new BotStateController({
    stateChangeStrategies: {
      StackTestament: makeBotStateChangeStrategy(stackTestamentMapper),
      StackSection: makeBotStateChangeStrategy(stackSectionMapper),
      StackSectionBook: makeBotStateChangeStrategy(stackSectionBookMapper),
      StackBook: makeBotStateChangeStrategy(stackBookMapper),
      StackChapter: makeBotStateChangeStrategy(stackChapterMapper),
      StackSectionShadow: makeBotStateChangeStrategy({
        toDomain: (bot: typeof sectionShadowPrefab) =>
          stackSectionShadowMapper.toDomain(bot, bot.tags.sectionDataId),
      }),
    },
  });

  const crossLineInteractionController = new CrossLineInteractionController({
    crossLineMapperPort: stackCrossLineMapper,
    bibleModeServicePort: bibleModeService,
    bibleDataRepositoryPort: bibleDataRepository,
  });
  const labelInteractionController = new LabelInteractionController({
    labelDataStore: labelDataStore,
    labelInteractionServicePort: labelInteractionService,
  });

  // 6. Event wiring

  os.addBotListener(
    gridPortalBot,
    "onBotChanged",
    ({ tags }: { tags: "cameraRotation"[] }) => {
      if (tags.includes("cameraRotation")) {
        cameraController.handleCameraRotationChanged();
      }
    }
  );

  bibleStackEventManager.subscribe("OnStackSectionExploded", (payload) =>
    stackPresenceNavigationService.handleSectionExploded(payload)
  );

  bibleStackEventManager.subscribe("OnSectionBeginSelect", () =>
    audioAdapter.playSound("SectionOpen")
  );

  bibleStackEventManager.subscribe("OnBookEndSelect", () =>
    audioAdapter.playSound("BookSelect")
  );

  bibleStackEventManager.subscribe("OnBibleResetSequenceStart", () =>
    audioAdapter.playSound("ResetBible")
  );

  bibleStackEventManager.subscribe("OnStackPieceDrop", () =>
    audioAdapter.playSound("StackPieceDrop")
  );

  bibleStackEventManager.subscribe("OnStackPiecePulledOut", () =>
    audioAdapter.playSound("StackPiecePulledOut")
  );

  bibleStackEventManager.subscribe("OnTestamentBeginSelect", () => {
    audioAdapter.playSound("TestamentOpen");
  });

  bibleStackEventManager.subscribe(
    "OnBibleCreationBegin",
    ({ hasABibleEverBeenCreated }) => {
      if (!hasABibleEverBeenCreated) audioAdapter.playSound("BibleOpenSound");
    }
  );

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
        });
        break;
      case "StackCover":
        coverInteractionController.handleCoverClick(bot as CoverBot);
        break;
      case "Verse":
        verseInteractionController.handleVerseClick(bot as VerseBot);
        break;
      case "VersesBundle":
        versesBundleInteractionController.handleBundleClick(
          bot as VersesBundleBot
        );
        break;
      case "InfoLabelTail":
        labelInteractionController.handleLabelTailClick(
          bot as InfoLabelTailBot
        );
        break;
      case "InfoLabelText":
        labelInteractionController.handleLabelTextClick(
          bot as InfoLabelTextBot
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
      case "StackTestament":
        testamentInteractionController.handleTestamentPointerExit(
          bot as TestamentBot
        );
        break;
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

  infrastructureEventManager.subscribe("OnPieceBotReleased", ({ pieceBot }) => {
    switch (pieceBot.tags.type) {
      case BiblePieces.StackTransformer:
      case BiblePieces.StackTestament:
      case BiblePieces.StackSection:
      case BiblePieces.StackSectionShadow:
      case BiblePieces.StackSectionBook:
      case BiblePieces.StackBook:
      case BiblePieces.StackChapter:
      case BiblePieces.VersesBundle:
      case BiblePieces.Verse:
      case BiblePieces.InfoLabelTransformer:
      case BiblePieces.InfoLabelDate:
      case BiblePieces.InfoLabelText:
      case BiblePieces.InfoLabelTail:
      case BiblePieces.ActivityIndicator:
        visualStateRegistry.clearState({
          piece: { type: pieceBot.tags.type, id: pieceBot.id },
        });
        break;
      default:
        break;
    }
  });

  // TODO: Add an onBotChanged event listener to the configBot to listen to camera rotation changes.
  // call to an environment or camera controller to update all the activity notifications.

  // 7. Disposers

  experienceService.displayExperience();

  audioAdapter.bufferSounds();
};
