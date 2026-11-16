import { describe, it, expect, beforeEach, type Mocked } from "vitest";
import { ChapterInteractionService } from "../../../../../../patterns/bible-stack/bible-stack/application/services/ChapterInteractionService";
import type { PieceHierarchyServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/PieceHierarchy";
import type { LoggerPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/out/Logger";
import { StackBookData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackBookData";
import { StackChapterData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackChapterData";
import { StackSectionBookData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackSectionBookData";
import type {
  BookInfo,
  SectionInfo,
} from "../../../../../../patterns/bible-stack/bible-stack/domain/models/arrangement";
import type {
  ParentDataIds,
  Piece,
  ParentDataChain,
} from "../../../../../../patterns/bible-stack/bible-stack/domain/models/canvas";
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
import { StackUpdatePacings } from "../../../../../../patterns/bible-stack/bible-stack/domain/models/stacks";
import type { PaintServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/Paint";
import type { ChapterSelectionServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/ChapterSelection";
import type { PieceHighlightServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/PieceHighlight";
import type { ChapterNavigationServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/ChapterNavigation";
import { makePieceHighlightServiceDouble } from "../serviceDoubles";
import type { PieceDataRepositoryPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/out/PieceDataRepository";

const ARRANGEMENT_NAME = "arrangement";
const BIBLE_ID = "bible-id";
const BOOK_ID = "book-data";
const SECTION_BOOK_ID = "section-book-data";

const chapterPiece: Piece<"StackChapter"> = {
  id: "chapter-piece",
  type: "StackChapter",
};

const bookPiece: Piece<"StackBook"> = { id: "book-piece", type: "StackBook" };

const sectionBookPiece: Piece<"StackSectionBook"> = {
  id: "section-book-piece",
  type: "StackSectionBook",
};

const bookInfo: BookInfo = {
  type: "complete",
  bookId: BOOK_ID,
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

const applySelectionState = (data: StackChapterData, state: SelectionState) => {
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

const makeChapterData = ({
  id = "chapter-data",
  piece = chapterPiece,
  parentDataIds = { stackBibleId: BIBLE_ID, stackBookId: BOOK_ID },
  selectionState = SelectionStates.Idle,
  isOnTheGround = false,
  isBeingDragged = false,
  isFocused = false,
}: {
  id?: string;
  piece?: Piece<"StackChapter">;
  parentDataIds?: ParentDataIds | null;
  selectionState?: SelectionState;
  isOnTheGround?: boolean;
  isBeingDragged?: boolean;
  isFocused?: boolean;
} = {}): StackChapterData => {
  const chapterData = new StackChapterData({
    id,
    piece,
    pieceInfo: { amountOfVerses: 10, number: 1 },
    parentDataIds: (parentDataIds ?? undefined) as ParentDataIds,
    isInsideBible: true,
    creationParams: { bookId: BOOK_ID },
  });

  applySelectionState(chapterData, selectionState);
  if (isOnTheGround) {
    chapterData.placeOnGround();
  }
  if (isBeingDragged) {
    chapterData.beginDrag();
  }
  if (isFocused) {
    chapterData.beginFocus();
  }

  return chapterData;
};

const makeBookData = (): StackBookData =>
  new StackBookData({
    id: BOOK_ID,
    piece: bookPiece,
    pieceInfo: bookInfo,
    parentDataIds: { stackBibleId: BIBLE_ID },
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

const makeSectionBookData = (): StackSectionBookData =>
  new StackSectionBookData({
    id: SECTION_BOOK_ID,
    piece: sectionBookPiece,
    pieceInfo: sectionInfo,
    pieceBookInfo: bookInfo,
    parentDataIds: { stackBibleId: BIBLE_ID },
    creationParams: {
      arrangementIndex: 0,
      testamentIndex: 0,
      sectionIndex: 0,
      amountOfChaptersInSection: 3,
    },
  });

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

describe("pattern.bible-stack.application.services.ChapterInteractionService", () => {
  let service: ChapterInteractionService;
  let chapterDataRepositoryPort: Mocked<PieceDataRepositoryPort>;
  let pieceHierarchyServicePort: Mocked<PieceHierarchyServicePort>;
  let chapterSelectionServicePort: Mocked<ChapterSelectionServicePort>;
  let pieceHighlighterPort: Mocked<PieceHighlightServicePort>;
  let chapterNavigationServicePort: Mocked<ChapterNavigationServicePort>;
  let paintPort: Mocked<PaintServicePort>;
  let loggerPort: Mocked<LoggerPort>;

  beforeEach(() => {
    chapterDataRepositoryPort = {
      getPieceData: vi.fn(),
    } as unknown as Mocked<PieceDataRepositoryPort>;

    pieceHierarchyServicePort = {
      getParentDataChain: vi.fn(() => makeParentDataChain()),
    };

    chapterSelectionServicePort = {
      deselectChapter: vi.fn(async () => {}),
      trySelectChapter: vi.fn(async () => {}),
    };

    pieceHighlighterPort = makePieceHighlightServiceDouble({
      isUnhighlightScheduled: vi.fn(() => false),
    });

    chapterNavigationServicePort = {
      openChapter: vi.fn(),
    };

    paintPort = {
      changeColor: vi.fn(),
      paint: vi.fn(),
      unpaint: vi.fn(),
      activate: vi.fn(),
      deactivate: vi.fn(),
      isActive: false,
    } as unknown as Mocked<PaintServicePort>;

    loggerPort = {
      error: vi.fn(),
      warn: vi.fn(),
      log: vi.fn(),
    };

    service = new ChapterInteractionService({
      chapterDataRepositoryPort,
      pieceHierarchyServicePort,
      chapterSelectionServicePort,
      pieceHighlighterPort,
      chapterNavigationServicePort,
      paintPort,
      loggerPort,
    });
  });

  describe("handleChapterSelection", () => {
    it("logs an error and no-ops if no chapterData found", () => {
      chapterDataRepositoryPort.getPieceData.mockReturnValue(undefined);

      service.handleChapterSelection({ chapter: chapterPiece });

      expect(loggerPort.error).toHaveBeenCalledWith(
        "ChapterInteractionService: chapterData not found at handleChapterSelection."
      );
      expect(paintPort.paint).not.toHaveBeenCalled();
      expect(
        pieceHierarchyServicePort.getParentDataChain
      ).not.toHaveBeenCalled();
      expect(
        chapterSelectionServicePort.trySelectChapter
      ).not.toHaveBeenCalled();
      expect(
        chapterSelectionServicePort.deselectChapter
      ).not.toHaveBeenCalled();
      expect(chapterNavigationServicePort.openChapter).not.toHaveBeenCalled();
    });

    it("paint if the paint feature is active, skips the rest", () => {
      const chapterData = makeChapterData({
        selectionState: SelectionStates.Idle,
        isOnTheGround: true,
      });
      chapterDataRepositoryPort.getPieceData.mockReturnValue(chapterData);
      paintPort.isActive = true;

      service.handleChapterSelection({ chapter: chapterPiece });

      expect(paintPort.paint).toHaveBeenCalledWith(chapterData);
      expect(
        pieceHierarchyServicePort.getParentDataChain
      ).not.toHaveBeenCalled();
      expect(
        chapterSelectionServicePort.trySelectChapter
      ).not.toHaveBeenCalled();
      expect(chapterNavigationServicePort.openChapter).not.toHaveBeenCalled();
      expect(loggerPort.error).not.toHaveBeenCalled();
    });

    it("logs an error and no-ops if parentDataIds is not defined", () => {
      const chapterData = makeChapterData({ parentDataIds: null });
      chapterDataRepositoryPort.getPieceData.mockReturnValue(chapterData);
      paintPort.isActive = true;

      service.handleChapterSelection({ chapter: chapterPiece });

      expect(loggerPort.error).toHaveBeenCalledWith(
        "ChapterInteractionService: chapterData.parentDataIds not defined at handleChapterSelection."
      );
      expect(paintPort.paint).not.toHaveBeenCalled();
      expect(
        pieceHierarchyServicePort.getParentDataChain
      ).not.toHaveBeenCalled();
      expect(
        chapterSelectionServicePort.trySelectChapter
      ).not.toHaveBeenCalled();
      expect(
        chapterSelectionServicePort.deselectChapter
      ).not.toHaveBeenCalled();
    });

    it("deselects chapter if it is selected and does not have a parent", () => {
      const chapterData = makeChapterData({
        selectionState: SelectionStates.Selected,
      });
      chapterDataRepositoryPort.getPieceData.mockReturnValue(chapterData);

      service.handleChapterSelection({ chapter: chapterPiece });

      expect(chapterSelectionServicePort.deselectChapter).toHaveBeenCalledWith({
        data: chapterData,
        pacing: StackUpdatePacings.Regular,
      });
      expect(
        chapterSelectionServicePort.trySelectChapter
      ).not.toHaveBeenCalled();
      expect(chapterNavigationServicePort.openChapter).not.toHaveBeenCalled();
    });

    it("does not deselect chapter if it is selected and has a parent", () => {
      const cases = [
        makeParentDataChain({ bookData: makeBookData() }),
        makeParentDataChain({ sectionBookData: makeSectionBookData() }),
      ];

      for (const chain of cases) {
        vi.clearAllMocks();

        const chapterData = makeChapterData({
          selectionState: SelectionStates.Selected,
        });
        chapterDataRepositoryPort.getPieceData.mockReturnValue(chapterData);
        pieceHierarchyServicePort.getParentDataChain.mockReturnValue(chain);

        service.handleChapterSelection({ chapter: chapterPiece });

        expect(
          chapterSelectionServicePort.deselectChapter
        ).not.toHaveBeenCalled();
        expect(
          chapterSelectionServicePort.trySelectChapter
        ).not.toHaveBeenCalled();
        expect(chapterNavigationServicePort.openChapter).not.toHaveBeenCalled();
      }
    });

    it("tries to select chapter if it is idle and on the ground", () => {
      const sectionBookData = makeSectionBookData();
      const chapterData = makeChapterData({
        selectionState: SelectionStates.Idle,
        isOnTheGround: true,
      });
      chapterDataRepositoryPort.getPieceData.mockReturnValue(chapterData);
      pieceHierarchyServicePort.getParentDataChain.mockReturnValue(
        makeParentDataChain({ sectionBookData, bookData: makeBookData() })
      );

      service.handleChapterSelection({ chapter: chapterPiece });

      expect(chapterSelectionServicePort.trySelectChapter).toHaveBeenCalledWith(
        {
          data: chapterData,
          bookData: sectionBookData,
          pacing: StackUpdatePacings.Regular,
        }
      );
      expect(chapterNavigationServicePort.openChapter).not.toHaveBeenCalled();
      expect(
        chapterSelectionServicePort.deselectChapter
      ).not.toHaveBeenCalled();
    });

    it("opens the chapter if it is idle and stacked", () => {
      const chapterData = makeChapterData({
        selectionState: SelectionStates.Idle,
        isOnTheGround: false,
      });
      chapterDataRepositoryPort.getPieceData.mockReturnValue(chapterData);

      service.handleChapterSelection({ chapter: chapterPiece });

      expect(chapterNavigationServicePort.openChapter).toHaveBeenCalledWith(
        chapterPiece
      );
      expect(
        chapterSelectionServicePort.trySelectChapter
      ).not.toHaveBeenCalled();
      expect(
        chapterSelectionServicePort.deselectChapter
      ).not.toHaveBeenCalled();
    });
  });

  describe("handleChapterFocusBegin", () => {
    it("logs an error and no-ops if no chapterData found", () => {
      chapterDataRepositoryPort.getPieceData.mockReturnValue(undefined);

      service.handleChapterFocusBegin(chapterPiece);

      expect(loggerPort.error).toHaveBeenCalledWith(
        "ChapterInteractionService: chapterData not found at handleChapterFocusBegin."
      );
      expect(pieceHighlighterPort.tryHighlightPiece).not.toHaveBeenCalled();
    });

    it("focuses chapter", () => {
      const chapterData = makeChapterData();
      chapterDataRepositoryPort.getPieceData.mockReturnValue(chapterData);

      expect(chapterData.isFocused).toBe(false);

      service.handleChapterFocusBegin(chapterPiece);

      expect(chapterData.isFocused).toBe(true);
    });

    it("tries to highlight the chapter after making it focused, with the correct arguments", () => {
      const chapterData = makeChapterData();
      chapterDataRepositoryPort.getPieceData.mockReturnValue(chapterData);
      let wasFocusedWhenRequested: boolean | undefined;
      pieceHighlighterPort.tryHighlightPiece.mockImplementation(async () => {
        wasFocusedWhenRequested = chapterData.isFocused;
      });

      service.handleChapterFocusBegin(chapterPiece);

      expect(wasFocusedWhenRequested).toBe(true);
      expect(pieceHighlighterPort.tryHighlightPiece).toHaveBeenCalledWith({
        piece: chapterPiece,
        source: HighlightRequestSources.UserFocus,
      });
      expect(loggerPort.error).not.toHaveBeenCalled();
    });
  });

  describe("handleChapterFocusEnd", () => {
    it("logs an error and no-ops if no chapterData found", () => {
      chapterDataRepositoryPort.getPieceData.mockReturnValue(undefined);

      service.handleChapterFocusEnd(chapterPiece);

      expect(loggerPort.error).toHaveBeenCalledWith(
        "ChapterInteractionService: chapterData not found at handleChapterFocusEnd."
      );
      expect(pieceHighlighterPort.tryUnhighlightPiece).not.toHaveBeenCalled();
    });

    it("unfocuses chapter", () => {
      const chapterData = makeChapterData({ isFocused: true });
      chapterDataRepositoryPort.getPieceData.mockReturnValue(chapterData);

      expect(chapterData.isFocused).toBe(true);

      service.handleChapterFocusEnd(chapterPiece);

      expect(chapterData.isFocused).toBe(false);
    });

    it("no-ops if chapter is being dragged, after getting it unfocused", () => {
      const chapterData = makeChapterData({
        isFocused: true,
        isBeingDragged: true,
      });
      chapterDataRepositoryPort.getPieceData.mockReturnValue(chapterData);

      service.handleChapterFocusEnd(chapterPiece);

      expect(chapterData.isFocused).toBe(false);
      expect(pieceHighlighterPort.tryUnhighlightPiece).not.toHaveBeenCalled();
    });

    it("tries to unhighlight the chapter if it is not being dragged, with the correct arguments", () => {
      const chapterData = makeChapterData({
        isFocused: true,
        isBeingDragged: false,
      });
      chapterDataRepositoryPort.getPieceData.mockReturnValue(chapterData);

      service.handleChapterFocusEnd(chapterPiece);

      expect(pieceHighlighterPort.tryUnhighlightPiece).toHaveBeenCalledWith({
        piece: chapterPiece,
        source: UnhighlightRequestSources.UserUnfocus,
        pacing: HighlightPacings.Regular,
      });
      expect(loggerPort.error).not.toHaveBeenCalled();
    });
  });
});
