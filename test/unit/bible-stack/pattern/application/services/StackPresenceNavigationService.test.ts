import { describe, it, expect, beforeEach, vi, type Mocked } from "vitest";
import { StackPresenceNavigationService } from "../../../../../../patterns/bible-stack/bible-stack/application/services/StackPresenceNavigationService";
import { SequenceStateService } from "../../../../../../patterns/bible-stack/bible-stack/application/services/SequenceStateService";
import type { BookSelectionServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/BookSelection";
import type {
  ChapterSelectionServicePort,
  TrySelectChapterParams,
} from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/ChapterSelection";
import type { ExplodedViewServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/ExplodedView";
import type { PieceHierarchyServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/PieceHierarchy";
import type { ScriptureServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/Scripture";
import type { SectionSelectionServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/SectionSelection";
import type { TestamentSelectionServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/TestamentSelection";
import type { UserPresenceServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/UserPresence";
import type { BibleSequenceServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/BibleSequence";
import type { ArrangementServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/Arrangement";
import type { AwaiterPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/out/Awaiter";
import type { BibleDataRepositoryPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/out/BibleDataRepository";
import type { LoggerPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/out/Logger";
import type { PiecePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/out/Piece";
import type { PieceDataRepositoryPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/out/PieceDataRepository";
import type { EventManagerPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/out/EventManager";
import { EventManager } from "../../../../../../patterns/bible-stack/bible-stack/infrastructure/utils/EventManager";
import { StackBibleData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackBibleData";
import { StackBookData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackBookData";
import { StackChapterData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackChapterData";
import { StackSectionBookData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackSectionBookData";
import { StackSectionData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackSectionData";
import { StackTestamentData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackTestamentData";
import type { BibleStackEvents } from "../../../../../../patterns/bible-stack/bible-stack/domain/models/events";
import type {
  BookInfo,
  BookPathIndices,
  SectionInfo,
  TestamentInfo,
} from "../../../../../../patterns/bible-stack/bible-stack/domain/models/arrangement";
import {
  BibleTypes,
  BibleVisualizationStates,
  CrossPositions,
  PieceSelectionSources,
  type ParentDataChain,
  type PieceSelectionSource,
} from "../../../../../../patterns/bible-stack/bible-stack/domain/models/canvas";
import { SelectionEvents } from "../../../../../../patterns/bible-stack/bible-stack/domain/models/selection";
import type {
  ReadingInstance,
  UserPresence,
} from "../../../../../../patterns/bible-stack/bible-stack/domain/models/userPresence";
import {
  makeArrangementServiceDouble,
  makeBibleSequenceServiceDouble,
  makeBookSelectionServiceDouble,
  makeChapterSelectionServiceDouble,
  makeExplodedViewServiceDouble,
  makePieceHierarchyServiceDouble,
  makeScriptureServiceDouble,
  makeSectionSelectionServiceDouble,
  makeTestamentSelectionServiceDouble,
  makeUserPresenceServiceDouble,
} from "../serviceDoubles";
import {
  makeAwaiterDouble,
  makeBibleDataRepositoryDouble,
  makeLoggerDouble,
  makePieceDataRepositoryDouble,
  makePieceDouble,
} from "../adapterDoubles";

const ARRANGEMENT_NAME = "arrangement";
const BIBLE_ID = "bible-id";
const TESTAMENT_ID = "testament-id";
const SECTION_ID = "section-id";
const SOURCE = PieceSelectionSources.StackPresenceNavigation;

const makeBookInfo = (bookId: string, bookIndex: number): BookInfo => ({
  type: "complete",
  bookId,
  author: "author",
  chaptersVerseCount: [10, 10, 10],
  relativeDateRange: { min: 0, max: 1 },
  numberOfChapters: 3,
  path: {
    arrangementName: ARRANGEMENT_NAME,
    testamentIndex: 0,
    sectionIndex: 0,
    bookIndex,
  },
});

const PSALMS_SUBSET_INFO: BookInfo = {
  ...makeBookInfo("PSA-2", 3),
  type: "subset",
  completeBookId: "PSA",
  startIndex: 41,
  endIndex: 72,
};

/** Every book the arrangement knows about, indexed by `bookIndex`. */
const ARRANGEMENT_BOOKS: BookInfo[] = [
  makeBookInfo("GEN", 0),
  makeBookInfo("EXO", 1),
  makeBookInfo("LEV", 2),
  PSALMS_SUBSET_INFO,
];

const sectionInfo: SectionInfo = {
  name: "section",
  color: "#ffffff",
  books: ARRANGEMENT_BOOKS,
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

const markSelected = (
  data: StackChapterData | StackBookData | StackSectionBookData
) => {
  data.changeSelectionState(SelectionEvents.RequestSelect);
  data.changeSelectionState(SelectionEvents.SequenceComplete);
};

const makeChapter = ({
  bookId,
  number,
  isInStack = true,
  isSelected = false,
  isOnTheGround = false,
  isActive = true,
}: {
  bookId: string;
  number: number;
  isInStack?: boolean;
  isSelected?: boolean;
  isOnTheGround?: boolean;
  isActive?: boolean;
}): StackChapterData => {
  const id = `${bookId}-${number}`;
  const chapter = new StackChapterData({
    id,
    piece: { id: `${id}-piece`, type: "StackChapter" },
    pieceInfo: { amountOfVerses: 10, number },
    parentDataIds: isInStack
      ? { stackBibleId: BIBLE_ID, stackBookId: `${bookId}-book` }
      : {},
    isInsideBible: isInStack,
    creationParams: { bookId },
  });
  if (isSelected) markSelected(chapter);
  if (isOnTheGround) chapter.placeOnGround();
  if (isActive) chapter.activate();
  return chapter;
};

const makeBook = ({
  bookId = "GEN",
  id = `${bookId}-book`,
  isSelected = false,
  isActive = true,
  lastInteractionSource,
}: {
  bookId?: string;
  id?: string;
  isSelected?: boolean;
  isActive?: boolean;
  lastInteractionSource?: PieceSelectionSource;
} = {}): StackBookData => {
  const book = new StackBookData({
    id,
    piece: { id: `${id}-piece`, type: "StackBook" },
    pieceInfo:
      ARRANGEMENT_BOOKS.find((info) => info.bookId === bookId) ??
      makeBookInfo(bookId, 0),
    parentDataIds: { stackBibleId: BIBLE_ID },
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
  if (isSelected) markSelected(book);
  if (lastInteractionSource)
    book.changeLastInteractionSource(lastInteractionSource);
  return book;
};

const makeSectionBook = ({
  isSelected = false,
}: { isSelected?: boolean } = {}): StackSectionBookData => {
  const sectionBook = new StackSectionBookData({
    id: "section-book",
    piece: { id: "section-book-piece", type: "StackSectionBook" },
    pieceInfo: sectionInfo,
    pieceBookInfo: ARRANGEMENT_BOOKS[0]!,
    parentDataIds: { stackBibleId: BIBLE_ID, stackTestamentId: TESTAMENT_ID },
    creationParams: {
      arrangementIndex: 0,
      testamentIndex: 0,
      sectionIndex: 0,
      amountOfChaptersInSection: 3,
    },
  });
  if (isSelected) markSelected(sectionBook);
  return sectionBook;
};

const makeSection = ({
  isSplitIntoBooks = false,
  isInExplodedView = false,
  childrenData = [],
}: {
  isSplitIntoBooks?: boolean;
  isInExplodedView?: boolean;
  childrenData?: StackBookData[][];
} = {}): StackSectionData =>
  new StackSectionData({
    id: SECTION_ID,
    pieceInfo: sectionInfo,
    parentDataIds: { stackBibleId: BIBLE_ID, stackTestamentId: TESTAMENT_ID },
    childrenData,
    isActive: true,
    isSplitIntoBooks,
    isInExplodedView,
    creationParams: {
      arrangementIndex: 0,
      testamentIndex: 0,
      sectionIndex: 0,
      amountOfChaptersInSection: 3,
    },
  });

const makeTestament = ({
  isSplitIntoSections = false,
}: { isSplitIntoSections?: boolean } = {}): StackTestamentData =>
  new StackTestamentData({
    id: TESTAMENT_ID,
    pieceInfo: testamentInfo,
    parentDataIds: { stackBibleId: BIBLE_ID },
    childrenData: [],
    isActive: true,
    isSplitIntoSections,
    creationParams: { arrangementIndex: 0, testamentIndex: 0 },
  });

const makeBible = (): StackBibleData =>
  new StackBibleData({
    id: BIBLE_ID,
    childrenData: [],
    currentCrossPosition: CrossPositions.Top,
    currentStackVizState: BibleVisualizationStates.Regular,
    arrangementIndex: 0,
    bibleType: BibleTypes.Default,
  });

/** A hierarchy already opened down to `bookData`: every navigation step but the chapter is skipped. */
const makeOpenChain = (bookData: StackBookData): ParentDataChain => ({
  bibleData: makeBible(),
  testamentData: makeTestament({ isSplitIntoSections: true }),
  sectionData: makeSection({ isSplitIntoBooks: true, isInExplodedView: true }),
  sectionBookData: undefined,
  bookData,
});

/** A hierarchy with nothing opened yet: every navigation step has to run. */
const makeClosedChain = (bookData: StackBookData): ParentDataChain => ({
  bibleData: makeBible(),
  testamentData: makeTestament(),
  sectionData: makeSection(),
  sectionBookData: undefined,
  bookData,
});

const readingInstance = (bookId: string, chapter: number): ReadingInstance => ({
  bookId,
  chapter,
  id: "tab-1",
  selected: true,
  translation: "BSB",
  connectionId: "own-connection",
});

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("pattern.bible-stack.application.services.StackPresenceNavigationService", () => {
  let eventManagerPort: EventManagerPort<BibleStackEvents>;
  let sequenceStateService: SequenceStateService;
  let loggerPort: Mocked<LoggerPort>;
  let bibleDataRepositoryPort: Mocked<BibleDataRepositoryPort>;
  let userPresencePort: Mocked<UserPresenceServicePort>;
  let pieceAdapterPort: Mocked<PiecePort>;
  let pieceDataRepositoryPort: Mocked<PieceDataRepositoryPort>;
  let chapterSelectionServicePort: Mocked<ChapterSelectionServicePort>;
  let pieceHierarchyServicePort: Mocked<PieceHierarchyServicePort>;
  let scriptureServicePort: Mocked<ScriptureServicePort>;
  let bookSelectionServicePort: Mocked<BookSelectionServicePort>;
  let awaiterPort: Mocked<AwaiterPort>;
  let testamentSelectionServicePort: Mocked<TestamentSelectionServicePort>;
  let sectionSelectionServicePort: Mocked<SectionSelectionServicePort>;
  let explodedViewServicePort: Mocked<ExplodedViewServicePort>;
  let arrangementServicePort: Mocked<ArrangementServicePort>;
  let bibleSequenceServicePort: Mocked<BibleSequenceServicePort>;

  let ownInstance: ReadingInstance | undefined;
  let chapters: StackChapterData[];
  let books: StackBookData[];
  let chain: ParentDataChain;
  /** The navigation actions the service issued, in the order it issued them. */
  let steps: string[];
  let releaseHeldSleep: (() => void) | undefined;

  const emitPresence = () =>
    eventManagerPort.emit("OnUserPresenceUpdated", {
      userPresence: new Map() as UserPresence,
    });

  /** Parks the next navigation step until `releaseHeldSleep()` is called. */
  const holdNextSleep = () => {
    awaiterPort.sleep.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          releaseHeldSleep = resolve;
        })
    );
  };

  const chapterId = (params: TrySelectChapterParams) =>
    "data" in params ? params.data.id : undefined;

  const selectedChapterIds = () =>
    chapterSelectionServicePort.trySelectChapter.mock.calls.map(([params]) =>
      chapterId(params)
    );

  const deselectedChapterIds = () =>
    chapterSelectionServicePort.deselectChapter.mock.calls.map(
      ([params]) => params.data.id
    );

  beforeEach(() => {
    eventManagerPort = new EventManager<BibleStackEvents>();
    loggerPort = makeLoggerDouble();
    sequenceStateService = new SequenceStateService({
      eventManagerPort,
      loggerPort,
    });

    ownInstance = readingInstance("GEN", 1);
    chapters = [];
    books = [];
    chain = makeOpenChain(makeBook({ isSelected: true }));
    steps = [];
    releaseHeldSleep = undefined;

    bibleDataRepositoryPort = makeBibleDataRepositoryDouble({
      getAllBiblesData: vi.fn(() => [makeBible()]),
    });
    userPresencePort = makeUserPresenceServiceDouble({
      getOwnUserSelectedInstance: vi.fn(() => ownInstance),
    });
    pieceAdapterPort = makePieceDouble({
      isPieceBeingUsed: vi.fn(() => true),
    });
    pieceDataRepositoryPort = makePieceDataRepositoryDouble({
      getAllChapters: vi.fn(() => chapters),
      getAllBooks: vi.fn(() => books),
      getAllSectionBooks: vi.fn(() => []),
    });
    chapterSelectionServicePort = makeChapterSelectionServiceDouble({
      trySelectChapter: vi.fn(async () => {
        steps.push("chapter");
      }),
      deselectChapter: vi.fn(async () => {
        steps.push("deselect-chapter");
      }),
    });
    pieceHierarchyServicePort = makePieceHierarchyServiceDouble({
      getParentDataChain: vi.fn(() => chain),
    });
    scriptureServicePort = makeScriptureServiceDouble();
    bookSelectionServicePort = makeBookSelectionServiceDouble({
      selectBook: vi.fn(async () => {
        steps.push("book");
      }),
      deselectBook: vi.fn(async () => {
        steps.push("deselect-book");
      }),
    });
    awaiterPort = makeAwaiterDouble({
      sleep: vi.fn(() => Promise.resolve()),
    });
    testamentSelectionServicePort = makeTestamentSelectionServiceDouble({
      select: vi.fn(async () => {
        steps.push("testament");
      }),
    });
    sectionSelectionServicePort = makeSectionSelectionServiceDouble({
      select: vi.fn(async () => {
        steps.push("section");
      }),
    });
    explodedViewServicePort = makeExplodedViewServiceDouble({
      explodeSection: vi.fn(async () => {
        steps.push("explode");
      }),
    });
    bibleSequenceServicePort = makeBibleSequenceServiceDouble({
      resetBible: vi.fn(async () => {
        steps.push("reset");
      }),
    });
    arrangementServicePort = makeArrangementServiceDouble({
      getBookInfoPathById: vi.fn(({ id }: { id: string }) => {
        const bookIndex = ARRANGEMENT_BOOKS.findIndex(
          (info) => info.bookId === id
        );
        return {
          found: bookIndex >= 0,
          arrangementIndex: 0,
          testamentIndex: 0,
          sectionIndex: 0,
          bookIndex: bookIndex >= 0 ? bookIndex : undefined,
        };
      }),
      getBookByIndices: vi.fn(
        ({ bookIndex }: BookPathIndices) => ARRANGEMENT_BOOKS[bookIndex]
      ),
    });

    new StackPresenceNavigationService({
      loggerPort,
      bibleDataRepositoryPort,
      userPresencePort,
      pieceAdapterPort,
      pieceDataRepositoryPort,
      sequenceStateServicePort: sequenceStateService,
      eventManagerPort,
      chapterSelectionServicePort,
      pieceHierarchyServicePort,
      scriptureServicePort,
      bibleSequenceServicePort,
      bookSelectionServicePort,
      awaiterPort,
      testamentSelectionServicePort,
      sectionSelectionServicePort,
      explodedViewServicePort,
      arrangementServicePort,
    });
  });

  describe("navigating to the reader's chapter inside the stack", () => {
    it("opens a closed hierarchy step by step and ends by selecting the chapter", async () => {
      const book = makeBook();
      chain = makeClosedChain(book);
      chapters = [makeChapter({ bookId: "GEN", number: 1 })];

      emitPresence();
      await flush();

      expect(steps).toEqual([
        "testament",
        "section",
        "explode",
        "book",
        "chapter",
      ]);
      expect(
        chapterSelectionServicePort.trySelectChapter
      ).toHaveBeenCalledExactlyOnceWith({ data: chapters[0], bookData: book });
    });

    it("drives every step at the faster pacing when several of them are pending", async () => {
      const book = makeBook();
      chain = makeClosedChain(book);
      chapters = [makeChapter({ bookId: "GEN", number: 1 })];

      emitPresence();
      await flush();

      expect(testamentSelectionServicePort.select).toHaveBeenCalledWith({
        data: chain.testamentData,
        pacing: "Fast",
        source: SOURCE,
      });
      expect(sectionSelectionServicePort.select).toHaveBeenCalledWith({
        data: chain.sectionData,
        pacing: "Double",
        source: SOURCE,
        makeTourGuide: false,
      });
      expect(explodedViewServicePort.explodeSection).toHaveBeenCalledWith({
        data: chain.sectionData,
        pacing: "Fast",
      });
      expect(bookSelectionServicePort.selectBook).toHaveBeenCalledWith({
        data: book,
        pacing: "Fast",
        source: SOURCE,
      });
    });

    it("skips the steps whose piece is already open", async () => {
      chapters = [makeChapter({ bookId: "GEN", number: 1 })];

      emitPresence();
      await flush();

      expect(steps).toEqual(["chapter"]);
    });

    it("selects the book at regular pacing when it is the only pending step", async () => {
      const book = makeBook();
      chain = makeOpenChain(book);
      chapters = [makeChapter({ bookId: "GEN", number: 1 })];

      emitPresence();
      await flush();

      expect(steps).toEqual(["book", "chapter"]);
      expect(bookSelectionServicePort.selectBook).toHaveBeenCalledWith({
        data: book,
        pacing: "Regular",
        source: SOURCE,
      });
    });

    it("selects a section book instead of drilling into a section", async () => {
      const sectionBook = makeSectionBook();
      chain = {
        bibleData: makeBible(),
        testamentData: makeTestament({ isSplitIntoSections: true }),
        sectionData: undefined,
        sectionBookData: sectionBook,
        bookData: undefined,
      };
      chapters = [makeChapter({ bookId: "GEN", number: 1 })];

      emitPresence();
      await flush();

      expect(steps).toEqual(["book", "chapter"]);
      expect(bookSelectionServicePort.selectBook).toHaveBeenCalledWith({
        data: sectionBook,
        pacing: "Regular",
        source: SOURCE,
      });
      expect(
        chapterSelectionServicePort.trySelectChapter
      ).toHaveBeenCalledExactlyOnceWith({
        data: chapters[0],
        bookData: undefined,
      });
    });

    it("first deselects a book an earlier presence navigation left selected", async () => {
      const staleBook = makeBook({
        bookId: "EXO",
        isSelected: true,
        lastInteractionSource: SOURCE,
      });
      const userBook = makeBook({
        bookId: "LEV",
        isSelected: true,
        lastInteractionSource: PieceSelectionSources.UserSelection,
      });
      books = [userBook, staleBook];
      chapters = [makeChapter({ bookId: "GEN", number: 1 })];

      emitPresence();
      await flush();

      expect(steps).toEqual(["deselect-book", "chapter"]);
      expect(
        bookSelectionServicePort.deselectBook
      ).toHaveBeenCalledExactlyOnceWith(staleBook);
    });

    it("resets the stack when a piece of the chain is missing and no closed ancestor can rebuild it", async () => {
      chain = makeOpenChain(makeBook({ isActive: false }));
      chapters = [makeChapter({ bookId: "GEN", number: 1, isActive: false })];

      emitPresence();
      await flush();

      expect(steps).toEqual(["reset", "book", "chapter"]);
      expect(bibleSequenceServicePort.resetBible).toHaveBeenCalledWith({
        bibleData: chain.bibleData,
        pacing: "Double",
      });
    });

    it("opens a present, closed ancestor instead of resetting the stack", async () => {
      chain = {
        ...makeOpenChain(makeBook({ isActive: false })),
        sectionData: makeSection(),
      };
      chapters = [makeChapter({ bookId: "GEN", number: 1, isActive: false })];

      emitPresence();
      await flush();

      expect(steps).toEqual(["section", "explode", "book", "chapter"]);
    });

    it("maps a subset book's chapter to its complete book before matching the reader", async () => {
      ownInstance = readingInstance("PSA", 45);
      scriptureServicePort.mapSubsetToCompleteBook.mockReturnValue({
        bookId: "PSA",
        chapter: 45,
      });
      chapters = [
        makeChapter({ bookId: "GEN", number: 1 }),
        makeChapter({ bookId: "PSA-2", number: 4 }),
      ];

      emitPresence();
      await flush();

      expect(selectedChapterIds()).toEqual(["PSA-2-4"]);
    });
  });

  describe("chapters outside the stack", () => {
    it("selects the reader's chapter directly", async () => {
      chapters = [makeChapter({ bookId: "GEN", number: 1, isInStack: false })];

      emitPresence();
      await flush();

      expect(steps).toEqual(["chapter"]);
      expect(
        chapterSelectionServicePort.trySelectChapter
      ).toHaveBeenCalledExactlyOnceWith({
        data: chapters[0],
        bookData: undefined,
      });
    });

    it("leaves the reader's chapter alone when its piece isn't in use", async () => {
      pieceAdapterPort.isPieceBeingUsed.mockReturnValue(false);
      chapters = [makeChapter({ bookId: "GEN", number: 1, isInStack: false })];

      emitPresence();
      await flush();

      expect(steps).toEqual([]);
    });

    it("deselects other chapters left selected, except those placed on the ground", async () => {
      chapters = [
        makeChapter({ bookId: "GEN", number: 1 }),
        makeChapter({ bookId: "GEN", number: 2, isSelected: true }),
        makeChapter({
          bookId: "GEN",
          number: 3,
          isSelected: true,
          isOnTheGround: true,
        }),
      ];

      emitPresence();
      await flush();

      expect(deselectedChapterIds()).toEqual(["GEN-2"]);
      expect(selectedChapterIds()).toEqual(["GEN-1"]);
    });
  });

  describe("navigating nowhere", () => {
    it("does nothing when there's no bible on the canvas", async () => {
      bibleDataRepositoryPort.getAllBiblesData.mockReturnValue([]);
      chapters = [makeChapter({ bookId: "GEN", number: 1 })];

      emitPresence();
      await flush();

      expect(steps).toEqual([]);
    });

    it("does nothing when the user has no selected reading instance", async () => {
      ownInstance = undefined;
      chapters = [makeChapter({ bookId: "GEN", number: 1 })];

      emitPresence();
      await flush();

      expect(steps).toEqual([]);
    });

    it("does nothing when a chapter's book isn't in the arrangement", async () => {
      ownInstance = readingInstance("REV", 1);
      chapters = [makeChapter({ bookId: "REV", number: 1 })];

      emitPresence();
      await flush();

      expect(steps).toEqual([]);
    });

    it("skips a chapter whose book isn't in the arrangement and still navigates to the reader's", async () => {
      chapters = [
        makeChapter({ bookId: "REV", number: 1 }),
        makeChapter({ bookId: "GEN", number: 1 }),
      ];

      emitPresence();
      await flush();

      expect(selectedChapterIds()).toEqual(["GEN-1"]);
    });

    it("logs a navigation that fails and leaves the service ready for the next one", async () => {
      chapters = [makeChapter({ bookId: "GEN", number: 1 })];
      chapterSelectionServicePort.trySelectChapter.mockRejectedValueOnce(
        new Error("boom")
      );

      emitPresence();
      await flush();

      expect(loggerPort.error).toHaveBeenCalledWith(
        "StackPresenceNavigationService: update failed",
        expect.any(Error)
      );

      emitPresence();
      await flush();

      expect(selectedChapterIds()).toEqual(["GEN-1", "GEN-1"]);
    });
  });

  describe("competing updates", () => {
    it("abandons an in-flight navigation and navigates to the newer position", async () => {
      chapters = [
        makeChapter({ bookId: "GEN", number: 1 }),
        makeChapter({ bookId: "EXO", number: 25 }),
      ];
      holdNextSleep();

      emitPresence();
      await flush();

      ownInstance = readingInstance("EXO", 25);
      emitPresence();
      releaseHeldSleep?.();
      await flush();

      expect(selectedChapterIds()).toEqual(["EXO-25"]);
    });

    it("navigates only to the latest of several positions that arrived mid-navigation", async () => {
      chapters = [
        makeChapter({ bookId: "GEN", number: 1 }),
        makeChapter({ bookId: "EXO", number: 25 }),
        makeChapter({ bookId: "LEV", number: 3 }),
      ];
      holdNextSleep();

      emitPresence();
      await flush();

      ownInstance = readingInstance("EXO", 25);
      emitPresence();
      ownInstance = readingInstance("LEV", 3);
      emitPresence();
      releaseHeldSleep?.();
      await flush();

      expect(selectedChapterIds()).toEqual(["LEV-3"]);
    });

    it("navigates once when no further update arrived", async () => {
      chapters = [makeChapter({ bookId: "GEN", number: 1 })];
      holdNextSleep();

      emitPresence();
      await flush();
      releaseHeldSleep?.();
      await flush();

      expect(selectedChapterIds()).toEqual(["GEN-1"]);
    });

    it("discards a position that arrived during someone else's sequence", async () => {
      chapters = [makeChapter({ bookId: "GEN", number: 1 })];
      let releaseForeign: (() => void) | undefined;
      void sequenceStateService.executeAsSequence(
        () =>
          new Promise<void>((resolve) => {
            releaseForeign = resolve;
          })
      );

      emitPresence();
      await flush();
      releaseForeign?.();
      await flush();

      expect(steps).toEqual([]);
    });
  });

  describe("when a section is exploded", () => {
    it("navigates when the section holds the reader's book, actively selected", async () => {
      chapters = [makeChapter({ bookId: "GEN", number: 1 })];
      const sectionData = makeSection({
        childrenData: [[makeBook({ isSelected: true })]],
      });

      eventManagerPort.emit("OnStackSectionExploded", { sectionData });
      await flush();

      expect(selectedChapterIds()).toEqual(["GEN-1"]);
    });

    it("does not navigate when the section doesn't hold the reader's book", async () => {
      chapters = [makeChapter({ bookId: "GEN", number: 1 })];
      const sectionData = makeSection({
        childrenData: [[makeBook({ bookId: "EXO", isSelected: true })]],
      });

      eventManagerPort.emit("OnStackSectionExploded", { sectionData });
      await flush();

      expect(steps).toEqual([]);
    });
  });
});
