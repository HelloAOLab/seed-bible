import {
  registerExtension,
  // type SeedBibleState,
} from "seed-bible.app.api";
import type { BibleVizAPI } from "bibleVizUtils.infrastructure.models.seedBible";
// import { AudioAdapter } from "../adapters/audio/AudioAdapter";
// import { BibleSetupCameraAdapter } from "../adapters/environment/BibleSetupCameraAdapter";
// import { CameraAdapter } from "../adapters/environment/CameraAdapter";
// import { EnvironmentAdapter } from "../adapters/environment/EnvironmentAdapter";
// import { ExperienceAdapter } from "../adapters/experience/ExperienceAdapter";
// import { BibleSequenceAdapter } from "../adapters/sequences/BibleSequenceAdapter";
// import { BibleDataRepository } from "../adapters/stacks/BibleDataRepository";
// import { PieceDataRepository } from "../adapters/stacks/PieceDataRepository";
// import { VersesBundleRepository } from "../adapters/stacks/VersesBundleDataRepository";
// import { VisualStateRegistry } from "../adapters/stacks/VisualStateRegistry";
// import { InteractionRegistry } from "../adapters/stacks/InteractionRegistry";
// import { BibleSetupAdapter } from "../adapters/stacks/BibleSetupAdapter";
// import { BibleStackUpdaterAdapter } from "../adapters/stacks/BibleStackUpdaterAdapter";
// import { TestamentStackUpdaterAdapter } from "../adapters/stacks/TestamentStackUpdaterAdapter";
// import { SectionStackUpdaterAdapter } from "../adapters/stacks/SectionStackUpdaterAdapter";
// import { BookStackUpdaterAdapter } from "../adapters/stacks/BookStackUpdaterAdapter";
// import { BookStackLayoutAdapter } from "../adapters/stacks/BookStackLayoutAdapter";
// import { SelectedBookLayoutAdapter } from "../adapters/stacks/SelectedBookLayoutAdapter";
// import { BookShapeAdapter } from "../adapters/stacks/BookShapeAdapter";
// import { BookSetupAdapter } from "../adapters/stacks/BookSetupAdapter";
// import { StackPieceLifecycleAdapter } from "../adapters/stacks/StackPieceLifecycleAdapter";
// import { PieceAdapter } from "../adapters/stacks/PieceAdapter";
// import { PieceHighlightAdapter } from "../adapters/stacks/PieceHighlightAdapter";
// import { PieceUnhighlightSchedulerAdapter } from "../adapters/stacks/PieceUnhighlightSchedulerAdapter";
// import { SectionSelectionAdapter } from "../adapters/stacks/SectionSelectionAdapter";
// import { ChapterSelectionAdapter } from "../adapters/stacks/ChapterSelectionAdapter";
// import { VersesAdapter } from "../adapters/stacks/VersesAdapter";
// import { VersesBundleAdapter } from "../adapters/stacks/VersesBundleAdapter";
// import { TourGuideAdapter } from "../adapters/stacks/TourGuideAdapter";
// import { BibleRecenterAdapter } from "../adapters/stacks/BibleRecenterAdapter";
// import { StackTestamentMapper } from "../mappers/StackTestamentMapper";
// import { StackSectionMapper } from "../mappers/StackSectionMapper";
// import { StackSectionBookMapper } from "../mappers/StackSectionBookMapper";
// import { StackBookMapper } from "../mappers/StackBookMapper";
// import { StackChapterMapper } from "../mappers/StackChapterMapper";
// import { StackSectionShadowMapper } from "../mappers/StackSectionShadowMapper";
// import { StackShadowMapper } from "../mappers/StackShadowMapper";
// import { StackTransformerMapper } from "../mappers/StackTransformerMapper";
// import { StackCoverMapper } from "../mappers/StackCoverMapper";
// import { StackLowerCoverMapper } from "../mappers/StackLowerCoverMapper";
// import { StackCrossLineMapper } from "../mappers/StackCrossLineMapper";
// import { VersesBundleMapper } from "../mappers/VersesBundleMapper";
// import { VerseMapper } from "../mappers/VerseMapper";
// import { BookInteractionConfigProvider } from "../config/bookInteraction/BookInteractionConfigProvider";
// import { StackUpdateConfigProvider } from "../config/stackUpdate/StackUpdateConfigProvider";
// import { AudioConfigProvider } from "../config/audio/AudioConfigProvider";
// import { ExperienceConfigProvider } from "../config/experience/ExperienceConfigProvider";
// import { SectionInteractionConfigProvider } from "../config/sectionInteraction/SectionInteractionConfigProvider";
// import { ChapterSelectionConfigProvider } from "../config/chapterSelection/ChapterSelectionConfigProvider";
// import { HighlightConfigProvider } from "../config/highlight/HighlightConfigProvider";
// import { SequenceConfigProvider } from "../config/sequences/SequenceConfigProvider";
// import { BookSetupConfigProvider } from "../config/bookSetup/BookSetupConfigProvider";
// import { SectionSelectionConfigProvider } from "../config/sectionSelection/SectionSelectionConfigProvider";
// import type { BibleStackObjectPoolerMap } from "../models/objectPooler";
// import type { PoolData } from "@packages/Bible Visualization Utils/bibleVizUtils/infrastructure/models/casualos";
// import { BiblePiece } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/models/canvas";
// import { thisTypedBot as testamentPrefab } from "bibleStack.prefabs.testament.botAdapter";
// import { thisTypedBot as sectionPrefab } from "bibleStack.prefabs.section.botAdapter";
// import { thisTypedBot as bookPrefab } from "bibleStack.prefabs.book.botAdapter";
// import { thisTypedBot as chapterPrefab } from "bibleStack.prefabs.chapter.botAdapter";
// import { thisTypedBot as chunkOfVersesPrefab } from "bibleStack.prefabs.chunkOfVerses.botAdapter";
// import { thisTypedBot as versePrefab } from "bibleStack.prefabs.verse.botAdapter";
// import { thisTypedBot as coverPrefab } from "bibleStack.prefabs.cover.botAdapter";
// import { thisTypedBot as crossLinePrefab } from "bibleStack.prefabs.crossLine.botAdapter";
// import { thisTypedBot as sectionShadowPrefab } from "bibleStack.prefabs.sectionShadow.botAdapter";
// import { thisTypedBot as bibleTransformerPrefab } from "bibleStack.prefabs.bibleTransformer.botAdapter";
// import { thisTypedBot as bibleShadowPrefab } from "bibleStack.prefabs.shadow.botAdapter";

const bibleVizUtilsId = "bible-visualization-utils";

interface DependenciesMap {
  [bibleVizUtilsId]: BibleVizAPI;
}

const dependencies: (keyof DependenciesMap)[] = [bibleVizUtilsId];

export const bootstrapExtension = () => {
  registerExtension({
    dependencies,
    id: "bible-stack",
    init: function* (/*context: SeedBibleState, dependenciesMap*/) {
      // const { pieceMapper, stackConfigProvider, createObjectPooler } = dependenciesMap[
      //   bibleVizUtilsId
      // ] as DependenciesMap[typeof bibleVizUtilsId];

      // // 1. Instantiating mappers

      // const stackTestamentMapper = new StackTestamentMapper();
      // const stackSectionMapper = new StackSectionMapper();
      // const stackSectionBookMapper = new StackSectionBookMapper();
      // const stackBookMapper = new StackBookMapper();
      // const stackChapterMapper = new StackChapterMapper();
      // const stackSectionShadowMapper = new StackSectionShadowMapper();
      // const stackShadowMapper = new StackShadowMapper();
      // const stackTransformerMapper = new StackTransformerMapper();
      // const stackCoverMapper = new StackCoverMapper();
      // const stackLowerCoverMapper = new StackLowerCoverMapper();
      // const stackCrossLineMapper = new StackCrossLineMapper();
      // const versesBundleMapper = new VersesBundleMapper();
      // const verseMapper = new VerseMapper();

      // // 2. Instantiating config providers

      // const bookInteractionConfigProvider = new BookInteractionConfigProvider();
      // const stackUpdateConfigProvider = new StackUpdateConfigProvider();
      // const audioConfigProvider = new AudioConfigProvider();
      // const experienceConfigProvider = new ExperienceConfigProvider();
      // const sectionInteractionConfigProvider =
      //   new SectionInteractionConfigProvider();
      // const chapterSelectionConfigProvider = new ChapterSelectionConfigProvider();
      // const highlightConfigProvider = new HighlightConfigProvider();
      // const sequenceConfigProvider = new SequenceConfigProvider();
      // const bookSetupConfigProvider = new BookSetupConfigProvider();
      // const sectionSelectionConfigProvider = new SectionSelectionConfigProvider();

      // // 3. Instantiating adapters

      // const stackObjectPooler = createObjectPooler<BibleStackObjectPoolerMap>({
      //   poolsData: [
      //     {
      //       key: BiblePiece.StackTestament,
      //       prefab: testamentPrefab,
      //       customTags: {
      //         draggable: false,
      //         formOpacity: 1,
      //         scale: 1,
      //         color: "white",
      //         scaleX: undefined,
      //         scaleY: undefined,
      //         scaleZ: undefined,
      //         pointable: undefined,
      //         system: undefined,
      //       },
      //       size: 2,
      //     },
      //     {
      //       key: BiblePiece.StackSection,
      //       prefab: sectionPrefab,
      //       customTags: {
      //         draggable: false,
      //         formOpacity: 0.7,
      //         scale: undefined,
      //         color: undefined,
      //         strokeColor: undefined,
      //         labelOpacity: undefined,
      //         scaleX: undefined,
      //         scaleY: undefined,
      //         scaleZ: undefined,
      //         system: undefined,
      //       },
      //       size: 8,
      //     },
      //     {
      //       key: BiblePiece.StackBook,
      //       prefab: bookPrefab,
      //       customTags: {
      //         draggable: false,
      //         formOpacity: 0,
      //         color: undefined,
      //         strokeColor: undefined,
      //         labelOpacity: undefined,
      //         scaleX: undefined,
      //         scaleY: undefined,
      //         scaleZ: undefined,
      //         system: undefined,
      //       },
      //       size: 20,
      //     },
      //     {
      //       // TODO: legacy had no dedicated section-book prefab; reusing the book prefab.
      //       key: BiblePiece.StackSectionBook,
      //       prefab: bookPrefab,
      //       customTags: {
      //         draggable: false,
      //         formOpacity: 0,
      //         color: undefined,
      //         strokeColor: undefined,
      //         labelOpacity: undefined,
      //         scaleX: undefined,
      //         scaleY: undefined,
      //         scaleZ: undefined,
      //         system: undefined,
      //       },
      //       size: 8,
      //     },
      //     {
      //       key: BiblePiece.StackChapter,
      //       prefab: chapterPrefab,
      //       customTags: {
      //         draggable: true,
      //         pointable: true,
      //         color: "#e8e8e8",
      //         label: "1",
      //         labelPosition: "front",
      //         scaleX: undefined,
      //         scaleY: undefined,
      //         scaleZ: undefined,
      //         system: undefined,
      //       },
      //       size: 20,
      //     },
      //     {
      //       key: BiblePiece.StackSectionShadow,
      //       prefab: sectionShadowPrefab,
      //       customTags: {
      //         draggable: false,
      //         pointable: false,
      //         formOpacity: 0,
      //         color: undefined,
      //         scaleX: undefined,
      //         scaleY: undefined,
      //         scaleZ: undefined,
      //         sectionName: undefined,
      //         sectionDataId: undefined,
      //         system: undefined,
      //       },
      //       size: 8,
      //     },
      //     {
      //       key: BiblePiece.VersesBundle,
      //       prefab: chunkOfVersesPrefab,
      //       customTags: {
      //         color: "#d3d3d3",
      //         labelOpacity: 1,
      //         scaleX: 3.5,
      //         scaleY: 1,
      //         scaleZ: 0,
      //         label: undefined,
      //         draggable: undefined,
      //         system: undefined,
      //       },
      //       size: 3,
      //     },
      //     {
      //       key: BiblePiece.Verse,
      //       prefab: versePrefab,
      //       customTags: {
      //         scaleZ: undefined,
      //         system: undefined,
      //       },
      //       size: 3,
      //     },
      //     {
      //       key: "Cover",
      //       prefab: coverPrefab,
      //       customTags: {
      //         draggable: false,
      //         color: "black",
      //         pointable: undefined,
      //         scaleX: undefined,
      //         scaleY: 1,
      //         scaleZ: 1,
      //         stackBibleId: undefined,
      //         system: undefined,
      //       },
      //       size: 3,
      //     },
      //     {
      //       key: "CrossLine",
      //       prefab: crossLinePrefab,
      //       customTags: {
      //         draggable: false,
      //         color: "#FFD700",
      //         pointable: false,
      //         formOpacity: 1,
      //         scaleX: undefined,
      //         scaleY: undefined,
      //         scaleZ: 0.05,
      //         stackBibleId: undefined,
      //         system: undefined,
      //       },
      //       size: 2,
      //     },
      //     {
      //       key: BiblePiece.StackTransformer,
      //       prefab: bibleTransformerPrefab,
      //       customTags: {
      //         draggable: false,
      //         pointable: false,
      //         color: "clear",
      //         toErase: true,
      //         stackBibleId: undefined,
      //         system: undefined,
      //       },
      //       size: 1,
      //     },
      //     {
      //       key: BiblePiece.StackShadow,
      //       prefab: bibleShadowPrefab,
      //       customTags: {
      //         draggable: false,
      //         pointable: false,
      //         color: "#7B64FF",
      //         stackBibleId: undefined,
      //         system: undefined,
      //       },
      //       size: 1,
      //     },
      //   ],
      //   dimensionGetter: {
      //     getDimension: () => os.getCurrentDimension()
      //   }
      // })
      // const bibleDataRepository = new BibleDataRepository();
      // const pieceDataRepository = new PieceDataRepository();
      // const versesBundleRepository = new VersesBundleRepository();
      // const visualStateRegistry = new VisualStateRegistry();
      // const interactionRegistry = new InteractionRegistry();
      // const stackPieceLifecycleAdapter = new StackPieceLifecycleAdapter({
      //   objectPoolerPort: stackObjectPooler,
      //   testamentMapperPort: stackTestamentMapper,
      //   sectionMapperPort: stackSectionMapper,
      //   bookMapperPort: stackBookMapper,
      //   chapterMapperPort: stackChapterMapper,
      //   sectionShadowMapperPort: stackSectionShadowMapper,
      //   sectionBookMapperPort: stackSectionBookMapper,
      //   versesBundleMapperPort: versesBundleMapper,
      //   verseMapperPort: verseMapper,
      //   stackTransformerMapperPort: stackTransformerMapper,
      //   coverMapperPort: stackCoverMapper,
      //   crossLineMapperPort: stackCrossLineMapper,
      //   stackShadowMapperPort: stackShadowMapper

      // });
      // const bibleSetupAdapter = new BibleSetupAdapter({
      //   configProviderPort: stackConfigProvider,
      //   visualStateRegistryPort: visualStateRegistry,
      //   pieceMapperPort: pieceMapper,
      //   stackPieceLifecycleAdapterPort: stackPieceLifecycleAdapter,
      //   testamentMapperPort: stackTestamentMapper,
      //   dimensionProviderPort: {
      //     getCurrentDimension: () => os.getCurrentDimension()
      //   }
      // });
      // const bibleStackUpdaterAdapter = new BibleStackUpdaterAdapter();
      // const testamentStackUpdaterAdapter = new TestamentStackUpdaterAdapter();
      // const sectionStackUpdaterAdapter = new SectionStackUpdaterAdapter();
      // const bookStackUpdaterAdapter = new BookStackUpdaterAdapter();
      // const bookStackLayoutAdapter = new BookStackLayoutAdapter();
      // const selectedBookLayoutAdapter = new SelectedBookLayoutAdapter();
      // const bookShapeAdapter = new BookShapeAdapter();
      // const bookSetupAdapter = new BookSetupAdapter();
      // const pieceAdapter = new PieceAdapter();
      // const pieceHighlightAdapter = new PieceHighlightAdapter();
      // const pieceUnhighlightSchedulerAdapter =
      //   new PieceUnhighlightSchedulerAdapter();
      // const sectionSelectionAdapter = new SectionSelectionAdapter();
      // const chapterSelectionAdapter = new ChapterSelectionAdapter();
      // const versesAdapter = new VersesAdapter();
      // const versesBundleAdapter = new VersesBundleAdapter();
      // const tourGuideAdapter = new TourGuideAdapter();
      // const bibleRecenterAdapter = new BibleRecenterAdapter();

      // const cameraAdapter = new CameraAdapter();
      // const bibleSetupCameraAdapter = new BibleSetupCameraAdapter();
      // const environmentAdapter = new EnvironmentAdapter();
      // const experienceAdapter = new ExperienceAdapter();
      // const bibleSequenceAdapter = new BibleSequenceAdapter();
      // const audioAdapter = new AudioAdapter();

      // 4. Instantiating services

      // 5. Instantiating controllers

      // 6. Event wiring

      // 7. Disposers

      yield () => {};
    },
  });

  // // 1. Instantiating adapters

  // const pieceDataRepository = new PieceDataRepository();
  // const bibleDataRepository = new BibleDataRepository();
  // const tourGuideAdapter = new TourGuideAdapter();

  // // 2, Instantiating services

  // const stackPieceLabelService = bibleVizAPI?.createPieceLabelService({
  //   [BiblePiece.StackTestament]: {
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
  //   [BiblePiece.StackSection]: {
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
  //   [BiblePiece.StackSectionShadow]: {
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
  //   [BiblePiece.StackSectionBook]: {
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
  //   [BiblePiece.StackBook]: {
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
  //   [BiblePiece.StackChapter]: {
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
};

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
