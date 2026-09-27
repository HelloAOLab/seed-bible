import { describe, it, expect, beforeEach, type Mocked } from "vitest";
import { TestamentSelectionService } from "../../../../../../patterns/bible-stack/bible-stack/application/services/TestamentSelectionService";
import type { StackUpdateServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/StackUpdate";
import type { LoggerPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/out/Logger";
import type {
  AwaiterPort,
  TestamentSelectionPort,
} from "../../../../../../patterns/bible-stack/bible-stack/application/ports/out/TestamentSelection";
import { StackSectionBookData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackSectionBookData";
import { StackSectionData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackSectionData";
import { StackTestamentData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackTestamentData";
import type {
  BookInfo,
  SectionInfo,
  TestamentInfo,
} from "../../../../../../patterns/bible-stack/bible-stack/domain/models/arrangement";
import {
  PieceSelectionSources,
  type ParentDataIds,
  type Piece,
} from "../../../../../../patterns/bible-stack/bible-stack/domain/models/canvas";
import {
  HighlightPacings,
  HighlightRequestSources,
} from "../../../../../../patterns/bible-stack/bible-stack/domain/models/pieces";
import { SelectionStates } from "../../../../../../patterns/bible-stack/bible-stack/domain/models/selection";
import {
  StackUpdatePacings,
  type StackUpdatePacing,
} from "../../../../../../patterns/bible-stack/bible-stack/domain/models/stacks";
import type { EventManagerPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/out/EventManager";
import type { BibleStackEvents } from "../../../../../../patterns/bible-stack/bible-stack/domain/models/events";
import type { PieceHighlightServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/PieceHighlight";
import { makePieceHighlightServiceDouble } from "../serviceDoubles";
import type { LabelSequenceConfigProviderPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/out/LabelSequenceConfigProvider";
import type { PiecePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/out/Piece";
import type { StackPieceLifecyclePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/out/StackPieceLifecycle";
import {
  makePieceDouble,
  makeStackPieceLifecycleDouble,
} from "../adapterDoubles";

const ARRANGEMENT_NAME = "arrangement";
const BIBLE_ID = "bible-id";
const TESTAMENT_ID = "testament-data";
const SHOW_SEQUENCE_DURATION_SECONDS = 1.5;
const STAGGER_DELAY = 1000;

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
  color: "#ffffff",
  sections: [sectionInfo],
};

const sectionCreationParams = {
  arrangementIndex: 0,
  testamentIndex: 0,
  sectionIndex: 0,
  amountOfChaptersInSection: 3,
};

const childParentDataIds = (): ParentDataIds => ({
  stackBibleId: BIBLE_ID,
  stackTestamentId: TESTAMENT_ID,
});

const makeSectionPiece = (id: string): Piece<"StackSection"> => ({
  id,
  type: "StackSection",
});

const makeSectionBookPiece = (id: string): Piece<"StackSectionBook"> => ({
  id,
  type: "StackSectionBook",
});

const makeSectionData = ({
  id,
  isActive = false,
  isInsideBible = true,
  isInsideTestament = true,
}: {
  id: string;
  isActive?: boolean;
  isInsideBible?: boolean;
  isInsideTestament?: boolean;
}): StackSectionData =>
  new StackSectionData({
    id,
    pieceInfo: sectionInfo,
    parentDataIds: childParentDataIds(),
    isActive,
    isInsideBible,
    isInsideTestament,
    creationParams: sectionCreationParams,
  });

const makeSectionBookData = ({
  id,
  isActive = false,
  isInsideBible = true,
  isInsideTestament = true,
}: {
  id: string;
  isActive?: boolean;
  isInsideBible?: boolean;
  isInsideTestament?: boolean;
}): StackSectionBookData =>
  new StackSectionBookData({
    id,
    pieceInfo: sectionInfo,
    pieceBookInfo: bookInfo,
    parentDataIds: childParentDataIds(),
    isActive,
    isInsideBible,
    isInsideTestament,
    creationParams: sectionCreationParams,
  });

const makeTestamentData = ({
  id = TESTAMENT_ID,
  parentDataIds = { stackBibleId: BIBLE_ID },
  childrenData = [],
  isInsideBible = true,
  isSplitIntoSections = false,
}: {
  id?: string;
  parentDataIds?: ParentDataIds;
  childrenData?: (StackSectionData | StackSectionBookData)[];
  isInsideBible?: boolean;
  isSplitIntoSections?: boolean;
} = {}): StackTestamentData =>
  new StackTestamentData({
    id,
    piece: { id: `${id}-piece`, type: "StackTestament" },
    pieceInfo: testamentInfo,
    parentDataIds,
    childrenData,
    isInsideBible,
    isSplitIntoSections,
    isActive: true,
    creationParams: { arrangementIndex: 0, testamentIndex: 0 },
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

describe("pattern.bible-stack.application.services.TestamentSelectionService", () => {
  let service: TestamentSelectionService;
  let testamentSelectionAdapterPort: Mocked<TestamentSelectionPort>;
  let eventManagerPort: Mocked<EventManagerPort<BibleStackEvents>>;
  let pieceHighlighterPort: Mocked<PieceHighlightServicePort>;
  let sectionSpawnerPort: Mocked<StackPieceLifecyclePort>;
  let stackUpdateServicePort: Mocked<StackUpdateServicePort>;
  let awaiterPort: Mocked<AwaiterPort>;
  let labelSequenceConfigProviderPort: Mocked<LabelSequenceConfigProviderPort>;
  let pieceAdapterPort: Mocked<PiecePort>;
  let loggerPort: Mocked<LoggerPort>;
  let spawnedSectionPieces: Piece<"StackSection">[];
  let spawnedSectionBookPieces: Piece<"StackSectionBook">[];

  const select = (data: StackTestamentData, pacing?: StackUpdatePacing) =>
    service.select({
      data,
      pacing,
      source: PieceSelectionSources.UserSelection,
    });

  const makeChildren = () => {
    const section_1 = makeSectionData({ id: "section-data-1" });
    const sectionBook = makeSectionBookData({ id: "section-book-data" });
    const section_2 = makeSectionData({ id: "section-data-2" });
    return { section_1, sectionBook, section_2 };
  };

  const recordOnEmit = <T>(
    read: () => T
  ): { eventName: string; value: T }[] => {
    const records: { eventName: string; value: T }[] = [];
    eventManagerPort.emit.mockImplementation(((eventName: string) => {
      records.push({ eventName, value: read() });
    }) as EventManagerPort<BibleStackEvents>["emit"]);
    return records;
  };

  const emitOrders = () => eventManagerPort.emit.mock.invocationCallOrder;
  const highlightOrders = () =>
    pieceHighlighterPort.tryHighlightPiece.mock.invocationCallOrder;
  const interactableOrders = () =>
    pieceAdapterPort.makeInteractable.mock.invocationCallOrder;

  const highlightRequest = (
    piece: Piece<"StackSection"> | Piece<"StackSectionBook"> | undefined,
    pacing: StackUpdatePacing = HighlightPacings.Regular
  ) => [
    {
      piece,
      source: HighlightRequestSources.Transition,
      scheduledUnhighlightData: {
        delay: 2000,
        pacing,
      },
      pacing,
    },
  ];

  beforeEach(() => {
    spawnedSectionPieces = [];
    spawnedSectionBookPieces = [];

    testamentSelectionAdapterPort = {
      select: vi.fn(),
    };

    eventManagerPort = {
      emit: vi.fn(),
    } as unknown as Mocked<EventManagerPort<BibleStackEvents>>;

    pieceHighlighterPort = makePieceHighlightServiceDouble();

    sectionSpawnerPort = makeStackPieceLifecycleDouble({
      spawnSectionDomain: vi.fn(() => {
        const piece = makeSectionPiece(
          `spawned-section-piece-${spawnedSectionPieces.length}`
        );
        spawnedSectionPieces.push(piece);
        return piece;
      }),
      spawnSectionBookDomain: vi.fn(() => {
        const piece = makeSectionBookPiece(
          `spawned-section-book-piece-${spawnedSectionBookPieces.length}`
        );
        spawnedSectionBookPieces.push(piece);
        return piece;
      }),
    });

    stackUpdateServicePort = {
      updateAllStacks: vi.fn(),
      updateStack: vi.fn(),
    };

    awaiterPort = {
      sleep: vi.fn(),
    };

    labelSequenceConfigProviderPort = {
      getShowSequenceDurationSeconds: vi.fn(
        () => SHOW_SEQUENCE_DURATION_SECONDS
      ),
    };

    pieceAdapterPort = makePieceDouble();

    loggerPort = {
      error: vi.fn(),
      warn: vi.fn(),
      log: vi.fn(),
    };

    service = new TestamentSelectionService({
      testamentSelectionAdapterPort,
      eventManagerPort,
      pieceHighlighterPort,
      sectionSpawnerPort,
      stackUpdateServicePort,
      awaiterPort,
      labelSequenceConfigProviderPort,
      pieceAdapterPort,
      loggerPort,
    });
  });

  describe("select", () => {
    it("emits at start", async () => {
      const data = makeTestamentData({
        childrenData: [makeSectionData({ id: "section-data" })],
      });

      await select(data);

      expect(eventManagerPort.emit).toHaveBeenNthCalledWith(
        1,
        "OnTestamentBeginSelect",
        { data }
      );
      expect(
        (eventManagerPort.emit.mock.calls[0]![1] as { data: unknown }).data
      ).toBe(data);
      expect(emitOrders()[0]!).toBeLessThan(
        pieceHighlighterPort.unhighlightBiblePieces.mock.invocationCallOrder[0]!
      );
      expect(emitOrders()[0]!).toBeLessThan(
        sectionSpawnerPort.spawnSectionDomain.mock.invocationCallOrder[0]!
      );
    });

    it("requests the testament selection", async () => {
      const data = makeTestamentData();
      const selectionStates = recordOnEmit(() => data.selectionState);
      const statesAtUnhighlight: string[] = [];
      pieceHighlighterPort.unhighlightBiblePieces.mockImplementation(
        async () => {
          statesAtUnhighlight.push(data.selectionState);
        }
      );

      await select(data);

      expect(selectionStates[0]).toEqual({
        eventName: "OnTestamentBeginSelect",
        value: SelectionStates.Idle,
      });
      expect(statesAtUnhighlight).toEqual([SelectionStates.Selected]);
      expect(data.selectionState).toBe(SelectionStates.Selected);
      expect(data.isSplitIntoSections).toBe(true);
    });

    it("logs an error and no-ops if the selection state is not mutated", async () => {
      const section = makeSectionData({ id: "section-data" });
      const sectionBook = makeSectionBookData({ id: "section-book-data" });
      const data = makeTestamentData({
        isSplitIntoSections: true,
        childrenData: [section, sectionBook],
      });

      await expect(select(data)).resolves.toBeUndefined();

      expect(loggerPort.error).toHaveBeenCalledExactlyOnceWith(
        "TestamentSelectionService: testament not selecting at prepareSelection."
      );
      expect(eventManagerPort.emit).toHaveBeenCalledExactlyOnceWith(
        "OnTestamentBeginSelect",
        { data }
      );
      expect(
        pieceHighlighterPort.unhighlightBiblePieces
      ).not.toHaveBeenCalled();
      expect(sectionSpawnerPort.spawnSectionDomain).not.toHaveBeenCalled();
      expect(sectionSpawnerPort.spawnSectionBookDomain).not.toHaveBeenCalled();
      expect(section.piece).toBeUndefined();
      expect(sectionBook.piece).toBeUndefined();
      expect(section.isActive).toBe(false);
      expect(sectionBook.isActive).toBe(false);
      expect(testamentSelectionAdapterPort.select).not.toHaveBeenCalled();
      expect(stackUpdateServicePort.updateStack).not.toHaveBeenCalled();
      expect(section.isHighlightable).toBe(false);
      expect(pieceHighlighterPort.tryHighlightPiece).not.toHaveBeenCalled();
      expect(pieceAdapterPort.makeInteractable).not.toHaveBeenCalled();
    });

    it("awaits for the unhighlight in batch of every piece from the bible the testament is inside of if the selection state is mutated", async () => {
      const section = makeSectionData({ id: "section-data" });
      const data = makeTestamentData({ childrenData: [section] });
      const unhighlight = makeDeferred();
      pieceHighlighterPort.unhighlightBiblePieces.mockReturnValue(
        unhighlight.promise
      );

      const selection = select(data);
      await flush();

      expect(
        pieceHighlighterPort.unhighlightBiblePieces
      ).toHaveBeenCalledExactlyOnceWith(BIBLE_ID);
      expect(section.isActive).toBe(false);
      expect(section.piece).toBeUndefined();
      expect(testamentSelectionAdapterPort.select).not.toHaveBeenCalled();

      unhighlight.resolve();
      await selection;

      expect(section.isActive).toBe(true);
      expect(testamentSelectionAdapterPort.select).toHaveBeenCalledOnce();

      pieceHighlighterPort.unhighlightBiblePieces.mockClear();

      await select(
        makeTestamentData({
          id: "outside-testament-data",
          isInsideBible: false,
        })
      );
      await select(
        makeTestamentData({
          id: "bibleless-testament-data",
          parentDataIds: {},
        })
      );
      await select(makeTestamentData({ isSplitIntoSections: true }));

      expect(
        pieceHighlighterPort.unhighlightBiblePieces
      ).not.toHaveBeenCalled();
    });

    it("attaches every child of the testament to the bible if the testament is inside of one, otherwise detaches it from the bible", async () => {
      const detachedChildren = [
        makeSectionData({ id: "section-data-1", isInsideBible: false }),
        makeSectionBookData({
          id: "section-book-data-1",
          isInsideBible: false,
        }),
      ];
      const insideData = makeTestamentData({
        isInsideBible: true,
        childrenData: detachedChildren,
      });

      await select(insideData);

      expect(detachedChildren.map((child) => child.isInsideBible)).toEqual([
        true,
        true,
      ]);

      const attachedChildren = [
        makeSectionData({ id: "section-data-2", isInsideBible: true }),
        makeSectionBookData({ id: "section-book-data-2", isInsideBible: true }),
      ];
      const outsideData = makeTestamentData({
        id: "outside-testament-data",
        isInsideBible: false,
        childrenData: attachedChildren,
      });

      await select(outsideData);

      expect(attachedChildren.map((child) => child.isInsideBible)).toEqual([
        false,
        false,
      ]);
    });

    it("attaches every StackSection child to the testament", async () => {
      const section_1 = makeSectionData({
        id: "section-data-1",
        isInsideTestament: false,
      });
      const section_2 = makeSectionData({
        id: "section-data-2",
        isInsideTestament: false,
      });
      const sectionBook = makeSectionBookData({
        id: "section-book-data",
        isInsideTestament: false,
      });
      const data = makeTestamentData({
        childrenData: [section_1, sectionBook, section_2],
      });

      await select(data);

      expect(section_1.isInsideTestament).toBe(true);
      expect(section_2.isInsideTestament).toBe(true);
      expect(sectionBook.isInsideTestament).toBe(false);
    });

    it("spawns a section piece and attaches it to every child of the testament that is a section", async () => {
      const { section_1, sectionBook, section_2 } = makeChildren();
      const data = makeTestamentData({
        childrenData: [section_1, sectionBook, section_2],
      });

      await select(data);

      expect(sectionSpawnerPort.spawnSectionDomain).toHaveBeenCalledTimes(2);
      expect([section_1.piece, section_2.piece]).toEqual(spawnedSectionPieces);
      expect(spawnedSectionPieces).not.toContain(sectionBook.piece);
    });

    it("spawns a section book piece and attaches it to every child of the testament that is a section book", async () => {
      const section = makeSectionData({ id: "section-data" });
      const sectionBook_1 = makeSectionBookData({ id: "section-book-data-1" });
      const sectionBook_2 = makeSectionBookData({ id: "section-book-data-2" });
      const data = makeTestamentData({
        childrenData: [sectionBook_1, section, sectionBook_2],
      });

      await select(data);

      expect(sectionSpawnerPort.spawnSectionBookDomain).toHaveBeenCalledTimes(
        2
      );
      expect([sectionBook_1.piece, sectionBook_2.piece]).toEqual(
        spawnedSectionBookPieces
      );
      expect(spawnedSectionBookPieces).not.toContain(section.piece);
    });

    it("activates every child of the testament", async () => {
      const { section_1, sectionBook, section_2 } = makeChildren();
      const data = makeTestamentData({
        childrenData: [section_1, sectionBook, section_2],
      });

      await select(data);

      expect(
        [section_1, sectionBook, section_2].map((child) => child.isActive)
      ).toEqual([true, true, true]);
    });

    it("awaits for the selection sequence, after the preparation", async () => {
      const { section_1, sectionBook, section_2 } = makeChildren();
      const data = makeTestamentData({
        childrenData: [section_1, sectionBook, section_2],
      });
      const adapterSelection = makeDeferred();
      testamentSelectionAdapterPort.select.mockReturnValue(
        adapterSelection.promise
      );

      const selection = select(data);
      await flush();

      expect(
        testamentSelectionAdapterPort.select
      ).toHaveBeenCalledExactlyOnceWith(data);
      expect(
        testamentSelectionAdapterPort.select.mock.invocationCallOrder[0]!
      ).toBeGreaterThan(
        pieceHighlighterPort.unhighlightBiblePieces.mock.invocationCallOrder[0]!
      );
      expect(
        [section_1, sectionBook, section_2].map((child) => child.isActive)
      ).toEqual([true, true, true]);
      expect(
        [section_1, sectionBook, section_2].every((child) => !!child.piece)
      ).toBe(true);
      expect(stackUpdateServicePort.updateStack).not.toHaveBeenCalled();

      adapterSelection.resolve();
      await selection;

      expect(stackUpdateServicePort.updateStack).toHaveBeenCalledOnce();
    });

    it("throws if the selection sequence rejects", async () => {
      const section = makeSectionData({ id: "section-data" });
      const data = makeTestamentData({ childrenData: [section] });
      const error = new Error("selection rejected");
      testamentSelectionAdapterPort.select.mockRejectedValue(error);

      await expect(select(data)).rejects.toBe(error);

      expect(stackUpdateServicePort.updateStack).not.toHaveBeenCalled();
      expect(section.isHighlightable).toBe(false);
      expect(pieceHighlighterPort.tryHighlightPiece).not.toHaveBeenCalled();
      expect(pieceAdapterPort.makeInteractable).not.toHaveBeenCalled();
      expect(eventManagerPort.emit).toHaveBeenCalledExactlyOnceWith(
        "OnTestamentBeginSelect",
        { data }
      );
      expect(loggerPort.error).not.toHaveBeenCalled();
    });

    it("awaits for the stack update sequence with the correct testament ancestor, after the selection sequence", async () => {
      const section = makeSectionData({ id: "section-data" });
      const data = makeTestamentData({ childrenData: [section] });
      const update = makeDeferred();
      stackUpdateServicePort.updateStack.mockReturnValueOnce(update.promise);

      const selection = select(data);
      await flush();

      expect(
        stackUpdateServicePort.updateStack
      ).toHaveBeenCalledExactlyOnceWith(
        BIBLE_ID,
        "StackBible",
        StackUpdatePacings.Regular
      );
      expect(
        stackUpdateServicePort.updateStack.mock.invocationCallOrder[0]!
      ).toBeGreaterThan(
        testamentSelectionAdapterPort.select.mock.invocationCallOrder[0]!
      );
      expect(pieceHighlighterPort.tryHighlightPiece).not.toHaveBeenCalled();
      expect(eventManagerPort.emit).toHaveBeenCalledOnce();

      update.resolve();
      await selection;

      expect(pieceHighlighterPort.tryHighlightPiece).toHaveBeenCalledOnce();

      await select(
        makeTestamentData({
          id: "root-testament-data",
          parentDataIds: {},
        }),
        StackUpdatePacings.Fast
      );

      expect(stackUpdateServicePort.updateStack).toHaveBeenLastCalledWith(
        "root-testament-data",
        "StackTestament",
        StackUpdatePacings.Fast
      );
    });

    it("throws if the update sequence rejects", async () => {
      const section = makeSectionData({ id: "section-data" });
      const data = makeTestamentData({ childrenData: [section] });
      const error = new Error("stack update rejected");
      stackUpdateServicePort.updateStack.mockRejectedValue(error);

      await expect(select(data)).rejects.toBe(error);

      expect(section.isHighlightable).toBe(false);
      expect(pieceHighlighterPort.tryHighlightPiece).not.toHaveBeenCalled();
      expect(awaiterPort.sleep).not.toHaveBeenCalled();
      expect(pieceAdapterPort.makeInteractable).not.toHaveBeenCalled();
      expect(eventManagerPort.emit).toHaveBeenCalledExactlyOnceWith(
        "OnTestamentBeginSelect",
        { data }
      );
      expect(loggerPort.error).not.toHaveBeenCalled();
    });

    it("makes every child highlightable, after the update sequence", async () => {
      const { section_1, sectionBook, section_2 } = makeChildren();
      const children = [section_1, sectionBook, section_2];
      const data = makeTestamentData({ childrenData: children });
      const highlightablesAtUpdate: boolean[][] = [];
      stackUpdateServicePort.updateStack.mockImplementation(async () => {
        highlightablesAtUpdate.push(
          children.map((child) => child.isHighlightable)
        );
      });
      const highlightablesAtHighlight: boolean[][] = [];
      pieceHighlighterPort.tryHighlightPiece.mockImplementation(async () => {
        highlightablesAtHighlight.push(
          children.map((child) => child.isHighlightable)
        );
      });

      await select(data);

      expect(highlightablesAtUpdate).toEqual([[false, false, false]]);
      expect(highlightablesAtHighlight[0]).toEqual([true, true, true]);
      expect(children.map((child) => child.isHighlightable)).toEqual([
        true,
        true,
        true,
      ]);
    });

    it("omits the highlight animations if the pacing is Instant", async () => {
      const { section_1, sectionBook, section_2 } = makeChildren();
      const children = [section_1, sectionBook, section_2];
      const data = makeTestamentData({ childrenData: children });

      await select(data, StackUpdatePacings.Instant);

      expect(
        stackUpdateServicePort.updateStack
      ).toHaveBeenCalledExactlyOnceWith(
        BIBLE_ID,
        "StackBible",
        StackUpdatePacings.Instant
      );
      expect(children.map((child) => child.isHighlightable)).toEqual([
        true,
        true,
        true,
      ]);
      expect(pieceHighlighterPort.tryHighlightPiece).not.toHaveBeenCalled();
      expect(
        labelSequenceConfigProviderPort.getShowSequenceDurationSeconds
      ).not.toHaveBeenCalled();
      expect(awaiterPort.sleep).not.toHaveBeenCalled();
      expect(pieceAdapterPort.makeInteractable.mock.calls).toEqual([
        [section_1.piece],
        [sectionBook.piece],
        [section_2.piece],
      ]);
      expect(eventManagerPort.emit.mock.calls).toEqual([
        ["OnTestamentBeginSelect", { data }],
        ["OnTestamentEndSelect", { data }],
      ]);
      expect(emitOrders()[1]!).toBeGreaterThan(interactableOrders()[2]!);
    });

    it("tries to highlight every child in reverse order, with source: Transition, and scheduling an unhighlight", async () => {
      const { section_1, sectionBook, section_2 } = makeChildren();
      const data = makeTestamentData({
        childrenData: [section_1, sectionBook, section_2],
      });

      await select(data);

      expect(pieceHighlighterPort.tryHighlightPiece.mock.calls).toEqual([
        highlightRequest(section_2.piece),
        highlightRequest(sectionBook.piece),
        highlightRequest(section_1.piece),
      ]);

      pieceHighlighterPort.tryHighlightPiece.mockClear();
      const slowSection = makeSectionData({ id: "slow-section-data" });

      await select(
        makeTestamentData({
          id: "slow-testament-data",
          childrenData: [slowSection],
        }),
        StackUpdatePacings.Slow
      );

      expect(pieceHighlighterPort.tryHighlightPiece.mock.calls).toEqual([
        highlightRequest(slowSection.piece, HighlightPacings.Slow),
      ]);
    });

    it("logs an error and skips the child if it does not have a piece attached", async () => {
      const { section_1, sectionBook, section_2 } = makeChildren();
      const data = makeTestamentData({
        childrenData: [section_1, sectionBook, section_2],
      });
      testamentSelectionAdapterPort.select.mockImplementation(async () => {
        sectionBook.clearPiece();
      });

      await expect(select(data)).resolves.toBeUndefined();

      expect(loggerPort.error).toHaveBeenCalledExactlyOnceWith(
        "TestamentSelectionService: sectionData.piece not found at finalizeSelection"
      );
      expect(pieceHighlighterPort.tryHighlightPiece.mock.calls).toEqual([
        highlightRequest(section_2.piece),
        highlightRequest(section_1.piece),
      ]);
      expect(awaiterPort.sleep).toHaveBeenCalledTimes(2);
      expect(eventManagerPort.emit).toHaveBeenLastCalledWith(
        "OnTestamentEndSelect",
        { data }
      );
    });

    it("awaits for a stagger delay between highlight calls", async () => {
      const { section_1, sectionBook, section_2 } = makeChildren();
      const data = makeTestamentData({
        childrenData: [section_1, sectionBook, section_2],
      });
      const firstStagger = makeDeferred();
      awaiterPort.sleep.mockReturnValueOnce(firstStagger.promise);

      const selection = select(data);
      await flush();

      expect(pieceHighlighterPort.tryHighlightPiece).toHaveBeenCalledOnce();
      expect(awaiterPort.sleep).toHaveBeenCalledExactlyOnceWith(STAGGER_DELAY);

      firstStagger.resolve();
      await selection;

      const timeline = [
        ...awaiterPort.sleep.mock.invocationCallOrder.map((order, index) => ({
          order,
          step: `sleep:${awaiterPort.sleep.mock.calls[index]![0]}`,
        })),
        ...highlightOrders().map((order, index) => ({
          order,
          step: `highlight:${pieceHighlighterPort.tryHighlightPiece.mock.calls[index]![0].piece.id}`,
        })),
      ]
        .sort((first, second) => first.order - second.order)
        .map((entry) => entry.step);

      expect(timeline).toEqual([
        `highlight:${section_2.piece!.id}`,
        `sleep:${STAGGER_DELAY}`,
        `highlight:${sectionBook.piece!.id}`,
        `sleep:${STAGGER_DELAY}`,
        `highlight:${section_1.piece!.id}`,
        `sleep:${STAGGER_DELAY}`,
      ]);
      expect(
        labelSequenceConfigProviderPort.getShowSequenceDurationSeconds
      ).toHaveBeenCalledWith(StackUpdatePacings.Regular);
    });

    it("awaits for all the highlight promises in batch", async () => {
      const { section_1, sectionBook, section_2 } = makeChildren();
      const data = makeTestamentData({
        childrenData: [section_1, sectionBook, section_2],
      });
      const highlights = [makeDeferred(), makeDeferred(), makeDeferred()];
      highlights.forEach((highlight) =>
        pieceHighlighterPort.tryHighlightPiece.mockReturnValueOnce(
          highlight.promise
        )
      );

      const selection = select(data);
      await flush();

      expect(pieceHighlighterPort.tryHighlightPiece).toHaveBeenCalledTimes(3);
      expect(pieceAdapterPort.makeInteractable).not.toHaveBeenCalled();

      highlights[0]!.resolve();
      highlights[2]!.resolve();
      await flush();

      expect(pieceAdapterPort.makeInteractable).not.toHaveBeenCalled();
      expect(eventManagerPort.emit).toHaveBeenCalledOnce();

      highlights[1]!.resolve();
      await selection;

      expect(pieceAdapterPort.makeInteractable).toHaveBeenCalledTimes(3);
    });

    it("makes every child interactable, after awaiting the highlight batch", async () => {
      const { section_1, sectionBook, section_2 } = makeChildren();
      const data = makeTestamentData({
        childrenData: [section_1, sectionBook, section_2],
      });

      await select(data);

      expect(pieceAdapterPort.makeInteractable.mock.calls).toEqual([
        [section_1.piece],
        [sectionBook.piece],
        [section_2.piece],
      ]);
      expect(interactableOrders()[0]!).toBeGreaterThan(
        highlightOrders()[highlightOrders().length - 1]!
      );
    });

    it("emits at the end", async () => {
      const section = makeSectionData({ id: "section-data" });
      const data = makeTestamentData({ childrenData: [section] });

      await select(data);

      expect(eventManagerPort.emit.mock.calls).toEqual([
        ["OnTestamentBeginSelect", { data }],
        ["OnTestamentEndSelect", { data }],
      ]);
      expect(
        (eventManagerPort.emit.mock.calls[1]![1] as { data: unknown }).data
      ).toBe(data);
      expect(emitOrders()[1]!).toBeGreaterThan(interactableOrders()[0]!);
    });
  });
});
