import { describe, it, expect, beforeEach, type Mocked } from "vitest";
import { BookInteractionService } from "../../../../../../patterns/bible-stack/bible-stack/application/services/BookInteractionService";
import type {
  BookDataRepositoryPort,
  PieceAdapterPort,
  SequenceStateServicePort,
} from "../../../../../../patterns/bible-stack/bible-stack/application/ports/books";
import type { BookSelectionServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/BookSelection";
import type { ExplodedViewServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/ExplodedView";
import type { PaintPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/Paint";
import type { PieceHierarchyServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/PieceHierarchy";
import type { PieceHighlighterPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/PieceHighlight";
import type { TourGuideServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/TourGuide";
import {
  BookInteractionDelays,
  type BookInteractionConfigProviderPort,
} from "../../../../../../patterns/bible-stack/bible-stack/application/ports/out/BookInteraction";
import type { LoggerPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/out/Logger";
import type { ParentDataChain } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/pieces";
import { StackBibleData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackBibleData";
import { StackBookData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackBookData";
import { StackSectionBookData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackSectionBookData";
import { StackSectionData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackSectionData";
import { StackTestamentData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackTestamentData";
import type {
  BookInfo,
  SectionInfo,
  TestamentInfo,
} from "../../../../../../patterns/bible-stack/bible-stack/domain/models/arrangement";
import {
  BibleStates,
  BibleTypes,
  BibleVisualizationStates,
  BookShapes,
  CrossPositions,
  PieceSelectionSources,
  SelectionModalities,
  type BibleState,
  type BibleVisualizationState,
  type BookShape,
  type ParentDataIds,
  type Piece,
} from "../../../../../../patterns/bible-stack/bible-stack/domain/models/canvas";
import {
  HighlightEvents,
  HighlightStates,
  type HighlightState,
} from "../../../../../../patterns/bible-stack/bible-stack/domain/models/highlight";
import { LabelTranslucencyModes } from "../../../../../../patterns/bible-stack/bible-stack/domain/models/label";
import {
  HighlightPacings,
  HighlightRequestSources,
  UnhighlightRequestSources,
} from "../../../../../../patterns/bible-stack/bible-stack/domain/models/pieces";
import {
  SelectionEvents,
  SelectionStates,
  type SelectionState,
} from "../../../../../../patterns/bible-stack/bible-stack/domain/models/selection";

const ARRANGEMENT_NAME = "arrangement";
const BIBLE_ID = "bible-id";
const TESTAMENT_ID = "testament-id";
const SECTION_ID = "section-id";
const UNHIGHLIGHT_DELAY = 250;

const bookPiece: Piece<"StackBook"> = { id: "book-piece", type: "StackBook" };
const sectionBookPiece: Piece<"StackSectionBook"> = {
  id: "section-book-piece",
  type: "StackSectionBook",
};
const sectionPiece: Piece<"StackSection"> = {
  id: "section-piece",
  type: "StackSection",
};

const makeBookPiece = (id: string): Piece<"StackBook"> => ({
  id,
  type: "StackBook",
});

const bookInfo: BookInfo = {
  type: "complete",
  bookId: "book-id",
  author: "book-author",
  chaptersVerseCount: [10, 20, 30],
  relativeDateRange: { min: 1000, max: 2000 },
  numberOfChapters: 3,
  path: {
    arrangementName: ARRANGEMENT_NAME,
    testamentIndex: 0,
    sectionIndex: 0,
    bookIndex: 0,
  },
};

const sectionInfo: SectionInfo = {
  name: "section",
  color: "#ffffff",
  books: [bookInfo],
  path: {
    arrangementName: ARRANGEMENT_NAME,
    testamentIndex: 0,
    sectionIndex: 0,
  },
};

const testamentInfo: TestamentInfo = {
  name: "testament",
  sections: [sectionInfo],
};

const applySelectionState = (
  data: StackBookData | StackSectionBookData,
  state: SelectionState
) => {
  if (
    state === SelectionStates.Selecting ||
    state === SelectionStates.Selected
  ) {
    data.changeSelectionState(SelectionEvents.RequestSelect);
  }
  if (state === SelectionStates.Selected) {
    data.changeSelectionState(SelectionEvents.SequenceComplete);
  }
};

const applyHighlightState = (
  data: StackBookData | StackSectionBookData,
  state: HighlightState
) => {
  if (
    state === HighlightStates.Highlighting ||
    state === HighlightStates.Highlighted
  ) {
    data.changeHighlightState(HighlightEvents.RequestHighlight);
  }
  if (state === HighlightStates.Highlighted) {
    data.changeHighlightState(HighlightEvents.SequenceComplete);
  }
};

const makeBookData = ({
  id = "book-data",
  piece = bookPiece,
  parentDataIds = { stackBibleId: BIBLE_ID },
  currentShape,
  selectionState = SelectionStates.Idle,
  highlightState = HighlightStates.Idle,
  isActive = false,
  isOnTheGround = false,
}: {
  id?: string;
  piece?: Piece<"StackBook"> | null;
  parentDataIds?: ParentDataIds | null;
  currentShape?: BookShape;
  selectionState?: SelectionState;
  highlightState?: HighlightState;
  isActive?: boolean;
  isOnTheGround?: boolean;
} = {}): StackBookData => {
  const bookData = new StackBookData({
    id,
    piece: piece ?? undefined,
    pieceInfo: bookInfo,
    parentDataIds: parentDataIds ?? undefined,
    currentShape,
    isActive,
    creationParams: {
      arrangementIndex: 0,
      testamentIndex: 0,
      sectionIndex: 0,
      levelIndex: 0,
      bookIndex: 0,
      bookLevelIndex: 0,
      levelsLenght: 1,
    },
  });

  applySelectionState(bookData, selectionState);
  applyHighlightState(bookData, highlightState);
  if (isOnTheGround) {
    bookData.placeOnGround();
  }

  return bookData;
};

const makeSectionBookData = ({
  id = "section-book-data",
  piece = sectionBookPiece,
  parentDataIds = { stackBibleId: BIBLE_ID },
  selectionState = SelectionStates.Idle,
}: {
  id?: string;
  piece?: Piece<"StackSectionBook"> | null;
  parentDataIds?: ParentDataIds | null;
  selectionState?: SelectionState;
} = {}): StackSectionBookData => {
  const sectionBookData = new StackSectionBookData({
    id,
    piece: piece ?? undefined,
    pieceInfo: sectionInfo,
    pieceBookInfo: bookInfo,
    parentDataIds: parentDataIds ?? undefined,
    creationParams: {
      arrangementIndex: 0,
      testamentIndex: 0,
      sectionIndex: 0,
      amountOfChaptersInSection: 3,
    },
  });

  applySelectionState(sectionBookData, selectionState);

  return sectionBookData;
};

const makeSectionData = ({
  id = SECTION_ID,
  piece,
  childrenData = [],
  isInExplodedView = false,
  isActive = false,
  isSplitIntoBooks = false,
}: {
  id?: string;
  piece?: Piece<"StackSection">;
  childrenData?: StackBookData[][];
  isInExplodedView?: boolean;
  isActive?: boolean;
  isSplitIntoBooks?: boolean;
} = {}): StackSectionData =>
  new StackSectionData({
    id,
    piece,
    pieceInfo: sectionInfo,
    parentDataIds: { stackBibleId: BIBLE_ID, stackTestamentId: TESTAMENT_ID },
    childrenData,
    isInExplodedView,
    isActive,
    isSplitIntoBooks,
    creationParams: {
      arrangementIndex: 0,
      testamentIndex: 0,
      sectionIndex: 0,
      amountOfChaptersInSection: 3,
    },
  });

const makeTestamentData = (
  childrenData: (StackSectionData | StackSectionBookData)[] = []
): StackTestamentData =>
  new StackTestamentData({
    id: TESTAMENT_ID,
    pieceInfo: testamentInfo,
    parentDataIds: { stackBibleId: BIBLE_ID },
    childrenData,
    creationParams: { arrangementIndex: 0, testamentIndex: 0 },
  });

const makeBibleData = ({
  currentState = BibleStates.Open,
  currentStackVizState = BibleVisualizationStates.Regular,
  childrenData = [],
}: {
  currentState?: BibleState;
  currentStackVizState?: BibleVisualizationState;
  childrenData?: StackTestamentData[];
} = {}): StackBibleData => {
  const bibleData = new StackBibleData({
    id: BIBLE_ID,
    childrenData,
    currentCrossPosition: CrossPositions.Top,
    currentStackVizState,
    arrangementIndex: 0,
    bibleType: BibleTypes.Default,
  });
  bibleData.changeState(currentState);
  return bibleData;
};

const makeParentDataChain = (
  overrides: Partial<ParentDataChain> = {}
): ParentDataChain => ({
  bibleData: undefined,
  testamentData: undefined,
  sectionData: undefined,
  sectionBookData: undefined,
  bookData: undefined,
  ...overrides,
});

describe("pattern.bible-stack.application.services.BookInteractionService", () => {
  let service: BookInteractionService;
  let bookDataRepositoryPort: Mocked<BookDataRepositoryPort>;
  let pieceHierarchyServicePort: Mocked<PieceHierarchyServicePort>;
  let tourGuideServicePort: Mocked<TourGuideServicePort>;
  let bookSelectionServicePort: Mocked<BookSelectionServicePort>;
  let pieceHighlightServicePort: Mocked<PieceHighlighterPort>;
  let explodedViewServicePort: Mocked<ExplodedViewServicePort>;
  let sequenceStateServicePort: Mocked<SequenceStateServicePort>;
  let pieceAdapterPort: Mocked<PieceAdapterPort>;
  let bookInteractionConfigProviderPort: Mocked<BookInteractionConfigProviderPort>;
  let paintPort: Mocked<PaintPort>;
  let loggerPort: Mocked<LoggerPort>;

  beforeEach(() => {
    bookDataRepositoryPort = {
      getPieceData: vi.fn(),
    } as unknown as Mocked<BookDataRepositoryPort>;

    pieceHierarchyServicePort = {
      getParentDataChain: vi.fn(() => makeParentDataChain()),
    };

    tourGuideServicePort = {
      ongoingTourGuideSectionData:
        undefined as unknown as TourGuideServicePort["ongoingTourGuideSectionData"],
      isThereAnOngoingTourGuide: vi.fn(() => false),
      beginTourGuide: vi.fn(),
      stopTourGuide: vi.fn(),
    };

    bookSelectionServicePort = {
      selectBook: vi.fn(),
      deselectBook: vi.fn(),
      selectBooks: vi.fn(),
      deselectBooks: vi.fn(),
    };

    pieceHighlightServicePort = {
      tryHighlightPiece: vi.fn(),
      tryUnhighlightPiece: vi.fn(),
      isUnhighlightScheduled: vi.fn(() => false),
      changeHighlightIntensity: vi.fn(),
      clearScheduledUnhighlights: vi.fn(),
      clearHighlightedPieces: vi.fn(),
      forgetPiece: vi.fn(),
      unhighlightBiblePieces: vi.fn(),
    };

    explodedViewServicePort = {
      explodeSection: vi.fn(),
      registerExplodedSection: vi.fn(),
      currentExplodedSection:
        undefined as unknown as ExplodedViewServicePort["currentExplodedSection"],
    };

    sequenceStateServicePort = {
      isThereAnOngoingSequence: vi.fn(() => false),
      executeAsSequence: vi.fn(async (task: () => Promise<void>) => {
        await task();
      }),
    };

    pieceAdapterPort = {
      isPieceAnchored: vi.fn(),
    };

    bookInteractionConfigProviderPort = {
      getDelay: vi.fn(() => UNHIGHLIGHT_DELAY),
    };

    paintPort = {
      changeColor: vi.fn(),
      paint: vi.fn(),
      unpaint: vi.fn(),
      activate: vi.fn(),
      deactivate: vi.fn(),
      isActive: false,
    } as unknown as Mocked<PaintPort>;

    loggerPort = {
      error: vi.fn(),
      warn: vi.fn(),
      log: vi.fn(),
    };

    service = new BookInteractionService({
      bookDataRepositoryPort,
      pieceHierarchyServicePort,
      tourGuideServicePort,
      bookSelectionServicePort,
      pieceHighlightServicePort,
      explodedViewServicePort,
      sequenceStateServicePort,
      pieceAdapterPort,
      bookInteractionConfigProviderPort,
      paintPort,
      loggerPort,
    });
  });

  describe("handleBookSelection", () => {
    it("logs and error and no-ops if no book data found", () => {
      bookDataRepositoryPort.getPieceData.mockReturnValue(undefined);

      service.handleBookSelection({
        book: bookPiece,
        interaction: SelectionModalities.Precise,
      });

      expect(loggerPort.error).toHaveBeenCalledWith(
        "BookInteractionService: bookData not found at handleBookClick."
      );
      expect(
        pieceHierarchyServicePort.getParentDataChain
      ).not.toHaveBeenCalled();
      expect(paintPort.paint).not.toHaveBeenCalled();
      expect(sequenceStateServicePort.executeAsSequence).not.toHaveBeenCalled();
    });

    it("logs and error and no-ops if parentDataIds is not defined in book data", () => {
      const bookData = makeBookData({ parentDataIds: null });
      bookDataRepositoryPort.getPieceData.mockReturnValue(bookData);

      service.handleBookSelection({
        book: bookPiece,
        interaction: SelectionModalities.Precise,
      });

      expect(loggerPort.error).toHaveBeenCalledWith(
        "BookInteractionService: bookData.parentDataIds not defined at handleBookClick."
      );
      expect(
        pieceHierarchyServicePort.getParentDataChain
      ).not.toHaveBeenCalled();
      expect(paintPort.paint).not.toHaveBeenCalled();
      expect(sequenceStateServicePort.executeAsSequence).not.toHaveBeenCalled();
    });

    it("no-ops if bible data found and it is not opened", () => {
      const bookData = makeBookData();
      bookDataRepositoryPort.getPieceData.mockReturnValue(bookData);
      pieceHierarchyServicePort.getParentDataChain.mockReturnValue(
        makeParentDataChain({
          bibleData: makeBibleData({ currentState: BibleStates.Closed }),
        })
      );

      service.handleBookSelection({
        book: bookPiece,
        interaction: SelectionModalities.Coarse,
      });

      expect(
        tourGuideServicePort.isThereAnOngoingTourGuide
      ).not.toHaveBeenCalled();
      expect(paintPort.paint).not.toHaveBeenCalled();
      expect(sequenceStateServicePort.executeAsSequence).not.toHaveBeenCalled();
      expect(
        pieceHighlightServicePort.tryHighlightPiece
      ).not.toHaveBeenCalled();
      expect(loggerPort.error).not.toHaveBeenCalled();
    });

    it("stops the current tour guide and returns if book is not selected, there's a section data with a piece and it is being tour-guided", () => {
      const bookData = makeBookData({
        selectionState: SelectionStates.Idle,
        highlightState: HighlightStates.Highlighted,
      });
      const sectionData = makeSectionData({ piece: sectionPiece });
      bookDataRepositoryPort.getPieceData.mockReturnValue(bookData);
      pieceHierarchyServicePort.getParentDataChain.mockReturnValue(
        makeParentDataChain({ sectionData })
      );
      tourGuideServicePort.isThereAnOngoingTourGuide.mockReturnValue(true);
      tourGuideServicePort.ongoingTourGuideSectionData = sectionData;

      service.handleBookSelection({
        book: bookPiece,
        interaction: SelectionModalities.Precise,
      });

      expect(tourGuideServicePort.stopTourGuide).toHaveBeenCalledOnce();
      expect(paintPort.paint).not.toHaveBeenCalled();
      expect(bookSelectionServicePort.selectBook).not.toHaveBeenCalled();
      expect(
        pieceHighlightServicePort.tryHighlightPiece
      ).not.toHaveBeenCalled();
    });

    it("paints the book if the paint feature is active and there's no tour guide to stop", () => {
      const bookData = makeBookData();
      bookDataRepositoryPort.getPieceData.mockReturnValue(bookData);
      tourGuideServicePort.isThereAnOngoingTourGuide.mockReturnValue(false);
      paintPort.isActive = true;

      service.handleBookSelection({
        book: bookPiece,
        interaction: SelectionModalities.Precise,
      });

      expect(tourGuideServicePort.stopTourGuide).not.toHaveBeenCalled();
      expect(paintPort.paint).toHaveBeenCalledWith(bookData);
      expect(sequenceStateServicePort.executeAsSequence).not.toHaveBeenCalled();
      expect(
        pieceHighlightServicePort.tryHighlightPiece
      ).not.toHaveBeenCalled();
    });

    it("selects the book as a sequence if it is highlighted, not selected, paint feature is not active and the interaction is precise", () => {
      const bookData = makeBookData({
        selectionState: SelectionStates.Idle,
        highlightState: HighlightStates.Highlighted,
      });
      bookDataRepositoryPort.getPieceData.mockReturnValue(bookData);

      service.handleBookSelection({
        book: bookPiece,
        interaction: SelectionModalities.Precise,
      });

      expect(sequenceStateServicePort.executeAsSequence).toHaveBeenCalledOnce();
      expect(bookSelectionServicePort.selectBook).toHaveBeenCalledWith({
        data: bookData,
        source: PieceSelectionSources.UserSelection,
      });
      expect(
        pieceHighlightServicePort.tryHighlightPiece
      ).not.toHaveBeenCalled();
    });

    it("tries to highlight if it is not highlighted", () => {
      const bookData = makeBookData({
        selectionState: SelectionStates.Idle,
        highlightState: HighlightStates.Idle,
      });
      bookDataRepositoryPort.getPieceData.mockReturnValue(bookData);

      service.handleBookSelection({
        book: bookPiece,
        interaction: SelectionModalities.Precise,
      });

      expect(pieceHighlightServicePort.tryHighlightPiece).toHaveBeenCalledWith({
        piece: bookPiece,
        source: HighlightRequestSources.UserSelection,
      });
      expect(bookSelectionServicePort.selectBook).not.toHaveBeenCalled();
      expect(sequenceStateServicePort.executeAsSequence).not.toHaveBeenCalled();
    });

    it("deselects the book as a sequence if the book is selecting or selected, there's no section data or it is in exploded view and the interaction is coarse.", () => {
      const cases = [
        { selectionState: SelectionStates.Selecting, sectionData: undefined },
        {
          selectionState: SelectionStates.Selected,
          sectionData: makeSectionData({ isInExplodedView: true }),
        },
      ] as const;

      for (const testCase of cases) {
        vi.clearAllMocks();

        const bookData = makeBookData({
          selectionState: testCase.selectionState,
        });
        bookDataRepositoryPort.getPieceData.mockReturnValue(bookData);
        pieceHierarchyServicePort.getParentDataChain.mockReturnValue(
          makeParentDataChain({ sectionData: testCase.sectionData })
        );

        service.handleBookSelection({
          book: bookPiece,
          interaction: SelectionModalities.Coarse,
        });

        expect(
          sequenceStateServicePort.executeAsSequence
        ).toHaveBeenCalledOnce();
        expect(bookSelectionServicePort.deselectBook).toHaveBeenCalledWith(
          bookData
        );
        expect(bookSelectionServicePort.selectBook).not.toHaveBeenCalled();
        expect(explodedViewServicePort.explodeSection).not.toHaveBeenCalled();
      }
    });

    it("selects the book as a sequence if it is not selecting or selected.", () => {
      const bookData = makeBookData({ selectionState: SelectionStates.Idle });
      bookDataRepositoryPort.getPieceData.mockReturnValue(bookData);
      pieceHierarchyServicePort.getParentDataChain.mockReturnValue(
        makeParentDataChain({ sectionData: undefined })
      );

      service.handleBookSelection({
        book: bookPiece,
        interaction: SelectionModalities.Coarse,
      });

      expect(sequenceStateServicePort.executeAsSequence).toHaveBeenCalledOnce();
      expect(bookSelectionServicePort.selectBook).toHaveBeenCalledWith({
        data: bookData,
        source: PieceSelectionSources.StackUserPresenceUpdate,
      });
      expect(bookSelectionServicePort.deselectBook).not.toHaveBeenCalled();
    });

    it("explodes the section as a sequence if book is inside of a regular-visualized bible and of an imploded section", () => {
      const bookData = makeBookData({
        parentDataIds: { stackBibleId: BIBLE_ID },
      });
      const sectionData = makeSectionData({ isInExplodedView: false });
      bookDataRepositoryPort.getPieceData.mockReturnValue(bookData);
      pieceHierarchyServicePort.getParentDataChain.mockReturnValue(
        makeParentDataChain({
          bibleData: makeBibleData({
            currentStackVizState: BibleVisualizationStates.Regular,
          }),
          sectionData,
        })
      );

      service.handleBookSelection({
        book: bookPiece,
        interaction: SelectionModalities.Coarse,
      });

      expect(sequenceStateServicePort.executeAsSequence).toHaveBeenCalledOnce();
      expect(explodedViewServicePort.explodeSection).toHaveBeenCalledWith({
        data: sectionData,
      });
      expect(bookSelectionServicePort.selectBook).not.toHaveBeenCalled();
      expect(bookSelectionServicePort.deselectBook).not.toHaveBeenCalled();
    });
  });

  describe("handleBookFocusBegin", () => {
    it("logs and error and no-ops if no book data found", () => {
      bookDataRepositoryPort.getPieceData.mockReturnValue(undefined);

      service.handleBookFocusBegin(bookPiece);

      expect(loggerPort.error).toHaveBeenCalledWith(
        "BookInteractionService: bookData not found at handleBookFocusBegin."
      );
      expect(
        sequenceStateServicePort.isThereAnOngoingSequence
      ).not.toHaveBeenCalled();
      expect(
        pieceHierarchyServicePort.getParentDataChain
      ).not.toHaveBeenCalled();
    });

    it("successfully focuses the book, even if there's an ongoing sequence", () => {
      const bookData = makeBookData();
      bookDataRepositoryPort.getPieceData.mockReturnValue(bookData);
      sequenceStateServicePort.isThereAnOngoingSequence.mockReturnValue(true);

      expect(bookData.isFocused).toBe(false);

      service.handleBookFocusBegin(bookPiece);

      expect(bookData.isFocused).toBe(true);
      expect(
        pieceHierarchyServicePort.getParentDataChain
      ).not.toHaveBeenCalled();
    });

    it("no-ops if there's an ongoing sequence", () => {
      const bookData = makeBookData({ parentDataIds: null });
      bookDataRepositoryPort.getPieceData.mockReturnValue(bookData);
      sequenceStateServicePort.isThereAnOngoingSequence.mockReturnValue(true);

      service.handleBookFocusBegin(bookPiece);

      expect(
        pieceHierarchyServicePort.getParentDataChain
      ).not.toHaveBeenCalled();
      expect(
        pieceHighlightServicePort.tryHighlightPiece
      ).not.toHaveBeenCalled();
      expect(explodedViewServicePort.explodeSection).not.toHaveBeenCalled();
      expect(loggerPort.error).not.toHaveBeenCalled();
    });

    it("logs and error and no-ops if parentDataIds is not defined in book data", () => {
      const bookData = makeBookData({ parentDataIds: null });
      bookDataRepositoryPort.getPieceData.mockReturnValue(bookData);
      sequenceStateServicePort.isThereAnOngoingSequence.mockReturnValue(false);

      service.handleBookFocusBegin(bookPiece);

      expect(loggerPort.error).toHaveBeenCalledWith(
        "BookInteractionService: bookData.parentDataIds not defined at handleBookFocusBegin."
      );
      expect(
        pieceHierarchyServicePort.getParentDataChain
      ).not.toHaveBeenCalled();
      expect(
        pieceHighlightServicePort.tryHighlightPiece
      ).not.toHaveBeenCalled();
    });

    it("no-ops if found bible is not open, or if there's an ongonig tour guide for the found section", () => {
      const tourGuidedSectionData = makeSectionData({ piece: sectionPiece });
      const cases = [
        {
          chain: makeParentDataChain({
            bibleData: makeBibleData({ currentState: BibleStates.Closed }),
          }),
          isThereAnOngoingTourGuide: false,
          ongoingTourGuideSectionData: undefined,
        },
        {
          chain: makeParentDataChain({ sectionData: tourGuidedSectionData }),
          isThereAnOngoingTourGuide: true,
          ongoingTourGuideSectionData: tourGuidedSectionData,
        },
      ] as const;

      for (const testCase of cases) {
        vi.clearAllMocks();

        bookDataRepositoryPort.getPieceData.mockReturnValue(
          makeSectionBookData()
        );
        pieceHierarchyServicePort.getParentDataChain.mockReturnValue(
          testCase.chain
        );
        tourGuideServicePort.isThereAnOngoingTourGuide.mockReturnValue(
          testCase.isThereAnOngoingTourGuide
        );
        tourGuideServicePort.ongoingTourGuideSectionData =
          testCase.ongoingTourGuideSectionData;

        service.handleBookFocusBegin(sectionBookPiece);

        expect(
          pieceHighlightServicePort.tryHighlightPiece
        ).not.toHaveBeenCalled();
        expect(
          sequenceStateServicePort.executeAsSequence
        ).not.toHaveBeenCalled();
      }
    });

    it("tries to highlight the book if it is a section book", () => {
      bookDataRepositoryPort.getPieceData.mockReturnValue(
        makeSectionBookData()
      );

      service.handleBookFocusBegin(sectionBookPiece);

      expect(pieceHighlightServicePort.tryHighlightPiece).toHaveBeenCalledWith({
        piece: sectionBookPiece,
        source: HighlightRequestSources.UserFocus,
      });
      expect(explodedViewServicePort.explodeSection).not.toHaveBeenCalled();
    });

    it("explodes the section as a sequence if there's a non-exploded section found, book is attached to testament, there's no bible data or it is regular-visualized, the book shape is regular or regular-selected and it is a regular book", () => {
      const cases = [
        { currentShape: BookShapes.Regular, bibleData: undefined },
        {
          currentShape: BookShapes.RegularSelected,
          bibleData: makeBibleData({
            currentStackVizState: BibleVisualizationStates.Regular,
          }),
        },
      ] as const;

      for (const testCase of cases) {
        vi.clearAllMocks();

        const bookData = makeBookData({
          parentDataIds: { stackTestamentId: TESTAMENT_ID },
          currentShape: testCase.currentShape,
        });
        const sectionData = makeSectionData({ isInExplodedView: false });
        bookDataRepositoryPort.getPieceData.mockReturnValue(bookData);
        pieceHierarchyServicePort.getParentDataChain.mockReturnValue(
          makeParentDataChain({ bibleData: testCase.bibleData, sectionData })
        );

        service.handleBookFocusBegin(bookPiece);

        expect(
          sequenceStateServicePort.executeAsSequence
        ).toHaveBeenCalledOnce();
        expect(explodedViewServicePort.explodeSection).toHaveBeenCalledWith({
          data: sectionData,
        });
        expect(
          pieceHighlightServicePort.tryHighlightPiece
        ).not.toHaveBeenCalled();
      }
    });

    it("tries to highlight the book with the correct arguments if it a regular book not selected", () => {
      const bookData = makeBookData({
        selectionState: SelectionStates.Idle,
        currentShape: BookShapes.ExplodedView,
      });
      bookDataRepositoryPort.getPieceData.mockReturnValue(bookData);
      pieceHierarchyServicePort.getParentDataChain.mockReturnValue(
        makeParentDataChain({ sectionData: makeSectionData() })
      );

      service.handleBookFocusBegin(bookPiece);

      expect(pieceHighlightServicePort.tryHighlightPiece).toHaveBeenCalledWith({
        piece: bookPiece,
        source: HighlightRequestSources.UserFocus,
      });
      expect(explodedViewServicePort.explodeSection).not.toHaveBeenCalled();
      expect(
        pieceHighlightServicePort.tryUnhighlightPiece
      ).not.toHaveBeenCalled();
    });

    it("tries to unhighlight every other active book that has a piece and is not in the ground and withing the same section and if it has any parent", () => {
      const focusedBookData = makeBookData({
        currentShape: BookShapes.ExplodedView,
        isActive: true,
      });
      const neighbourBookData = makeBookData({
        id: "neighbour-book-data",
        piece: makeBookPiece("neighbour-book-piece"),
        isActive: true,
      });
      const inactiveBookData = makeBookData({
        id: "inactive-book-data",
        piece: makeBookPiece("inactive-book-piece"),
        isActive: false,
      });
      const pieceLessBookData = makeBookData({
        id: "piece-less-book-data",
        piece: null,
        isActive: true,
      });
      const groundedBookData = makeBookData({
        id: "grounded-book-data",
        piece: makeBookPiece("grounded-book-piece"),
        isActive: true,
        isOnTheGround: true,
      });
      const parentLessBookData = makeBookData({
        id: "parent-less-book-data",
        piece: makeBookPiece("parent-less-book-piece"),
        parentDataIds: {},
        isActive: true,
      });

      bookDataRepositoryPort.getPieceData.mockReturnValue(focusedBookData);
      pieceHierarchyServicePort.getParentDataChain.mockReturnValue(
        makeParentDataChain({
          sectionData: makeSectionData({
            childrenData: [
              [focusedBookData, neighbourBookData, inactiveBookData],
              [pieceLessBookData, groundedBookData, parentLessBookData],
            ],
          }),
        })
      );

      service.handleBookFocusBegin(bookPiece);

      expect(
        pieceHighlightServicePort.tryUnhighlightPiece
      ).toHaveBeenCalledOnce();
      expect(
        pieceHighlightServicePort.tryUnhighlightPiece
      ).toHaveBeenCalledWith({
        piece: neighbourBookData.piece,
        source: HighlightRequestSources.Transition,
        pacing: HighlightPacings.Regular,
      });
    });

    it("decreases intensity for other section's highlighted books.", () => {
      const focusedBookData = makeBookData({
        currentShape: BookShapes.ExplodedView,
      });
      const highlightedBookData = makeBookData({
        id: "highlighted-book-data",
        piece: makeBookPiece("highlighted-book-piece"),
        isActive: true,
        highlightState: HighlightStates.Highlighted,
      });
      const idleBookData = makeBookData({
        id: "idle-book-data",
        piece: makeBookPiece("idle-book-piece"),
        isActive: true,
        highlightState: HighlightStates.Idle,
      });
      const focusedSectionData = makeSectionData();
      const otherSectionData = makeSectionData({
        id: "other-section-id",
        isActive: true,
        isSplitIntoBooks: true,
        childrenData: [[highlightedBookData, idleBookData]],
      });

      bookDataRepositoryPort.getPieceData.mockReturnValue(focusedBookData);
      pieceHierarchyServicePort.getParentDataChain.mockReturnValue(
        makeParentDataChain({
          testamentData: makeTestamentData([
            focusedSectionData,
            otherSectionData,
          ]),
          sectionData: focusedSectionData,
        })
      );

      service.handleBookFocusBegin(bookPiece);

      expect(
        pieceHighlightServicePort.changeHighlightIntensity
      ).toHaveBeenCalledOnce();
      expect(
        pieceHighlightServicePort.changeHighlightIntensity
      ).toHaveBeenCalledWith({
        piece: highlightedBookData.piece,
        intensity: LabelTranslucencyModes.Faded,
      });
    });

    it("schedules an unhighlight for every faded book that has one already", () => {
      const focusedBookData = makeBookData({
        currentShape: BookShapes.ExplodedView,
      });
      const scheduledBookData = makeBookData({
        id: "scheduled-book-data",
        piece: makeBookPiece("scheduled-book-piece"),
        isActive: true,
        highlightState: HighlightStates.Highlighted,
      });
      const unscheduledBookData = makeBookData({
        id: "unscheduled-book-data",
        piece: makeBookPiece("unscheduled-book-piece"),
        isActive: true,
        highlightState: HighlightStates.Highlighted,
      });
      const focusedSectionData = makeSectionData();
      const otherSectionData = makeSectionData({
        id: "other-section-id",
        isActive: true,
        isSplitIntoBooks: true,
        childrenData: [[scheduledBookData, unscheduledBookData]],
      });

      bookDataRepositoryPort.getPieceData.mockReturnValue(focusedBookData);
      pieceHierarchyServicePort.getParentDataChain.mockReturnValue(
        makeParentDataChain({
          testamentData: makeTestamentData([
            focusedSectionData,
            otherSectionData,
          ]),
          sectionData: focusedSectionData,
        })
      );
      pieceHighlightServicePort.isUnhighlightScheduled.mockImplementation(
        (piece) => piece.id === scheduledBookData.piece?.id
      );

      service.handleBookFocusBegin(bookPiece);

      expect(bookInteractionConfigProviderPort.getDelay).toHaveBeenCalledWith(
        BookInteractionDelays.UnhighlightOtherSectionBooks
      );
      expect(
        pieceHighlightServicePort.tryUnhighlightPiece
      ).toHaveBeenCalledOnce();
      expect(
        pieceHighlightServicePort.tryUnhighlightPiece
      ).toHaveBeenCalledWith({
        piece: unscheduledBookData.piece,
        source: HighlightRequestSources.UserFocus,
        pacing: HighlightPacings.Regular,
        delay: UNHIGHLIGHT_DELAY,
      });
    });
  });

  describe("handleBookFocusEnd", () => {
    it("logs and error and no-ops if no book data found", () => {
      bookDataRepositoryPort.getPieceData.mockReturnValue(undefined);

      service.handleBookFocusEnd(bookPiece);

      expect(loggerPort.error).toHaveBeenCalledWith(
        "BookInteractionService: bookData not found at handleBookFocusEnd."
      );
      expect(
        sequenceStateServicePort.isThereAnOngoingSequence
      ).not.toHaveBeenCalled();
      expect(
        pieceHighlightServicePort.tryUnhighlightPiece
      ).not.toHaveBeenCalled();
    });

    it("successfully unfocuses the book", () => {
      const bookData = makeBookData({
        parentDataIds: { stackTestamentId: TESTAMENT_ID },
      });
      bookData.beginFocus();
      bookDataRepositoryPort.getPieceData.mockReturnValue(bookData);

      expect(bookData.isFocused).toBe(true);

      service.handleBookFocusEnd(bookPiece);

      expect(bookData.isFocused).toBe(false);
      expect(
        pieceHighlightServicePort.tryUnhighlightPiece
      ).toHaveBeenCalledOnce();
    });

    it("no-ops if there's an ongoing sequence, after unfocusing the book", () => {
      const bookData = makeBookData({
        parentDataIds: { stackTestamentId: TESTAMENT_ID },
      });
      bookData.beginFocus();
      bookDataRepositoryPort.getPieceData.mockReturnValue(bookData);
      sequenceStateServicePort.isThereAnOngoingSequence.mockReturnValue(true);

      service.handleBookFocusEnd(bookPiece);

      expect(bookData.isFocused).toBe(false);
      expect(
        pieceHierarchyServicePort.getParentDataChain
      ).not.toHaveBeenCalled();
      expect(
        pieceHighlightServicePort.tryUnhighlightPiece
      ).not.toHaveBeenCalled();
    });

    it("logs and error and no-ops if parentDataIds is not defined in book data", () => {
      const bookData = makeBookData({ parentDataIds: null });
      bookDataRepositoryPort.getPieceData.mockReturnValue(bookData);

      service.handleBookFocusEnd(bookPiece);

      expect(loggerPort.error).toHaveBeenCalledWith(
        "BookInteractionService: bookData.parentDataIds not defined at handleBookFocusEnd."
      );
      expect(
        pieceHierarchyServicePort.getParentDataChain
      ).not.toHaveBeenCalled();
      expect(
        pieceHighlightServicePort.tryUnhighlightPiece
      ).not.toHaveBeenCalled();
    });

    it("no-ops if the bible found is not opened, or if book is selected, or if a tour-guided section is found, or if it is a regular book attached to a bible", () => {
      const tourGuidedSectionData = makeSectionData({ piece: sectionPiece });
      const cases = [
        {
          makeData: () =>
            makeSectionBookData({
              parentDataIds: { stackTestamentId: TESTAMENT_ID },
            }),
          piece: sectionBookPiece,
          chain: makeParentDataChain({
            bibleData: makeBibleData({ currentState: BibleStates.Closed }),
          }),
          isThereAnOngoingTourGuide: false,
          ongoingTourGuideSectionData: undefined,
        },
        {
          makeData: () =>
            makeSectionBookData({
              parentDataIds: { stackTestamentId: TESTAMENT_ID },
              selectionState: SelectionStates.Selected,
            }),
          piece: sectionBookPiece,
          chain: makeParentDataChain(),
          isThereAnOngoingTourGuide: false,
          ongoingTourGuideSectionData: undefined,
        },
        {
          makeData: () =>
            makeSectionBookData({
              parentDataIds: { stackTestamentId: TESTAMENT_ID },
            }),
          piece: sectionBookPiece,
          chain: makeParentDataChain({ sectionData: tourGuidedSectionData }),
          isThereAnOngoingTourGuide: true,
          ongoingTourGuideSectionData: tourGuidedSectionData,
        },
        {
          makeData: () =>
            makeBookData({ parentDataIds: { stackBibleId: BIBLE_ID } }),
          piece: bookPiece,
          chain: makeParentDataChain(),
          isThereAnOngoingTourGuide: false,
          ongoingTourGuideSectionData: undefined,
        },
      ] as const;

      for (const testCase of cases) {
        vi.clearAllMocks();

        bookDataRepositoryPort.getPieceData.mockReturnValue(
          testCase.makeData()
        );
        pieceHierarchyServicePort.getParentDataChain.mockReturnValue(
          testCase.chain
        );
        tourGuideServicePort.isThereAnOngoingTourGuide.mockReturnValue(
          testCase.isThereAnOngoingTourGuide
        );
        tourGuideServicePort.ongoingTourGuideSectionData =
          testCase.ongoingTourGuideSectionData;

        service.handleBookFocusEnd(testCase.piece);

        expect(
          pieceHighlightServicePort.tryUnhighlightPiece
        ).not.toHaveBeenCalled();
      }
    });

    it("tries to unhighlight the book with the correct arguments.", () => {
      const bookData = makeBookData({
        parentDataIds: { stackTestamentId: TESTAMENT_ID },
      });
      bookDataRepositoryPort.getPieceData.mockReturnValue(bookData);

      service.handleBookFocusEnd(bookPiece);

      expect(bookInteractionConfigProviderPort.getDelay).toHaveBeenCalledWith(
        BookInteractionDelays.UnhighlightBook
      );
      expect(
        pieceHighlightServicePort.tryUnhighlightPiece
      ).toHaveBeenCalledWith({
        piece: bookPiece,
        source: UnhighlightRequestSources.UserUnfocus,
        pacing: HighlightPacings.Regular,
        delay: UNHIGHLIGHT_DELAY,
      });
    });
  });
});
