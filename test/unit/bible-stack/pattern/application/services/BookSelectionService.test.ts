import { describe, it, expect, beforeEach, type Mocked } from "vitest";
import { BookSelectionService } from "../../../../../../patterns/bible-stack/bible-stack/application/services/BookSelectionService";
import type { LoggerPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/Logger";
import type { PieceHighlighterPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/PieceHighlight";
import type { StackUpdateServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/StackUpdate";
import type {
  BookSelectionEventPort,
  PieceAdapterPort,
} from "../../../../../../patterns/bible-stack/bible-stack/application/ports/out/BookSelection";
import { StackBookData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackBookData";
import { StackChapterData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackChapterData";
import { StackSectionBookData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackSectionBookData";
import type {
  BookInfo,
  SectionInfo,
} from "../../../../../../patterns/bible-stack/bible-stack/domain/models/arrangement";
import {
  PieceSelectionSources,
  type ParentDataIds,
  type Piece,
} from "../../../../../../patterns/bible-stack/bible-stack/domain/models/canvas";
import {
  HighlightPacings,
  UnhighlightRequestSources,
} from "../../../../../../patterns/bible-stack/bible-stack/domain/models/pieces";
import {
  SelectionEvents,
  SelectionStates,
  type SelectionState,
} from "../../../../../../patterns/bible-stack/bible-stack/domain/models/selection";
import { StackUpdatePacings } from "../../../../../../patterns/bible-stack/bible-stack/domain/models/stacks";

const ARRANGEMENT_NAME = "arrangement";
const BIBLE_ID = "bible-id";
const BOOK_ID = "book-data";
const SECTION_BOOK_ID = "section-book-data";
const ROOT_BOOK_ID = "root-book-data";

const bookPiece: Piece<"StackBook"> = { id: "book-piece", type: "StackBook" };
const sectionBookPiece: Piece<"StackSectionBook"> = {
  id: "section-book-piece",
  type: "StackSectionBook",
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

const applySelectionState = (
  data: StackBookData | StackSectionBookData | StackChapterData,
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

const makeChapterData = ({
  number,
  selectionState = SelectionStates.Idle,
}: {
  number: number;
  selectionState?: SelectionState;
}): StackChapterData => {
  const chapterData = new StackChapterData({
    id: `chapter-data-${number}`,
    piece: { id: `chapter-piece-${number}`, type: "StackChapter" },
    pieceInfo: { amountOfVerses: number * 10, number },
    parentDataIds: { stackBibleId: BIBLE_ID, stackBookId: BOOK_ID },
    isInsideBible: true,
    creationParams: { bookId: BOOK_ID },
  });

  applySelectionState(chapterData, selectionState);

  return chapterData;
};

const makeBookData = ({
  id = BOOK_ID,
  piece = bookPiece,
  parentDataIds = { stackBibleId: BIBLE_ID },
  childrenData = [],
  selectionState = SelectionStates.Idle,
  isHighlightable = false,
}: {
  id?: string;
  piece?: Piece<"StackBook"> | null;
  parentDataIds?: ParentDataIds | null;
  childrenData?: StackChapterData[];
  selectionState?: SelectionState;
  isHighlightable?: boolean;
} = {}): StackBookData => {
  const bookData = new StackBookData({
    id,
    piece: piece ?? undefined,
    pieceInfo: bookInfo,
    parentDataIds: parentDataIds ?? undefined,
    childrenData,
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
  if (isHighlightable) {
    bookData.becomeHighlightable();
  }

  return bookData;
};

const makeSectionBookData = ({
  id = SECTION_BOOK_ID,
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

const makeDeferred = () => {
  let resolve!: () => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<void>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

describe("pattern.bible-stack.application.services.BookSelectionService", () => {
  let service: BookSelectionService;
  let bookSelectionEventPort: Mocked<BookSelectionEventPort>;
  let pieceAdapterPort: Mocked<PieceAdapterPort>;
  let stackUpdateServicePort: Mocked<StackUpdateServicePort>;
  let pieceHighlighterPort: Mocked<PieceHighlighterPort>;
  let loggerPort: Mocked<LoggerPort>;

  const recordOnStackUpdate = <T>(read: () => T): T[] => {
    const records: T[] = [];
    stackUpdateServicePort.updateStack.mockImplementation(async () => {
      records.push(read());
    });
    return records;
  };

  const recordOnEmit = <T>(
    read: () => T
  ): { eventName: string; value: T }[] => {
    const records: { eventName: string; value: T }[] = [];
    bookSelectionEventPort.emit.mockImplementation(((eventName: string) => {
      records.push({ eventName, value: read() });
    }) as BookSelectionEventPort["emit"]);
    return records;
  };

  const emitOrders = () => bookSelectionEventPort.emit.mock.invocationCallOrder;
  const updateOrders = () =>
    stackUpdateServicePort.updateStack.mock.invocationCallOrder;
  const unhighlightOrders = () =>
    pieceHighlighterPort.tryUnhighlightPiece.mock.invocationCallOrder;

  beforeEach(() => {
    bookSelectionEventPort = {
      emit: vi.fn(),
    } as unknown as Mocked<BookSelectionEventPort>;

    pieceAdapterPort = {
      makeInteractable: vi.fn(),
      makeNonInteractable: vi.fn(),
    };

    stackUpdateServicePort = {
      updateAllStacks: vi.fn(),
      updateStack: vi.fn(),
    };

    pieceHighlighterPort = {
      tryHighlightPiece: vi.fn(),
      tryUnhighlightPiece: vi.fn(),
      isUnhighlightScheduled: vi.fn(),
      changeHighlightIntensity: vi.fn(),
      clearScheduledUnhighlights: vi.fn(),
      clearHighlightedPieces: vi.fn(),
      forgetPiece: vi.fn(),
      unhighlightBiblePieces: vi.fn(),
    };

    loggerPort = {
      error: vi.fn(),
      warn: vi.fn(),
      log: vi.fn(),
    };

    service = new BookSelectionService({
      bookSelectionEventPort,
      pieceAdapterPort,
      stackUpdateServicePort,
      pieceHighlighterPort,
      loggerPort,
    });
  });

  describe("selectBook", () => {
    it("logs an error and no-ops if no piece found", async () => {
      const data = makeBookData({ piece: null });

      await service.selectBook({ data });

      expect(loggerPort.error).toHaveBeenCalledExactlyOnceWith(
        "BookSelectionService: data.piece is not defined at selectBook"
      );
      expect(bookSelectionEventPort.emit).not.toHaveBeenCalled();
      expect(pieceHighlighterPort.tryUnhighlightPiece).not.toHaveBeenCalled();
      expect(stackUpdateServicePort.updateStack).not.toHaveBeenCalled();
      expect(data.selectionState).toBe(SelectionStates.Idle);
    });

    it("emits at start, then at end", async () => {
      const data = makeBookData();

      await service.selectBook({ data });

      expect(bookSelectionEventPort.emit.mock.calls).toEqual([
        ["OnBookBeginSelect", { data }],
        ["OnBookEndSelect", { data }],
      ]);
    });

    it("awaits the try to unhighlight the book, after first emit, before requesting select", async () => {
      const data = makeBookData();
      const unhighlight = makeDeferred();
      pieceHighlighterPort.tryUnhighlightPiece.mockReturnValue(
        unhighlight.promise
      );

      const selection = service.selectBook({
        data,
        pacing: StackUpdatePacings.Fast,
      });
      await flush();

      expect(
        pieceHighlighterPort.tryUnhighlightPiece
      ).toHaveBeenCalledExactlyOnceWith({
        piece: bookPiece,
        source: UnhighlightRequestSources.Transition,
        pacing: HighlightPacings.Fast,
      });
      expect(unhighlightOrders()[0]!).toBeGreaterThan(emitOrders()[0]!);
      expect(data.selectionState).toBe(SelectionStates.Idle);
      expect(stackUpdateServicePort.updateStack).not.toHaveBeenCalled();

      unhighlight.resolve();
      await selection;

      expect(data.selectionState).toBe(SelectionStates.Selected);
    });

    it("does not throw and logs an error if unhighlight gets rejected", async () => {
      const data = makeBookData();
      const error = new Error("unhighlight rejected");
      pieceHighlighterPort.tryUnhighlightPiece.mockRejectedValue(error);

      await expect(service.selectBook({ data })).resolves.toBeUndefined();

      expect(loggerPort.error).toHaveBeenCalledExactlyOnceWith(
        "BookSelectionService: Error at selectBook",
        error
      );
      expect(stackUpdateServicePort.updateStack).not.toHaveBeenCalled();
      expect(data.selectionState).toBe(SelectionStates.Idle);
    });

    it("requests book selection after the unhighlight sequence before the stack update", async () => {
      const data = makeBookData();
      const selectionStates = recordOnStackUpdate(() => data.selectionState);

      await service.selectBook({ data });

      expect(selectionStates).toEqual([SelectionStates.Selecting]);
      expect(updateOrders()[0]!).toBeGreaterThan(unhighlightOrders()[0]!);
    });

    it("logs an error and no-ops if selection state is not mutated", async () => {
      const data = makeBookData({ selectionState: SelectionStates.Selecting });

      await service.selectBook({ data });

      expect(loggerPort.error).toHaveBeenCalledExactlyOnceWith(
        "BookSelectionService: book should be selecting"
      );
      expect(pieceAdapterPort.makeNonInteractable).not.toHaveBeenCalled();
      expect(stackUpdateServicePort.updateStack).not.toHaveBeenCalled();
      expect(bookSelectionEventPort.emit).toHaveBeenCalledExactlyOnceWith(
        "OnBookBeginSelect",
        { data }
      );
    });

    it("records book's last interaction source as UserSelection before the stack update", async () => {
      const data = makeBookData();
      const interactionSources = recordOnStackUpdate(
        () => data.lastInteractionSource
      );

      await service.selectBook({ data });

      expect(interactionSources).toEqual([PieceSelectionSources.UserSelection]);
    });

    it("makes the book non-interactable before the stack update", async () => {
      const data = makeBookData();

      await service.selectBook({ data });

      expect(
        pieceAdapterPort.makeNonInteractable
      ).toHaveBeenCalledExactlyOnceWith(bookPiece);
      expect(updateOrders()[0]!).toBeGreaterThan(
        pieceAdapterPort.makeNonInteractable.mock.invocationCallOrder[0]!
      );
    });

    it("makes the book non-highlightable before the stack update", async () => {
      const data = makeBookData({ isHighlightable: true });
      const highlightables = recordOnStackUpdate(() => data.isHighlightable);

      await service.selectBook({ data });

      expect(highlightables).toEqual([false]);
      expect(data.isHighlightable).toBe(false);
    });

    it("updates the correct stack with the correct pacing, before book is selected", async () => {
      const data = makeBookData();
      const rootData = makeBookData({
        id: ROOT_BOOK_ID,
        piece: makeBookPiece("root-book-piece"),
        parentDataIds: null,
      });
      const selectionStates = recordOnStackUpdate(() => data.selectionState);

      await service.selectBook({ data, pacing: StackUpdatePacings.Slow });

      expect(
        stackUpdateServicePort.updateStack
      ).toHaveBeenCalledExactlyOnceWith(
        BIBLE_ID,
        "StackBible",
        StackUpdatePacings.Slow
      );
      expect(selectionStates).toEqual([SelectionStates.Selecting]);

      await service.selectBook({ data: rootData });

      expect(stackUpdateServicePort.updateStack).toHaveBeenLastCalledWith(
        ROOT_BOOK_ID,
        "StackBook",
        StackUpdatePacings.Regular
      );
    });

    it("does not throw, logs an error and undoes the selection pre-flight if stack update gets rejected", async () => {
      const data = makeBookData({ isHighlightable: true });
      const error = new Error("stack update rejected");
      stackUpdateServicePort.updateStack.mockRejectedValue(error);

      await expect(service.selectBook({ data })).resolves.toBeUndefined();

      expect(loggerPort.error).toHaveBeenCalledExactlyOnceWith(
        "BookSelectionService: Error at selectBook",
        error
      );
      expect(data.selectionState).toBe(SelectionStates.Idle);
      expect(data.isHighlightable).toBe(true);
      expect(data.lastInteractionSource).toBeUndefined();
      expect(pieceAdapterPort.makeInteractable).toHaveBeenCalledExactlyOnceWith(
        bookPiece
      );
      expect(bookSelectionEventPort.emit).toHaveBeenCalledExactlyOnceWith(
        "OnBookBeginSelect",
        { data }
      );
    });

    it("book is selected, before last emit", async () => {
      const data = makeBookData();
      const selectionStates = recordOnEmit(() => data.selectionState);

      await service.selectBook({ data });

      expect(selectionStates).toEqual([
        { eventName: "OnBookBeginSelect", value: SelectionStates.Idle },
        { eventName: "OnBookEndSelect", value: SelectionStates.Selected },
      ]);
      expect(data.selectionState).toBe(SelectionStates.Selected);
    });
  });

  describe("selectBooks", () => {
    it("performs book's selection pre-flight in batch, before any stack update", async () => {
      const piece_1 = makeBookPiece("book-piece-1");
      const piece_2 = makeBookPiece("book-piece-2");
      const book_1 = makeBookData({
        id: "book-data-1",
        piece: piece_1,
        isHighlightable: true,
      });
      const book_2 = makeBookData({
        id: "book-data-2",
        piece: piece_2,
        isHighlightable: true,
      });
      const unhighlight = makeDeferred();
      pieceHighlighterPort.tryUnhighlightPiece.mockReturnValue(
        unhighlight.promise
      );
      const preflights = recordOnStackUpdate(() =>
        [book_1, book_2].map((book) => ({
          selectionState: book.selectionState,
          lastInteractionSource: book.lastInteractionSource,
          isHighlightable: book.isHighlightable,
        }))
      );

      const selection = service.selectBooks([book_1, book_2]);
      await flush();

      expect(pieceHighlighterPort.tryUnhighlightPiece.mock.calls).toEqual([
        [
          {
            piece: piece_1,
            source: UnhighlightRequestSources.Transition,
            pacing: HighlightPacings.Regular,
          },
        ],
        [
          {
            piece: piece_2,
            source: UnhighlightRequestSources.Transition,
            pacing: HighlightPacings.Regular,
          },
        ],
      ]);
      expect(stackUpdateServicePort.updateStack).not.toHaveBeenCalled();

      unhighlight.resolve();
      await selection;

      expect(bookSelectionEventPort.emit.mock.calls.slice(0, 2)).toEqual([
        ["OnBookBeginSelect", { data: book_1 }],
        ["OnBookBeginSelect", { data: book_2 }],
      ]);
      expect(pieceAdapterPort.makeNonInteractable.mock.calls).toEqual([
        [piece_1],
        [piece_2],
      ]);
      expect(preflights[0]).toEqual([
        {
          selectionState: SelectionStates.Selecting,
          lastInteractionSource: PieceSelectionSources.UserSelection,
          isHighlightable: false,
        },
        {
          selectionState: SelectionStates.Selecting,
          lastInteractionSource: PieceSelectionSources.UserSelection,
          isHighlightable: false,
        },
      ]);
    });

    it("does not throw and logs an error if any book unhighlight gets rejected", async () => {
      const book_1 = makeBookData({
        id: "book-data-1",
        piece: makeBookPiece("book-piece-1"),
      });
      const book_2 = makeBookData({
        id: "book-data-2",
        piece: makeBookPiece("book-piece-2"),
      });
      const error = new Error("unhighlight rejected");
      pieceHighlighterPort.tryUnhighlightPiece.mockImplementation(
        async ({ piece }) => {
          if (piece.id === "book-piece-2") throw error;
        }
      );

      await expect(
        service.selectBooks([book_1, book_2])
      ).resolves.toBeUndefined();

      expect(loggerPort.error).toHaveBeenCalledExactlyOnceWith(
        "BookSelectionService: Error at selectBooks",
        error
      );
      expect(stackUpdateServicePort.updateStack).not.toHaveBeenCalled();
      expect([book_1.selectionState, book_2.selectionState]).toEqual([
        SelectionStates.Idle,
        SelectionStates.Idle,
      ]);
    });

    it("perform stack update in batch for unique ancestors, before any closing emit, after any opening emit", async () => {
      const book_1 = makeBookData({
        id: "book-data-1",
        piece: makeBookPiece("book-piece-1"),
      });
      const book_2 = makeBookData({
        id: "book-data-2",
        piece: makeBookPiece("book-piece-2"),
      });
      const rootBook = makeBookData({
        id: ROOT_BOOK_ID,
        piece: makeBookPiece("root-book-piece"),
        parentDataIds: null,
      });
      const update = makeDeferred();
      stackUpdateServicePort.updateStack.mockReturnValue(update.promise);

      const selection = service.selectBooks(
        [book_1, book_2, rootBook],
        StackUpdatePacings.Fast
      );
      await flush();

      expect(stackUpdateServicePort.updateStack.mock.calls).toEqual([
        [BIBLE_ID, "StackBible", StackUpdatePacings.Fast],
        [ROOT_BOOK_ID, "StackBook", StackUpdatePacings.Fast],
      ]);
      expect(bookSelectionEventPort.emit).toHaveBeenCalledTimes(3);

      update.resolve();
      await selection;

      expect(bookSelectionEventPort.emit).toHaveBeenCalledTimes(6);
      expect(Math.min(...updateOrders())).toBeGreaterThan(emitOrders()[2]!);
      expect(Math.max(...updateOrders())).toBeLessThan(emitOrders()[3]!);
    });

    it("does not throw, logs an error and takes every book back to idle if any stack update gets rejected", async () => {
      const book = makeBookData({
        id: "book-data-1",
        piece: makeBookPiece("book-piece-1"),
      });
      const rootBook = makeBookData({
        id: ROOT_BOOK_ID,
        piece: makeBookPiece("root-book-piece"),
        parentDataIds: null,
      });
      const error = new Error("stack update rejected");
      stackUpdateServicePort.updateStack.mockImplementation(async (id) => {
        if (id === ROOT_BOOK_ID) throw error;
      });

      await expect(
        service.selectBooks([book, rootBook])
      ).resolves.toBeUndefined();

      expect(loggerPort.error).toHaveBeenCalledExactlyOnceWith(
        "BookSelectionService: Error at selectBooks",
        error
      );
      expect([book.selectionState, rootBook.selectionState]).toEqual([
        SelectionStates.Idle,
        SelectionStates.Idle,
      ]);
    });

    it("keeps the state of the books that already completed their selection if a closing emit throws", async () => {
      const book_1 = makeBookData({
        id: "book-data-1",
        piece: makeBookPiece("book-piece-1"),
      });
      const book_2 = makeBookData({
        id: "book-data-2",
        piece: makeBookPiece("book-piece-2"),
      });
      const error = new Error("emit threw");
      bookSelectionEventPort.emit.mockImplementation(((
        eventName: string,
        payload: { data: StackBookData }
      ) => {
        if (eventName === "OnBookEndSelect" && payload.data === book_2) {
          throw error;
        }
      }) as BookSelectionEventPort["emit"]);

      await expect(
        service.selectBooks([book_1, book_2])
      ).resolves.toBeUndefined();

      expect(loggerPort.error).toHaveBeenCalledExactlyOnceWith(
        "BookSelectionService: Error at selectBooks",
        error
      );
      expect([book_1.selectionState, book_2.selectionState]).toEqual([
        SelectionStates.Selected,
        SelectionStates.Selected,
      ]);
    });

    it("continues with the books that passed the pre-flight, skipping the ones that did not", async () => {
      const piece = makeBookPiece("book-piece-1");
      const book = makeBookData({ id: "book-data-1", piece });
      const pieceLessBook = makeBookData({
        id: "piece-less-book-data",
        piece: null,
        parentDataIds: null,
      });

      await service.selectBooks([book, pieceLessBook]);

      expect(loggerPort.error).toHaveBeenCalledExactlyOnceWith(
        "BookSelectionService: data.piece is not defined at selectBook"
      );
      expect(
        stackUpdateServicePort.updateStack
      ).toHaveBeenCalledExactlyOnceWith(
        BIBLE_ID,
        "StackBible",
        StackUpdatePacings.Regular
      );
      expect(book.selectionState).toBe(SelectionStates.Selected);
      expect(pieceLessBook.selectionState).toBe(SelectionStates.Idle);
      expect(bookSelectionEventPort.emit.mock.calls).toEqual([
        ["OnBookBeginSelect", { data: book }],
        ["OnBookEndSelect", { data: book }],
      ]);
    });

    it("performs book's selection post-flight in batch", async () => {
      const book_1 = makeBookData({
        id: "book-data-1",
        piece: makeBookPiece("book-piece-1"),
      });
      const book_2 = makeBookData({
        id: "book-data-2",
        piece: makeBookPiece("book-piece-2"),
      });

      await service.selectBooks([book_1, book_2]);

      expect([book_1.selectionState, book_2.selectionState]).toEqual([
        SelectionStates.Selected,
        SelectionStates.Selected,
      ]);
      expect(bookSelectionEventPort.emit.mock.calls.slice(2)).toEqual([
        ["OnBookEndSelect", { data: book_1 }],
        ["OnBookEndSelect", { data: book_2 }],
      ]);
    });
  });

  describe("deselectBook", () => {
    it("emits at start, then at end", async () => {
      const data = makeBookData({ selectionState: SelectionStates.Selected });

      await service.deselectBook(data);

      expect(bookSelectionEventPort.emit.mock.calls).toEqual([
        ["OnBookBeginDeselect", { data }],
        ["OnBookEndDeselect", { data }],
      ]);
    });

    it("sets book as deselecting before stack update, after first emit", async () => {
      const data = makeBookData({ selectionState: SelectionStates.Selected });
      const selectionStates = recordOnStackUpdate(() => data.selectionState);

      await service.deselectBook(data);

      expect(selectionStates).toEqual([SelectionStates.Deselecting]);
      expect(updateOrders()[0]!).toBeGreaterThan(emitOrders()[0]!);
    });

    it("sets book's children as deselecting before stack update, after first emit", async () => {
      const chapter_1 = makeChapterData({
        number: 1,
        selectionState: SelectionStates.Selected,
      });
      const chapter_2 = makeChapterData({
        number: 2,
        selectionState: SelectionStates.Selected,
      });
      const data = makeBookData({
        selectionState: SelectionStates.Selected,
        childrenData: [chapter_1, chapter_2],
      });
      const childrenStates = recordOnStackUpdate(() =>
        data.childrenData.map((chapter) => chapter.selectionState)
      );

      await service.deselectBook(data);

      expect(childrenStates).toEqual([
        [SelectionStates.Deselecting, SelectionStates.Deselecting],
      ]);
      expect(updateOrders()[0]!).toBeGreaterThan(emitOrders()[0]!);
    });

    it("makes book interactable if piece found, before stack update, after first emit", async () => {
      const data = makeBookData({ selectionState: SelectionStates.Selected });
      const pieceLessData = makeBookData({
        id: "piece-less-book-data",
        piece: null,
        selectionState: SelectionStates.Selected,
      });

      await service.deselectBook(data);

      expect(pieceAdapterPort.makeInteractable).toHaveBeenCalledExactlyOnceWith(
        bookPiece
      );
      const [interactableOrder] =
        pieceAdapterPort.makeInteractable.mock.invocationCallOrder;
      expect(interactableOrder!).toBeGreaterThan(emitOrders()[0]!);
      expect(updateOrders()[0]!).toBeGreaterThan(interactableOrder!);

      await expect(
        service.deselectBook(pieceLessData)
      ).resolves.toBeUndefined();

      expect(pieceAdapterPort.makeInteractable).toHaveBeenCalledOnce();
    });

    it("makes book highlightable before stack update, after first emit", async () => {
      const data = makeBookData({ selectionState: SelectionStates.Selected });
      const highlightables = recordOnStackUpdate(() => data.isHighlightable);

      await service.deselectBook(data);

      expect(highlightables).toEqual([true]);
      expect(updateOrders()[0]!).toBeGreaterThan(emitOrders()[0]!);
    });

    it("performs stack update for the correct ancestor and pacing, before last emit", async () => {
      const data = makeBookData({ selectionState: SelectionStates.Selected });
      const rootData = makeBookData({
        id: ROOT_BOOK_ID,
        piece: makeBookPiece("root-book-piece"),
        parentDataIds: null,
        selectionState: SelectionStates.Selected,
      });

      await service.deselectBook(data, StackUpdatePacings.Instant);

      expect(
        stackUpdateServicePort.updateStack
      ).toHaveBeenCalledExactlyOnceWith(
        BIBLE_ID,
        "StackBible",
        StackUpdatePacings.Instant
      );
      expect(updateOrders()[0]!).toBeLessThan(emitOrders()[1]!);

      await service.deselectBook(rootData);

      expect(stackUpdateServicePort.updateStack).toHaveBeenLastCalledWith(
        ROOT_BOOK_ID,
        "StackBook",
        StackUpdatePacings.Regular
      );
    });

    it("does not throw, logs an error and takes the book back to selected if stack update gets rejected", async () => {
      const data = makeBookData({
        selectionState: SelectionStates.Selected,
        isHighlightable: true,
      });
      const error = new Error("stack update rejected");
      stackUpdateServicePort.updateStack.mockRejectedValue(error);

      await expect(service.deselectBook(data)).resolves.toBeUndefined();

      expect(loggerPort.error).toHaveBeenCalledExactlyOnceWith(
        "BookSelectionService: Error at deselectBook",
        error
      );
      expect(data.selectionState).toBe(SelectionStates.Selected);
      expect(data.isHighlightable).toBe(false);
      expect(pieceAdapterPort.makeNonInteractable).toHaveBeenCalledWith(
        bookPiece
      );
      expect(bookSelectionEventPort.emit).toHaveBeenCalledExactlyOnceWith(
        "OnBookBeginDeselect",
        { data }
      );
    });

    it("takes the chapters the pre-flight moved back to selected, leaving the idle ones alone", async () => {
      const selectedChapter = makeChapterData({
        number: 1,
        selectionState: SelectionStates.Selected,
      });
      const idleChapter = makeChapterData({ number: 2 });
      const data = makeBookData({
        selectionState: SelectionStates.Selected,
        childrenData: [selectedChapter, idleChapter],
      });
      stackUpdateServicePort.updateStack.mockRejectedValue(
        new Error("stack update rejected")
      );

      await service.deselectBook(data);

      expect([
        selectedChapter.selectionState,
        idleChapter.selectionState,
      ]).toEqual([SelectionStates.Selected, SelectionStates.Idle]);
    });

    it("book is deselected, before last emit", async () => {
      const data = makeBookData({ selectionState: SelectionStates.Selected });
      const selectionStates = recordOnEmit(() => data.selectionState);

      await service.deselectBook(data);

      expect(selectionStates).toEqual([
        { eventName: "OnBookBeginDeselect", value: SelectionStates.Selected },
        { eventName: "OnBookEndDeselect", value: SelectionStates.Idle },
      ]);
      expect(data.selectionState).toBe(SelectionStates.Idle);
    });
  });

  describe("deselectBooks", () => {
    it("performs book's deselection pre-flight in batch, before any stack update", async () => {
      const piece_1 = makeBookPiece("book-piece-1");
      const chapter = makeChapterData({
        number: 1,
        selectionState: SelectionStates.Selected,
      });
      const book = makeBookData({
        id: "book-data-1",
        piece: piece_1,
        childrenData: [chapter],
        selectionState: SelectionStates.Selected,
      });
      const sectionBook = makeSectionBookData({
        selectionState: SelectionStates.Selected,
      });
      const preflights = recordOnStackUpdate(() =>
        [book, sectionBook].map((data) => ({
          selectionState: data.selectionState,
          isHighlightable: data.isHighlightable,
        }))
      );

      await service.deselectBooks([book, sectionBook]);

      expect(preflights[0]).toEqual([
        { selectionState: SelectionStates.Deselecting, isHighlightable: true },
        { selectionState: SelectionStates.Deselecting, isHighlightable: true },
      ]);
      expect(chapter.selectionState).toBe(SelectionStates.Deselecting);
      expect(pieceAdapterPort.makeInteractable.mock.calls).toEqual([
        [piece_1],
        [sectionBookPiece],
      ]);
      expect(bookSelectionEventPort.emit.mock.calls.slice(0, 2)).toEqual([
        ["OnBookBeginDeselect", { data: book }],
        ["OnBookBeginDeselect", { data: sectionBook }],
      ]);
      expect(Math.min(...updateOrders())).toBeGreaterThan(emitOrders()[1]!);
    });

    it("perform stack update in batch for unique ancestors, before any closing emit, after any opening emit", async () => {
      const book_1 = makeBookData({
        id: "book-data-1",
        piece: makeBookPiece("book-piece-1"),
        selectionState: SelectionStates.Selected,
      });
      const book_2 = makeBookData({
        id: "book-data-2",
        piece: makeBookPiece("book-piece-2"),
        selectionState: SelectionStates.Selected,
      });
      const rootBook = makeBookData({
        id: ROOT_BOOK_ID,
        piece: makeBookPiece("root-book-piece"),
        parentDataIds: null,
        selectionState: SelectionStates.Selected,
      });
      const update = makeDeferred();
      stackUpdateServicePort.updateStack.mockReturnValue(update.promise);

      const deselection = service.deselectBooks(
        [book_1, book_2, rootBook],
        StackUpdatePacings.Slow
      );
      await flush();

      expect(stackUpdateServicePort.updateStack.mock.calls).toEqual([
        [BIBLE_ID, "StackBible", StackUpdatePacings.Slow],
        [ROOT_BOOK_ID, "StackBook", StackUpdatePacings.Slow],
      ]);
      expect(bookSelectionEventPort.emit).toHaveBeenCalledTimes(3);

      update.resolve();
      await deselection;

      expect(bookSelectionEventPort.emit).toHaveBeenCalledTimes(6);
      expect(Math.min(...updateOrders())).toBeGreaterThan(emitOrders()[2]!);
      expect(Math.max(...updateOrders())).toBeLessThan(emitOrders()[3]!);
    });

    it("does not throw, logs an error and takes every book back to selected if any stack update gets rejected", async () => {
      const book = makeBookData({
        id: "book-data-1",
        piece: makeBookPiece("book-piece-1"),
        selectionState: SelectionStates.Selected,
      });
      const rootBook = makeBookData({
        id: ROOT_BOOK_ID,
        piece: makeBookPiece("root-book-piece"),
        parentDataIds: null,
        selectionState: SelectionStates.Selected,
      });
      const error = new Error("stack update rejected");
      stackUpdateServicePort.updateStack.mockImplementation(async (id) => {
        if (id === ROOT_BOOK_ID) throw error;
      });

      await expect(
        service.deselectBooks([book, rootBook])
      ).resolves.toBeUndefined();

      expect(loggerPort.error).toHaveBeenCalledExactlyOnceWith(
        "BookSelectionService: Error at deselectBooks",
        error
      );
      expect([book.selectionState, rootBook.selectionState]).toEqual([
        SelectionStates.Selected,
        SelectionStates.Selected,
      ]);
    });

    it("keeps the state of the books that already completed their deselection if a closing emit throws", async () => {
      const book_1 = makeBookData({
        id: "book-data-1",
        piece: makeBookPiece("book-piece-1"),
        selectionState: SelectionStates.Selected,
      });
      const book_2 = makeBookData({
        id: "book-data-2",
        piece: makeBookPiece("book-piece-2"),
        selectionState: SelectionStates.Selected,
      });
      const error = new Error("emit threw");
      bookSelectionEventPort.emit.mockImplementation(((
        eventName: string,
        payload: { data: StackBookData }
      ) => {
        if (eventName === "OnBookEndDeselect" && payload.data === book_2) {
          throw error;
        }
      }) as BookSelectionEventPort["emit"]);

      await expect(
        service.deselectBooks([book_1, book_2])
      ).resolves.toBeUndefined();

      expect(loggerPort.error).toHaveBeenCalledExactlyOnceWith(
        "BookSelectionService: Error at deselectBooks",
        error
      );
      expect([book_1.selectionState, book_2.selectionState]).toEqual([
        SelectionStates.Idle,
        SelectionStates.Idle,
      ]);
    });

    it("performs book's deselection post-flight in batch", async () => {
      const book_1 = makeBookData({
        id: "book-data-1",
        piece: makeBookPiece("book-piece-1"),
        selectionState: SelectionStates.Selected,
      });
      const book_2 = makeBookData({
        id: "book-data-2",
        piece: makeBookPiece("book-piece-2"),
        selectionState: SelectionStates.Selected,
      });

      await service.deselectBooks([book_1, book_2]);

      expect([book_1.selectionState, book_2.selectionState]).toEqual([
        SelectionStates.Idle,
        SelectionStates.Idle,
      ]);
      expect(bookSelectionEventPort.emit.mock.calls.slice(2)).toEqual([
        ["OnBookEndDeselect", { data: book_1 }],
        ["OnBookEndDeselect", { data: book_2 }],
      ]);
    });
  });
});
