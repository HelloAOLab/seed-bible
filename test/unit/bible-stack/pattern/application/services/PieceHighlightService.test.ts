import { describe, it, expect, beforeEach, type Mocked } from "vitest";
import { PieceHighlightService } from "../../../../../../patterns/bible-stack/bible-stack/application/services/PieceHighlightService";
import type { PieceHierarchyServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/PieceHierarchy";
import {
  HighlightDelays,
  type AnyStackData,
  type HighlightConfigProviderPort,
  type PieceHighlightActivityNotificationAdapterPort,
  type PieceHighlightActivityServicePort,
  type PieceHighlightAdapterPort,
  type PieceHighlightEventPort,
  type PieceHighlightLabelServicePort,
  type PieceHighlightPieceDataRepositoryPort,
  type PieceHighlightSequenceStateServicePort,
  type PieceUnhighlightSchedulerAdapterPort,
} from "../../../../../../patterns/bible-stack/bible-stack/application/ports/pieces";
import type { LoggerPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/out/Logger";
import { StackBibleData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackBibleData";
import { StackBookData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackBookData";
import { StackChapterData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackChapterData";
import { StackSectionBookData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackSectionBookData";
import { StackTestamentData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackTestamentData";
import type {
  CompleteBookInfo,
  SectionInfo,
  TestamentInfo,
} from "../../../../../../patterns/bible-stack/bible-stack/domain/models/arrangement";
import {
  BibleStates,
  BibleTypes,
  BibleVisualizationStates,
  CrossPositions,
  type ActivityNotification,
  type ParentDataIds,
  type Piece,
} from "../../../../../../patterns/bible-stack/bible-stack/domain/models/canvas";
import {
  HighlightIntensities,
  HighlightStates,
  type HighlightState,
} from "../../../../../../patterns/bible-stack/bible-stack/domain/models/highlight";

type HighlightablePiece = Parameters<
  PieceHighlightService["tryHighlightPiece"]
>[0]["piece"];

const BIBLE_ID = "bible-id";
const OTHER_BIBLE_ID = "other-bible-id";

const bookInfo: CompleteBookInfo = {
  type: "complete",
  bookId: "GEN",
  author: "author",
  chaptersVerseCount: [10],
  relativeDateRange: { min: 0, max: 1 },
  numberOfChapters: 1,
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

const testamentInfo: TestamentInfo = {
  name: "testament",
  sections: [sectionInfo],
};

const makeChapterData = (
  pieceId: string,
  parentDataIds: ParentDataIds = {}
): StackChapterData => {
  const data = new StackChapterData({
    id: `${pieceId}-data`,
    piece: { id: pieceId, type: "StackChapter" },
    pieceInfo: { amountOfVerses: 10, number: 1 },
    parentDataIds,
    isInsideBible: true,
    creationParams: { bookId: "GEN" },
  });
  data.becomeHighlightable();
  return data;
};

const makeBookData = (
  pieceId: string,
  parentDataIds: ParentDataIds = {}
): StackBookData => {
  const data = new StackBookData({
    id: `${pieceId}-data`,
    piece: { id: pieceId, type: "StackBook" },
    pieceInfo: bookInfo,
    parentDataIds,
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
  data.becomeHighlightable();
  return data;
};

const makeSectionBookData = (pieceId: string): StackSectionBookData => {
  const data = new StackSectionBookData({
    id: `${pieceId}-data`,
    piece: { id: pieceId, type: "StackSectionBook" },
    pieceInfo: sectionInfo,
    pieceBookInfo: bookInfo,
    parentDataIds: {},
    creationParams: {
      arrangementIndex: 0,
      testamentIndex: 0,
      sectionIndex: 0,
      amountOfChaptersInSection: 1,
    },
  });
  data.becomeHighlightable();
  return data;
};

const makeTestamentData = (
  pieceId: string,
  stackBibleId: string
): StackTestamentData => {
  const data = new StackTestamentData({
    id: `${pieceId}-data`,
    piece: { id: pieceId, type: "StackTestament" },
    pieceInfo: testamentInfo,
    parentDataIds: { stackBibleId },
    creationParams: { arrangementIndex: 0, testamentIndex: 0 },
  });
  data.becomeHighlightable();
  return data;
};

const makeClosedBibleData = (): StackBibleData => {
  const data = new StackBibleData({
    id: BIBLE_ID,
    currentCrossPosition: CrossPositions.Top,
    currentStackVizState: BibleVisualizationStates.Regular,
    arrangementIndex: 0,
    bibleType: BibleTypes.Default,
  });
  data.changeState(BibleStates.Closed);
  return data;
};

const makeDeferred = () => {
  let resolve!: () => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const flushMicrotasks = () =>
  new Promise<void>((resolve) => setTimeout(resolve, 0));

describe("pattern.bible-stack.application.services.PieceHighlightService", () => {
  let service: PieceHighlightService;
  let eventPort: Mocked<PieceHighlightEventPort>;
  let pieceHighlightAdapterPort: Mocked<PieceHighlightAdapterPort>;
  let activityNotificationAdapterPort: Mocked<PieceHighlightActivityNotificationAdapterPort>;
  let pieceActivityServicePort: Mocked<PieceHighlightActivityServicePort>;
  let pieceLabelServicePort: Mocked<PieceHighlightLabelServicePort>;
  let schedulerAdapterPort: Mocked<PieceUnhighlightSchedulerAdapterPort>;
  let configProviderPort: Mocked<HighlightConfigProviderPort>;
  let pieceHierarchyServicePort: Mocked<PieceHierarchyServicePort>;
  let sequenceStateServicePort: Mocked<PieceHighlightSequenceStateServicePort>;
  let pieceDataRepositoryPort: Mocked<PieceHighlightPieceDataRepositoryPort>;
  let loggerPort: Mocked<LoggerPort>;
  let dataByPieceId: Map<string, AnyStackData>;

  const register = <T extends AnyStackData>(data: T) => {
    dataByPieceId.set(data.piece!.id, data);
    return { data, piece: data.piece! };
  };

  const highlight = async (piece: HighlightablePiece) => {
    await service.tryHighlightPiece({ piece, source: "UserSelection" });
  };

  const startHighlighting = (piece: HighlightablePiece) => {
    pieceHighlightAdapterPort.highlight.mockReturnValueOnce(
      makeDeferred().promise
    );
    void service.tryHighlightPiece({ piece, source: "UserSelection" });
  };

  const unhighlight = (piece: HighlightablePiece) =>
    service.tryUnhighlightPiece({
      piece,
      source: "Transition",
      pacing: "Regular",
    });

  const scheduleUnhighlight = (piece: HighlightablePiece, delay = 100) =>
    service.tryUnhighlightPiece({
      piece,
      source: "UserSelection",
      pacing: "Regular",
      delay,
    });

  const closeBible = () => {
    pieceHierarchyServicePort.getParentDataChain.mockReturnValue({
      bibleData: makeClosedBibleData(),
      testamentData: undefined,
      sectionData: undefined,
      sectionBookData: undefined,
      bookData: undefined,
    });
  };

  beforeEach(() => {
    dataByPieceId = new Map();

    eventPort = {
      emit: vi.fn(),
    } as unknown as Mocked<PieceHighlightEventPort>;

    pieceHighlightAdapterPort = {
      interruptSequence: vi.fn(),
      highlight: vi.fn(),
      rehighlight: vi.fn(),
      unhighlight: vi.fn(),
      increaseIntensity: vi.fn(),
      decreaseIntensity: vi.fn(),
    };

    activityNotificationAdapterPort = {
      hideNotification: vi.fn(),
    };

    pieceActivityServicePort = {
      updateNotification: vi.fn(),
    };

    pieceLabelServicePort = {
      showLabel: vi.fn(),
      hideLabel: vi.fn(),
      changeIntensity: vi.fn(),
    };

    schedulerAdapterPort = {
      schedule: vi.fn(),
      clear: vi.fn(),
    };

    configProviderPort = {
      getDelay: vi.fn(),
    };

    pieceHierarchyServicePort = {
      getParentDataChain: vi.fn(),
    };

    sequenceStateServicePort = {
      isThereAnOngoingSequence: vi.fn(),
    };

    pieceDataRepositoryPort = {
      getPieceData: vi.fn(),
    } as unknown as Mocked<PieceHighlightPieceDataRepositoryPort>;

    loggerPort = {
      error: vi.fn(),
      warn: vi.fn(),
      log: vi.fn(),
    };

    pieceDataRepositoryPort.getPieceData.mockImplementation(((piece: Piece) =>
      dataByPieceId.get(
        piece.id
      )) as PieceHighlightPieceDataRepositoryPort["getPieceData"]);
    pieceHierarchyServicePort.getParentDataChain.mockReturnValue({
      bibleData: undefined,
      testamentData: undefined,
      sectionData: undefined,
      sectionBookData: undefined,
      bookData: undefined,
    });
    sequenceStateServicePort.isThereAnOngoingSequence.mockReturnValue(false);
    pieceHighlightAdapterPort.highlight.mockResolvedValue(undefined);
    pieceHighlightAdapterPort.rehighlight.mockResolvedValue(undefined);
    pieceHighlightAdapterPort.unhighlight.mockResolvedValue(undefined);
    pieceLabelServicePort.showLabel.mockResolvedValue(undefined);
    pieceLabelServicePort.hideLabel.mockResolvedValue(undefined);

    service = new PieceHighlightService({
      eventPort,
      pieceHighlightAdapterPort,
      activityNotificationAdapterPort,
      pieceActivityServicePort,
      pieceLabelServicePort,
      schedulerAdapterPort,
      configProviderPort,
      pieceDataRepositoryPort,
      pieceHierarchyServicePort,
      sequenceStateServicePort,
      loggerPort,
    });
  });

  describe("isPieceHighlighted", () => {
    it("successfully returns the highlighted piece id", async () => {
      const highlighted = register(makeChapterData("highlighted"));
      const idle = register(makeChapterData("idle"));

      await highlight(highlighted.piece);

      expect(service.isPieceHighlighted(highlighted.piece.id)).toBe(true);
      expect(service.isPieceHighlighted(idle.piece.id)).toBe(false);
    });
  });

  describe("tryHighlightPiece", () => {
    it("logs an error and no-ops if no data found", async () => {
      const piece: Piece<"StackChapter"> = {
        id: "unknown",
        type: "StackChapter",
      };

      await highlight(piece);

      expect(loggerPort.error).toHaveBeenCalledWith(
        "PieceHighlightService: data not found at tryHighlightPiece."
      );
      expect(service.isPieceHighlighted(piece.id)).toBe(false);
      expect(eventPort.emit).not.toHaveBeenCalled();
      expect(pieceHighlightAdapterPort.highlight).not.toHaveBeenCalled();
      expect(pieceLabelServicePort.showLabel).not.toHaveBeenCalled();
    });
    it("no-ops if there's an ongoing sequence and the source is not a transition, or if there's a not-opened bible data, or if the piece is not highlightable", async () => {
      const expectNoOp = ({
        data,
        piece,
      }: {
        data: AnyStackData;
        piece: HighlightablePiece;
      }) => {
        expect(data.highlightState).toBe(HighlightStates.Idle);
        expect(service.isPieceHighlighted(piece.id)).toBe(false);
        expect(eventPort.emit).not.toHaveBeenCalled();
        expect(pieceHighlightAdapterPort.highlight).not.toHaveBeenCalled();
        expect(pieceLabelServicePort.showLabel).not.toHaveBeenCalled();
      };

      sequenceStateServicePort.isThereAnOngoingSequence.mockReturnValue(true);
      const duringSequence = register(makeChapterData("during-sequence"));
      await highlight(duringSequence.piece);
      expectNoOp(duringSequence);

      const transition = register(makeChapterData("transition"));
      await service.tryHighlightPiece({
        piece: transition.piece,
        source: "Transition",
      });
      expect(pieceHighlightAdapterPort.highlight).toHaveBeenCalledWith(
        transition.piece,
        "Regular"
      );
      sequenceStateServicePort.isThereAnOngoingSequence.mockReturnValue(false);
      eventPort.emit.mockClear();
      pieceHighlightAdapterPort.highlight.mockClear();
      pieceLabelServicePort.showLabel.mockClear();

      closeBible();
      const closedBible = register(makeChapterData("closed-bible"));
      await highlight(closedBible.piece);
      expectNoOp(closedBible);

      pieceHierarchyServicePort.getParentDataChain.mockReturnValue({
        bibleData: undefined,
        testamentData: undefined,
        sectionData: undefined,
        sectionBookData: undefined,
        bookData: undefined,
      });
      const notHighlightable = register(makeChapterData("not-highlightable"));
      notHighlightable.data.becomeNonHighlightable();
      await highlight(notHighlightable.piece);
      expectNoOp(notHighlightable);
    });
    it("successfully changes highlight state", () => {
      const { data, piece } = register(makeChapterData("chapter"));

      startHighlighting(piece);

      expect(data.highlightState).toBe(HighlightStates.Highlighting);
    });
    it("omits the rest if the highlight state is not mutated", async () => {
      const { data, piece } = register(makeChapterData("chapter"));
      await highlight(piece);
      eventPort.emit.mockClear();
      pieceHighlightAdapterPort.highlight.mockClear();
      pieceLabelServicePort.showLabel.mockClear();

      await highlight(piece);

      expect(data.highlightState).toBe(HighlightStates.Highlighted);
      expect(eventPort.emit).not.toHaveBeenCalled();
      expect(pieceHighlightAdapterPort.highlight).not.toHaveBeenCalled();
      expect(pieceHighlightAdapterPort.rehighlight).not.toHaveBeenCalled();
      expect(pieceLabelServicePort.showLabel).not.toHaveBeenCalled();
      expect(schedulerAdapterPort.clear).not.toHaveBeenCalled();
    });
    it("clears the scheduled unhighlight if highlight state is not mutated and there is a scheduled unhighlight", async () => {
      const { data, piece } = register(makeChapterData("chapter"));
      await highlight(piece);
      schedulerAdapterPort.schedule.mockReturnValue("timer-1");
      await scheduleUnhighlight(piece);
      expect(service.isUnhighlightScheduled(piece)).toBe(true);

      await highlight(piece);

      expect(schedulerAdapterPort.clear).toHaveBeenCalledWith("timer-1");
      expect(service.isUnhighlightScheduled(piece)).toBe(false);
      expect(data.highlightState).toBe(HighlightStates.Highlighted);
    });
    it("successfully changes the highlight intensity if the piece is a book and highlight state is not mutated and there is a scheduled unhighlight", async () => {
      schedulerAdapterPort.schedule.mockReturnValue("timer");

      const book = register(makeBookData("book"));
      await highlight(book.piece);
      book.data.changeHighlightIntensity(HighlightIntensities.Faded);
      await scheduleUnhighlight(book.piece);

      await highlight(book.piece);

      expect(book.data.highlightIntensity).toBe(HighlightIntensities.Solid);
      expect(pieceHighlightAdapterPort.increaseIntensity).toHaveBeenCalledWith(
        book.piece,
        "Regular"
      );
      expect(pieceLabelServicePort.changeIntensity).toHaveBeenCalledWith(
        book.piece,
        HighlightIntensities.Solid,
        "Regular"
      );

      pieceHighlightAdapterPort.increaseIntensity.mockClear();
      pieceLabelServicePort.changeIntensity.mockClear();
      const chapter = register(makeChapterData("chapter"));
      await highlight(chapter.piece);
      chapter.data.changeHighlightIntensity(HighlightIntensities.Faded);
      await scheduleUnhighlight(chapter.piece);

      await highlight(chapter.piece);

      expect(chapter.data.highlightIntensity).toBe(HighlightIntensities.Faded);
      expect(
        pieceHighlightAdapterPort.increaseIntensity
      ).not.toHaveBeenCalled();
      expect(pieceLabelServicePort.changeIntensity).not.toHaveBeenCalled();
    });
    it("successfully changes the data's highlight intensity if the highlight state is mutated", async () => {
      const { data, piece } = register(makeChapterData("chapter"));
      await highlight(piece);
      data.changeHighlightIntensity(HighlightIntensities.Faded);
      const pendingUnhighlight = makeDeferred();
      pieceHighlightAdapterPort.unhighlight.mockReturnValueOnce(
        pendingUnhighlight.promise
      );
      const pending = unhighlight(piece);
      expect(data.highlightIntensity).toBe(HighlightIntensities.Faded);

      await highlight(piece);

      expect(data.highlightIntensity).toBe(HighlightIntensities.Solid);

      pendingUnhighlight.resolve();
      await pending;
    });
    it("successfully saves the piece as highlighted", () => {
      const { piece } = register(makeChapterData("chapter"));

      startHighlighting(piece);

      expect(service.isPieceHighlighted(piece.id)).toBe(true);
    });
    it("successfully emits", () => {
      const { data, piece } = register(makeChapterData("chapter"));

      startHighlighting(piece);

      expect(eventPort.emit).toHaveBeenCalledWith(
        "OnScripturePieceHighlighted",
        { pieceData: data }
      );
    });
    it("interrupts the sequence and rehighlights if the previous highlight state is unhighlighting", async () => {
      const { data, piece } = register(makeChapterData("chapter"));
      await highlight(piece);
      const pendingUnhighlight = makeDeferred();
      pieceHighlightAdapterPort.unhighlight.mockReturnValueOnce(
        pendingUnhighlight.promise
      );
      const pending = unhighlight(piece);
      expect(data.highlightState).toBe(HighlightStates.Unhighlighting);
      pieceHighlightAdapterPort.highlight.mockClear();
      pieceHighlightAdapterPort.interruptSequence.mockClear();

      await highlight(piece);

      expect(pieceHighlightAdapterPort.interruptSequence).toHaveBeenCalledWith(
        piece
      );
      expect(pieceHighlightAdapterPort.rehighlight).toHaveBeenCalledWith(
        piece,
        "Regular"
      );
      expect(
        pieceHighlightAdapterPort.interruptSequence.mock.invocationCallOrder[0]!
      ).toBeLessThan(
        pieceHighlightAdapterPort.rehighlight.mock.invocationCallOrder[0]!
      );
      expect(pieceHighlightAdapterPort.highlight).not.toHaveBeenCalled();

      pendingUnhighlight.resolve();
      await pending;
    });
    it("highlights the piece if the previous highlight state is idle", async () => {
      const { data, piece } = register(makeChapterData("chapter"));

      await highlight(piece);

      expect(pieceHighlightAdapterPort.highlight).toHaveBeenCalledWith(
        piece,
        "Regular"
      );
      expect(pieceHighlightAdapterPort.rehighlight).not.toHaveBeenCalled();
      expect(
        pieceHighlightAdapterPort.interruptSequence
      ).not.toHaveBeenCalled();
      expect(data.highlightState).toBe(HighlightStates.Highlighted);
    });
    it("detaches and clears an existing notification if piece is a chapter and the previous state is idle", async () => {
      const idle = register(makeChapterData("idle"));
      const idleNotification: ActivityNotification = {
        id: "idle-notification",
        type: "ActivityNotification",
      };
      idle.data.attachActivityNotification(idleNotification);

      await highlight(idle.piece);

      expect(idle.data.activityNotification).toBeUndefined();
      expect(
        activityNotificationAdapterPort.hideNotification
      ).toHaveBeenCalledWith(idleNotification);

      activityNotificationAdapterPort.hideNotification.mockClear();
      const withoutNotification = register(makeChapterData("no-notification"));

      await highlight(withoutNotification.piece);

      expect(
        activityNotificationAdapterPort.hideNotification
      ).not.toHaveBeenCalled();

      const unhighlighting = register(makeChapterData("unhighlighting"));
      await highlight(unhighlighting.piece);
      const pendingUnhighlight = makeDeferred();
      pieceHighlightAdapterPort.unhighlight.mockReturnValueOnce(
        pendingUnhighlight.promise
      );
      const pending = unhighlight(unhighlighting.piece);
      const unhighlightingNotification: ActivityNotification = {
        id: "unhighlighting-notification",
        type: "ActivityNotification",
      };
      unhighlighting.data.attachActivityNotification(
        unhighlightingNotification
      );

      await highlight(unhighlighting.piece);

      expect(unhighlighting.data.activityNotification).toBe(
        unhighlightingNotification
      );
      expect(
        activityNotificationAdapterPort.hideNotification
      ).not.toHaveBeenCalled();

      pendingUnhighlight.resolve();
      await pending;
    });
    it("tries to unhighlight every other highlighted testament in the same bible that is stacked if the piece is a testament", async () => {
      const target = register(makeTestamentData("target", BIBLE_ID));
      const stacked = register(makeTestamentData("stacked", BIBLE_ID));
      const grounded = register(makeTestamentData("grounded", BIBLE_ID));
      const otherBible = register(
        makeTestamentData("other-bible", OTHER_BIBLE_ID)
      );
      const chapter = register(
        makeChapterData("chapter", { stackBibleId: BIBLE_ID })
      );
      for (const { data, piece } of [stacked, grounded, otherBible]) {
        data.placeOnGround();
        await highlight(piece);
      }
      await highlight(chapter.piece);
      stacked.data.pickFromGround();
      otherBible.data.pickFromGround();
      pieceHighlightAdapterPort.unhighlight.mockClear();

      await highlight(target.piece);
      await flushMicrotasks();

      expect(pieceHighlightAdapterPort.unhighlight).toHaveBeenCalledTimes(1);
      expect(pieceHighlightAdapterPort.unhighlight).toHaveBeenCalledWith(
        stacked.piece,
        "Regular"
      );
      expect(stacked.data.highlightState).toBe(HighlightStates.Idle);
      expect(grounded.data.highlightState).toBe(HighlightStates.Highlighted);
      expect(otherBible.data.highlightState).toBe(HighlightStates.Highlighted);
      expect(chapter.data.highlightState).toBe(HighlightStates.Highlighted);
      expect(target.data.highlightState).toBe(HighlightStates.Highlighted);
    });
    it("logs an error and omits the unhighlight try if the piece data is not found", async () => {
      const target = register(makeTestamentData("target", BIBLE_ID));
      const orphan = register(makeTestamentData("orphan", BIBLE_ID));
      await highlight(orphan.piece);
      dataByPieceId.delete(orphan.piece.id);

      await highlight(target.piece);
      await flushMicrotasks();

      expect(loggerPort.error).toHaveBeenCalledTimes(1);
      expect(loggerPort.error).toHaveBeenCalledWith(
        "PieceHighlightService: data not found at tryHighlightPiece"
      );
      expect(pieceHighlightAdapterPort.unhighlight).not.toHaveBeenCalled();
      expect(orphan.data.highlightState).toBe(HighlightStates.Highlighted);
    });
    it("awaits the highlight action and label show in parallel", async () => {
      const { piece } = register(makeChapterData("chapter"));
      const pendingHighlight = makeDeferred();
      const pendingShowLabel = makeDeferred();
      pieceHighlightAdapterPort.highlight.mockReturnValueOnce(
        pendingHighlight.promise
      );
      pieceLabelServicePort.showLabel.mockReturnValueOnce(
        pendingShowLabel.promise
      );
      let settled = false;

      const pending = service
        .tryHighlightPiece({ piece, source: "UserSelection" })
        .then(() => {
          settled = true;
        });
      await flushMicrotasks();

      expect(pieceHighlightAdapterPort.highlight).toHaveBeenCalledWith(
        piece,
        "Regular"
      );
      expect(pieceLabelServicePort.showLabel).toHaveBeenCalledWith({
        piece,
        translucencyMode: "Solid",
      });

      pendingHighlight.resolve();
      await flushMicrotasks();

      expect(settled).toBe(false);

      pendingShowLabel.resolve();
      await pending;

      expect(settled).toBe(true);
    });
    it("successfully sets the highlight state after the highlight promise resolves", async () => {
      const { data, piece } = register(makeChapterData("chapter"));
      const pendingHighlight = makeDeferred();
      pieceHighlightAdapterPort.highlight.mockReturnValueOnce(
        pendingHighlight.promise
      );

      const pending = highlight(piece);
      await flushMicrotasks();

      expect(data.highlightState).toBe(HighlightStates.Highlighting);

      pendingHighlight.resolve();
      await pending;

      expect(data.highlightState).toBe(HighlightStates.Highlighted);
    });
    it("tries to schedule an unhighlight if the source is user focus, the piece is not focused and it is not a book or a section book", async () => {
      configProviderPort.getDelay.mockReturnValue(500);
      schedulerAdapterPort.schedule.mockReturnValue("timer");
      const unfocused = register(makeChapterData("unfocused"));
      const focused = register(makeChapterData("focused"));
      focused.data.beginFocus();
      const book = register(makeBookData("book"));
      const sectionBook = register(makeSectionBookData("section-book"));

      for (const { piece } of [unfocused, focused, book, sectionBook]) {
        await service.tryHighlightPiece({ piece, source: "UserFocus" });
      }

      expect(configProviderPort.getDelay).toHaveBeenCalledWith(
        HighlightDelays.UserFocusUnhighlightDelay
      );
      expect(schedulerAdapterPort.schedule).toHaveBeenCalledTimes(1);
      expect(schedulerAdapterPort.schedule).toHaveBeenCalledWith(
        500,
        expect.any(Function)
      );
      expect(service.isUnhighlightScheduled(unfocused.piece)).toBe(true);
      expect(service.isUnhighlightScheduled(focused.piece)).toBe(false);
      expect(service.isUnhighlightScheduled(book.piece)).toBe(false);
      expect(service.isUnhighlightScheduled(sectionBook.piece)).toBe(false);
    });
    it("tries to schedule an unhighlight if schedule data is provided and the source is user selection and the piece is not focused", async () => {
      schedulerAdapterPort.schedule.mockReturnValue("timer");
      const withData = register(makeChapterData("with-data"));
      const withoutData = register(makeChapterData("without-data"));
      const focused = register(makeChapterData("focused"));
      focused.data.beginFocus();

      await service.tryHighlightPiece({
        piece: withData.piece,
        source: "UserSelection",
        scheduledUnhighlightData: { delay: 300 },
      });
      await service.tryHighlightPiece({
        piece: withoutData.piece,
        source: "UserSelection",
      });
      await service.tryHighlightPiece({
        piece: focused.piece,
        source: "UserSelection",
        scheduledUnhighlightData: { delay: 300 },
      });

      expect(schedulerAdapterPort.schedule).toHaveBeenCalledTimes(1);
      expect(schedulerAdapterPort.schedule).toHaveBeenCalledWith(
        300,
        expect.any(Function)
      );
      expect(service.isUnhighlightScheduled(withData.piece)).toBe(true);
      expect(service.isUnhighlightScheduled(withoutData.piece)).toBe(false);
      expect(service.isUnhighlightScheduled(focused.piece)).toBe(false);
    });
    it("tries to schedule an unhighlight if schedule data is provided and the source is user blur", async () => {
      schedulerAdapterPort.schedule.mockReturnValue("timer");
      const withData = register(makeChapterData("with-data"));
      const withoutData = register(makeChapterData("without-data"));

      await service.tryHighlightPiece({
        piece: withData.piece,
        source: "UserBlur",
        scheduledUnhighlightData: { delay: 300 },
      });
      await service.tryHighlightPiece({
        piece: withoutData.piece,
        source: "UserBlur",
      });

      expect(schedulerAdapterPort.schedule).toHaveBeenCalledTimes(1);
      expect(schedulerAdapterPort.schedule).toHaveBeenCalledWith(
        300,
        expect.any(Function)
      );
      expect(service.isUnhighlightScheduled(withData.piece)).toBe(true);
      expect(service.isUnhighlightScheduled(withoutData.piece)).toBe(false);
    });
    it("tries to schedule an unhighlight if the source is transition", async () => {
      configProviderPort.getDelay.mockReturnValue(700);
      schedulerAdapterPort.schedule.mockReturnValue("timer");
      const withoutData = register(makeChapterData("without-data"));
      const withData = register(makeChapterData("with-data"));

      await service.tryHighlightPiece({
        piece: withoutData.piece,
        source: "Transition",
      });
      await service.tryHighlightPiece({
        piece: withData.piece,
        source: "Transition",
        scheduledUnhighlightData: { delay: 200 },
      });

      expect(configProviderPort.getDelay).toHaveBeenCalledWith(
        HighlightDelays.TransitionUnhighlightDelay
      );
      expect(schedulerAdapterPort.schedule).toHaveBeenNthCalledWith(
        1,
        700,
        expect.any(Function)
      );
      expect(schedulerAdapterPort.schedule).toHaveBeenNthCalledWith(
        2,
        200,
        expect.any(Function)
      );
      expect(service.isUnhighlightScheduled(withoutData.piece)).toBe(true);
      expect(service.isUnhighlightScheduled(withData.piece)).toBe(true);
    });
    it("skips completing a highlight that was superseded by an unhighlight before it resolved", async () => {
      const { data, piece } = register(makeChapterData("chapter"));
      const inFlightHighlight = makeDeferred();
      pieceHighlightAdapterPort.highlight.mockReturnValueOnce(
        inFlightHighlight.promise
      );
      pieceHighlightAdapterPort.interruptSequence.mockImplementation(() =>
        inFlightHighlight.resolve()
      );
      const pendingUnhighlight = makeDeferred();
      pieceHighlightAdapterPort.unhighlight.mockReturnValueOnce(
        pendingUnhighlight.promise
      );

      const staleHighlight = highlight(piece);
      const unhighlighting = unhighlight(piece);
      await staleHighlight;

      expect(data.highlightState).toBe(HighlightStates.Unhighlighting);
      expect(service.isPieceHighlighted(piece.id)).toBe(true);

      pendingUnhighlight.resolve();
      await unhighlighting;

      expect(data.highlightState).toBe(HighlightStates.Idle);
      expect(service.isPieceHighlighted(piece.id)).toBe(false);
    });
  });

  describe("tryUnhighlightPiece", () => {
    it("logs an error and no-ops if no data found", async () => {
      const piece: Piece<"StackChapter"> = {
        id: "unknown",
        type: "StackChapter",
      };

      await unhighlight(piece);

      expect(loggerPort.error).toHaveBeenCalledWith(
        "PieceHighlightService: data not found at tryUnhighlightPiece."
      );
      expect(pieceHighlightAdapterPort.unhighlight).not.toHaveBeenCalled();
      expect(pieceLabelServicePort.hideLabel).not.toHaveBeenCalled();
      expect(schedulerAdapterPort.schedule).not.toHaveBeenCalled();
    });
    it("no-ops if the piece is idle", async () => {
      const { data, piece } = register(makeChapterData("chapter"));

      await unhighlight(piece);
      await scheduleUnhighlight(piece);

      expect(data.highlightState).toBe(HighlightStates.Idle);
      expect(pieceHighlightAdapterPort.unhighlight).not.toHaveBeenCalled();
      expect(pieceLabelServicePort.hideLabel).not.toHaveBeenCalled();
      expect(schedulerAdapterPort.schedule).not.toHaveBeenCalled();
    });
    it("no-ops if there's an ongoing sequence and the source is not a transition, or if there's a not-opened bible data, or if the piece is not highlightable", async () => {
      const expectNoOp = ({
        data,
        piece,
      }: {
        data: AnyStackData;
        piece: HighlightablePiece;
      }) => {
        expect(data.highlightState).toBe(HighlightStates.Highlighted);
        expect(service.isPieceHighlighted(piece.id)).toBe(true);
        expect(pieceHighlightAdapterPort.unhighlight).not.toHaveBeenCalled();
        expect(pieceLabelServicePort.hideLabel).not.toHaveBeenCalled();
      };

      const duringSequence = register(makeChapterData("during-sequence"));
      await highlight(duringSequence.piece);
      sequenceStateServicePort.isThereAnOngoingSequence.mockReturnValue(true);
      await service.tryUnhighlightPiece({
        piece: duringSequence.piece,
        source: "UserSelection",
        pacing: "Regular",
      });
      expectNoOp(duringSequence);
      sequenceStateServicePort.isThereAnOngoingSequence.mockReturnValue(false);

      const closedBible = register(makeChapterData("closed-bible"));
      await highlight(closedBible.piece);
      closeBible();
      await unhighlight(closedBible.piece);
      expectNoOp(closedBible);
      pieceHierarchyServicePort.getParentDataChain.mockReturnValue({
        bibleData: undefined,
        testamentData: undefined,
        sectionData: undefined,
        sectionBookData: undefined,
        bookData: undefined,
      });

      const notHighlightable = register(makeChapterData("not-highlightable"));
      await highlight(notHighlightable.piece);
      notHighlightable.data.becomeNonHighlightable();
      await unhighlight(notHighlightable.piece);
      expectNoOp(notHighlightable);
    });
    it("no-ops if the piece is already unhighlighting or has a scheduled unhighlight, and if the source is not transition", async () => {
      const running = register(makeChapterData("running"));
      await highlight(running.piece);
      const pendingUnhighlight = makeDeferred();
      pieceHighlightAdapterPort.unhighlight.mockReturnValueOnce(
        pendingUnhighlight.promise
      );
      const pending = unhighlight(running.piece);
      pieceHighlightAdapterPort.unhighlight.mockClear();
      pieceHighlightAdapterPort.interruptSequence.mockClear();

      await service.tryUnhighlightPiece({
        piece: running.piece,
        source: "UserSelection",
        pacing: "Regular",
      });

      expect(running.data.highlightState).toBe(HighlightStates.Unhighlighting);
      expect(pieceHighlightAdapterPort.unhighlight).not.toHaveBeenCalled();
      expect(
        pieceHighlightAdapterPort.interruptSequence
      ).not.toHaveBeenCalled();

      pendingUnhighlight.resolve();
      await pending;

      schedulerAdapterPort.schedule.mockReturnValue("timer-1");
      const scheduled = register(makeChapterData("scheduled"));
      await highlight(scheduled.piece);
      await scheduleUnhighlight(scheduled.piece);
      schedulerAdapterPort.schedule.mockClear();

      await service.tryUnhighlightPiece({
        piece: scheduled.piece,
        source: "UserBlur",
        pacing: "Regular",
      });

      expect(scheduled.data.highlightState).toBe(HighlightStates.Highlighted);
      expect(service.isUnhighlightScheduled(scheduled.piece)).toBe(true);
      expect(schedulerAdapterPort.clear).not.toHaveBeenCalled();
      expect(schedulerAdapterPort.schedule).not.toHaveBeenCalled();
      expect(pieceHighlightAdapterPort.unhighlight).not.toHaveBeenCalled();
    });
    it("interrupts the current sequence if the source is Transition and the piece is already unhighlighting", async () => {
      const { piece } = register(makeChapterData("chapter"));
      await highlight(piece);
      const pendingUnhighlight = makeDeferred();
      pieceHighlightAdapterPort.unhighlight.mockReturnValueOnce(
        pendingUnhighlight.promise
      );
      const pending = unhighlight(piece);
      pieceHighlightAdapterPort.interruptSequence.mockClear();
      schedulerAdapterPort.schedule.mockReturnValue("timer");

      await service.tryUnhighlightPiece({
        piece,
        source: "Transition",
        pacing: "Regular",
        delay: 100,
      });

      expect(pieceHighlightAdapterPort.interruptSequence).toHaveBeenCalledWith(
        piece
      );

      pendingUnhighlight.resolve();
      await pending;
    });
    it("clears the scheduled unhighlight if the source is Transition", async () => {
      const { data, piece } = register(makeChapterData("chapter"));
      await highlight(piece);
      schedulerAdapterPort.schedule.mockReturnValue("timer-1");
      await scheduleUnhighlight(piece);

      await unhighlight(piece);

      expect(schedulerAdapterPort.clear).toHaveBeenCalledWith("timer-1");
      expect(service.isUnhighlightScheduled(piece)).toBe(false);
      expect(pieceHighlightAdapterPort.unhighlight).toHaveBeenCalledWith(
        piece,
        "Regular"
      );
      expect(data.highlightState).toBe(HighlightStates.Idle);
    });
    it("changes the highlight state to Unhighlighting before the sequences finish", async () => {
      const { data, piece } = register(makeChapterData("chapter"));
      await highlight(piece);
      const pendingUnhighlight = makeDeferred();
      const pendingHideLabel = makeDeferred();
      pieceHighlightAdapterPort.unhighlight.mockReturnValueOnce(
        pendingUnhighlight.promise
      );
      pieceLabelServicePort.hideLabel.mockReturnValueOnce(
        pendingHideLabel.promise
      );

      const pending = unhighlight(piece);

      expect(data.highlightState).toBe(HighlightStates.Unhighlighting);

      pendingUnhighlight.resolve();
      pendingHideLabel.resolve();
      await pending;
    });

    it("interrupts the sequence before calling unhighlight if the previous state was Highlighting or Unhighlighting, and does not interrupt if it was Highlighted", async () => {
      const expectInterruptBeforeUnhighlight = (piece: Piece) => {
        expect(
          pieceHighlightAdapterPort.interruptSequence
        ).toHaveBeenCalledWith(piece);
        expect(
          pieceHighlightAdapterPort.interruptSequence.mock.invocationCallOrder.at(
            -1
          )
        ).toBeLessThan(
          pieceHighlightAdapterPort.unhighlight.mock.invocationCallOrder[0]!
        );
      };

      const highlighting = register(makeChapterData("highlighting"));
      startHighlighting(highlighting.piece);
      expect(highlighting.data.highlightState).toBe(
        HighlightStates.Highlighting
      );
      pieceHighlightAdapterPort.interruptSequence.mockClear();
      pieceHighlightAdapterPort.unhighlight.mockClear();

      await unhighlight(highlighting.piece);

      expectInterruptBeforeUnhighlight(highlighting.piece);

      const unhighlighting = register(makeChapterData("unhighlighting"));
      await highlight(unhighlighting.piece);
      const firstUnhighlight = makeDeferred();
      pieceHighlightAdapterPort.unhighlight.mockReturnValueOnce(
        firstUnhighlight.promise
      );
      const firstPending = unhighlight(unhighlighting.piece);
      expect(unhighlighting.data.highlightState).toBe(
        HighlightStates.Unhighlighting
      );
      pieceHighlightAdapterPort.interruptSequence.mockClear();
      pieceHighlightAdapterPort.unhighlight.mockClear();

      await unhighlight(unhighlighting.piece);

      expectInterruptBeforeUnhighlight(unhighlighting.piece);
      firstUnhighlight.resolve();
      await firstPending;

      const highlighted = register(makeChapterData("highlighted"));
      await highlight(highlighted.piece);
      expect(highlighted.data.highlightState).toBe(HighlightStates.Highlighted);
      pieceHighlightAdapterPort.interruptSequence.mockClear();
      pieceHighlightAdapterPort.unhighlight.mockClear();

      await unhighlight(highlighted.piece);

      expect(pieceHighlightAdapterPort.unhighlight).toHaveBeenCalledWith(
        highlighted.piece,
        "Regular"
      );
      expect(
        pieceHighlightAdapterPort.interruptSequence
      ).not.toHaveBeenCalled();
    });

    it("runs unhighlight and hideLabel in parallel", async () => {
      const { piece } = register(makeChapterData("chapter"));
      await highlight(piece);
      const pendingUnhighlight = makeDeferred();
      const pendingHideLabel = makeDeferred();
      pieceHighlightAdapterPort.unhighlight.mockReturnValueOnce(
        pendingUnhighlight.promise
      );
      pieceLabelServicePort.hideLabel.mockReturnValueOnce(
        pendingHideLabel.promise
      );

      const pending = unhighlight(piece);
      await flushMicrotasks();

      expect(pieceHighlightAdapterPort.unhighlight).toHaveBeenCalledWith(
        piece,
        "Regular"
      );
      expect(pieceLabelServicePort.hideLabel).toHaveBeenCalledWith(
        piece,
        "Regular"
      );

      pendingUnhighlight.resolve();
      pendingHideLabel.resolve();
      await pending;
    });

    it("changes the state to Idle and forgets the piece only after both promises resolve", async () => {
      const resolutionOrders = [
        ["unhighlight", "hideLabel"],
        ["hideLabel", "unhighlight"],
      ] as const;

      for (const [first, second] of resolutionOrders) {
        const { data, piece } = register(
          makeChapterData(`${first}-first-chapter`)
        );
        await highlight(piece);
        const deferreds = {
          unhighlight: makeDeferred(),
          hideLabel: makeDeferred(),
        };
        pieceHighlightAdapterPort.unhighlight.mockReturnValueOnce(
          deferreds.unhighlight.promise
        );
        pieceLabelServicePort.hideLabel.mockReturnValueOnce(
          deferreds.hideLabel.promise
        );

        const pending = unhighlight(piece);
        await flushMicrotasks();

        expect(data.highlightState).toBe(HighlightStates.Unhighlighting);
        expect(service.isPieceHighlighted(piece.id)).toBe(true);

        deferreds[first].resolve();
        await flushMicrotasks();

        expect(data.highlightState).toBe(HighlightStates.Unhighlighting);
        expect(service.isPieceHighlighted(piece.id)).toBe(true);

        deferreds[second].resolve();
        await pending;

        expect(data.highlightState).toBe(HighlightStates.Idle);
        expect(service.isPieceHighlighted(piece.id)).toBe(false);
      }
    });

    it("updates the notification when the piece is a chapter and it is already Idle, and does not for other piece types", async () => {
      const chapter = register(makeChapterData("chapter"));
      await highlight(chapter.piece);
      const notifiedWith: { state: HighlightState; highlighted: boolean }[] =
        [];
      pieceActivityServicePort.updateNotification.mockImplementation(
        (container) => {
          notifiedWith.push({
            state: container.highlightState,
            highlighted: service.isPieceHighlighted(chapter.piece.id),
          });
        }
      );

      await unhighlight(chapter.piece);

      expect(pieceActivityServicePort.updateNotification).toHaveBeenCalledWith(
        chapter.data
      );
      expect(notifiedWith).toEqual([
        { state: HighlightStates.Idle, highlighted: false },
      ]);

      pieceActivityServicePort.updateNotification.mockClear();
      const book = register(makeBookData("book"));
      await highlight(book.piece);

      await unhighlight(book.piece);

      expect(book.data.highlightState).toBe(HighlightStates.Idle);
      expect(
        pieceActivityServicePort.updateNotification
      ).not.toHaveBeenCalled();
    });
    it("logs an error, does not throw and reverts the state if either the unhighlight or the label hide sequence rejects", async () => {
      const failures = [
        (error: Error) =>
          pieceHighlightAdapterPort.unhighlight.mockRejectedValueOnce(error),
        (error: Error) =>
          pieceLabelServicePort.hideLabel.mockRejectedValueOnce(error),
      ];

      for (const [index, fail] of failures.entries()) {
        const { data, piece } = register(makeChapterData(`chapter-${index}`));
        await highlight(piece);
        const error = new Error("sequence failed");
        fail(error);
        loggerPort.error.mockClear();

        await expect(unhighlight(piece)).resolves.toBeUndefined();

        expect(loggerPort.error).toHaveBeenCalledWith(
          "PieceHighlightService: Error executing unhighlight sequence at executeUnhighlight.",
          { error }
        );
        expect(data.highlightState).toBe(HighlightStates.Highlighted);
        expect(service.isPieceHighlighted(piece.id)).toBe(true);
        expect(
          pieceActivityServicePort.updateNotification
        ).not.toHaveBeenCalled();
      }
    });
    it("schedules a sequence of deleting the piece id from the schedule map and awaiting the unhighlight execution, then it adds the piece to the schedule map if a delay is provided", async () => {
      const { data, piece } = register(makeChapterData("chapter"));
      await highlight(piece);
      schedulerAdapterPort.schedule.mockReturnValue("timer-1");

      await service.tryUnhighlightPiece({
        piece,
        source: "UserSelection",
        pacing: "Fast",
        delay: 250,
      });

      expect(schedulerAdapterPort.schedule).toHaveBeenCalledWith(
        250,
        expect.any(Function)
      );
      expect(service.isUnhighlightScheduled(piece)).toBe(true);
      expect(data.highlightState).toBe(HighlightStates.Highlighted);
      expect(pieceHighlightAdapterPort.unhighlight).not.toHaveBeenCalled();

      const pendingUnhighlight = makeDeferred();
      pieceHighlightAdapterPort.unhighlight.mockReturnValueOnce(
        pendingUnhighlight.promise
      );
      const scheduledSequence = schedulerAdapterPort.schedule.mock.calls[0]![1];

      const pending = scheduledSequence();

      expect(service.isUnhighlightScheduled(piece)).toBe(false);
      expect(data.highlightState).toBe(HighlightStates.Unhighlighting);
      expect(pieceHighlightAdapterPort.unhighlight).toHaveBeenCalledWith(
        piece,
        "Fast"
      );

      pendingUnhighlight.resolve();
      await pending;

      expect(data.highlightState).toBe(HighlightStates.Idle);
    });
    it("directly awaits the unhighlight execution if no delay provided", async () => {
      const { data, piece } = register(makeChapterData("chapter"));
      await highlight(piece);
      const pendingUnhighlight = makeDeferred();
      pieceHighlightAdapterPort.unhighlight.mockReturnValueOnce(
        pendingUnhighlight.promise
      );
      let settled = false;

      const pending = unhighlight(piece).then(() => {
        settled = true;
      });
      await flushMicrotasks();

      expect(schedulerAdapterPort.schedule).not.toHaveBeenCalled();
      expect(service.isUnhighlightScheduled(piece)).toBe(false);
      expect(settled).toBe(false);

      pendingUnhighlight.resolve();
      await pending;

      expect(settled).toBe(true);
      expect(data.highlightState).toBe(HighlightStates.Idle);
    });
    it("logs an error and does not throw if the unhighlight execution sequence rejects", async () => {
      const { piece } = register(makeChapterData("chapter"));
      startHighlighting(piece);
      const error = new Error("interrupt failed");
      pieceHighlightAdapterPort.interruptSequence.mockImplementationOnce(() => {
        throw error;
      });

      await expect(unhighlight(piece)).resolves.toBeUndefined();

      expect(loggerPort.error).toHaveBeenCalledWith(
        "PieceHighlightService: Error executing unhighlight sequence at tryUnhighlightPiece",
        { error }
      );
    });
    it("skips completing an unhighlight that was superseded by a highlight before it resolved", async () => {
      const { data, piece } = register(makeChapterData("chapter"));
      await highlight(piece);
      const inFlightUnhighlight = makeDeferred();
      pieceHighlightAdapterPort.unhighlight.mockReturnValueOnce(
        inFlightUnhighlight.promise
      );
      pieceHighlightAdapterPort.interruptSequence.mockImplementation(() =>
        inFlightUnhighlight.resolve()
      );
      const pendingRehighlight = makeDeferred();
      pieceHighlightAdapterPort.rehighlight.mockReturnValueOnce(
        pendingRehighlight.promise
      );

      const staleUnhighlight = unhighlight(piece);
      const rehighlighting = highlight(piece);
      await staleUnhighlight;

      expect(data.highlightState).toBe(HighlightStates.Highlighting);
      expect(service.isPieceHighlighted(piece.id)).toBe(true);
      expect(
        pieceActivityServicePort.updateNotification
      ).not.toHaveBeenCalled();

      pendingRehighlight.resolve();
      await rehighlighting;

      expect(data.highlightState).toBe(HighlightStates.Highlighted);
      expect(service.isPieceHighlighted(piece.id)).toBe(true);
    });
    it("skips reverting the state of an unhighlight that rejects after being superseded by a highlight", async () => {
      const { data, piece } = register(makeChapterData("chapter"));
      await highlight(piece);
      const inFlightUnhighlight = makeDeferred();
      pieceHighlightAdapterPort.unhighlight.mockReturnValueOnce(
        inFlightUnhighlight.promise
      );
      const pendingRehighlight = makeDeferred();
      pieceHighlightAdapterPort.rehighlight.mockReturnValueOnce(
        pendingRehighlight.promise
      );
      const error = new Error("unhighlight failed");

      const staleUnhighlight = unhighlight(piece);
      const rehighlighting = highlight(piece);
      inFlightUnhighlight.reject(error);
      await staleUnhighlight;

      expect(loggerPort.error).toHaveBeenCalledWith(
        "PieceHighlightService: Error executing unhighlight sequence at executeUnhighlight.",
        { error }
      );
      expect(data.highlightState).toBe(HighlightStates.Highlighting);

      pendingRehighlight.resolve();
      await rehighlighting;

      expect(data.highlightState).toBe(HighlightStates.Highlighted);
    });
  });

  describe("isUnhighlightScheduled", () => {
    it("returns true only if the piece has a scheduled unhighlight", async () => {
      const { piece } = register(makeChapterData("chapter"));
      await highlight(piece);

      expect(service.isUnhighlightScheduled(piece)).toBe(false);

      schedulerAdapterPort.schedule.mockReturnValue("timer-1");
      await scheduleUnhighlight(piece);

      expect(service.isUnhighlightScheduled(piece)).toBe(true);
    });
  });

  describe("changeHighlightIntensity", () => {
    it("no-ops if no data found", () => {
      const piece: Piece<"StackChapter"> = {
        id: "unknown",
        type: "StackChapter",
      };

      expect(() =>
        service.changeHighlightIntensity({
          piece,
          intensity: HighlightIntensities.Faded,
        })
      ).not.toThrow();

      expect(
        pieceHighlightAdapterPort.decreaseIntensity
      ).not.toHaveBeenCalled();
      expect(
        pieceHighlightAdapterPort.increaseIntensity
      ).not.toHaveBeenCalled();
      expect(pieceLabelServicePort.changeIntensity).not.toHaveBeenCalled();
    });
    it("no-ops if intensity is not mutated", async () => {
      const highlighted = register(makeChapterData("highlighted"));
      await highlight(highlighted.piece);
      const idle = register(makeChapterData("idle"));

      service.changeHighlightIntensity({
        piece: highlighted.piece,
        intensity: HighlightIntensities.Solid,
      });
      service.changeHighlightIntensity({
        piece: idle.piece,
        intensity: HighlightIntensities.Faded,
      });

      expect(highlighted.data.highlightIntensity).toBe(
        HighlightIntensities.Solid
      );
      expect(idle.data.highlightIntensity).toBe(HighlightIntensities.Solid);
      expect(
        pieceHighlightAdapterPort.increaseIntensity
      ).not.toHaveBeenCalled();
      expect(
        pieceHighlightAdapterPort.decreaseIntensity
      ).not.toHaveBeenCalled();
      expect(pieceLabelServicePort.changeIntensity).not.toHaveBeenCalled();
    });
    it("successfully increases the intensity if the target is Solid with the correct arguments", async () => {
      const { data, piece } = register(makeChapterData("chapter"));
      await highlight(piece);
      data.changeHighlightIntensity(HighlightIntensities.Faded);

      service.changeHighlightIntensity({
        piece,
        intensity: HighlightIntensities.Solid,
        pacing: "Fast",
      });

      expect(data.highlightIntensity).toBe(HighlightIntensities.Solid);
      expect(pieceHighlightAdapterPort.increaseIntensity).toHaveBeenCalledWith(
        piece,
        "Fast"
      );
      expect(
        pieceHighlightAdapterPort.decreaseIntensity
      ).not.toHaveBeenCalled();
    });
    it("successfully decreases the intensity if the target is Faded with the correct piece", async () => {
      const { data, piece } = register(makeChapterData("chapter"));
      await highlight(piece);

      service.changeHighlightIntensity({
        piece,
        intensity: HighlightIntensities.Faded,
      });

      expect(data.highlightIntensity).toBe(HighlightIntensities.Faded);
      expect(pieceHighlightAdapterPort.decreaseIntensity).toHaveBeenCalledWith(
        piece
      );
      expect(
        pieceHighlightAdapterPort.increaseIntensity
      ).not.toHaveBeenCalled();
    });
    it("successfully executes the label intensity change with the correct arguments", async () => {
      const { piece } = register(makeChapterData("chapter"));
      await highlight(piece);

      service.changeHighlightIntensity({
        piece,
        intensity: HighlightIntensities.Faded,
        pacing: "Slow",
      });
      service.changeHighlightIntensity({
        piece,
        intensity: HighlightIntensities.Solid,
      });

      expect(pieceLabelServicePort.changeIntensity).toHaveBeenNthCalledWith(
        1,
        piece,
        HighlightIntensities.Faded,
        "Slow"
      );
      expect(pieceLabelServicePort.changeIntensity).toHaveBeenNthCalledWith(
        2,
        piece,
        HighlightIntensities.Solid,
        "Regular"
      );
    });
  });

  describe("unhighlightBiblePieces", () => {
    it("unhighlights in batch every highlighted stacked piece within the specified bible that is not unhighlighting", async () => {
      const stackedChapter = register(
        makeChapterData("stacked-chapter", { stackBibleId: BIBLE_ID })
      );
      const stackedBook = register(
        makeBookData("stacked-book", { stackBibleId: BIBLE_ID })
      );
      const groundedChapter = register(
        makeChapterData("grounded-chapter", { stackBibleId: BIBLE_ID })
      );
      const otherBibleChapter = register(
        makeChapterData("other-bible-chapter", { stackBibleId: OTHER_BIBLE_ID })
      );
      const unhighlightingChapter = register(
        makeChapterData("unhighlighting-chapter", { stackBibleId: BIBLE_ID })
      );
      for (const { piece } of [
        stackedChapter,
        stackedBook,
        groundedChapter,
        otherBibleChapter,
        unhighlightingChapter,
      ]) {
        await highlight(piece);
      }
      groundedChapter.data.placeOnGround();
      const runningUnhighlight = makeDeferred();
      pieceHighlightAdapterPort.unhighlight.mockReturnValueOnce(
        runningUnhighlight.promise
      );
      const runningPending = unhighlight(unhighlightingChapter.piece);
      pieceHighlightAdapterPort.unhighlight.mockClear();
      pieceHighlightAdapterPort.interruptSequence.mockClear();
      const deferredByPieceId = new Map([
        [stackedChapter.piece.id, makeDeferred()],
        [stackedBook.piece.id, makeDeferred()],
      ]);
      pieceHighlightAdapterPort.unhighlight.mockImplementation(
        (piece) => deferredByPieceId.get(piece.id)?.promise ?? Promise.resolve()
      );

      const pending = service.unhighlightBiblePieces(BIBLE_ID, "Fast");
      await flushMicrotasks();

      expect(pieceHighlightAdapterPort.unhighlight).toHaveBeenCalledTimes(2);
      expect(pieceHighlightAdapterPort.unhighlight).toHaveBeenCalledWith(
        stackedChapter.piece,
        "Fast"
      );
      expect(pieceHighlightAdapterPort.unhighlight).toHaveBeenCalledWith(
        stackedBook.piece,
        "Fast"
      );
      expect(
        pieceHighlightAdapterPort.interruptSequence
      ).not.toHaveBeenCalled();

      for (const deferred of deferredByPieceId.values()) {
        deferred.resolve();
      }
      await pending;

      expect(stackedChapter.data.highlightState).toBe(HighlightStates.Idle);
      expect(stackedBook.data.highlightState).toBe(HighlightStates.Idle);
      expect(groundedChapter.data.highlightState).toBe(
        HighlightStates.Highlighted
      );
      expect(otherBibleChapter.data.highlightState).toBe(
        HighlightStates.Highlighted
      );
      expect(unhighlightingChapter.data.highlightState).toBe(
        HighlightStates.Unhighlighting
      );

      runningUnhighlight.resolve();
      await runningPending;
    });
  });

  describe("clearHighlightedPieces", () => {
    it("successfully makes every highlighted piece Unhighlighting", async () => {
      const first = register(makeChapterData("first"));
      const second = register(makeBookData("second"));
      const highlighting = register(makeChapterData("highlighting"));
      await highlight(first.piece);
      await highlight(second.piece);
      startHighlighting(highlighting.piece);

      service.clearHighlightedPieces();

      expect(first.data.highlightState).toBe(HighlightStates.Unhighlighting);
      expect(second.data.highlightState).toBe(HighlightStates.Unhighlighting);
      expect(highlighting.data.highlightState).toBe(
        HighlightStates.Unhighlighting
      );
    });
    it("omits any piece whose data is not found", async () => {
      const missing = register(makeChapterData("missing"));
      const present = register(makeChapterData("present"));
      await highlight(missing.piece);
      await highlight(present.piece);
      dataByPieceId.delete(missing.piece.id);

      expect(() => service.clearHighlightedPieces()).not.toThrow();

      expect(missing.data.highlightState).toBe(HighlightStates.Highlighted);
      expect(present.data.highlightState).toBe(HighlightStates.Unhighlighting);
    });
    it("clears the highlighted pieces map", async () => {
      const first = register(makeChapterData("first"));
      const second = register(makeChapterData("second"));
      await highlight(first.piece);
      await highlight(second.piece);

      service.clearHighlightedPieces();

      expect(service.isPieceHighlighted(first.piece.id)).toBe(false);
      expect(service.isPieceHighlighted(second.piece.id)).toBe(false);
    });
    it("works twice if the piece has been highlighted in-between", async () => {
      const { data, piece } = register(makeChapterData("chapter"));
      await highlight(piece);
      service.clearHighlightedPieces();

      await highlight(piece);

      expect(data.highlightState).toBe(HighlightStates.Highlighted);
      expect(service.isPieceHighlighted(piece.id)).toBe(true);

      service.clearHighlightedPieces();

      expect(data.highlightState).toBe(HighlightStates.Unhighlighting);
      expect(service.isPieceHighlighted(piece.id)).toBe(false);
    });
  });

  describe("clearScheduledUnhighlight", () => {
    it("no-ops if there's no scheduled unhighlight for the piece", async () => {
      const { piece } = register(makeChapterData("chapter"));
      await highlight(piece);

      service.clearScheduledUnhighlight(piece);

      expect(schedulerAdapterPort.clear).not.toHaveBeenCalled();
      expect(service.isUnhighlightScheduled(piece)).toBe(false);
    });
    it("successfully clears the unhighlight", async () => {
      const { piece } = register(makeChapterData("chapter"));
      await highlight(piece);
      schedulerAdapterPort.schedule.mockReturnValue("timer-1");
      await scheduleUnhighlight(piece);

      service.clearScheduledUnhighlight(piece);

      expect(schedulerAdapterPort.clear).toHaveBeenCalledWith("timer-1");
    });
    it("successfully deletes the piece from the schedule list", async () => {
      const { piece } = register(makeChapterData("chapter"));
      await highlight(piece);
      schedulerAdapterPort.schedule.mockReturnValue("timer-1");
      await scheduleUnhighlight(piece);

      service.clearScheduledUnhighlight(piece);
      service.clearScheduledUnhighlight(piece);

      expect(service.isUnhighlightScheduled(piece)).toBe(false);
      expect(schedulerAdapterPort.clear).toHaveBeenCalledTimes(1);
    });
    it("works twice if a piece has been scheduled an unhighlight in-between", async () => {
      const { piece } = register(makeChapterData("chapter"));
      await highlight(piece);
      schedulerAdapterPort.schedule
        .mockReturnValueOnce("timer-1")
        .mockReturnValueOnce("timer-2");
      await scheduleUnhighlight(piece);
      service.clearScheduledUnhighlight(piece);

      await scheduleUnhighlight(piece);

      expect(service.isUnhighlightScheduled(piece)).toBe(true);

      service.clearScheduledUnhighlight(piece);

      expect(schedulerAdapterPort.clear).toHaveBeenNthCalledWith(1, "timer-1");
      expect(schedulerAdapterPort.clear).toHaveBeenNthCalledWith(2, "timer-2");
      expect(service.isUnhighlightScheduled(piece)).toBe(false);
    });
  });

  describe("forgetPiece", () => {
    it("clears a piece's scheduled unhighlight", async () => {
      const { piece } = register(makeChapterData("chapter"));
      await highlight(piece);
      schedulerAdapterPort.schedule.mockReturnValue("timer-1");
      await scheduleUnhighlight(piece);

      service.forgetPiece(piece);

      expect(schedulerAdapterPort.clear).toHaveBeenCalledWith("timer-1");
      expect(service.isUnhighlightScheduled(piece)).toBe(false);
    });
    it("deletes the piece from the highlighted list", async () => {
      const { piece } = register(makeChapterData("chapter"));
      await highlight(piece);

      service.forgetPiece(piece);

      expect(service.isPieceHighlighted(piece.id)).toBe(false);
    });
    it("works twice if the piece has been highlighted and re-scheduled an unhighlight in-between", async () => {
      const { data, piece } = register(makeChapterData("chapter"));
      schedulerAdapterPort.schedule
        .mockReturnValueOnce("timer-1")
        .mockReturnValueOnce("timer-2");
      await highlight(piece);
      await scheduleUnhighlight(piece);
      service.forgetPiece(piece);
      data.resetHighlightState();

      await highlight(piece);
      await scheduleUnhighlight(piece);

      expect(service.isPieceHighlighted(piece.id)).toBe(true);
      expect(service.isUnhighlightScheduled(piece)).toBe(true);

      service.forgetPiece(piece);

      expect(schedulerAdapterPort.clear).toHaveBeenNthCalledWith(1, "timer-1");
      expect(schedulerAdapterPort.clear).toHaveBeenNthCalledWith(2, "timer-2");
      expect(service.isPieceHighlighted(piece.id)).toBe(false);
      expect(service.isUnhighlightScheduled(piece)).toBe(false);
    });
  });

  describe("clearScheduledUnhighlights", () => {
    it("clears every scheduled unhighlight", async () => {
      const first = register(makeChapterData("first"));
      const second = register(makeChapterData("second"));
      schedulerAdapterPort.schedule
        .mockReturnValueOnce("timer-1")
        .mockReturnValueOnce("timer-2");
      for (const { piece } of [first, second]) {
        await highlight(piece);
        await scheduleUnhighlight(piece);
      }

      service.clearScheduledUnhighlights();

      expect(schedulerAdapterPort.clear).toHaveBeenCalledTimes(2);
      expect(schedulerAdapterPort.clear).toHaveBeenCalledWith("timer-1");
      expect(schedulerAdapterPort.clear).toHaveBeenCalledWith("timer-2");
    });
    it("clears the scheduled unhighlight list", async () => {
      const first = register(makeChapterData("first"));
      const second = register(makeChapterData("second"));
      schedulerAdapterPort.schedule
        .mockReturnValueOnce("timer-1")
        .mockReturnValueOnce("timer-2");
      for (const { piece } of [first, second]) {
        await highlight(piece);
        await scheduleUnhighlight(piece);
      }

      service.clearScheduledUnhighlights();
      service.clearScheduledUnhighlights();

      expect(service.isUnhighlightScheduled(first.piece)).toBe(false);
      expect(service.isUnhighlightScheduled(second.piece)).toBe(false);
      expect(schedulerAdapterPort.clear).toHaveBeenCalledTimes(2);
    });
    it("works twice if new scheduled unhighlights have been introduced in-between", async () => {
      const first = register(makeChapterData("first"));
      const second = register(makeChapterData("second"));
      schedulerAdapterPort.schedule
        .mockReturnValueOnce("timer-1")
        .mockReturnValueOnce("timer-2")
        .mockReturnValueOnce("timer-3");
      await highlight(first.piece);
      await highlight(second.piece);
      await scheduleUnhighlight(first.piece);
      service.clearScheduledUnhighlights();

      await scheduleUnhighlight(first.piece);
      await scheduleUnhighlight(second.piece);

      expect(service.isUnhighlightScheduled(first.piece)).toBe(true);
      expect(service.isUnhighlightScheduled(second.piece)).toBe(true);

      service.clearScheduledUnhighlights();

      expect(schedulerAdapterPort.clear).toHaveBeenCalledTimes(3);
      expect(schedulerAdapterPort.clear).toHaveBeenCalledWith("timer-2");
      expect(schedulerAdapterPort.clear).toHaveBeenCalledWith("timer-3");
      expect(service.isUnhighlightScheduled(first.piece)).toBe(false);
      expect(service.isUnhighlightScheduled(second.piece)).toBe(false);
    });
  });
});
