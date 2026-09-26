import { describe, it, expect, beforeEach, type Mocked } from "vitest";
import { PieceStateService } from "../../../../../../patterns/bible-stack/bible-stack/application/services/PieceStateService";
import type { BookChaptersManagementServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/BookChaptersManagement";
import type { PieceLabelServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/PieceLabel";
import type { LoggerPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/out/Logger";
import type {
  ActivityIndicatorsAdapterPort,
  ActivityNotificationAdapterPort,
  PieceDataRepositoryPort,
} from "../../../../../../patterns/bible-stack/bible-stack/application/ports/out/PieceState";
import { ActivityIndicatorData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/ActivityIndicatorData";
import { StackBookData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackBookData";
import { StackChapterData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackChapterData";
import { StackSectionBookData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackSectionBookData";
import type {
  BookInfo,
  SectionInfo,
} from "../../../../../../patterns/bible-stack/bible-stack/domain/models/arrangement";
import {
  BookShapes,
  type BookShape,
  type Piece,
  type PieceState,
} from "../../../../../../patterns/bible-stack/bible-stack/domain/models/canvas";
import { SelectionEvents } from "../../../../../../patterns/bible-stack/bible-stack/domain/models/selection";

const BOOK_ERROR_MESSAGE =
  "PieceStateService: data not found at handleBookStateChanged";
const CHAPTER_ERROR_MESSAGE =
  "PieceStateService: data not found at handleChapterStateChanged";

const TRANSFORM_PROPERTIES: Array<keyof PieceState> = [
  "positionX",
  "positionY",
  "positionZ",
  "sizeX",
  "sizeY",
  "sizeZ",
];

const testamentPiece: Piece<"StackTestament"> = {
  id: "testament-piece",
  type: "StackTestament",
};
const sectionPiece: Piece<"StackSection"> = {
  id: "section-piece",
  type: "StackSection",
};
const bookPiece: Piece<"StackBook"> = { id: "book-piece", type: "StackBook" };
const sectionBookPiece: Piece<"StackSectionBook"> = {
  id: "section-book-piece",
  type: "StackSectionBook",
};
const chapterPiece: Piece<"StackChapter"> = {
  id: "chapter-piece",
  type: "StackChapter",
};
const sectionShadowPiece: Piece<"StackSectionShadow"> = {
  id: "section-shadow-piece",
  type: "StackSectionShadow",
};

const bookInfo: BookInfo = {
  type: "complete",
  bookId: "GEN",
  author: "author",
  chaptersVerseCount: [10, 20],
  relativeDateRange: { min: 0, max: 1 },
  numberOfChapters: 2,
  path: {
    arrangementName: "arrangement",
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
    arrangementName: "arrangement",
    testamentIndex: 0,
    sectionIndex: 0,
  },
};

interface BookStateParams {
  isSelected?: boolean;
  currentShape?: BookShape;
  isShowingChapters?: boolean;
}

const applyBookState = <T extends StackBookData | StackSectionBookData>(
  data: T,
  { isSelected = false, isShowingChapters = false }: BookStateParams
): T => {
  if (isSelected) {
    data.changeSelectionState(SelectionEvents.RequestSelect);
    data.changeSelectionState(SelectionEvents.SequenceComplete);
  }
  if (isShowingChapters) {
    data.showChapters();
  }
  return data;
};

const makeBookData = (params: BookStateParams = {}): StackBookData =>
  applyBookState(
    new StackBookData({
      id: "book-data",
      piece: bookPiece,
      pieceInfo: bookInfo,
      currentShape: params.currentShape,
      creationParams: {
        arrangementIndex: 0,
        testamentIndex: 0,
        sectionIndex: 0,
        levelIndex: 0,
        bookIndex: 0,
        bookLevelIndex: 0,
        levelsLenght: 1,
      },
    }),
    params
  );

const makeSectionBookData = (
  params: BookStateParams = {}
): StackSectionBookData =>
  applyBookState(
    new StackSectionBookData({
      id: "section-book-data",
      piece: sectionBookPiece,
      pieceInfo: sectionInfo,
      pieceBookInfo: bookInfo,
      currentShape: params.currentShape,
      creationParams: {
        arrangementIndex: 0,
        testamentIndex: 0,
        sectionIndex: 0,
        amountOfChaptersInSection: 2,
      },
    }),
    params
  );

const makeIndicator = (id: string): ActivityIndicatorData =>
  new ActivityIndicatorData({
    id,
    index: 0,
    indicatorType: "regular",
    piece: { id: `${id}-piece`, type: "ActivityIndicator", dataId: id },
    containerPieceId: chapterPiece.id,
    containerDataId: "chapter-data",
    containerType: "StackChapter",
  });

const makeChapterData = ({
  activityIndicators = [],
  withNotification = false,
}: {
  activityIndicators?: ActivityIndicatorData[];
  withNotification?: boolean;
} = {}): StackChapterData =>
  new StackChapterData({
    id: "chapter-data",
    piece: chapterPiece,
    pieceInfo: { amountOfVerses: 10, number: 1 },
    parentDataIds: {},
    isInsideBible: true,
    creationParams: { bookId: "GEN" },
    activityIndicators,
    activityNotification: withNotification
      ? { id: "notification-piece", type: "ActivityNotification" }
      : undefined,
  });

describe("pattern.bible-stack.application.services.PieceStateService", () => {
  let service: PieceStateService;
  let labelPositionUpdaterPort: Mocked<
    PieceLabelServicePort<
      | "StackTestament"
      | "StackSection"
      | "StackBook"
      | "StackSectionBook"
      | "StackChapter"
      | "StackSectionShadow"
    >
  >;
  let pieceDataRepositoryPort: Mocked<PieceDataRepositoryPort>;
  let bookChaptersManagementServicePort: Mocked<BookChaptersManagementServicePort>;
  let activityIndicatorsAdapterPort: Mocked<ActivityIndicatorsAdapterPort>;
  let activityNotificationAdapterPort: Mocked<ActivityNotificationAdapterPort>;
  let loggerPort: Mocked<LoggerPort>;

  const expectNoPortCalled = () => {
    expect(labelPositionUpdaterPort.updateLabelPosition).not.toHaveBeenCalled();
    expect(pieceDataRepositoryPort.getPieceData).not.toHaveBeenCalled();
    expect(
      bookChaptersManagementServicePort.updateChaptersPosition
    ).not.toHaveBeenCalled();
    expect(
      activityIndicatorsAdapterPort.updateIndicatorsPosition
    ).not.toHaveBeenCalled();
    expect(
      activityNotificationAdapterPort.updateNotificationPosition
    ).not.toHaveBeenCalled();
    expect(loggerPort.error).not.toHaveBeenCalled();
  };

  beforeEach(() => {
    labelPositionUpdaterPort = {
      showLabel: vi.fn(),
      hideLabel: vi.fn(),
      changeIntensity: vi.fn(),
      updateLabelPosition: vi.fn(),
      getPieceLabel: vi.fn(),
    };

    pieceDataRepositoryPort = {
      getPieceData: vi.fn(),
    } as unknown as Mocked<PieceDataRepositoryPort>;

    bookChaptersManagementServicePort = {
      showChapters: vi.fn(),
      hideChapters: vi.fn(),
      updateChaptersPosition: vi.fn(),
    };

    activityIndicatorsAdapterPort = {
      updateIndicatorsPosition: vi.fn(),
    };

    activityNotificationAdapterPort = {
      updateNotificationPosition: vi.fn(),
    };

    loggerPort = {
      error: vi.fn(),
      warn: vi.fn(),
      log: vi.fn(),
    };

    service = new PieceStateService({
      labelPositionUpdaterPort,
      pieceDataRepositoryPort,
      bookChaptersManagementServicePort,
      activityIndicatorsAdapterPort,
      activityNotificationAdapterPort,
      loggerPort,
    });
  });

  describe("handlePieceStateChanged", () => {
    it("no-ops if the piece is not of type StackTestament, StackSection, StackBook, StackSectionBook, StackChapter, StackSectionShadow", () => {
      const unhandledPieces: Piece[] = [
        { id: "verses-bundle-piece", type: "VersesBundle" },
        { id: "verse-piece", type: "Verse" },
        { id: "cover-piece", type: "StackCover" },
        { id: "cross-line-piece", type: "StackCrossLine" },
        { id: "transformer-piece", type: "StackTransformer" },
        { id: "shadow-piece", type: "StackShadow" },
        { id: "indicator-piece", type: "ActivityIndicator" },
        { id: "notification-piece", type: "ActivityNotification" },
        { id: "label-transformer-piece", type: "InfoLabelTransformer" },
        { id: "label-text-piece", type: "InfoLabelText" },
        { id: "label-tail-piece", type: "InfoLabelTail" },
        { id: "label-date-piece", type: "InfoLabelDate" },
      ];

      for (const piece of unhandledPieces) {
        service.handlePieceStateChanged({
          piece,
          changedProperties: TRANSFORM_PROPERTIES,
        });
      }

      expectNoPortCalled();
    });

    it("no-ops if the changed property is not a position or a size for testament, section, section book, book, chapter", () => {
      const pieces: Piece[] = [
        testamentPiece,
        sectionPiece,
        sectionBookPiece,
        bookPiece,
        chapterPiece,
      ];

      for (const piece of pieces) {
        service.handlePieceStateChanged({ piece, changedProperties: [] });
      }

      expectNoPortCalled();
    });

    it("updates the label position for testament, section, section book, book and section shadow", () => {
      const cases = [
        { piece: testamentPiece, data: undefined },
        { piece: sectionPiece, data: undefined },
        { piece: sectionBookPiece, data: makeSectionBookData() },
        { piece: bookPiece, data: makeBookData() },
        { piece: sectionShadowPiece, data: undefined },
      ];

      for (const { piece, data } of cases) {
        for (const property of TRANSFORM_PROPERTIES) {
          vi.clearAllMocks();
          pieceDataRepositoryPort.getPieceData.mockReturnValue(data);

          service.handlePieceStateChanged({
            piece,
            changedProperties: [property],
          });

          expect(
            labelPositionUpdaterPort.updateLabelPosition
          ).toHaveBeenCalledExactlyOnceWith(piece);
        }
      }
    });

    it("logs an error and returns if no data found for book or section book, after updating the label position", () => {
      for (const piece of [bookPiece, sectionBookPiece]) {
        vi.clearAllMocks();
        pieceDataRepositoryPort.getPieceData.mockReturnValue(undefined);

        service.handlePieceStateChanged({
          piece,
          changedProperties: ["positionX"],
        });

        expect(
          labelPositionUpdaterPort.updateLabelPosition
        ).toHaveBeenCalledExactlyOnceWith(piece);
        expect(loggerPort.error).toHaveBeenCalledExactlyOnceWith(
          BOOK_ERROR_MESSAGE
        );
        expect(
          labelPositionUpdaterPort.updateLabelPosition
        ).toHaveBeenCalledBefore(loggerPort.error);
        expect(
          bookChaptersManagementServicePort.updateChaptersPosition
        ).not.toHaveBeenCalled();
      }
    });

    it("updates a book's or section book's chapters' position if it is selected in state and shape and showing chapters", () => {
      const factories = [
        { piece: bookPiece, makeData: makeBookData },
        { piece: sectionBookPiece, makeData: makeSectionBookData },
      ];
      const selectedState: Required<BookStateParams> = {
        isSelected: true,
        currentShape: BookShapes.Selected,
        isShowingChapters: true,
      };
      const incompleteStates: BookStateParams[] = [
        { ...selectedState, isSelected: false },
        { ...selectedState, currentShape: BookShapes.Regular },
        { ...selectedState, currentShape: BookShapes.RegularSelected },
        { ...selectedState, isShowingChapters: false },
      ];

      for (const { piece, makeData } of factories) {
        vi.clearAllMocks();
        const data = makeData(selectedState);
        pieceDataRepositoryPort.getPieceData.mockReturnValue(data);

        service.handlePieceStateChanged({
          piece,
          changedProperties: ["sizeY"],
        });

        expect(
          bookChaptersManagementServicePort.updateChaptersPosition
        ).toHaveBeenCalledExactlyOnceWith(data);

        for (const state of incompleteStates) {
          vi.clearAllMocks();
          pieceDataRepositoryPort.getPieceData.mockReturnValue(makeData(state));

          service.handlePieceStateChanged({
            piece,
            changedProperties: ["sizeY"],
          });

          expect(
            bookChaptersManagementServicePort.updateChaptersPosition
          ).not.toHaveBeenCalled();
        }
      }
    });

    it("logs an error and returns if no data found for chapter", () => {
      pieceDataRepositoryPort.getPieceData.mockReturnValue(undefined);

      service.handlePieceStateChanged({
        piece: chapterPiece,
        changedProperties: ["positionY"],
      });

      expect(loggerPort.error).toHaveBeenCalledExactlyOnceWith(
        CHAPTER_ERROR_MESSAGE
      );
      expect(
        activityIndicatorsAdapterPort.updateIndicatorsPosition
      ).not.toHaveBeenCalled();
      expect(
        activityNotificationAdapterPort.updateNotificationPosition
      ).not.toHaveBeenCalled();
      expect(
        labelPositionUpdaterPort.updateLabelPosition
      ).not.toHaveBeenCalled();
    });

    it("updates the chapter's indicator's position if there are any", () => {
      const chapterWithIndicators = makeChapterData({
        activityIndicators: [makeIndicator("indicator-1")],
      });
      pieceDataRepositoryPort.getPieceData.mockReturnValue(
        chapterWithIndicators
      );

      service.handlePieceStateChanged({
        piece: chapterPiece,
        changedProperties: ["positionZ"],
      });

      expect(
        activityIndicatorsAdapterPort.updateIndicatorsPosition
      ).toHaveBeenCalledExactlyOnceWith(chapterWithIndicators);

      vi.clearAllMocks();
      pieceDataRepositoryPort.getPieceData.mockReturnValue(makeChapterData());

      service.handlePieceStateChanged({
        piece: chapterPiece,
        changedProperties: ["positionZ"],
      });

      expect(
        activityIndicatorsAdapterPort.updateIndicatorsPosition
      ).not.toHaveBeenCalled();
    });

    it("updates the chapter's activity notification's position if exists.", () => {
      const chapterWithNotification = makeChapterData({
        withNotification: true,
      });
      pieceDataRepositoryPort.getPieceData.mockReturnValue(
        chapterWithNotification
      );

      service.handlePieceStateChanged({
        piece: chapterPiece,
        changedProperties: ["sizeX"],
      });

      expect(
        activityNotificationAdapterPort.updateNotificationPosition
      ).toHaveBeenCalledExactlyOnceWith(chapterWithNotification);

      vi.clearAllMocks();
      pieceDataRepositoryPort.getPieceData.mockReturnValue(makeChapterData());

      service.handlePieceStateChanged({
        piece: chapterPiece,
        changedProperties: ["sizeX"],
      });

      expect(
        activityNotificationAdapterPort.updateNotificationPosition
      ).not.toHaveBeenCalled();
    });
  });
});
