import { describe, it, expect, beforeEach, type Mocked } from "vitest";
import { ChapterSelectionService } from "../../../../../../patterns/bible-stack/bible-stack/application/services/ChapterSelectionService";
import type { LoggerPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/Logger";
import type { PieceActivityServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/PieceActivity";
import type {
  ChapterSelectionAdapterPort,
  LabelManagerPort,
  VersesBundleLifecycleAdapterPort,
} from "../../../../../../patterns/bible-stack/bible-stack/application/ports/out/ChapterSelection";
import { StackBookData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackBookData";
import { StackChapterData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackChapterData";
import { VerseData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/VerseData";
import { VersesBundleData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/VersesBundleData";
import type { BookInfo } from "../../../../../../patterns/bible-stack/bible-stack/domain/models/arrangement";
import type { Piece } from "../../../../../../patterns/bible-stack/bible-stack/domain/models/canvas";
import { LabelTranslucencyModes } from "../../../../../../patterns/bible-stack/bible-stack/domain/models/label";
import {
  SelectionEvents,
  SelectionStates,
  type SelectionState,
} from "../../../../../../patterns/bible-stack/bible-stack/domain/models/selection";

const ARRANGEMENT_NAME = "arrangement";
const BIBLE_ID = "bible-id";
const BOOK_ID = "book-data";

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

const makeBundlePiece = (id: string): Piece<"VersesBundle"> => ({
  id,
  type: "VersesBundle",
});

const makeVersePiece = (id: string): Piece<"Verse"> => ({
  id,
  type: "Verse",
});

const applySelectionState = (data: StackChapterData, state: SelectionState) => {
  if (
    state === SelectionStates.Selecting ||
    state === SelectionStates.Selected ||
    state === SelectionStates.Deselecting
  ) {
    data.changeSelectionState(SelectionEvents.RequestSelect);
  }
  if (
    state === SelectionStates.Selected ||
    state === SelectionStates.Deselecting
  ) {
    data.changeSelectionState(SelectionEvents.SequenceComplete);
  }
  if (state === SelectionStates.Deselecting) {
    data.changeSelectionState(SelectionEvents.RequestDeselect);
  }
};

const makeVerseData = ({
  id,
  piece,
}: {
  id: string;
  piece?: Piece<"Verse"> | null;
}): VerseData =>
  new VerseData({
    id,
    piece: piece ?? undefined,
    creationParams: {
      bookId: BOOK_ID,
      chapter: 1,
      start: 1,
      count: 1,
      verseIndex: 0,
    },
  });

const makeBundleData = ({
  id,
  piece = null,
  verses = [],
}: {
  id: string;
  piece?: Piece<"VersesBundle"> | null;
  verses?: VerseData[];
}): VersesBundleData =>
  new VersesBundleData({
    id,
    piece: piece ?? undefined,
    verses,
    creationParams: { bookId: BOOK_ID, chapter: 1, start: 1, count: 1 },
  });

const makeChapterData = ({
  number = 1,
  piece,
  childrenData = [],
  selectionState = SelectionStates.Idle,
  isOnTheGround = false,
}: {
  number?: number;
  piece?: Piece<"StackChapter"> | null;
  childrenData?: VersesBundleData[];
  selectionState?: SelectionState;
  isOnTheGround?: boolean;
} = {}): StackChapterData => {
  const chapterData = new StackChapterData({
    id: `chapter-data-${number}`,
    piece:
      piece === null
        ? undefined
        : (piece ?? { id: `chapter-piece-${number}`, type: "StackChapter" }),
    pieceInfo: { amountOfVerses: number * 10, number },
    parentDataIds: { stackBibleId: BIBLE_ID, stackBookId: BOOK_ID },
    isInsideBible: true,
    creationParams: { bookId: BOOK_ID },
    childrenData,
  });

  chapterData.activate();
  applySelectionState(chapterData, selectionState);
  if (isOnTheGround) {
    chapterData.placeOnGround();
  }

  return chapterData;
};

const makeBookData = (childrenData: StackChapterData[]): StackBookData =>
  new StackBookData({
    id: BOOK_ID,
    piece: { id: "book-piece", type: "StackBook" },
    pieceInfo: bookInfo,
    parentDataIds: { stackBibleId: BIBLE_ID },
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

describe("pattern.bible-stack.application.services.ChapterSelectionService", () => {
  let service: ChapterSelectionService;
  let loggerPort: Mocked<LoggerPort>;
  let chapterSelectionAdapterPort: Mocked<ChapterSelectionAdapterPort>;
  let pieceActivityServicePort: Mocked<PieceActivityServicePort>;
  let labelManagerPort: Mocked<LabelManagerPort>;
  let versesBundleLifecycleAdapterPort: Mocked<VersesBundleLifecycleAdapterPort>;

  const selectOrders = () =>
    chapterSelectionAdapterPort.select.mock.invocationCallOrder;
  const deselectOrders = () =>
    chapterSelectionAdapterPort.deselect.mock.invocationCallOrder;

  const recordOnSelect = <T>(read: () => T): T[] => {
    const records: T[] = [];
    chapterSelectionAdapterPort.select.mockImplementation(async () => {
      records.push(read());
    });
    return records;
  };

  const recordOnDeselect = <T>(read: () => T): T[] => {
    const records: T[] = [];
    chapterSelectionAdapterPort.deselect.mockImplementation(async () => {
      records.push(read());
    });
    return records;
  };

  const recordOnUpdateIndicators = <T>(read: () => T): T[] => {
    const records: T[] = [];
    pieceActivityServicePort.updateIndicators.mockImplementation(() => {
      records.push(read());
      return [];
    });
    return records;
  };

  beforeEach(() => {
    loggerPort = {
      error: vi.fn(),
      warn: vi.fn(),
      log: vi.fn(),
    };

    chapterSelectionAdapterPort = {
      select: vi.fn(),
      deselect: vi.fn(),
    };

    pieceActivityServicePort = {
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
    };

    labelManagerPort = {
      hideLabel: vi.fn(),
      showLabel: vi.fn(),
    };

    versesBundleLifecycleAdapterPort = {
      spawnVersesBundleDomain: vi.fn(),
      despawnVersesBundle: vi.fn(),
      despawnVerse: vi.fn(),
    };

    service = new ChapterSelectionService({
      loggerPort,
      chapterSelectionAdapterPort,
      pieceActivityServicePort,
      labelManagerPort,
      versesBundleLifecycleAdapterPort,
    });
  });

  describe("trySelectChapter", () => {
    it("tries to find the data if it is not provided by params", async () => {
      const firstChapter = makeChapterData({ number: 1 });
      const secondChapter = makeChapterData({ number: 2 });
      const bookData = makeBookData([firstChapter, secondChapter]);

      await service.trySelectChapter({ bookData, chapter: 2 });

      expect(
        chapterSelectionAdapterPort.select
      ).toHaveBeenCalledExactlyOnceWith({ data: secondChapter });
      expect(secondChapter.selectionState).toBe(SelectionStates.Selected);
      expect(firstChapter.selectionState).toBe(SelectionStates.Idle);
    });

    it("logs an error and no-ops if no found or provided data", async () => {
      const bookData = makeBookData([makeChapterData({ number: 1 })]);

      await service.trySelectChapter({ bookData, chapter: 3 });

      expect(loggerPort.error).toHaveBeenCalledExactlyOnceWith(
        "ChapterSelectionService: data not found at trySelectChapter"
      );
      expect(chapterSelectionAdapterPort.select).not.toHaveBeenCalled();
      expect(
        pieceActivityServicePort.tryHideNotification
      ).not.toHaveBeenCalled();
      expect(
        versesBundleLifecycleAdapterPort.spawnVersesBundleDomain
      ).not.toHaveBeenCalled();
    });

    it("changes chapter's selection state to Selecting, before the select sequence.", async () => {
      const data = makeChapterData({ isOnTheGround: true });
      const selectionStates = recordOnSelect(() => data.selectionState);
      const preflightStates: SelectionState[] = [];
      pieceActivityServicePort.tryHideNotification.mockImplementation(() => {
        preflightStates.push(data.selectionState);
        return true;
      });

      await service.trySelectChapter({ data });

      expect(preflightStates).toEqual([SelectionStates.Selecting]);
      expect(selectionStates).toEqual([SelectionStates.Selecting]);
    });

    it("logs a warn and no-ops if selection state is not mutated", async () => {
      const data = makeChapterData({
        selectionState: SelectionStates.Selecting,
        isOnTheGround: true,
      });

      await service.trySelectChapter({ data });

      expect(loggerPort.warn).toHaveBeenCalledExactlyOnceWith(
        "ChapterSelectionService: chapter is not deselecting at deselectChapter"
      );
      expect(chapterSelectionAdapterPort.select).not.toHaveBeenCalled();
      expect(
        pieceActivityServicePort.tryHideNotification
      ).not.toHaveBeenCalled();
      expect(data.selectionState).toBe(SelectionStates.Selecting);
    });

    it("tries to hide notification if the chapter is grounded, before the select sequence", async () => {
      const grounded = makeChapterData({ number: 1, isOnTheGround: true });

      await service.trySelectChapter({ data: grounded });

      expect(
        pieceActivityServicePort.tryHideNotification
      ).toHaveBeenCalledExactlyOnceWith(grounded);
      expect(selectOrders()[0]!).toBeGreaterThan(
        pieceActivityServicePort.tryHideNotification.mock
          .invocationCallOrder[0]!
      );

      const lifted = makeChapterData({ number: 2 });

      await service.trySelectChapter({ data: lifted });

      expect(
        pieceActivityServicePort.tryHideNotification
      ).toHaveBeenCalledTimes(1);
      expect(chapterSelectionAdapterPort.select).toHaveBeenCalledTimes(2);
    });

    it("spawns a new piece for every chapter's child if it is grounded, before the select sequence", async () => {
      const bundles = [
        makeBundleData({ id: "bundle-1" }),
        makeBundleData({ id: "bundle-2" }),
      ];
      const spawnedPieces = [
        makeBundlePiece("spawned-1"),
        makeBundlePiece("spawned-2"),
      ];
      versesBundleLifecycleAdapterPort.spawnVersesBundleDomain
        .mockReturnValueOnce(spawnedPieces[0]!)
        .mockReturnValueOnce(spawnedPieces[1]!);
      const grounded = makeChapterData({
        number: 1,
        childrenData: bundles,
        isOnTheGround: true,
      });

      await service.trySelectChapter({ data: grounded });

      expect(
        versesBundleLifecycleAdapterPort.spawnVersesBundleDomain
      ).toHaveBeenCalledTimes(2);
      expect(bundles.map((bundle) => bundle.piece)).toEqual(spawnedPieces);
      expect(selectOrders()[0]!).toBeGreaterThan(
        versesBundleLifecycleAdapterPort.spawnVersesBundleDomain.mock
          .invocationCallOrder[1]!
      );

      const lifted = makeChapterData({
        number: 2,
        childrenData: [makeBundleData({ id: "bundle-3" })],
      });

      await service.trySelectChapter({ data: lifted });

      expect(
        versesBundleLifecycleAdapterPort.spawnVersesBundleDomain
      ).toHaveBeenCalledTimes(2);
    });

    it("awaits for the label hide sequence if it is grounded, before the select sequence", async () => {
      const piece: Piece<"StackChapter"> = {
        id: "chapter-piece-1",
        type: "StackChapter",
      };
      const data = makeChapterData({ piece, isOnTheGround: true });
      const hiding = makeDeferred();
      labelManagerPort.hideLabel.mockReturnValue(hiding.promise);

      const selection = service.trySelectChapter({ data });
      await flush();

      expect(labelManagerPort.hideLabel).toHaveBeenCalledExactlyOnceWith(
        piece,
        "Instant"
      );
      expect(chapterSelectionAdapterPort.select).not.toHaveBeenCalled();

      hiding.resolve();
      await selection;

      expect(chapterSelectionAdapterPort.select).toHaveBeenCalledOnce();
      expect(data.selectionState).toBe(SelectionStates.Selected);
    });

    it("successfully performs the select sequence", async () => {
      const data = makeChapterData({ isOnTheGround: true });

      await expect(service.trySelectChapter({ data })).resolves.toBeUndefined();

      expect(
        chapterSelectionAdapterPort.select
      ).toHaveBeenCalledExactlyOnceWith({ data });
      expect(loggerPort.error).not.toHaveBeenCalled();
      expect(loggerPort.warn).not.toHaveBeenCalled();
    });

    it("changes chapter's selection state to Selected, after the select sequence", async () => {
      const data = makeChapterData({ isOnTheGround: true });
      const selecting = makeDeferred();
      chapterSelectionAdapterPort.select.mockReturnValue(selecting.promise);

      const selection = service.trySelectChapter({ data });
      await flush();

      expect(data.selectionState).toBe(SelectionStates.Selecting);

      selecting.resolve();
      await selection;

      expect(data.selectionState).toBe(SelectionStates.Selected);
    });

    it("logs an error and reverts selection pre-flight if the update sequence or the hide label sequence gets rejected", async () => {
      const piece: Piece<"StackChapter"> = {
        id: "chapter-piece-1",
        type: "StackChapter",
      };
      const versePiece = makeVersePiece("verse-piece-1");
      const bundlePiece = makeBundlePiece("spawned-1");
      const bundle = makeBundleData({
        id: "bundle-1",
        verses: [makeVerseData({ id: "verse-1", piece: versePiece })],
      });
      const data = makeChapterData({
        piece,
        childrenData: [bundle],
        isOnTheGround: true,
      });
      versesBundleLifecycleAdapterPort.spawnVersesBundleDomain.mockReturnValue(
        bundlePiece
      );
      const selectError = new Error("select rejected");
      chapterSelectionAdapterPort.select.mockRejectedValue(selectError);

      await service.trySelectChapter({ data });

      expect(loggerPort.error).toHaveBeenCalledExactlyOnceWith(
        "ChapterSelectionService: Error at trySelectChapter",
        selectError
      );
      expect(data.selectionState).toBe(SelectionStates.Idle);
      expect(
        versesBundleLifecycleAdapterPort.despawnVerse
      ).toHaveBeenCalledExactlyOnceWith(versePiece);
      expect(
        versesBundleLifecycleAdapterPort.despawnVersesBundle
      ).toHaveBeenCalledExactlyOnceWith(bundlePiece);
      expect(bundle.piece).toBeUndefined();
      expect(
        pieceActivityServicePort.updateNotification
      ).toHaveBeenCalledExactlyOnceWith(data);
      expect(labelManagerPort.showLabel).toHaveBeenCalledExactlyOnceWith({
        piece,
        translucencyMode: LabelTranslucencyModes.Solid,
        pacing: "Instant",
      });

      vi.clearAllMocks();
      chapterSelectionAdapterPort.select.mockResolvedValue(undefined);
      const otherVersePiece = makeVersePiece("verse-piece-2");
      const otherBundlePiece = makeBundlePiece("spawned-2");
      const otherBundle = makeBundleData({
        id: "bundle-2",
        verses: [makeVerseData({ id: "verse-2", piece: otherVersePiece })],
      });
      const otherData = makeChapterData({
        number: 2,
        childrenData: [otherBundle],
        isOnTheGround: true,
      });
      versesBundleLifecycleAdapterPort.spawnVersesBundleDomain.mockReturnValue(
        otherBundlePiece
      );
      const hideError = new Error("hideLabel rejected");
      labelManagerPort.hideLabel.mockRejectedValue(hideError);

      await service.trySelectChapter({ data: otherData });

      expect(loggerPort.error).toHaveBeenCalledExactlyOnceWith(
        "ChapterSelectionService: Error at trySelectChapter",
        hideError
      );
      expect(chapterSelectionAdapterPort.select).not.toHaveBeenCalled();
      expect(otherData.selectionState).toBe(SelectionStates.Idle);
      expect(
        versesBundleLifecycleAdapterPort.despawnVerse
      ).toHaveBeenCalledExactlyOnceWith(otherVersePiece);
      expect(
        versesBundleLifecycleAdapterPort.despawnVersesBundle
      ).toHaveBeenCalledExactlyOnceWith(otherBundlePiece);
      expect(
        pieceActivityServicePort.updateNotification
      ).toHaveBeenCalledExactlyOnceWith(otherData);
      expect(labelManagerPort.showLabel).toHaveBeenCalledOnce();
    });
  });

  describe("deselectChapter", () => {
    it("logs an error and no-ops not piece found", async () => {
      const data = makeChapterData({
        piece: null,
        selectionState: SelectionStates.Selected,
      });

      await service.deselectChapter({ data });

      expect(loggerPort.error).toHaveBeenCalledExactlyOnceWith(
        "ChapterSelectionService: data.piece not defined at deselectChapter"
      );
      expect(chapterSelectionAdapterPort.deselect).not.toHaveBeenCalled();
      expect(pieceActivityServicePort.tryHideIndicators).not.toHaveBeenCalled();
      expect(data.selectionState).toBe(SelectionStates.Selected);
    });

    it("sets the chapter's selection state Deselecting, before the deselection sequence", async () => {
      const data = makeChapterData({
        selectionState: SelectionStates.Selected,
      });
      const selectionStates = recordOnDeselect(() => data.selectionState);

      await service.deselectChapter({ data });

      expect(selectionStates).toEqual([SelectionStates.Deselecting]);
    });

    it("logs a warn and no-ops if the selection state is not mutated", async () => {
      const data = makeChapterData({ selectionState: SelectionStates.Idle });

      await service.deselectChapter({ data });

      expect(loggerPort.warn).toHaveBeenCalledExactlyOnceWith(
        "ChapterSelectionService: chapter is not deselecting at deselectChapter"
      );
      expect(chapterSelectionAdapterPort.deselect).not.toHaveBeenCalled();
      expect(pieceActivityServicePort.tryHideIndicators).not.toHaveBeenCalled();
      expect(data.selectionState).toBe(SelectionStates.Idle);
    });

    it("tries to hide indicators, after changing deselection state, before deselection sequence", async () => {
      const data = makeChapterData({
        selectionState: SelectionStates.Selected,
      });
      const hideStates: SelectionState[] = [];
      pieceActivityServicePort.tryHideIndicators.mockImplementation(() => {
        hideStates.push(data.selectionState);
        return true;
      });

      await service.deselectChapter({ data });

      expect(
        pieceActivityServicePort.tryHideIndicators
      ).toHaveBeenCalledExactlyOnceWith(data);
      expect(hideStates).toEqual([SelectionStates.Deselecting]);
      expect(deselectOrders()[0]!).toBeGreaterThan(
        pieceActivityServicePort.tryHideIndicators.mock.invocationCallOrder[0]!
      );
    });

    it("successfully performs the deselection sequence", async () => {
      const data = makeChapterData({
        selectionState: SelectionStates.Selected,
      });

      await expect(service.deselectChapter({ data })).resolves.toBeUndefined();

      expect(
        chapterSelectionAdapterPort.deselect
      ).toHaveBeenCalledExactlyOnceWith({ data });
      expect(loggerPort.error).not.toHaveBeenCalled();
      expect(loggerPort.warn).not.toHaveBeenCalled();
    });

    it("successfully update indicators after the deselection sequence", async () => {
      const data = makeChapterData({
        selectionState: SelectionStates.Selected,
      });
      const deselection = makeDeferred();
      chapterSelectionAdapterPort.deselect.mockReturnValue(deselection.promise);

      const deselecting = service.deselectChapter({ data });
      await flush();

      expect(pieceActivityServicePort.updateIndicators).not.toHaveBeenCalled();

      deselection.resolve();
      await deselecting;

      expect(
        pieceActivityServicePort.updateIndicators
      ).toHaveBeenCalledExactlyOnceWith(data);
    });

    it("does not update indicators if the deselection sequence gets rejected", async () => {
      const data = makeChapterData({
        selectionState: SelectionStates.Selected,
      });
      const updateStates = recordOnUpdateIndicators(() => data.selectionState);
      chapterSelectionAdapterPort.deselect.mockRejectedValue(
        new Error("deselect rejected")
      );

      await service.deselectChapter({ data });

      expect(updateStates).not.toContain(SelectionStates.Deselecting);
      expect(updateStates).toEqual([SelectionStates.Selected]);
    });

    it("successfully despawns bundles and verses after the deselection sequence", async () => {
      const versePiece = makeVersePiece("verse-piece-1");
      const bundlePiece = makeBundlePiece("bundle-piece-1");
      const verse = makeVerseData({ id: "verse-1", piece: versePiece });
      const bundle = makeBundleData({
        id: "bundle-1",
        piece: bundlePiece,
        verses: [verse],
      });
      const data = makeChapterData({
        childrenData: [bundle],
        selectionState: SelectionStates.Selected,
      });

      await service.deselectChapter({ data });

      expect(
        versesBundleLifecycleAdapterPort.despawnVerse
      ).toHaveBeenCalledExactlyOnceWith(versePiece);
      expect(
        versesBundleLifecycleAdapterPort.despawnVersesBundle
      ).toHaveBeenCalledExactlyOnceWith(bundlePiece);
      expect(verse.piece).toBeUndefined();
      expect(bundle.piece).toBeUndefined();
      expect(
        versesBundleLifecycleAdapterPort.despawnVersesBundle.mock
          .invocationCallOrder[0]!
      ).toBeGreaterThan(deselectOrders()[0]!);
    });

    it("does not despawns bundles and verses if the deselection sequence gets rejected", async () => {
      const versePiece = makeVersePiece("verse-piece-1");
      const bundlePiece = makeBundlePiece("bundle-piece-1");
      const verse = makeVerseData({ id: "verse-1", piece: versePiece });
      const bundle = makeBundleData({
        id: "bundle-1",
        piece: bundlePiece,
        verses: [verse],
      });
      const data = makeChapterData({
        childrenData: [bundle],
        selectionState: SelectionStates.Selected,
      });
      chapterSelectionAdapterPort.deselect.mockRejectedValue(
        new Error("deselect rejected")
      );

      await service.deselectChapter({ data });

      expect(
        versesBundleLifecycleAdapterPort.despawnVerse
      ).not.toHaveBeenCalled();
      expect(
        versesBundleLifecycleAdapterPort.despawnVersesBundle
      ).not.toHaveBeenCalled();
      expect(verse.piece).toBe(versePiece);
      expect(bundle.piece).toBe(bundlePiece);
    });

    it("sets the chapter's selection state to Idle after the deselection sequence", async () => {
      const data = makeChapterData({
        selectionState: SelectionStates.Selected,
      });
      const deselection = makeDeferred();
      chapterSelectionAdapterPort.deselect.mockReturnValue(deselection.promise);

      const deselecting = service.deselectChapter({ data });
      await flush();

      expect(data.selectionState).toBe(SelectionStates.Deselecting);

      deselection.resolve();
      await deselecting;

      expect(data.selectionState).toBe(SelectionStates.Idle);
    });

    it("logs an error if the deselection sequence gets rejected", async () => {
      const data = makeChapterData({
        selectionState: SelectionStates.Selected,
      });
      const error = new Error("deselect rejected");
      chapterSelectionAdapterPort.deselect.mockRejectedValue(error);

      await expect(service.deselectChapter({ data })).resolves.toBeUndefined();

      expect(loggerPort.error).toHaveBeenCalledExactlyOnceWith(
        "ChapterSelectionService: Error at deselectChapter",
        error
      );
    });

    it("sets back the selection state to Selected if it is Deselecting after the selection sequence gets rejected", async () => {
      const data = makeChapterData({
        selectionState: SelectionStates.Selected,
      });
      chapterSelectionAdapterPort.deselect.mockRejectedValue(
        new Error("deselect rejected")
      );

      await service.deselectChapter({ data });

      expect(data.selectionState).toBe(SelectionStates.Selected);

      const settled = makeChapterData({
        number: 2,
        selectionState: SelectionStates.Selected,
      });
      chapterSelectionAdapterPort.deselect.mockImplementation(async () => {
        settled.changeSelectionState(SelectionEvents.RequestSelect);
        throw new Error("deselect rejected");
      });

      await service.deselectChapter({ data: settled });

      expect(settled.selectionState).toBe(SelectionStates.Selecting);
    });

    it("updates indicators if it is Deselecting after the selection sequence gets rejected", async () => {
      const data = makeChapterData({
        selectionState: SelectionStates.Selected,
      });
      const updateStates = recordOnUpdateIndicators(() => data.selectionState);
      chapterSelectionAdapterPort.deselect.mockRejectedValue(
        new Error("deselect rejected")
      );

      await service.deselectChapter({ data });

      expect(
        pieceActivityServicePort.updateIndicators
      ).toHaveBeenCalledExactlyOnceWith(data);
      expect(updateStates).toEqual([SelectionStates.Selected]);

      const settled = makeChapterData({
        number: 2,
        selectionState: SelectionStates.Selected,
      });
      chapterSelectionAdapterPort.deselect.mockImplementation(async () => {
        settled.changeSelectionState(SelectionEvents.RequestSelect);
        throw new Error("deselect rejected");
      });

      await service.deselectChapter({ data: settled });

      expect(pieceActivityServicePort.updateIndicators).toHaveBeenCalledOnce();
    });
  });
});
