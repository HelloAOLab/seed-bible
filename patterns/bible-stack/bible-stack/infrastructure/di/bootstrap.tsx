import { PieceMapper } from "../mappers/PieceMapper";
import { LayoutConfigProvider } from "../config/layout/LayoutConfigProvider";
import { ObjectPooler } from "../adapters/environment/ObjectPooler";
import type { BibleStackObjectPoolerMap } from "../models/objectPooler";
import {
  BiblePieces,
  type Piece,
  type SectionShadow,
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
import { CapitalizeFirstLetter } from "../../domain/functions/string";
import { TranslationsConfigProvider } from "../config/translation/TranslationsConfigProvider";
import type { ArrangementTranslationKey } from "../config/translation/ArrangementTranslations";
import { ComputeDateLabelText } from "../../domain/functions/time";
import { ScriptureService } from "../../application/services/ScriptureService";
import type { ArrangementInfo } from "../../domain/models/arrangement";
import { RenderOrderAdapter } from "../adapters/environment/renderOrderAdapter";
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

export const bootstrapExtension = () => {
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

  // // 3. Instantiating adapters

  const objectPooler = new ObjectPooler<BibleStackObjectPoolerMap>(
    [
      {
        key: BiblePieces.StackTestament,
        prefab: testamentPrefab,
        customTags: piecesConfigProvider.getInitialConfig(
          BiblePieces.StackTestament
        ),
        size: 2,
      },
      {
        key: BiblePieces.StackSection,
        prefab: sectionPrefab,
        customTags: piecesConfigProvider.getInitialConfig(
          BiblePieces.StackSection
        ),
        size: 8,
      },
      {
        key: BiblePieces.StackBook,
        prefab: bookPrefab,
        customTags: piecesConfigProvider.getInitialConfig(
          BiblePieces.StackBook
        ),
        size: 20,
      },
      {
        key: BiblePieces.StackSectionBook,
        prefab: bookPrefab,
        customTags: piecesConfigProvider.getInitialConfig(
          BiblePieces.StackSectionBook
        ),
        size: 8,
      },
      {
        key: BiblePieces.StackChapter,
        prefab: chapterPrefab,
        customTags: piecesConfigProvider.getInitialConfig(
          BiblePieces.StackChapter
        ),
        size: 20,
      },
      {
        key: BiblePieces.StackSectionShadow,
        prefab: sectionShadowPrefab,
        customTags: piecesConfigProvider.getInitialConfig(
          BiblePieces.StackSectionShadow
        ),
        size: 8,
      },
      {
        key: BiblePieces.VersesBundle,
        prefab: versesBunblePrefab,
        customTags: piecesConfigProvider.getInitialConfig(
          BiblePieces.VersesBundle
        ),
        size: 3,
      },
      {
        key: BiblePieces.Verse,
        prefab: versePrefab,
        customTags: piecesConfigProvider.getInitialConfig(BiblePieces.Verse),
        size: 3,
      },
      {
        key: BiblePieces.StackCover,
        prefab: coverPrefab,
        customTags: piecesConfigProvider.getInitialConfig(
          BiblePieces.StackCover
        ),
        size: 3,
      },
      {
        key: BiblePieces.StackCrossLine,
        prefab: crossLinePrefab,
        customTags: piecesConfigProvider.getInitialConfig(
          BiblePieces.StackCrossLine
        ),
        size: 2,
      },
      {
        key: BiblePieces.StackTransformer,
        prefab: bibleTransformerPrefab,
        customTags: piecesConfigProvider.getInitialConfig(
          BiblePieces.StackTransformer
        ),
        size: 1,
      },
      {
        key: BiblePieces.StackShadow,
        prefab: bibleShadowPrefab,
        customTags: piecesConfigProvider.getInitialConfig(
          BiblePieces.StackShadow
        ),
        size: 1,
      },
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
    labelPropertiesStrategies: {
      [BiblePieces.StackTestament]: {
        getLabel: (piece: Piece<"StackTestament">) => {
          const data = pieceDataRepository.getPieceData(piece);
          if (!data) {
            throw new Error(
              `BibleStack bootstrap: data not found at getLabel at createPieceLabelService`
            );
          }
          return data.getPieceInfoProperty("name");
        },
        getColor: (piece: Piece<"StackTestament">) => {
          const data = pieceDataRepository.getPieceData(piece);
          if (!data) {
            throw new Error(
              `BibleStack bootstrap: data not found at getColor at createPieceLabelService`
            );
          }
          return "#ffffff";
        },
        getLabelColor: (piece: Piece<"StackTestament">) => {
          const data = pieceDataRepository.getPieceData(piece);
          if (!data) {
            throw new Error(
              `BibleStack bootstrap: data not found at getColor at createPieceLabelService`
            );
          }
          return visualStateRegistry.getStateProperty({
            piece,
            property: "labelTextColor",
          });
        },
        getLabelPositioning: (piece: Piece<"StackTestament">) => {
          const data = pieceDataRepository.getPieceData(piece);
          if (!data) {
            throw new Error(
              `bible-stack bootstrap: data not found at getLabelPositioning at pieceLabelService`
            );
          }
          return data.isOnTheGround ? "Top" : "LeftSided";
        },
        isInteractable: true,
        makesAttentionFeedback: false,
      },
      [BiblePieces.StackSection]: {
        getLabel: (piece: Piece<"StackSection">) => {
          const data = pieceDataRepository.getPieceData(piece);
          if (!data) {
            throw new Error(
              `BibleStack bootstrap: data not found at getLabel at createPieceLabelService`
            );
          }
          let name: string | undefined;
          const translationKey = data.getPieceInfoProperty("translationKey");
          if (translationKey) {
            const translatedName =
              translationsConfigProvider.getArrangementTranslation(
                translationKey as ArrangementTranslationKey
              );
            if (translatedName) {
              name = translatedName;
            }
          }
          if (!name) {
            name = data.getPieceInfoProperty("name");
          }
          return CapitalizeFirstLetter(name.split("-").join(" "));
        },
        getColor: (piece: Piece<"StackSection">) => {
          const data = pieceDataRepository.getPieceData(piece);
          if (!data) {
            throw new Error(
              `BibleStack bootstrap: data not found at getColor at createPieceLabelService`
            );
          }
          return data.getPieceInfoProperty("color");
        },
        getLabelColor: (piece: Piece<"StackSection">) => {
          const data = pieceDataRepository.getPieceData(piece);
          if (!data) {
            throw new Error(
              `BibleStack bootstrap: data not found at getColor at createPieceLabelService`
            );
          }
          return visualStateRegistry.getStateProperty({
            piece,
            property: "labelTextColor",
          });
        },
        getLabelPositioning: (piece: Piece<"StackSection">) => {
          const data = pieceDataRepository.getPieceData(piece);
          if (!data) {
            throw new Error(
              `bible-stack bootstrap: data not found at getLabelPositioning at pieceLabelService`
            );
          }
          return data.isOnTheGround ? "Top" : "LeftSided";
        },
        makesAttentionFeedback: true,
        isInteractable: true,
      },
      [BiblePieces.StackSectionShadow]: {
        getLabel: (piece: Piece<"StackSectionShadow">) => {
          const sectionData = pieceDataRepository.getDataById(
            "StackSection",
            (piece as SectionShadow).sectionDataId
          );
          if (!sectionData) {
            throw new Error(
              "bible-stack bootstrap: sectionData not fonud at getLabel"
            );
          }
          let name: string | undefined;
          const translationKey =
            sectionData.getPieceInfoProperty("translationKey");
          if (translationKey) {
            const translatedName =
              translationsConfigProvider.getArrangementTranslation(
                translationKey as ArrangementTranslationKey
              );
            if (translatedName) {
              name = translatedName;
            }
          }
          if (!name) {
            name = sectionData.getPieceInfoProperty("name");
          }
          return CapitalizeFirstLetter(name.split("-").join(" "));
        },
        getColor: (piece: Piece<"StackSectionShadow">) => {
          const sectionData = pieceDataRepository.getDataById(
            "StackSection",
            (piece as SectionShadow).sectionDataId
          );
          if (!sectionData) {
            throw new Error(
              "bible-stack bootstrap: sectionData not fonud at getLabel"
            );
          }
          if (!sectionData.piece) {
            throw new Error(
              "bible-stack bootstrap: sectionData.piede not defined at getLabel"
            );
          }
          return visualStateRegistry.getStateProperty({
            piece: sectionData.piece,
            property: "labelTextColor",
          });
        },
        getLabelColor: () => {
          return "#ffffff";
        },
        getLabelPositioning: (piece: Piece<"StackSectionShadow">) => {
          const sectionData = pieceDataRepository.getDataById(
            "StackSection",
            (piece as SectionShadow).sectionDataId
          );
          if (!sectionData) {
            throw new Error(
              "bible-stack bootstrap: sectionData not fonud at getLabel"
            );
          }
          if (sectionData.isOnTheGround) {
            return "Top";
          }
          return "RightSidedCorner";
        },
        isInteractable: true,
        makesAttentionFeedback: false,
      },
      [BiblePieces.StackSectionBook]: {
        getLabel: (piece: Piece<"StackSectionBook">) => {
          const data = pieceDataRepository.getPieceData(piece);
          if (!data) {
            throw new Error(
              `BibleStack bootstrap: data not found at getLabel at pieceLabelService`
            );
          }
          const bookId = data.getPieceBookInfoProperty("bookId");
          return bookNamesProvider.getBookName(bookId) ?? bookId;
        },
        getDate: (piece: Piece<"StackSectionBook">) => {
          const data = pieceDataRepository.getPieceData(piece);
          if (!data) {
            throw new Error(
              `BibleStack bootstrap: data not found at getLabel at pieceLabelService`
            );
          }
          if (scripturePiecesStateService.shouldShowLabelDates) {
            const staticInfo = booksStaticInfoRepository.getBookStaticInfo(
              data.getPieceBookInfoProperty("bookId")
            );
            if (staticInfo) {
              const currentYear = new Date().getFullYear();
              return staticInfo.relativeDateRange
                ? ComputeDateLabelText({
                    format: labelDateService.dateFormat,
                    range: staticInfo.relativeDateRange,
                    currentYear,
                  })
                : undefined;
            }
          }
          return undefined;
        },
        getColor: (piece: Piece<"StackSectionBook">) => {
          const data = pieceDataRepository.getPieceData(piece);
          if (!data) {
            throw new Error(
              `BibleStack bootstrap: data not found at getColor at pieceLabelService`
            );
          }
          if (data.selectionState === "Selected") {
            return visualStateRegistry.getStateProperty({
              piece,
              property: "labelTextColor",
            });
          }
          return "#ffffff";
        },
        getLabelColor: (piece: Piece<"StackSectionBook">) => {
          const data = pieceDataRepository.getPieceData(piece);
          if (!data) {
            throw new Error(
              `BibleStack bootstrap: data not found at getLabelColor at pieceLabelService`
            );
          }
          if (data.selectionState === "Selected") {
            return "#ffffff";
          }
          return visualStateRegistry.getStateProperty({
            piece,
            property: "labelTextColor",
          });
        },
        getLabelPositioning: (piece: Piece<"StackSectionBook">) => {
          const data = pieceDataRepository.getPieceData(piece);
          if (!data) {
            throw new Error(
              `BibleStack bootstrap: data not found at getLabelPositioning at pieceLabelService`
            );
          }
          return data.isOnTheGround ? "Top" : "LeftSided";
        },
        isInteractable: true,
        makesAttentionFeedback: true,
      },
      [BiblePieces.StackBook]: {
        getLabel: (piece: Piece<"StackBook">) => {
          const data = pieceDataRepository.getPieceData(piece);
          if (!data) {
            throw new Error(
              `BibleStack bootstrap: data not found at getLabel at pieceLabelService`
            );
          }
          const bookId = data.getPieceInfoProperty("bookId");
          return bookNamesProvider.getBookName(bookId) ?? bookId;
        },
        getDate: (piece: Piece<"StackBook">) => {
          const data = pieceDataRepository.getPieceData(piece);
          if (!data) {
            throw new Error(
              `BibleStack bootstrap: data not found at getLabel at pieceLabelService`
            );
          }
          if (scripturePiecesStateService.shouldShowLabelDates) {
            const staticInfo = booksStaticInfoRepository.getBookStaticInfo(
              data.getPieceInfoProperty("bookId")
            );
            if (staticInfo) {
              const currentYear = new Date().getFullYear();
              return staticInfo.relativeDateRange
                ? ComputeDateLabelText({
                    format: labelDateService.dateFormat,
                    range: staticInfo.relativeDateRange,
                    currentYear,
                  })
                : undefined;
            }
          }
          return undefined;
        },
        getColor: (piece: Piece<"StackBook">) => {
          const data = pieceDataRepository.getPieceData(piece);
          if (!data) {
            throw new Error(
              `BibleStack bootstrap: data not found at getColor at pieceLabelService`
            );
          }
          if (data.selectionState === "Selected") {
            return visualStateRegistry.getStateProperty({
              piece,
              property: "labelTextColor",
            });
          }
          return "#ffffff";
        },
        getLabelColor: (piece: Piece<"StackBook">) => {
          const data = pieceDataRepository.getPieceData(piece);
          if (!data) {
            throw new Error(
              `BibleStack bootstrap: data not found at getLabelColor at pieceLabelService`
            );
          }
          if (data.selectionState === "Selected") {
            return "#ffffff";
          }
          return visualStateRegistry.getStateProperty({
            piece,
            property: "labelTextColor",
          });
        },
        getLabelPositioning: (piece: Piece<"StackBook">) => {
          const data = pieceDataRepository.getPieceData(piece);
          if (!data) {
            throw new Error(
              `BibleStack bootstrap: data not found at getLabelPositioning at pieceLabelService`
            );
          }
          return data.isOnTheGround ? "Top" : "LeftSided";
        },
        isInteractable: true,
        makesAttentionFeedback: true,
      },
      [BiblePieces.StackChapter]: {
        getLabel: (piece: Piece<"StackChapter">) => {
          const data = pieceDataRepository.getPieceData(piece);
          if (!data) {
            throw new Error(
              `bible-stack bootstrap: data not found at getLabel at pieceLabelService`
            );
          }
          const bookId = data.getCreationParam("bookId");
          const bookName = bookNamesProvider.getBookName(bookId) ?? bookId;
          return `${bookName} ${data.getPieceInfoProperty("number")}`;
        },
        getColor: () => {
          return "#ffffff";
        },
        getLabelColor: () => {
          return "#000000";
        },
        getLabelPositioning: (piece: Piece<"StackChapter">) => {
          const data = pieceDataRepository.getPieceData(piece);
          if (!data) {
            throw new Error(
              `bible-Stack bootstrap: data not found at getLabelPositioning at pieceLabelService`
            );
          }
          return data.isOnTheGround ? "Top" : "LeftSided";
        },
        isInteractable: false,
        makesAttentionFeedback: false,
      },
    },
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
  const scripturePiecesStateService = new ScripturePiecesStateService();
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
    // TODO (manual): userPresenceServicePort (core), chapterNavigationServicePort.
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

  // 5. Instantiating controllers

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
    // TODO (no instance in pattern): draggingEventMapperPort, dropEventMapperPort
  });
  const sectionInteractionController = new SectionInteractionController({
    sectionInteractionServicePort: sectionInteractionService,
    pieceMapperPort: pieceMapper,
    dragServicePort: scripturePieceDragService,
    draggingServicePort: scripturePieceDraggingService,
    selectionReleaseServicePort: scripturePieceSelectionReleaseService,
    dropServicePort: scripturePieceDropService,
    // TODO (no instance in pattern): draggingEventMapperPort, dropEventMapperPort
  });
  const bookInteractionController = new BookInteractionController({
    bookInteractionServicePort: bookInteractionService,
    pieceMapperPort: pieceMapper,
    dragServicePort: scripturePieceDragService,
    draggingServicePort: scripturePieceDraggingService,
    selectionReleaseServicePort: scripturePieceSelectionReleaseService,
    dropServicePort: scripturePieceDropService,
    // TODO (no instance in pattern): draggingEventMapperPort, dropEventMapperPort
  });
  const chapterInteractionController = new ChapterInteractionController({
    chapterInteractionServicePort: chapterInteractionService,
    pieceMapperPort: pieceMapper,
    dragServicePort: scripturePieceDragService,
    draggingServicePort: scripturePieceDraggingService,
    selectionReleaseServicePort: scripturePieceSelectionReleaseService,
    dropServicePort: scripturePieceDropService,
    // TODO (no instance in pattern): draggingEventMapperPort, dropEventMapperPort
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

  // 6. Event wiring

  // 7. Disposers
};

// // 1. Instantiating adapters

// const pieceDataRepository = new PieceDataRepository();
// const bibleDataRepository = new BibleDataRepository();
// const tourGuideAdapter = new TourGuideAdapter();

// // 2, Instantiating services

// const stackPieceLabelService = bibleVizAPI?.createPieceLabelService({
//   [BiblePieces.StackTestament]: {
//     getLabel: (piece: Piece<"StackTestament">) => {
//       const data = pieceDataRepository.getPieceData(piece);
//       if (!data) {
//         throw new Error(
//           `BibleStack bootstrap: data not found at getLabel at createPieceLabelService`
//         );
//       }
//       return data.getPieceInfoProperty("name");
//     },
//     getDate: (piece: Piece<"StackTestament">) => undefined, // TODO: Properly find the date
//     getColor: (piece: Piece<"StackTestament">) => {
//       const data = pieceDataRepository.getPieceData(piece);
//       if (!data) {
//         throw new Error(
//           `BibleStack bootstrap: data not found at getColor at createPieceLabelService`
//         );
//       }
//       return data.getPieceInfoProperty("color") ?? "#ffffff"; // TODO: Properly find the color
//     },
//     getLabelColor: (piece: Piece<"StackTestament">) => {
//       const data = pieceDataRepository.getPieceData(piece);
//       if (!data) {
//         throw new Error(
//           `BibleStack bootstrap: data not found at getColor at createPieceLabelService`
//         );
//       }
//       return data.getPieceInfoProperty("color") ?? "#ffffff"; // TODO: Properly find the color
//     },
//     labelPositioning: "LeftSided",
//     isInteractable: true,
//   },
//   [BiblePieces.StackSection]: {
//     getLabel: (piece: Piece<"StackSection">) => {
//       const data = pieceDataRepository.getPieceData(piece);
//       if (!data) {
//         throw new Error(
//           `BibleStack bootstrap: data not found at getLabel at createPieceLabelService`
//         );
//       }
//       return data.getPieceInfoProperty("name");
//     },
//     getDate: (piece: Piece<"StackSection">) => undefined, // TODO: Properly find the date
//     getColor: (piece: Piece<"StackSection">) => {
//       const data = pieceDataRepository.getPieceData(piece);
//       if (!data) {
//         throw new Error(
//           `BibleStack bootstrap: data not found at getColor at createPieceLabelService`
//         );
//       }
//       return data.getPieceInfoProperty("color") ?? "#ffffff"; // TODO: Properly find the color
//     },
//     getLabelColor: (piece: Piece<"StackSection">) => {
//       const data = pieceDataRepository.getPieceData(piece);
//       if (!data) {
//         throw new Error(
//           `BibleStack bootstrap: data not found at getColor at createPieceLabelService`
//         );
//       }
//       return data.getPieceInfoProperty("color") ?? "#ffffff"; // TODO: Properly find the color
//     },
//     labelPositioning: "LeftSided",
//     isInteractable: true,
//   },
//   [BiblePieces.StackSectionShadow]: {
//     getLabel: (piece: Piece<"StackSectionShadow">) => {
//       return "";
//     },
//     getDate: (piece: Piece<"StackSectionShadow">) => undefined, // TODO: Properly find the date
//     getColor: (piece: Piece<"StackSectionShadow">) => {
//       return "";
//     },
//     getLabelColor: (piece: Piece<"StackSectionShadow">) => {
//       return "";
//     },
//     labelPositioning: "LeftSided",
//     isInteractable: true,
//   },
//   [BiblePieces.StackSectionBook]: {
//     getLabel: (piece: Piece<"StackSectionBook">) => {
//       return "";
//     },
//     getDate: (piece: Piece<"StackSectionBook">) => undefined, // TODO: Properly find the date
//     getColor: (piece: Piece<"StackSectionBook">) => {
//       return "";
//     },
//     getLabelColor: (piece: Piece<"StackSectionBook">) => {
//       return "";
//     },
//     labelPositioning: "LeftSided",
//     isInteractable: true,
//   },
//   [BiblePieces.StackBook]: {
//     getLabel: (piece: Piece<"StackBook">) => {
//       return "";
//     },
//     getDate: (piece: Piece<"StackBook">) => undefined, // TODO: Properly find the date
//     getColor: (piece: Piece<"StackBook">) => {
//       return "";
//     },
//     getLabelColor: (piece: Piece<"StackBook">) => {
//       return "";
//     },
//     labelPositioning: "LeftSided",
//     isInteractable: true,
//   },
//   [BiblePieces.StackChapter]: {
//     getLabel: (piece: Piece<"StackChapter">) => {
//       return "";
//     },
//     getDate: (piece: Piece<"StackChapter">) => undefined, // TODO: Properly find the date
//     getColor: (piece: Piece<"StackChapter">) => {
//       return "";
//     },
//     getLabelColor: (piece: Piece<"StackChapter">) => {
//       return "";
//     },
//     labelPositioning: "LeftSided",
//     isInteractable: true,
//   },
// });
// const pieceHighlightService = new PieceHighlightService();
// const explodedViewService = new ExplodedViewService();
// const bookSelectionService = new BookSelectionService();
// const tourGuideService = new TourGuideService({
//   tourGuieAdapterPort: tourGuideAdapter,
// });
// const pieceHierarchyService = new PieceHierarchyService({
//   pieceDataRepositoryPort: pieceDataRepository,
//   bibleDataRepositoryPort: bibleDataRepository,
// });
// const bookInteractionService = new BookInteractionService({
//   bookDataRepositoryPort: pieceDataRepository,
//   pieceHierarchyServicePort: pieceHierarchyService,
//   tourGuideServicePort: tourGuideService,
//   bookSelectionServicePort: bookSelectionService,
//   pieceHighlightServicePort: pieceHighlightService,
//   explodedViewServicePort: explodedViewService,
// });

// // 3. Instantiating controllers

// bookInteractionController = new BookInteractionController(
//   bookInteractionService
// );

// testamentInteractionController = new TestamentInteractionController(
//   {} as any
// );
// sectionInteractionController = new SectionInteractionController({} as any);
// chapterInteractionController = new ChapterInteractionController({} as any);
// experienceController = new ExperienceController();

// // 4. Event wiring
// // TODO: Wire events on the go

// // 5. Adding dispose functions to disposal list

// disposeFunctions
//   .push
//   // TODO: Create and add service dispose functions on the go
//   ();

// console.log(`Bible Stack successfully initialized.`);
// };

// export const teardownApp = () => {
//   if (!isInitialized) {
//     return;
//   }
//   isInitialized = false;

//   console.log(`Uninstalling Bible Stack.`);

//   disposeFunctions.forEach((func) => func());
//   bookInteractionController = undefined;
//   testamentInteractionController = undefined;
//   sectionInteractionController = undefined;
//   chapterInteractionController = undefined;

//   console.log(`Bible Stack successfully uninstalled.`);
// };
