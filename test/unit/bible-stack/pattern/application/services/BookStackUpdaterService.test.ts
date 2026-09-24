import { describe, it, expect, beforeEach, type Mocked } from "vitest";
import { BookStackUpdaterService } from "../../../../../../patterns/bible-stack/bible-stack/application/services/BookStackUpdaterService";
import type { BookChaptersManagementServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/bibleLifecycle";
import type {
  BookStackUpdaterPort as UpdaterAdapterPort,
  LoggerPort,
} from "../../../../../../patterns/bible-stack/bible-stack/application/ports/out/StackBookUpdater";
import type { PieceLabelServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/pieceLifecycle";
import { StackBookData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackBookData";
import { StackSectionBookData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackSectionBookData";
import { StackSectionData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackSectionData";
import type {
  BookInfo,
  SectionInfo,
} from "../../../../../../patterns/bible-stack/bible-stack/domain/models/arrangement";
import {
  BookShapes,
  type BookShape,
  type Piece,
} from "../../../../../../patterns/bible-stack/bible-stack/domain/models/canvas";
import {
  SelectionEvents,
  SelectionStates,
  type SelectionState,
} from "../../../../../../patterns/bible-stack/bible-stack/domain/models/selection";
import { StackUpdatePacings } from "../../../../../../patterns/bible-stack/bible-stack/domain/models/stacks";

const BIBLE_ID = "bible-id";
const BOOK_ID = "book-id";
const SECTION_BOOK_ID = "section-book-id";
const SECTION_ID = "section-id";

const bookPiece: Piece<"StackBook"> = { id: "book-piece", type: "StackBook" };
const sectionBookPiece: Piece<"StackSectionBook"> = {
  id: "section-book-piece",
  type: "StackSectionBook",
};
const sectionPiece: Piece<"StackSection"> = {
  id: "section-piece",
  type: "StackSection",
};

const bookInfo: BookInfo = {
  type: "complete",
  bookId: BOOK_ID,
  author: "book-author",
  chaptersVerseCount: [10, 20, 30],
  relativeDateRange: { min: 1000, max: 2000 },
  numberOfChapters: 3,
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

const applySelectionState = (
  data: StackBookData | StackSectionBookData,
  selectionState: SelectionState
) => {
  if (selectionState === SelectionStates.Idle) return;

  data.changeSelectionState(SelectionEvents.RequestSelect);
  if (selectionState === SelectionStates.Selecting) return;

  data.changeSelectionState(SelectionEvents.SequenceComplete);
  if (selectionState === SelectionStates.Selected) return;

  data.changeSelectionState(SelectionEvents.RequestDeselect);
};

const makeBookData = ({
  piece = bookPiece,
  selectionState = SelectionStates.Idle,
  isShowingChapters = false,
  currentShape,
}: {
  piece?: Piece<"StackBook"> | null;
  selectionState?: SelectionState;
  isShowingChapters?: boolean;
  currentShape?: BookShape;
} = {}): StackBookData => {
  const data = new StackBookData({
    id: BOOK_ID,
    piece: piece ?? undefined,
    pieceInfo: bookInfo,
    parentDataIds: { stackBibleId: BIBLE_ID },
    currentShape,
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

  applySelectionState(data, selectionState);
  if (isShowingChapters) {
    data.showChapters();
  }

  return data;
};

const makeSectionBookData = ({
  piece = sectionBookPiece,
  selectionState = SelectionStates.Idle,
  isShowingChapters = false,
  currentShape,
}: {
  piece?: Piece<"StackSectionBook"> | null;
  selectionState?: SelectionState;
  isShowingChapters?: boolean;
  currentShape?: BookShape;
} = {}): StackSectionBookData => {
  const data = new StackSectionBookData({
    id: SECTION_BOOK_ID,
    piece: piece ?? undefined,
    pieceInfo: sectionInfo,
    pieceBookInfo: bookInfo,
    parentDataIds: { stackBibleId: BIBLE_ID },
    currentShape,
    creationParams: {
      arrangementIndex: 0,
      testamentIndex: 0,
      sectionIndex: 0,
      amountOfChaptersInSection: 3,
    },
  });

  applySelectionState(data, selectionState);
  if (isShowingChapters) {
    data.showChapters();
  }

  return data;
};

const makeSectionData = ({
  isInExplodedView = false,
}: { isInExplodedView?: boolean } = {}): StackSectionData =>
  new StackSectionData({
    id: SECTION_ID,
    piece: sectionPiece,
    pieceInfo: sectionInfo,
    parentDataIds: { stackBibleId: BIBLE_ID },
    isInExplodedView,
    creationParams: {
      arrangementIndex: 0,
      testamentIndex: 0,
      sectionIndex: 0,
      amountOfChaptersInSection: 3,
    },
  });

describe("pattern.bible-stack.application.services.BookStackUpdaterService", () => {
  let service: BookStackUpdaterService;
  let updaterAdapterPort: Mocked<UpdaterAdapterPort>;
  let bookChaptersManagementServicePort: Mocked<BookChaptersManagementServicePort>;
  let pieceLabelServicePort: Mocked<PieceLabelServicePort>;
  let loggerPort: Mocked<LoggerPort>;
  let callOrder: string[];

  beforeEach(() => {
    callOrder = [];

    updaterAdapterPort = {
      update: vi.fn(async () => {
        callOrder.push("update");
      }),
    };

    bookChaptersManagementServicePort = {
      showChapters: vi.fn(() => {
        callOrder.push("showChapters");
      }),
      hideChapters: vi.fn(() => {
        callOrder.push("hideChapters");
      }),
    };

    pieceLabelServicePort = {
      showLabel: vi.fn(() => {
        callOrder.push("showLabel");
      }),
      hideLabel: vi.fn(async () => {
        callOrder.push("hideLabel");
      }),
    };

    loggerPort = {
      error: vi.fn(),
      warn: vi.fn(),
      log: vi.fn(),
    };

    service = new BookStackUpdaterService({
      updaterAdapterPort,
      bookChaptersManagementServicePort,
      pieceLabelServicePort,
      loggerPort,
    });
  });

  describe("update", () => {
    it("it no-ops if no piece found", async () => {
      const cases = [
        makeBookData({
          piece: null,
          selectionState: SelectionStates.Deselecting,
          isShowingChapters: true,
          currentShape: BookShapes.Selected,
        }),
        makeSectionBookData({
          piece: null,
          selectionState: SelectionStates.Deselecting,
          isShowingChapters: true,
          currentShape: BookShapes.Selected,
        }),
      ];

      for (const data of cases) {
        vi.clearAllMocks();

        await expect(
          service.update({ data, pacing: StackUpdatePacings.Regular })
        ).resolves.toBeUndefined();

        expect(loggerPort.error).toHaveBeenCalledWith(
          "BookStackUpdaterService: command.data.piece not defined at prepareRegularBook"
        );
        expect(updaterAdapterPort.update).not.toHaveBeenCalled();
        expect(
          bookChaptersManagementServicePort.hideChapters
        ).not.toHaveBeenCalled();
        expect(
          bookChaptersManagementServicePort.showChapters
        ).not.toHaveBeenCalled();
        expect(pieceLabelServicePort.hideLabel).not.toHaveBeenCalled();
        expect(pieceLabelServicePort.showLabel).not.toHaveBeenCalled();
      }
    });

    it("only hides chapters and label if book is showing chapters, before update sequence", async () => {
      const notShowingChapters = makeBookData({
        selectionState: SelectionStates.Deselecting,
        isShowingChapters: false,
      });

      await service.update({
        data: notShowingChapters,
        pacing: StackUpdatePacings.Regular,
      });

      expect(
        bookChaptersManagementServicePort.hideChapters
      ).not.toHaveBeenCalled();
      expect(pieceLabelServicePort.hideLabel).not.toHaveBeenCalled();
      expect(updaterAdapterPort.update).toHaveBeenCalledTimes(1);
      expect(callOrder).toEqual(["update"]);

      vi.clearAllMocks();
      callOrder = [];

      const showingChapters = makeBookData({
        selectionState: SelectionStates.Deselecting,
        isShowingChapters: true,
      });

      await service.update({
        data: showingChapters,
        pacing: StackUpdatePacings.Regular,
      });

      expect(
        bookChaptersManagementServicePort.hideChapters
      ).toHaveBeenCalledWith(showingChapters);
      expect(pieceLabelServicePort.hideLabel).toHaveBeenCalledWith(bookPiece);
      expect(callOrder).toEqual(["hideChapters", "hideLabel", "update"]);
    });

    it("hides chapters and label on a regular book if it's selected and has a non-exploded section, or it's deselecting", async () => {
      const deselecting = makeBookData({
        selectionState: SelectionStates.Deselecting,
        isShowingChapters: true,
      });

      await service.update({
        data: deselecting,
        pacing: StackUpdatePacings.Regular,
      });

      expect(
        bookChaptersManagementServicePort.hideChapters
      ).toHaveBeenCalledWith(deselecting);
      expect(pieceLabelServicePort.hideLabel).toHaveBeenCalledWith(bookPiece);

      vi.clearAllMocks();

      const selected = makeBookData({
        selectionState: SelectionStates.Selected,
        isShowingChapters: true,
      });

      await service.update({
        data: selected,
        pacing: StackUpdatePacings.Regular,
      });

      expect(
        bookChaptersManagementServicePort.hideChapters
      ).not.toHaveBeenCalled();
      expect(pieceLabelServicePort.hideLabel).not.toHaveBeenCalled();

      vi.clearAllMocks();

      service.prepareBook({
        data: selected,
        sectionData: makeSectionData({ isInExplodedView: false }),
      });

      expect(
        bookChaptersManagementServicePort.hideChapters
      ).toHaveBeenCalledWith(selected);
      expect(pieceLabelServicePort.hideLabel).toHaveBeenCalledWith(bookPiece);

      vi.clearAllMocks();

      service.prepareBook({
        data: selected,
        sectionData: makeSectionData({ isInExplodedView: true }),
      });

      expect(
        bookChaptersManagementServicePort.hideChapters
      ).not.toHaveBeenCalled();
      expect(pieceLabelServicePort.hideLabel).not.toHaveBeenCalled();
    });

    it("hides chapters and label on a section book if it's deselecting", async () => {
      const deselecting = makeSectionBookData({
        selectionState: SelectionStates.Deselecting,
        isShowingChapters: true,
      });

      await service.update({
        data: deselecting,
        pacing: StackUpdatePacings.Regular,
      });

      expect(
        bookChaptersManagementServicePort.hideChapters
      ).toHaveBeenCalledWith(deselecting);
      expect(pieceLabelServicePort.hideLabel).toHaveBeenCalledWith(
        sectionBookPiece
      );

      for (const selectionState of [
        SelectionStates.Idle,
        SelectionStates.Selecting,
        SelectionStates.Selected,
      ]) {
        vi.clearAllMocks();

        const data = makeSectionBookData({
          selectionState,
          isShowingChapters: true,
        });

        await service.update({ data, pacing: StackUpdatePacings.Regular });

        expect(
          bookChaptersManagementServicePort.hideChapters
        ).not.toHaveBeenCalled();
        expect(pieceLabelServicePort.hideLabel).not.toHaveBeenCalled();
      }
    });

    it("successfully performs update sequence", async () => {
      const cases = [
        makeBookData({ currentShape: BookShapes.Regular }),
        makeSectionBookData({ currentShape: BookShapes.Regular }),
      ];

      for (const data of cases) {
        vi.clearAllMocks();

        await expect(
          service.update({ data, pacing: StackUpdatePacings.Regular })
        ).resolves.toBeUndefined();

        expect(updaterAdapterPort.update).toHaveBeenCalledTimes(1);
        expect(loggerPort.error).not.toHaveBeenCalled();
      }
    });

    it("successfully performs update sequence with the correct arguments", async () => {
      const data = makeBookData();

      await service.update({ data, pacing: StackUpdatePacings.Instant });

      expect(updaterAdapterPort.update).toHaveBeenCalledWith({
        data,
        pacing: StackUpdatePacings.Instant,
      });

      const sectionBookData = makeSectionBookData();

      await service.update({
        data: sectionBookData,
        pacing: StackUpdatePacings.Slow,
      });

      expect(updaterAdapterPort.update).toHaveBeenCalledWith({
        data: sectionBookData,
        pacing: StackUpdatePacings.Slow,
      });
    });

    it("logs an error if the update sequence gets rejected", async () => {
      const error = new Error("update failed");
      updaterAdapterPort.update.mockRejectedValue(error);

      const data = makeBookData({ currentShape: BookShapes.Selected });

      await expect(
        service.update({ data, pacing: StackUpdatePacings.Regular })
      ).resolves.toBeUndefined();

      expect(loggerPort.error).toHaveBeenCalledWith(
        "BookStackUpdaterService: Error at update",
        { error }
      );
      expect(
        bookChaptersManagementServicePort.showChapters
      ).not.toHaveBeenCalled();
      expect(pieceLabelServicePort.showLabel).not.toHaveBeenCalled();
    });

    it("shows chapters in book if it is selected after the update sequence, with the correct arguments", async () => {
      const selectedShape = makeBookData({
        currentShape: BookShapes.Selected,
      });

      await service.update({
        data: selectedShape,
        pacing: StackUpdatePacings.Regular,
      });

      expect(
        bookChaptersManagementServicePort.showChapters
      ).toHaveBeenCalledWith(selectedShape);
      expect(callOrder).toEqual(["update", "showChapters", "showLabel"]);

      for (const currentShape of [
        BookShapes.Regular,
        BookShapes.RegularSelected,
        BookShapes.ExplodedView,
        BookShapes.ExplodedViewCustomShape,
      ]) {
        vi.clearAllMocks();

        const data = makeBookData({ currentShape });

        await service.update({ data, pacing: StackUpdatePacings.Regular });

        expect(
          bookChaptersManagementServicePort.showChapters
        ).not.toHaveBeenCalled();
      }
    });

    it("shows label on book if it is selected after the update sequence, with the correct arguments", async () => {
      const data = makeBookData({ currentShape: BookShapes.Selected });

      await service.update({ data, pacing: StackUpdatePacings.Regular });

      expect(pieceLabelServicePort.showLabel).toHaveBeenCalledWith({
        piece: bookPiece,
        translucencyMode: "Solid",
      });

      vi.clearAllMocks();

      const sectionBookData = makeSectionBookData({
        currentShape: BookShapes.Selected,
      });

      await service.update({
        data: sectionBookData,
        pacing: StackUpdatePacings.Regular,
      });

      expect(pieceLabelServicePort.showLabel).toHaveBeenCalledWith({
        piece: sectionBookPiece,
        translucencyMode: "Solid",
      });

      vi.clearAllMocks();

      const regularShape = makeBookData({ currentShape: BookShapes.Regular });

      await service.update({
        data: regularShape,
        pacing: StackUpdatePacings.Regular,
      });

      expect(pieceLabelServicePort.showLabel).not.toHaveBeenCalled();
    });

    it("logs an error if the label show sequence gets rejected", async () => {
      const error = new Error("showLabel failed");
      pieceLabelServicePort.showLabel.mockRejectedValue(error);

      const data = makeBookData({ currentShape: BookShapes.Selected });

      await expect(
        service.update({ data, pacing: StackUpdatePacings.Regular })
      ).resolves.toBeUndefined();

      expect(loggerPort.error).toHaveBeenCalledTimes(1);
      expect(loggerPort.error).toHaveBeenCalledWith(
        "BookStackUpdaterService: showLabel failed at finalizeBook",
        error
      );
      expect(
        bookChaptersManagementServicePort.showChapters
      ).toHaveBeenCalledWith(data);
    });
  });
});
