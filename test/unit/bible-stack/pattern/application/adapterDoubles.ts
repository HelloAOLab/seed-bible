import { vi, type Mocked } from "vitest";
import type { ActivityIndicatorsPort } from "../../../../../patterns/bible-stack/bible-stack/application/ports/out/ActivityIndicators";
import type { ActivityNotificationPort } from "../../../../../patterns/bible-stack/bible-stack/application/ports/out/ActivityNotification";
import type { AwaiterPort } from "../../../../../patterns/bible-stack/bible-stack/application/ports/out/Awaiter";
import type { BibleDataRepositoryPort } from "../../../../../patterns/bible-stack/bible-stack/application/ports/out/BibleDataRepository";
import type { BibleModeSequencePort } from "../../../../../patterns/bible-stack/bible-stack/application/ports/out/BibleModeSequence";
import type { BibleRecenterPort } from "../../../../../patterns/bible-stack/bible-stack/application/ports/out/BibleRecenter";
import type { BibleSequencePort } from "../../../../../patterns/bible-stack/bible-stack/application/ports/out/BibleSequence";
import type { BibleSetupPort } from "../../../../../patterns/bible-stack/bible-stack/application/ports/out/BibleSetup";
import type { BibleStackUpdaterPort } from "../../../../../patterns/bible-stack/bible-stack/application/ports/out/BibleStackUpdater";
import type { BookChaptersManagementPort } from "../../../../../patterns/bible-stack/bible-stack/application/ports/out/BookChaptersManagement";
import type { BookInteractionConfigProviderPort } from "../../../../../patterns/bible-stack/bible-stack/application/ports/out/BookInteractionConfigProvider";
import type { BookStackUpdaterPort } from "../../../../../patterns/bible-stack/bible-stack/application/ports/out/BookStackUpdater";
import type { CameraPort } from "../../../../../patterns/bible-stack/bible-stack/application/ports/out/Camera";
import type { ChapterSelectionPort } from "../../../../../patterns/bible-stack/bible-stack/application/ports/out/ChapterSelection";
import type { CustomArrangementStorePort } from "../../../../../patterns/bible-stack/bible-stack/application/ports/out/CustomArrangementStore";
import type { EnvironmentPort } from "../../../../../patterns/bible-stack/bible-stack/application/ports/out/Environment";
import type { ExperiencePort } from "../../../../../patterns/bible-stack/bible-stack/application/ports/out/Experience";
import type { ExperienceConfigProviderPort } from "../../../../../patterns/bible-stack/bible-stack/application/ports/out/ExperienceConfigProvider";
import type { HighlightConfigProviderPort } from "../../../../../patterns/bible-stack/bible-stack/application/ports/out/HighlightConfigProvider";
import type { IdGeneratorPort } from "../../../../../patterns/bible-stack/bible-stack/application/ports/out/IdGenerator";
import type { InteractionRegistryPort } from "../../../../../patterns/bible-stack/bible-stack/application/ports/out/InteractionRegistry";
import type { LabelPort } from "../../../../../patterns/bible-stack/bible-stack/application/ports/out/Label";
import type { LabelDataStorePort } from "../../../../../patterns/bible-stack/bible-stack/application/ports/out/LabelDataStore";
import type { LabelFeedbackPort } from "../../../../../patterns/bible-stack/bible-stack/application/ports/out/LabelFeedback";
import type { LabelSequenceConfigProviderPort } from "../../../../../patterns/bible-stack/bible-stack/application/ports/out/LabelSequenceConfigProvider";
import type { LayoutConfigProviderPort } from "../../../../../patterns/bible-stack/bible-stack/application/ports/out/LayoutConfigProvider";
import type { LoggerPort } from "../../../../../patterns/bible-stack/bible-stack/application/ports/out/Logger";
import type { PaintPort } from "../../../../../patterns/bible-stack/bible-stack/application/ports/out/Paint";
import type { PiecePort } from "../../../../../patterns/bible-stack/bible-stack/application/ports/out/Piece";
import type { PieceDataRepositoryPort } from "../../../../../patterns/bible-stack/bible-stack/application/ports/out/PieceDataRepository";
import type { PieceHighlightPort } from "../../../../../patterns/bible-stack/bible-stack/application/ports/out/PieceHighlight";
import type { PieceUnhighlightSchedulerPort } from "../../../../../patterns/bible-stack/bible-stack/application/ports/out/PieceUnhighlightScheduler";
import type { ReaderNavigationPort } from "../../../../../patterns/bible-stack/bible-stack/application/ports/out/ReaderNavigation";
import type { RenderOrderPort } from "../../../../../patterns/bible-stack/bible-stack/application/ports/out/RenderOrder";
import type { SectionInteractionConfigProviderPort } from "../../../../../patterns/bible-stack/bible-stack/application/ports/out/SectionInteractionConfigProvider";
import type { SectionSelectionPort } from "../../../../../patterns/bible-stack/bible-stack/application/ports/out/SectionSelection";
import type { SectionStackUpdaterPort } from "../../../../../patterns/bible-stack/bible-stack/application/ports/out/SectionStackUpdater";
import type { SequenceConfigProviderPort } from "../../../../../patterns/bible-stack/bible-stack/application/ports/out/SequenceConfigProvider";
import type { StackPieceLifecyclePort } from "../../../../../patterns/bible-stack/bible-stack/application/ports/out/StackPieceLifecycle";
import type { StaticArrangementsProviderPort } from "../../../../../patterns/bible-stack/bible-stack/application/ports/out/StaticArrangementsProvider";
import type { TestamentSelectionPort } from "../../../../../patterns/bible-stack/bible-stack/application/ports/out/TestamentSelection";
import type { TestamentStackUpdaterPort } from "../../../../../patterns/bible-stack/bible-stack/application/ports/out/TestamentStackUpdater";
import type { TourGuidePort } from "../../../../../patterns/bible-stack/bible-stack/application/ports/out/TourGuide";
import type { UserIdentityStorePort } from "../../../../../patterns/bible-stack/bible-stack/application/ports/out/UserIdentityStore";
import type { VerseDataRepositoryPort } from "../../../../../patterns/bible-stack/bible-stack/application/ports/out/VerseDataRepository";
import type { VersesBundlePort } from "../../../../../patterns/bible-stack/bible-stack/application/ports/out/VersesBundle";
import type { VersesBundleDataRepositoryPort } from "../../../../../patterns/bible-stack/bible-stack/application/ports/out/VersesBundleDataRepository";
import type { VersesBundleSelectionPort } from "../../../../../patterns/bible-stack/bible-stack/application/ports/out/VersesBundleSelection";

export const makeActivityIndicatorsDouble = (
  overrides: Partial<Mocked<ActivityIndicatorsPort>> = {}
): Mocked<ActivityIndicatorsPort> => ({
  showIndicators: vi.fn(),
  hideIndicators: vi.fn(),
  hideIndicator: vi.fn(),
  updateIndicatorsPosition: vi.fn(),
  updateIndicatorPosition: vi.fn(),
  ...overrides,
});

export const makeActivityNotificationDouble = (
  overrides: Partial<Mocked<ActivityNotificationPort>> = {}
): Mocked<ActivityNotificationPort> => ({
  hideNotification: vi.fn(),
  showNotification: vi.fn(),
  updateNotificationPosition: vi.fn(),
  updateNotificationDirection: vi.fn(),
  ...overrides,
});

export const makeAwaiterDouble = (
  overrides: Partial<Mocked<AwaiterPort>> = {}
): Mocked<AwaiterPort> => ({
  sleep: vi.fn(),
  ...overrides,
});

export const makeBibleDataRepositoryDouble = (
  overrides: Partial<Mocked<BibleDataRepositoryPort>> = {}
): Mocked<BibleDataRepositoryPort> => ({
  addBibleData: vi.fn(),
  removeBibleData: vi.fn(),
  clearBiblesData: vi.fn(),
  getBibleDataById: vi.fn(),
  getAllBiblesData: vi.fn(),
  ...overrides,
});

export const makeBibleModeSequenceDouble = (
  overrides: Partial<Mocked<BibleModeSequencePort>> = {}
): Mocked<BibleModeSequencePort> => ({
  showToggleAttemptFeedback: vi.fn(),
  finishToggleAttemptFeedback: vi.fn(),
  showAttemptStopFeedback: vi.fn(),
  ...overrides,
});

export const makeBibleRecenterDouble = (
  overrides: Partial<Mocked<BibleRecenterPort>> = {}
): Mocked<BibleRecenterPort> => ({
  isBibleOffScreen: vi.fn(),
  recenter: vi.fn(),
  ...overrides,
});

export const makeBibleSequenceDouble = (
  overrides: Partial<Mocked<BibleSequencePort>> = {}
): Mocked<BibleSequencePort> => ({
  displayCrackOpenBibleSequence: vi.fn(),
  displayCloseBibleSequence: vi.fn(),
  displayOpenBibleSequence: vi.fn(),
  ...overrides,
});

export const makeBibleSetupDouble = (
  overrides: Partial<Mocked<BibleSetupPort>> = {}
): Mocked<BibleSetupPort> => ({
  setUp: vi.fn(),
  ...overrides,
});

export const makeBibleStackUpdaterDouble = (
  overrides: Partial<Mocked<BibleStackUpdaterPort>> = {}
): Mocked<BibleStackUpdaterPort> => ({
  update: vi.fn(),
  ...overrides,
});

export const makeBookChaptersManagementDouble = (
  overrides: Partial<Mocked<BookChaptersManagementPort>> = {}
): Mocked<BookChaptersManagementPort> => ({
  setUpChapter: vi.fn(),
  updateChaptersPosition: vi.fn(),
  ...overrides,
});

export const makeBookInteractionConfigProviderDouble = (
  overrides: Partial<Mocked<BookInteractionConfigProviderPort>> = {}
): Mocked<BookInteractionConfigProviderPort> => ({
  getDelay: vi.fn(),
  ...overrides,
});

export const makeBookStackUpdaterDouble = (
  overrides: Partial<Mocked<BookStackUpdaterPort>> = {}
): Mocked<BookStackUpdaterPort> => ({
  update: vi.fn(),
  ...overrides,
});

export const makeCameraDouble = (
  overrides: Partial<Mocked<CameraPort>> = {}
): Mocked<CameraPort> => ({
  focusOn: vi.fn(),
  cancelFocus: vi.fn(),
  ...overrides,
});

export const makeChapterSelectionDouble = (
  overrides: Partial<Mocked<ChapterSelectionPort>> = {}
): Mocked<ChapterSelectionPort> => ({
  select: vi.fn(),
  deselect: vi.fn(),
  ...overrides,
});

export const makeCustomArrangementStoreDouble = (
  overrides: Partial<Mocked<CustomArrangementStorePort>> = {}
): Mocked<CustomArrangementStorePort> => ({
  tryAddArrangement: vi.fn(),
  tryRemoveArrangement: vi.fn(),
  getArrangements: vi.fn(),
  ...overrides,
});

export const makeEnvironmentDouble = (
  overrides: Partial<Mocked<EnvironmentPort>> = {}
): Mocked<EnvironmentPort> => ({
  resetZoomMin: vi.fn(),
  changePortalZoomableMin: vi.fn(),
  setGridPortal: vi.fn(),
  clearMapPortal: vi.fn(),
  clearMiniGridPortal: vi.fn(),
  clearMiniMapPortal: vi.fn(),
  ...overrides,
});

export const makeExperienceDouble = (
  overrides: Partial<Mocked<ExperiencePort>> = {}
): Mocked<ExperiencePort> => ({
  displayExperience: vi.fn(),
  ...overrides,
});

export const makeExperienceConfigProviderDouble = (
  overrides: Partial<Mocked<ExperienceConfigProviderPort>> = {}
): Mocked<ExperienceConfigProviderPort> => ({
  getTargetPortalZoomableMin: vi.fn(),
  getAppTitle: vi.fn(),
  getAppPosition: vi.fn(),
  getAppSize: vi.fn(),
  getAppType: vi.fn(),
  getInitialBibleCreationDelay: vi.fn(),
  getBibleCreationPosition: vi.fn(),
  ...overrides,
});

export const makeHighlightConfigProviderDouble = (
  overrides: Partial<Mocked<HighlightConfigProviderPort>> = {}
): Mocked<HighlightConfigProviderPort> => ({
  getDelay: vi.fn(),
  getHighlightDuration: vi.fn(),
  ...overrides,
});

export const makeIdGeneratorDouble = (
  overrides: Partial<Mocked<IdGeneratorPort>> = {}
): Mocked<IdGeneratorPort> => ({
  getId: vi.fn(),
  ...overrides,
});

export const makeInteractionRegistryDouble = (
  overrides: Partial<Mocked<InteractionRegistryPort>> = {}
): Mocked<InteractionRegistryPort> => ({
  handleBibleInteracted: vi.fn(),
  handleBibleDeleted: vi.fn(),
  handleTestamentInteracted: vi.fn(),
  handleTestamentDeleted: vi.fn(),
  handleSectionInteracted: vi.fn(),
  handleSectionDeleted: vi.fn(),
  handleBookInteracted: vi.fn(),
  handleBookDeleted: vi.fn(),
  handleChapterInteracted: vi.fn(),
  clearAllLastInteractions: vi.fn(),
  ...overrides,
});

export const makeLabelDouble = (
  overrides: Partial<Mocked<LabelPort>> = {}
): Mocked<LabelPort> => ({
  spawnLabel: vi.fn(),
  locateLabel: vi.fn(),
  despawnLabel: vi.fn(),
  ...overrides,
});

export const makeLabelDataStoreDouble = (
  overrides: Partial<Mocked<LabelDataStorePort>> = {}
): Mocked<LabelDataStorePort> => ({
  addLabelData: vi.fn(),
  removeLabelData: vi.fn(),
  getDataByTransformerId: vi.fn(),
  getDataByTailId: vi.fn(),
  getDataByTextId: vi.fn(),
  getDataByOwnerId: vi.fn(),
  getAllLabelsData: vi.fn(),
  ...overrides,
});

export const makeLabelFeedbackDouble = (
  overrides: Partial<Mocked<LabelFeedbackPort>> = {}
): Mocked<LabelFeedbackPort> => ({
  displayAttentionFeedback: vi.fn(),
  stopAttentionFeedback: vi.fn(),
  displayShowFeedback: vi.fn(),
  displayHideFeedback: vi.fn(),
  displayChangedIntensityFeedback: vi.fn(),
  stopOpacityTransition: vi.fn(),
  disposeAll: vi.fn(),
  ...overrides,
});

export const makeLabelSequenceConfigProviderDouble = (
  overrides: Partial<Mocked<LabelSequenceConfigProviderPort>> = {}
): Mocked<LabelSequenceConfigProviderPort> => ({
  getShowSequenceDurationSeconds: vi.fn(),
  ...overrides,
});

export const makeLayoutConfigProviderDouble = (
  overrides: Partial<Mocked<LayoutConfigProviderPort>> = {}
): Mocked<LayoutConfigProviderPort> => ({
  getVersesPerBundle: vi.fn(),
  ...overrides,
});

export const makeLoggerDouble = (
  overrides: Partial<Mocked<LoggerPort>> = {}
): Mocked<LoggerPort> => ({
  error: vi.fn(),
  warn: vi.fn(),
  log: vi.fn(),
  ...overrides,
});

export const makePaintDouble = (
  overrides: Partial<Mocked<PaintPort>> = {}
): Mocked<PaintPort> => ({
  paint: vi.fn(),
  unpaint: vi.fn(),
  ...overrides,
});

export const makePieceDouble = (
  overrides: Partial<Mocked<PiecePort>> = {}
): Mocked<PiecePort> => ({
  isPieceAnchored: vi.fn(),
  anchorPiece: vi.fn(),
  unanchorPiece: vi.fn(),
  makePieceErasable: vi.fn(),
  releaseSelectionOnPiece: vi.fn(),
  updatePosition: vi.fn(),
  isPieceBeingUsed: vi.fn(),
  hasTransformer: vi.fn(),
  releaseTransformer: vi.fn(),
  isInteractable: vi.fn(),
  makeInteractable: vi.fn(),
  makeNonInteractable: vi.fn(),
  hide: vi.fn(),
  ...overrides,
});

export const makePieceDataRepositoryDouble = (
  overrides: Partial<Mocked<PieceDataRepositoryPort>> = {}
): Mocked<PieceDataRepositoryPort> => ({
  addTestamentData: vi.fn(),
  removeTestamentData: vi.fn(),
  clearTestamentsData: vi.fn(),
  getAllTestaments: vi.fn(),
  getStandaloneTestaments: vi.fn(),
  addSectionData: vi.fn(),
  removeSectionData: vi.fn(),
  clearSectionsData: vi.fn(),
  getAllSections: vi.fn(),
  getStandaloneSections: vi.fn(),
  addSectionBookData: vi.fn(),
  removeSectionBookData: vi.fn(),
  clearSectionBooksData: vi.fn(),
  getAllSectionBooks: vi.fn(),
  getStandaloneSectionBooks: vi.fn(),
  addBookData: vi.fn(),
  removeBookData: vi.fn(),
  clearBooksData: vi.fn(),
  getAllBooks: vi.fn(),
  getStandaloneBooks: vi.fn(),
  addChapterData: vi.fn(),
  removeChapterData: vi.fn(),
  clearChaptersData: vi.fn(),
  getAllChapters: vi.fn(),
  getPieceData: vi.fn() as Mocked<PieceDataRepositoryPort>["getPieceData"],
  getAllPiecesDataByType:
    vi.fn() as Mocked<PieceDataRepositoryPort>["getAllPiecesDataByType"],
  getDataById: vi.fn() as Mocked<PieceDataRepositoryPort>["getDataById"],
  ...overrides,
});

export const makePieceHighlightDouble = (
  overrides: Partial<Mocked<PieceHighlightPort>> = {}
): Mocked<PieceHighlightPort> => ({
  interruptSequence: vi.fn(),
  highlight: vi.fn(),
  rehighlight: vi.fn(),
  unhighlight: vi.fn(),
  increaseIntensity: vi.fn(),
  decreaseIntensity: vi.fn(),
  ...overrides,
});

export const makePieceUnhighlightSchedulerDouble = (
  overrides: Partial<Mocked<PieceUnhighlightSchedulerPort>> = {}
): Mocked<PieceUnhighlightSchedulerPort> => ({
  schedule: vi.fn(),
  clear: vi.fn(),
  ...overrides,
});

export const makeReaderNavigationDouble = (
  overrides: Partial<Mocked<ReaderNavigationPort>> = {}
): Mocked<ReaderNavigationPort> => ({
  open: vi.fn(),
  ...overrides,
});

export const makeRenderOrderDouble = (
  overrides: Partial<Mocked<RenderOrderPort>> = {}
): Mocked<RenderOrderPort> => ({
  setSortedRenderOrder: vi.fn(),
  ...overrides,
});

export const makeSectionInteractionConfigProviderDouble = (
  overrides: Partial<Mocked<SectionInteractionConfigProviderPort>> = {}
): Mocked<SectionInteractionConfigProviderPort> => ({
  getDelay: vi.fn(),
  ...overrides,
});

export const makeSectionSelectionDouble = (
  overrides: Partial<Mocked<SectionSelectionPort>> = {}
): Mocked<SectionSelectionPort> => ({
  select: vi.fn(),
  deselect: vi.fn(),
  ...overrides,
});

export const makeSectionStackUpdaterDouble = (
  overrides: Partial<Mocked<SectionStackUpdaterPort>> = {}
): Mocked<SectionStackUpdaterPort> => ({
  update: vi.fn(),
  ...overrides,
});

export const makeSequenceConfigProviderDouble = (
  overrides: Partial<Mocked<SequenceConfigProviderPort>> = {}
): Mocked<SequenceConfigProviderPort> => ({
  getCrackOpenBibleAnimationDuration: vi.fn(),
  getTestamentHighlightSequenceConfig: vi.fn(),
  ...overrides,
});

export const makeStackPieceLifecycleDouble = (
  overrides: Partial<Mocked<StackPieceLifecyclePort>> = {}
): Mocked<StackPieceLifecyclePort> => ({
  spawnActivityIndicatorDomain: vi.fn(),
  spawnTestamentDomain: vi.fn(),
  despawnTestament: vi.fn(),
  spawnSectionDomain: vi.fn(),
  despawnSection: vi.fn(),
  spawnSectionBookDomain: vi.fn(),
  despawnSectionBook: vi.fn(),
  spawnBookDomain: vi.fn(),
  despawnBook: vi.fn(),
  spawnChapterDomain: vi.fn(),
  despawnChapter: vi.fn(),
  spawnSectionShadowDomain: vi.fn(),
  despawnSectionShadow: vi.fn(),
  spawnVersesBundleDomain: vi.fn(),
  despawnVersesBundle: vi.fn(),
  spawnVerseDomain: vi.fn(),
  despawnVerse: vi.fn(),
  despawn: vi.fn(),
  despawnPieces: vi.fn(),
  spawnBibleTransformer: vi.fn(),
  spawnCover: vi.fn(),
  spawnCrossLine: vi.fn(),
  spawnShadow: vi.fn(),
  ...overrides,
});

export const makeStaticArrangementsProviderDouble = (
  overrides: Partial<Mocked<StaticArrangementsProviderPort>> = {}
): Mocked<StaticArrangementsProviderPort> => ({
  getStaticArrangements: vi.fn(),
  ...overrides,
});

export const makeTestamentSelectionDouble = (
  overrides: Partial<Mocked<TestamentSelectionPort>> = {}
): Mocked<TestamentSelectionPort> => ({
  select: vi.fn(),
  ...overrides,
});

export const makeTestamentStackUpdaterDouble = (
  overrides: Partial<Mocked<TestamentStackUpdaterPort>> = {}
): Mocked<TestamentStackUpdaterPort> => ({
  update: vi.fn(),
  ...overrides,
});

export const makeTourGuideDouble = (
  overrides: Partial<Mocked<TourGuidePort>> = {}
): Mocked<TourGuidePort> => ({
  startTourGuideSequence: vi.fn(),
  endTourGuideSequence: vi.fn(),
  ...overrides,
});

export const makeUserIdentityStoreDouble = (
  overrides: Partial<Mocked<UserIdentityStorePort>> = {}
): Mocked<UserIdentityStorePort> => ({
  getUserDataByIds: vi.fn(),
  getUserColor: vi.fn(),
  listUsers: vi.fn(),
  tryUpdate: vi.fn(),
  ...overrides,
});

export const makeVerseDataRepositoryDouble = (
  overrides: Partial<Mocked<VerseDataRepositoryPort>> = {}
): Mocked<VerseDataRepositoryPort> => ({
  addVerseData: vi.fn(),
  removeVerseData: vi.fn(),
  clearVersesData: vi.fn(),
  getVerseDataById: vi.fn(),
  getAllVersesData: vi.fn(),
  getVerseData: vi.fn(),
  ...overrides,
});

export const makeVersesBundleDouble = (
  overrides: Partial<Mocked<VersesBundlePort>> = {}
): Mocked<VersesBundlePort> => ({
  highlight: vi.fn(),
  unhighlight: vi.fn(),
  ...overrides,
});

export const makeVersesBundleDataRepositoryDouble = (
  overrides: Partial<Mocked<VersesBundleDataRepositoryPort>> = {}
): Mocked<VersesBundleDataRepositoryPort> => ({
  addBundleData: vi.fn(),
  removeBundleData: vi.fn(),
  clearBundlesData: vi.fn(),
  getBundleDataById: vi.fn(),
  getAllBundlesData: vi.fn(),
  getBundleData: vi.fn(),
  ...overrides,
});

export const makeVersesBundleSelectionDouble = (
  overrides: Partial<Mocked<VersesBundleSelectionPort>> = {}
): Mocked<VersesBundleSelectionPort> => ({
  select: vi.fn(),
  ...overrides,
});
