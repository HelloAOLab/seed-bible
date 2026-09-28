import { vi, type Mocked } from "vitest";
import type { ArrangementServicePort } from "../../../../../patterns/bible-stack/bible-stack/application/ports/in/Arrangement";
import type { BibleLifecycleServicePort } from "../../../../../patterns/bible-stack/bible-stack/application/ports/in/BibleLifecycle";
import type { BibleSequenceServicePort } from "../../../../../patterns/bible-stack/bible-stack/application/ports/in/BibleSequence";
import type { BookChaptersManagementServicePort } from "../../../../../patterns/bible-stack/bible-stack/application/ports/in/BookChaptersManagement";
import type { BookSelectionServicePort } from "../../../../../patterns/bible-stack/bible-stack/application/ports/in/BookSelection";
import type { ChapterSelectionServicePort } from "../../../../../patterns/bible-stack/bible-stack/application/ports/in/ChapterSelection";
import type { ExplodedViewServicePort } from "../../../../../patterns/bible-stack/bible-stack/application/ports/in/ExplodedView";
import type { LabelDateServicePort } from "../../../../../patterns/bible-stack/bible-stack/application/ports/in/LabelDate";
import type { PieceActivityServicePort } from "../../../../../patterns/bible-stack/bible-stack/application/ports/in/PieceActivity";
import type { PieceHierarchyServicePort } from "../../../../../patterns/bible-stack/bible-stack/application/ports/in/PieceHierarchy";
import type { PieceHighlightServicePort } from "../../../../../patterns/bible-stack/bible-stack/application/ports/in/PieceHighlight";
import type { PieceLabelServicePort } from "../../../../../patterns/bible-stack/bible-stack/application/ports/in/PieceLabel";
import type { PieceLifecycleServicePort } from "../../../../../patterns/bible-stack/bible-stack/application/ports/in/PieceLifecycle";
import type { ScriptureServicePort } from "../../../../../patterns/bible-stack/bible-stack/application/ports/in/Scripture";
import type { ScripturePiecesStateServicePort } from "../../../../../patterns/bible-stack/bible-stack/application/ports/in/ScripturePiecesState";
import type { SectionSelectionServicePort } from "../../../../../patterns/bible-stack/bible-stack/application/ports/in/SectionSelection";
import type { SequenceStateServicePort } from "../../../../../patterns/bible-stack/bible-stack/application/ports/in/SequenceState";
import type { TestamentSelectionServicePort } from "../../../../../patterns/bible-stack/bible-stack/application/ports/in/TestamentSelection";
import type { UserPresenceServicePort } from "../../../../../patterns/bible-stack/bible-stack/application/ports/in/UserPresence";
import type { StackLabelableBiblePiece } from "../../../../../patterns/bible-stack/bible-stack/domain/models/pieceLifecycle";

export const makeArrangementServiceDouble = (
  overrides: Partial<Mocked<ArrangementServicePort>> = {}
): Mocked<ArrangementServicePort> => ({
  getArrangementByIndex: vi.fn(),
  getAllArrangements: vi.fn(),
  getCurrentArrangementIndex: vi.fn(),
  setCurrentArrangementIndex: vi.fn(),
  setArrangementIndexByName: vi.fn(),
  getArrangementIndexByName: vi.fn(),
  getCurrentArrangement: vi.fn(),
  getCurrentArrangementName: vi.fn(),
  addCustomArrangement: vi.fn(),
  removeCustomArrangement: vi.fn(),
  getBooksNamesBySectionName: vi.fn(),
  getTestamentInfoPathByName: vi.fn(),
  getSectionInfoPathByName: vi.fn(),
  getBookInfoPathById: vi.fn(),
  getBookByIndices: vi.fn(),
  getTestamentByIndices: vi.fn(),
  getBookSubsetByCompleteId: vi.fn(),
  getSectionByIndices: vi.fn(),
  ...overrides,
});

export const makeBibleLifecycleServiceDouble = (
  overrides: Partial<Mocked<BibleLifecycleServicePort>> = {}
): Mocked<BibleLifecycleServicePort> => ({
  createBible: vi.fn(),
  deleteBible: vi.fn(),
  deleteBibles: vi.fn(),
  ...overrides,
});

export const makeBibleSequenceServiceDouble = (
  overrides: Partial<Mocked<BibleSequenceServicePort>> = {}
): Mocked<BibleSequenceServicePort> => ({
  resetBible: vi.fn(),
  closeBible: vi.fn(),
  openBible: vi.fn(),
  crackOpenBible: vi.fn(),
  ...overrides,
});

export const makeBookChaptersManagementServiceDouble = (
  overrides: Partial<Mocked<BookChaptersManagementServicePort>> = {}
): Mocked<BookChaptersManagementServicePort> => ({
  showChapters: vi.fn(),
  hideChapters: vi.fn(),
  updateChaptersPosition: vi.fn(),
  ...overrides,
});

export const makeBookSelectionServiceDouble = (
  overrides: Partial<Mocked<BookSelectionServicePort>> = {}
): Mocked<BookSelectionServicePort> => ({
  selectBook: vi.fn(),
  deselectBook: vi.fn(),
  selectBooks: vi.fn(),
  deselectBooks: vi.fn(),
  ...overrides,
});

export const makeChapterSelectionServiceDouble = (
  overrides: Partial<Mocked<ChapterSelectionServicePort>> = {}
): Mocked<ChapterSelectionServicePort> => ({
  deselectChapter: vi.fn(),
  trySelectChapter: vi.fn(),
  ...overrides,
});

export const makeExplodedViewServiceDouble = (
  overrides: Partial<Mocked<ExplodedViewServicePort>> = {}
): Mocked<ExplodedViewServicePort> => ({
  explodeSection: vi.fn(),
  registerExplodedSection: vi.fn(),
  currentExplodedSection: undefined,
  ...overrides,
});

export const makeLabelDateServiceDouble = (
  overrides: Partial<Mocked<LabelDateServicePort>> = {}
): Mocked<LabelDateServicePort> => ({
  dateFormat: "Absolute",
  changeDateFormat: vi.fn(),
  ...overrides,
});

export const makePieceActivityServiceDouble = (
  overrides: Partial<Mocked<PieceActivityServicePort>> = {}
): Mocked<PieceActivityServicePort> => ({
  getPieceActivity: vi.fn(),
  getActivityIndicatorsForPiece: vi.fn(),
  getActivityIndicatorByType: vi.fn(),
  getExtraActivityIndicatorsForPiece: vi.fn(),
  getPieceIndicatorByActivityIndex: vi.fn(),
  getDataActivityIndicatorByType: vi.fn(),
  getDataExtraActivityIndicators: vi.fn(),
  getDataIndicatorByActivityIndex: vi.fn(),
  tryHideIndicators: vi.fn(),
  updateIndicators: vi.fn(),
  updateAllIndicators: vi.fn(),
  tryHideNotification: vi.fn(),
  updateNotification: vi.fn(),
  updateAllNotifications: vi.fn(),
  updateAllNotificationsDirection: vi.fn(),
  hideAllNotifications: vi.fn(),
  ...overrides,
});

export const makePieceHierarchyServiceDouble = (
  overrides: Partial<Mocked<PieceHierarchyServicePort>> = {}
): Mocked<PieceHierarchyServicePort> => ({
  getParentDataChain: vi.fn(),
  ...overrides,
});

export const makePieceHighlightServiceDouble = (
  overrides: Partial<Mocked<PieceHighlightServicePort>> = {}
): Mocked<PieceHighlightServicePort> => ({
  tryHighlightPiece: vi.fn(),
  tryUnhighlightPiece: vi.fn(),
  isUnhighlightScheduled: vi.fn(),
  changeHighlightIntensity: vi.fn(),
  clearScheduledUnhighlights: vi.fn(),
  clearHighlightedPieces: vi.fn(),
  forgetPiece: vi.fn(),
  isPieceHighlighted: vi.fn(),
  clearScheduledUnhighlight: vi.fn(),
  unhighlightBiblePieces: vi.fn(),
  ...overrides,
});

export const makePieceLabelServiceDouble = <
  T extends StackLabelableBiblePiece = StackLabelableBiblePiece,
>(
  overrides: Partial<Mocked<PieceLabelServicePort<T>>> = {}
): Mocked<PieceLabelServicePort<T>> => ({
  showLabel: vi.fn(),
  hideLabel: vi.fn(),
  changeIntensity: vi.fn(),
  updateLabelPosition: vi.fn(),
  getPieceLabel: vi.fn(),
  ...overrides,
});

export const makePieceLifecycleServiceDouble = (
  overrides: Partial<Mocked<PieceLifecycleServicePort>> = {}
): Mocked<PieceLifecycleServicePort> => ({
  createTestament: vi.fn(),
  createSection: vi.fn(),
  createBook: vi.fn(),
  createChapter: vi.fn(),
  createVerseBundle: vi.fn(),
  createVerse: vi.fn(),
  clearPiece: vi.fn(),
  deleteTestament: vi.fn(),
  deleteTestaments: vi.fn(),
  deleteSection: vi.fn(),
  deleteSections: vi.fn(),
  deleteSectionBook: vi.fn(),
  deleteSectionBooks: vi.fn(),
  deleteBook: vi.fn(),
  deleteBooks: vi.fn(),
  deleteChapter: vi.fn(),
  deleteChapters: vi.fn(),
  deleteVersesBundle: vi.fn(),
  deleteVerse: vi.fn(),
  ...overrides,
});

export const makeScriptureServiceDouble = (
  overrides: Partial<Mocked<ScriptureServicePort>> = {}
): Mocked<ScriptureServicePort> => ({
  mapSubsetToCompleteBook: vi.fn(),
  mapCompleteToSubsetBook: vi.fn(),
  getBiggerChapter: vi.fn(),
  getSectionChapterCount: vi.fn(),
  getBookChapterCount: vi.fn(),
  ...overrides,
});

export const makeScripturePiecesStateServiceDouble = (
  overrides: Partial<Mocked<ScripturePiecesStateServicePort>> = {}
): Mocked<ScripturePiecesStateServicePort> => ({
  arePiecesDraggable: false,
  shouldShowLabelDates: false,
  resetToDefault: vi.fn(),
  makePiecesDraggable: vi.fn(),
  makePiecesNotDraggable: vi.fn(),
  enableLabelDates: vi.fn(),
  disableLabelDates: vi.fn(),
  ...overrides,
});

export const makeSectionSelectionServiceDouble = (
  overrides: Partial<Mocked<SectionSelectionServicePort>> = {}
): Mocked<SectionSelectionServicePort> => ({
  select: vi.fn(),
  deselect: vi.fn(),
  hasSectionEverBeenSelected: vi.fn(),
  ...overrides,
});

export const makeSequenceStateServiceDouble = (
  overrides: Partial<Mocked<SequenceStateServicePort>> = {}
): Mocked<SequenceStateServicePort> => ({
  isThereAnOngoingSequence: vi.fn(),
  executeAsSequence: vi.fn(),
  startSequence: vi.fn(),
  endSequence: vi.fn(),
  ...overrides,
});

export const makeTestamentSelectionServiceDouble = (
  overrides: Partial<Mocked<TestamentSelectionServicePort>> = {}
): Mocked<TestamentSelectionServicePort> => ({
  select: vi.fn(),
  deselect: vi.fn(),
  ...overrides,
});

export const makeUserPresenceServiceDouble = (
  overrides: Partial<Mocked<UserPresenceServicePort>> = {}
): Mocked<UserPresenceServicePort> => ({
  update: vi.fn(),
  getUserPresence: vi.fn(),
  getOwnConnectionId: vi.fn(),
  getOwnUserPresence: vi.fn(),
  getRemotesUserPresence: vi.fn(),
  getOwnUserSelectedInstance: vi.fn(),
  ...overrides,
});
