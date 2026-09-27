import { describe, it, expect, beforeEach, type Mocked } from "vitest";
import { SectionSelectionService } from "../../../../../../patterns/bible-stack/bible-stack/application/services/SectionSelectionService";
import type { BookSelectionServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/BookSelection";
import type { DomainEventManager } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/EventManager";
import type { ExplodedViewServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/ExplodedView";
import type { PieceHierarchyServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/PieceHierarchy";
import type { PieceHighlighterPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/PieceHighlight";
import type { PieceLifecycleServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/PieceLifecycle";
import type { BookSpawnerPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/PieceSpawn";
import type { StackUpdateServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/StackUpdate";
import type { TourGuideServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/TourGuide";
import type { LoggerPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/out/Logger";
import type {
  LabelDataStorePort,
  PieceLabelServicePort,
  SectionSelectionAdapterPort,
  SectionSelectionEventPort,
} from "../../../../../../patterns/bible-stack/bible-stack/application/ports/out/SectionSelection";
import type { ParentDataChain } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/pieces";
import { InfoLabelData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/InfoLabelData";
import { StackBibleData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackBibleData";
import { StackBookData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackBookData";
import { StackSectionData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackSectionData";
import type {
  BookInfo,
  SectionInfo,
} from "../../../../../../patterns/bible-stack/bible-stack/domain/models/arrangement";
import {
  BibleTypes,
  BibleVisualizationStates,
  CrossPositions,
  PieceSelectionSources,
  type BibleVisualizationState,
  type ParentDataIds,
  type Piece,
  type SectionShadow,
} from "../../../../../../patterns/bible-stack/bible-stack/domain/models/canvas";
import { HighlightEvents } from "../../../../../../patterns/bible-stack/bible-stack/domain/models/highlight";
import {
  LabelPositions,
  LabelTranslucencyModes,
  ShowSequencePacings,
} from "../../../../../../patterns/bible-stack/bible-stack/domain/models/label";
import {
  HighlightPacings,
  UnhighlightRequestSources,
} from "../../../../../../patterns/bible-stack/bible-stack/domain/models/pieces";
import {
  SelectionEvents,
  SelectionStates,
} from "../../../../../../patterns/bible-stack/bible-stack/domain/models/selection";
import { StackUpdatePacings } from "../../../../../../patterns/bible-stack/bible-stack/domain/models/stacks";

const ARRANGEMENT_NAME = "arrangement";
const BIBLE_ID = "bible-id";
const SECTION_ID = "section-data";
const SECTION_NAME = "section";
const PREVIOUS_SECTION_ID = "previous-section-data";

const sectionPiece: Piece<"StackSection"> = {
  id: "section-piece",
  type: "StackSection",
};

const shadowPiece: SectionShadow = {
  id: "shadow-piece",
  type: "StackSectionShadow",
  sectionDataId: SECTION_ID,
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

const makeSectionInfo = (name: string): SectionInfo => ({
  name,
  color: "#ffffff",
  books: [bookInfo],
  path: {
    arrangementName: ARRANGEMENT_NAME,
    testamentIndex: 0,
    sectionIndex: 0,
  },
});

const makeBookData = ({
  id,
  piece = makeBookPiece(`${id}-piece`),
  isActive = true,
  isHighlighted = false,
  isSelected = false,
  isInsideBible = true,
  isInsideTestament = true,
  isInsideSection = true,
}: {
  id: string;
  piece?: Piece<"StackBook"> | null;
  isActive?: boolean;
  isHighlighted?: boolean;
  isSelected?: boolean;
  isInsideBible?: boolean;
  isInsideTestament?: boolean;
  isInsideSection?: boolean;
}): StackBookData => {
  const bookData = new StackBookData({
    id,
    piece: piece ?? undefined,
    pieceInfo: bookInfo,
    parentDataIds: { stackBibleId: BIBLE_ID, stackSectionId: SECTION_ID },
    isActive,
    isInsideBible,
    isInsideTestament,
    isInsideSection,
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

  if (isHighlighted) {
    bookData.changeHighlightState(HighlightEvents.RequestHighlight);
    bookData.changeHighlightState(HighlightEvents.SequenceComplete);
  }
  if (isSelected) {
    bookData.changeSelectionState(SelectionEvents.RequestSelect);
    bookData.changeSelectionState(SelectionEvents.SequenceComplete);
  }

  return bookData;
};

const makeSectionData = ({
  id = SECTION_ID,
  name = SECTION_NAME,
  piece = sectionPiece,
  parentDataIds = { stackBibleId: BIBLE_ID },
  childrenData = [],
  shadow = null,
  isSelected = false,
  isInExplodedView = false,
  isInsideBible = true,
  isInsideTestament = true,
}: {
  id?: string;
  name?: string;
  piece?: Piece<"StackSection"> | null;
  parentDataIds?: ParentDataIds;
  childrenData?: StackBookData[][];
  shadow?: SectionShadow | null;
  isSelected?: boolean;
  isInExplodedView?: boolean;
  isInsideBible?: boolean;
  isInsideTestament?: boolean;
} = {}): StackSectionData => {
  const sectionData = new StackSectionData({
    id,
    piece: piece ?? undefined,
    pieceInfo: makeSectionInfo(name),
    parentDataIds,
    childrenData,
    isSplitIntoBooks: isSelected,
    isInExplodedView,
    isInsideBible,
    isInsideTestament,
    creationParams: {
      arrangementIndex: 0,
      testamentIndex: 0,
      sectionIndex: 0,
      amountOfChaptersInSection: 3,
    },
  });

  if (shadow) {
    sectionData.attachShadow(shadow);
  }

  return sectionData;
};

const makeBibleData = (
  currentStackVizState: BibleVisualizationState = BibleVisualizationStates.Regular
): StackBibleData =>
  new StackBibleData({
    id: BIBLE_ID,
    currentCrossPosition: CrossPositions.Top,
    currentStackVizState,
    arrangementIndex: 0,
    bibleType: BibleTypes.Default,
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

const makeInfoLabelData = (): InfoLabelData =>
  new InfoLabelData({
    id: "label-id",
    transformer: { id: "label-transformer", type: "InfoLabelTransformer" },
    tail: { id: "label-tail", type: "InfoLabelTail" },
    label: { id: "label-text", type: "InfoLabelText" },
    owner: shadowPiece,
    positioning: LabelPositions.Top,
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

describe("pattern.bible-stack.application.services.SectionSelectionService", () => {
  let service: SectionSelectionService;
  let labelDataStorePort: Mocked<LabelDataStorePort>;
  let pieceHighlighterPort: Mocked<PieceHighlighterPort>;
  let bookSelectionServicePort: Mocked<BookSelectionServicePort>;
  let pieceLabelServicePort: Mocked<PieceLabelServicePort>;
  let pieceLifecycleServicePort: Mocked<PieceLifecycleServicePort>;
  let stackUpdateServicePort: Mocked<StackUpdateServicePort>;
  let sectionSelectionAdapterPort: Mocked<SectionSelectionAdapterPort>;
  let explodedViewServicePort: Mocked<ExplodedViewServicePort>;
  let sectionSelectionEventPort: Mocked<SectionSelectionEventPort>;
  let bookSpawnerPort: Mocked<BookSpawnerPort>;
  let tourGuideServicePort: Mocked<TourGuideServicePort>;
  let pieceHierarchyServicePort: Mocked<PieceHierarchyServicePort>;
  let eventManager: Mocked<DomainEventManager>;
  let loggerPort: Mocked<LoggerPort>;
  let currentExplodedSection: StackSectionData | undefined;
  let spawnedPieces: Piece<"StackBook">[];

  const select = (data: StackSectionData, makeTourGuide?: boolean) =>
    service.select({
      data,
      source: PieceSelectionSources.UserSelection,
      makeTourGuide,
    });

  const recordOnEmit = <T>(
    read: () => T
  ): { eventName: string; value: T }[] => {
    const records: { eventName: string; value: T }[] = [];
    sectionSelectionEventPort.emit.mockImplementation(((eventName: string) => {
      records.push({ eventName, value: read() });
    }) as SectionSelectionEventPort["emit"]);
    return records;
  };

  const recordOnStackUpdate = <T>(read: () => T): T[] => {
    const records: T[] = [];
    stackUpdateServicePort.updateStack.mockImplementation(async () => {
      records.push(read());
    });
    return records;
  };

  const emitOrders = () =>
    sectionSelectionEventPort.emit.mock.invocationCallOrder;
  const updateOrders = () =>
    stackUpdateServicePort.updateStack.mock.invocationCallOrder;
  const unhighlightOrders = () =>
    pieceHighlighterPort.tryUnhighlightPiece.mock.invocationCallOrder;

  beforeEach(() => {
    currentExplodedSection = undefined;
    spawnedPieces = [];

    labelDataStorePort = {
      getDataByOwnerId: vi.fn(),
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

    bookSelectionServicePort = {
      selectBook: vi.fn(),
      deselectBook: vi.fn(),
      selectBooks: vi.fn(),
      deselectBooks: vi.fn(),
    };

    pieceLabelServicePort = {
      showLabel: vi.fn(),
      hideLabel: vi.fn(),
      changeIntensity: vi.fn(),
    };

    pieceLifecycleServicePort = {
      createTestament: vi.fn(),
      createSection: vi.fn(),
      createBook: vi.fn(),
      createChapter: vi.fn(),
      clearPiece: vi.fn(),
    };

    stackUpdateServicePort = {
      updateAllStacks: vi.fn(),
      updateStack: vi.fn(),
    };

    sectionSelectionAdapterPort = {
      select: vi.fn(),
      deselect: vi.fn(),
    };

    explodedViewServicePort = {
      explodeSection: vi.fn(),
      registerExplodedSection: vi.fn(),
      get currentExplodedSection() {
        return currentExplodedSection;
      },
    };

    sectionSelectionEventPort = {
      emit: vi.fn(),
    } as unknown as Mocked<SectionSelectionEventPort>;

    bookSpawnerPort = {
      spawnBookDomain: vi.fn(() => {
        const piece = makeBookPiece(
          `spawned-book-piece-${spawnedPieces.length}`
        );
        spawnedPieces.push(piece);
        return piece;
      }),
      despawnBook: vi.fn(),
    };

    tourGuideServicePort = {
      ongoingTourGuideSectionData:
        undefined as unknown as TourGuideServicePort["ongoingTourGuideSectionData"],
      isThereAnOngoingTourGuide: vi.fn(),
      beginTourGuide: vi.fn(),
      stopTourGuide: vi.fn(),
    };

    pieceHierarchyServicePort = {
      getParentDataChain: vi.fn(() => makeParentDataChain()),
    };

    eventManager = {
      subscribe: vi.fn(),
      emit: vi.fn(),
      removeAllListeners: vi.fn(),
    } as unknown as Mocked<DomainEventManager>;

    loggerPort = {
      error: vi.fn(),
      warn: vi.fn(),
      log: vi.fn(),
    };

    service = new SectionSelectionService({
      labelDataStorePort,
      pieceHighlighterPort,
      bookSelectionServicePort,
      pieceLabelServicePort,
      pieceLifecycleServicePort,
      stackUpdateServicePort,
      sectionSelectionAdapterPort,
      explodedViewServicePort,
      sectionSelectionEventPort,
      bookSpawnerPort,
      tourGuideServicePort,
      pieceHierarchyServicePort,
      eventManager,
      loggerPort,
    });
  });

  describe("select", () => {
    it("logs an error and no-ops if no piece attached", async () => {
      const book = makeBookData({ id: "book-data", isActive: false });
      const data = makeSectionData({ piece: null, childrenData: [[book]] });

      await select(data);

      expect(loggerPort.error).toHaveBeenCalledExactlyOnceWith(
        "SectionSelectionService: data.piece not defined at prepareSelection."
      );
      expect(sectionSelectionEventPort.emit).not.toHaveBeenCalled();
      expect(pieceLabelServicePort.hideLabel).not.toHaveBeenCalled();
      expect(stackUpdateServicePort.updateStack).not.toHaveBeenCalled();
      expect(sectionSelectionAdapterPort.select).not.toHaveBeenCalled();
      expect(tourGuideServicePort.beginTourGuide).not.toHaveBeenCalled();
      expect(data.selectionState).toBe(SelectionStates.Idle);
      expect(data.isInExplodedView).toBe(false);
      expect(book.isActive).toBe(false);
      expect(service.hasSectionEverBeenSelected(SECTION_NAME)).toBe(false);
    });

    it("emits at start", async () => {
      const data = makeSectionData();

      await select(data);

      expect(sectionSelectionEventPort.emit).toHaveBeenNthCalledWith(
        1,
        "OnSectionBeginSelect",
        { data }
      );
      expect(sectionSelectionEventPort.emit.mock.calls[0]![1]).toStrictEqual({
        data,
      });
      expect(sectionSelectionEventPort.emit.mock.calls[0]![1]!.data).toBe(data);
      expect(emitOrders()[0]!).toBeLessThan(
        pieceLabelServicePort.hideLabel.mock.invocationCallOrder[0]!
      );
    });

    it("instantly hides the section's label", async () => {
      const data = makeSectionData();

      await select(data);

      expect(pieceLabelServicePort.hideLabel).toHaveBeenCalledExactlyOnceWith(
        sectionPiece,
        ShowSequencePacings.Instant
      );
    });

    it("implodes a different currently exploded section if the provided section is within a regularly-visualized bible", async () => {
      const previous = makeSectionData({
        id: PREVIOUS_SECTION_ID,
        name: "previous",
        isSelected: true,
        isInExplodedView: true,
      });
      currentExplodedSection = previous;
      pieceHierarchyServicePort.getParentDataChain.mockReturnValue(
        makeParentDataChain({ bibleData: makeBibleData() })
      );

      await select(makeSectionData());

      expect(
        pieceHierarchyServicePort.getParentDataChain
      ).toHaveBeenCalledExactlyOnceWith({ stackBibleId: BIBLE_ID });
      expect(previous.isInExplodedView).toBe(false);

      const sameSection = makeSectionData({
        name: "same",
        isSelected: true,
        isInExplodedView: true,
      });
      currentExplodedSection = sameSection;

      await select(makeSectionData({ name: "same" }));

      expect(sameSection.isInExplodedView).toBe(true);

      const expandedPrevious = makeSectionData({
        id: PREVIOUS_SECTION_ID,
        name: "expanded-previous",
        isSelected: true,
        isInExplodedView: true,
      });
      currentExplodedSection = expandedPrevious;
      pieceHierarchyServicePort.getParentDataChain.mockReturnValue(
        makeParentDataChain({
          bibleData: makeBibleData(BibleVisualizationStates.Expanded),
        })
      );

      await select(makeSectionData({ name: "expanded" }));

      expect(expandedPrevious.isInExplodedView).toBe(true);

      const biblelessPrevious = makeSectionData({
        id: PREVIOUS_SECTION_ID,
        name: "bibleless-previous",
        isSelected: true,
        isInExplodedView: true,
      });
      currentExplodedSection = biblelessPrevious;
      pieceHierarchyServicePort.getParentDataChain.mockReturnValue(
        makeParentDataChain()
      );

      await select(makeSectionData({ name: "bibleless" }));

      expect(biblelessPrevious.isInExplodedView).toBe(true);
    });

    it("updates the previous exploded section's ancestor", async () => {
      const previous = makeSectionData({
        id: PREVIOUS_SECTION_ID,
        name: "previous",
        isSelected: true,
        isInExplodedView: true,
      });
      currentExplodedSection = previous;
      pieceHierarchyServicePort.getParentDataChain.mockReturnValue(
        makeParentDataChain({ bibleData: makeBibleData() })
      );
      const explodedAtUpdate = recordOnStackUpdate(
        () => previous.isInExplodedView
      );

      await select(makeSectionData());

      expect(stackUpdateServicePort.updateStack).toHaveBeenNthCalledWith(
        1,
        BIBLE_ID,
        "StackBible",
        StackUpdatePacings.Regular
      );
      expect(explodedAtUpdate[0]).toBe(false);

      const rootPrevious = makeSectionData({
        id: "root-previous-section-data",
        name: "root-previous",
        parentDataIds: {},
        isSelected: true,
        isInExplodedView: true,
      });
      currentExplodedSection = rootPrevious;
      stackUpdateServicePort.updateStack.mockClear();

      await select(makeSectionData({ name: "another" }));

      expect(stackUpdateServicePort.updateStack).toHaveBeenNthCalledWith(
        1,
        "root-previous-section-data",
        "StackSection",
        StackUpdatePacings.Regular
      );
    });

    it("logs an error and no-ops if the update sequence rejects", async () => {
      currentExplodedSection = makeSectionData({
        id: PREVIOUS_SECTION_ID,
        name: "previous",
        isSelected: true,
        isInExplodedView: true,
      });
      pieceHierarchyServicePort.getParentDataChain.mockReturnValue(
        makeParentDataChain({ bibleData: makeBibleData() })
      );
      const book = makeBookData({
        id: "book-data",
        isActive: false,
        isHighlighted: true,
      });
      const data = makeSectionData({ childrenData: [[book]] });
      const error = new Error("stack update rejected");
      stackUpdateServicePort.updateStack.mockRejectedValueOnce(error);

      await expect(select(data)).resolves.toBeUndefined();

      expect(loggerPort.error).toHaveBeenCalledExactlyOnceWith(
        "SectionSelectionService: Error while updating stack",
        { error }
      );
      expect(stackUpdateServicePort.updateStack).toHaveBeenCalledOnce();
      expect(pieceHighlighterPort.tryUnhighlightPiece).not.toHaveBeenCalled();
      expect(data.selectionState).toBe(SelectionStates.Idle);
      expect(data.isInExplodedView).toBe(false);
      expect(
        explodedViewServicePort.registerExplodedSection
      ).not.toHaveBeenCalled();
      expect(book.isActive).toBe(false);
      expect(sectionSelectionAdapterPort.select).not.toHaveBeenCalled();
      expect(service.hasSectionEverBeenSelected(SECTION_NAME)).toBe(false);
      expect(sectionSelectionEventPort.emit).toHaveBeenCalledExactlyOnceWith(
        "OnSectionBeginSelect",
        { data }
      );
    });

    it("awaits the unhighlight in batch for any actively-highlighted books before the section selection", async () => {
      const piece_1 = makeBookPiece("book-piece-1");
      const piece_2 = makeBookPiece("book-piece-2");
      const book_1 = makeBookData({
        id: "book-data-1",
        piece: piece_1,
        isHighlighted: true,
      });
      const book_2 = makeBookData({
        id: "book-data-2",
        piece: piece_2,
        isHighlighted: true,
      });
      const idleBook = makeBookData({ id: "book-data-3" });
      const inactiveBook = makeBookData({
        id: "book-data-4",
        isActive: false,
        isHighlighted: true,
      });
      const data = makeSectionData({
        childrenData: [
          [book_1, idleBook],
          [inactiveBook, book_2],
        ],
      });
      const unhighlight = makeDeferred();
      pieceHighlighterPort.tryUnhighlightPiece.mockReturnValue(
        unhighlight.promise
      );

      const selection = select(data);
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
      expect(data.selectionState).toBe(SelectionStates.Idle);
      expect(data.isInExplodedView).toBe(false);
      expect(sectionSelectionAdapterPort.select).not.toHaveBeenCalled();

      unhighlight.resolve();
      await selection;

      expect(data.selectionState).toBe(SelectionStates.Selected);
    });

    it("logs an error and no-ops if the unhighlight in batch rejects", async () => {
      const book = makeBookData({ id: "book-data", isHighlighted: true });
      const data = makeSectionData({ childrenData: [[book]] });
      const error = new Error("unhighlight rejected");
      pieceHighlighterPort.tryUnhighlightPiece.mockRejectedValue(error);

      await expect(select(data)).resolves.toBeUndefined();

      expect(loggerPort.error).toHaveBeenCalledExactlyOnceWith(
        "SectionSelectionService: Error while unhighlighting books",
        { error }
      );
      expect(data.selectionState).toBe(SelectionStates.Idle);
      expect(data.isInExplodedView).toBe(false);
      expect(
        explodedViewServicePort.registerExplodedSection
      ).not.toHaveBeenCalled();
      expect(bookSpawnerPort.spawnBookDomain).not.toHaveBeenCalled();
      expect(sectionSelectionAdapterPort.select).not.toHaveBeenCalled();
      expect(stackUpdateServicePort.updateStack).not.toHaveBeenCalled();
      expect(service.hasSectionEverBeenSelected(SECTION_NAME)).toBe(false);
    });

    it("omits any book that has no piece", async () => {
      const bookPiece = makeBookPiece("book-piece");
      const piecelessBook = makeBookData({
        id: "book-data-1",
        piece: null,
        isHighlighted: true,
      });
      const book = makeBookData({
        id: "book-data-2",
        piece: bookPiece,
        isHighlighted: true,
      });
      const data = makeSectionData({ childrenData: [[piecelessBook, book]] });

      await select(data);

      expect(
        pieceHighlighterPort.tryUnhighlightPiece
      ).toHaveBeenCalledExactlyOnceWith({
        piece: bookPiece,
        source: UnhighlightRequestSources.Transition,
        pacing: HighlightPacings.Regular,
      });
      expect(loggerPort.error).not.toHaveBeenCalled();
      expect(data.selectionState).toBe(SelectionStates.Selected);
    });

    it("requests the section selection", async () => {
      const data = makeSectionData();
      const selectionStates: string[] = [];
      sectionSelectionAdapterPort.select.mockImplementation(async () => {
        selectionStates.push(data.selectionState);
      });

      await select(data);

      expect(selectionStates).toEqual([SelectionStates.Selected]);
      expect(data.selectionState).toBe(SelectionStates.Selected);
    });

    it("logs an error and no-ops if the selection state is not mutated", async () => {
      const book = makeBookData({ id: "book-data", isActive: false });
      const data = makeSectionData({
        isSelected: true,
        childrenData: [[book]],
      });

      await select(data);

      expect(loggerPort.error).toHaveBeenCalledExactlyOnceWith(
        "SectionSelectionService: section is not idle at prepareSelection."
      );
      expect(data.isInExplodedView).toBe(false);
      expect(
        explodedViewServicePort.registerExplodedSection
      ).not.toHaveBeenCalled();
      expect(bookSpawnerPort.spawnBookDomain).not.toHaveBeenCalled();
      expect(book.isActive).toBe(false);
      expect(sectionSelectionAdapterPort.select).not.toHaveBeenCalled();
      expect(stackUpdateServicePort.updateStack).not.toHaveBeenCalled();
      expect(service.hasSectionEverBeenSelected(SECTION_NAME)).toBe(false);
      expect(sectionSelectionEventPort.emit).toHaveBeenCalledExactlyOnceWith(
        "OnSectionBeginSelect",
        { data }
      );
    });

    it("explodes the section", async () => {
      const data = makeSectionData();
      const explodedAtRegister: (boolean | undefined)[] = [];
      explodedViewServicePort.registerExplodedSection.mockImplementation(
        (section) => {
          explodedAtRegister.push(section.isInExplodedView);
        }
      );

      await select(data);

      expect(
        explodedViewServicePort.registerExplodedSection
      ).toHaveBeenCalledExactlyOnceWith(data);
      expect(explodedAtRegister).toEqual([true]);
      expect(data.isInExplodedView).toBe(true);
    });

    it("attaches or detaches every child from the bible whether it is or not inside one", async () => {
      const detachedBooks = [
        makeBookData({ id: "book-data-1", isInsideBible: false }),
        makeBookData({ id: "book-data-2", isInsideBible: false }),
      ];
      const insideData = makeSectionData({
        isInsideBible: true,
        childrenData: [[detachedBooks[0]!], [detachedBooks[1]!]],
      });

      await select(insideData);

      expect(detachedBooks.map((book) => book.isInsideBible)).toEqual([
        true,
        true,
      ]);

      const attachedBooks = [
        makeBookData({ id: "book-data-3", isInsideBible: true }),
        makeBookData({ id: "book-data-4", isInsideBible: true }),
      ];
      const outsideData = makeSectionData({
        id: "outside-section-data",
        name: "outside",
        isInsideBible: false,
        childrenData: [[attachedBooks[0]!], [attachedBooks[1]!]],
      });

      await select(outsideData);

      expect(attachedBooks.map((book) => book.isInsideBible)).toEqual([
        false,
        false,
      ]);
    });

    it("attaches or detaches every child from the testament whether it is or not inside one", async () => {
      const detachedBooks = [
        makeBookData({ id: "book-data-1", isInsideTestament: false }),
        makeBookData({ id: "book-data-2", isInsideTestament: false }),
      ];
      const insideData = makeSectionData({
        isInsideTestament: true,
        childrenData: [[detachedBooks[0]!], [detachedBooks[1]!]],
      });

      await select(insideData);

      expect(detachedBooks.map((book) => book.isInsideTestament)).toEqual([
        true,
        true,
      ]);

      const attachedBooks = [
        makeBookData({ id: "book-data-3", isInsideTestament: true }),
        makeBookData({ id: "book-data-4", isInsideTestament: true }),
      ];
      const outsideData = makeSectionData({
        id: "outside-section-data",
        name: "outside",
        isInsideTestament: false,
        childrenData: [[attachedBooks[0]!], [attachedBooks[1]!]],
      });

      await select(outsideData);

      expect(attachedBooks.map((book) => book.isInsideTestament)).toEqual([
        false,
        false,
      ]);
    });

    it("attaches every child to a section", async () => {
      const books = [
        makeBookData({ id: "book-data-1", isInsideSection: false }),
        makeBookData({ id: "book-data-2", isInsideSection: false }),
      ];
      const data = makeSectionData({
        childrenData: [[books[0]!], [books[1]!]],
      });

      await select(data);

      expect(books.map((book) => book.isInsideSection)).toEqual([true, true]);
    });

    it("attaches a new piece to every child", async () => {
      const books = [
        makeBookData({ id: "book-data-1" }),
        makeBookData({ id: "book-data-2", piece: null }),
        makeBookData({ id: "book-data-3" }),
      ];
      const data = makeSectionData({
        childrenData: [[books[0]!, books[1]!], [books[2]!]],
      });

      await select(data);

      expect(bookSpawnerPort.spawnBookDomain).toHaveBeenCalledTimes(3);
      expect(books.map((book) => book.piece)).toEqual(spawnedPieces);
    });

    it("activates every child", async () => {
      const books = [
        makeBookData({ id: "book-data-1", isActive: false }),
        makeBookData({ id: "book-data-2", isActive: false }),
      ];
      const data = makeSectionData({
        childrenData: [[books[0]!], [books[1]!]],
      });

      await select(data);

      expect(books.map((book) => book.isActive)).toEqual([true, true]);
    });

    it("adds the section to the selection registry, before the selection sequence", async () => {
      const data = makeSectionData();
      const registeredAtSelection: boolean[] = [];
      sectionSelectionAdapterPort.select.mockImplementation(async () => {
        registeredAtSelection.push(
          service.hasSectionEverBeenSelected(SECTION_NAME)
        );
      });

      expect(service.hasSectionEverBeenSelected(SECTION_NAME)).toBe(false);

      await select(data);

      expect(registeredAtSelection).toEqual([true]);
    });

    it("awaits for the selection sequence, before the update sequence", async () => {
      const data = makeSectionData();
      const adapterSelection = makeDeferred();
      sectionSelectionAdapterPort.select.mockReturnValue(
        adapterSelection.promise
      );

      const selection = select(data);
      await flush();

      expect(
        sectionSelectionAdapterPort.select
      ).toHaveBeenCalledExactlyOnceWith(data);
      expect(stackUpdateServicePort.updateStack).not.toHaveBeenCalled();

      adapterSelection.resolve();
      await selection;

      expect(stackUpdateServicePort.updateStack).toHaveBeenCalledOnce();
    });

    it("awaits for the update sequence with the correct ancestor, before selecting the section", async () => {
      const book = makeBookData({ id: "book-data" });
      const data = makeSectionData({
        shadow: shadowPiece,
        childrenData: [[book]],
      });
      const update = makeDeferred();
      stackUpdateServicePort.updateStack.mockReturnValue(update.promise);

      const selection = select(data);
      await flush();

      expect(
        stackUpdateServicePort.updateStack
      ).toHaveBeenCalledExactlyOnceWith(
        BIBLE_ID,
        "StackBible",
        StackUpdatePacings.Regular
      );
      expect(sectionSelectionEventPort.emit).toHaveBeenCalledExactlyOnceWith(
        "OnSectionBeginSelect",
        { data }
      );
      expect(pieceLabelServicePort.showLabel).not.toHaveBeenCalled();
      expect(book.isHighlightable).toBe(false);
      expect(tourGuideServicePort.beginTourGuide).not.toHaveBeenCalled();

      update.resolve();
      await selection;

      expect(sectionSelectionEventPort.emit).toHaveBeenLastCalledWith(
        "OnSectionEndSelect",
        { data }
      );

      const rootData = makeSectionData({
        id: "root-section-data",
        name: "root",
        parentDataIds: {},
      });

      await select(rootData);

      expect(stackUpdateServicePort.updateStack).toHaveBeenLastCalledWith(
        "root-section-data",
        "StackSection",
        StackUpdatePacings.Regular
      );
    });

    it("makes every active child highlightable, before the last emit", async () => {
      const books = [
        makeBookData({ id: "book-data-1", isActive: false }),
        makeBookData({ id: "book-data-2" }),
      ];
      const data = makeSectionData({ childrenData: [books] });
      const highlightables = recordOnEmit(() =>
        books.map((book) => book.isHighlightable)
      );

      await select(data);

      expect(highlightables).toEqual([
        { eventName: "OnSectionBeginSelect", value: [false, false] },
        { eventName: "OnSectionEndSelect", value: [true, true] },
      ]);
    });

    it("shows the label of the shadow if it exists, before the last emit", async () => {
      const data = makeSectionData({ shadow: shadowPiece });

      await select(data);

      expect(pieceLabelServicePort.showLabel).toHaveBeenCalledExactlyOnceWith({
        piece: shadowPiece,
        translucencyMode: LabelTranslucencyModes.Solid,
      });
      expect(
        pieceLabelServicePort.showLabel.mock.invocationCallOrder[0]!
      ).toBeLessThan(emitOrders()[1]!);

      const shadowlessData = makeSectionData({
        id: "shadowless-section-data",
        name: "shadowless",
      });

      await select(shadowlessData);

      expect(pieceLabelServicePort.showLabel).toHaveBeenCalledOnce();
    });

    it("selects the section, before the last emit", async () => {
      const data = makeSectionData();
      const selectionStates = recordOnEmit(() => data.selectionState);

      await select(data);

      expect(selectionStates).toEqual([
        { eventName: "OnSectionBeginSelect", value: SelectionStates.Idle },
        { eventName: "OnSectionEndSelect", value: SelectionStates.Selected },
      ]);
    });

    it("emits at the end", async () => {
      const data = makeSectionData();

      await select(data);

      expect(sectionSelectionEventPort.emit.mock.calls).toEqual([
        ["OnSectionBeginSelect", { data }],
        ["OnSectionEndSelect", { data }],
      ]);
      expect(sectionSelectionEventPort.emit.mock.calls[1]![1]!.data).toBe(data);
      expect(emitOrders()[1]!).toBeGreaterThan(updateOrders()[0]!);
    });

    it("starts a tour guide on the section if it is its first selection and is requested, after the last emit", async () => {
      const data = makeSectionData();

      await select(data);

      expect(
        tourGuideServicePort.beginTourGuide
      ).toHaveBeenCalledExactlyOnceWith(data);
      expect(
        tourGuideServicePort.beginTourGuide.mock.invocationCallOrder[0]!
      ).toBeGreaterThan(emitOrders()[1]!);

      await select(makeSectionData({ id: "reselected-section-data" }));

      expect(tourGuideServicePort.beginTourGuide).toHaveBeenCalledOnce();

      await select(
        makeSectionData({
          id: "unrequested-section-data",
          name: "unrequested",
        }),
        false
      );

      expect(tourGuideServicePort.beginTourGuide).toHaveBeenCalledOnce();
    });

    it("throws if the selection, stack update or tour guide sequence rejects", async () => {
      const selectionError = new Error("selection rejected");
      sectionSelectionAdapterPort.select.mockRejectedValueOnce(selectionError);

      await expect(
        select(makeSectionData({ id: "section-data-1", name: "section-1" }))
      ).rejects.toBe(selectionError);

      const updateError = new Error("stack update rejected");
      stackUpdateServicePort.updateStack.mockRejectedValueOnce(updateError);

      await expect(
        select(makeSectionData({ id: "section-data-2", name: "section-2" }))
      ).rejects.toBe(updateError);

      const tourGuideError = new Error("tour guide rejected");
      tourGuideServicePort.beginTourGuide.mockRejectedValueOnce(tourGuideError);

      await expect(
        select(makeSectionData({ id: "section-data-3", name: "section-3" }))
      ).rejects.toBe(tourGuideError);

      expect(loggerPort.error).not.toHaveBeenCalled();
    });
  });

  describe("deselect", () => {
    it("logs an error and no-ops if no shadow attached", async () => {
      const book = makeBookData({
        id: "book-data",
        isHighlighted: true,
        isSelected: true,
      });
      const data = makeSectionData({
        isSelected: true,
        isInExplodedView: true,
        childrenData: [[book]],
      });

      await service.deselect(data);

      expect(loggerPort.error).toHaveBeenCalledExactlyOnceWith(
        "SectionSelectionService: data.shadow not defined at deselect"
      );
      expect(eventManager.emit).not.toHaveBeenCalled();
      expect(labelDataStorePort.getDataByOwnerId).not.toHaveBeenCalled();
      expect(pieceHighlighterPort.tryUnhighlightPiece).not.toHaveBeenCalled();
      expect(bookSelectionServicePort.deselectBooks).not.toHaveBeenCalled();
      expect(sectionSelectionAdapterPort.deselect).not.toHaveBeenCalled();
      expect(pieceLifecycleServicePort.clearPiece).not.toHaveBeenCalled();
      expect(stackUpdateServicePort.updateStack).not.toHaveBeenCalled();
      expect(data.selectionState).toBe(SelectionStates.Selected);
      expect(data.isInExplodedView).toBe(true);
    });

    it("emits at start", async () => {
      const book = makeBookData({ id: "book-data", isHighlighted: true });
      const data = makeSectionData({
        shadow: shadowPiece,
        childrenData: [[book]],
      });

      await service.deselect(data);

      expect(eventManager.emit).toHaveBeenCalledExactlyOnceWith(
        "OnSectionDeselected",
        { data }
      );
      const emitOrder = eventManager.emit.mock.invocationCallOrder[0]!;
      expect(emitOrder).toBeLessThan(
        labelDataStorePort.getDataByOwnerId.mock.invocationCallOrder[0]!
      );
      expect(emitOrder).toBeLessThan(unhighlightOrders()[0]!);
      expect(emitOrder).toBeLessThan(
        sectionSelectionAdapterPort.deselect.mock.invocationCallOrder[0]!
      );
    });

    it("awaits the unhighlight in batch of every actively highlighted children", async () => {
      const piece_1 = makeBookPiece("book-piece-1");
      const piece_2 = makeBookPiece("book-piece-2");
      const book_1 = makeBookData({
        id: "book-data-1",
        piece: piece_1,
        isHighlighted: true,
      });
      const book_2 = makeBookData({
        id: "book-data-2",
        piece: piece_2,
        isHighlighted: true,
      });
      const selectedBook = makeBookData({
        id: "book-data-3",
        isSelected: true,
      });
      const inactiveBook = makeBookData({
        id: "book-data-4",
        isActive: false,
        isHighlighted: true,
      });
      const data = makeSectionData({
        shadow: shadowPiece,
        childrenData: [
          [book_1, selectedBook],
          [inactiveBook, book_2],
        ],
      });
      const unhighlight = makeDeferred();
      pieceHighlighterPort.tryUnhighlightPiece.mockReturnValue(
        unhighlight.promise
      );

      const deselection = service.deselect(data);
      await flush();

      expect(pieceHighlighterPort.tryUnhighlightPiece.mock.calls).toEqual([
        [
          {
            piece: piece_1,
            source: UnhighlightRequestSources.Transition,
            pacing: HighlightPacings.Fast,
          },
        ],
        [
          {
            piece: piece_2,
            source: UnhighlightRequestSources.Transition,
            pacing: HighlightPacings.Fast,
          },
        ],
      ]);
      expect(bookSelectionServicePort.deselectBooks).not.toHaveBeenCalled();
      expect(sectionSelectionAdapterPort.deselect).not.toHaveBeenCalled();

      unhighlight.resolve();
      await deselection;

      expect(bookSelectionServicePort.deselectBooks).toHaveBeenCalledOnce();
      expect(sectionSelectionAdapterPort.deselect).toHaveBeenCalledOnce();
    });

    it("omits any book that has no attached piece", async () => {
      const bookPiece = makeBookPiece("book-piece");
      const piecelessBook = makeBookData({
        id: "book-data-1",
        piece: null,
        isHighlighted: true,
      });
      const book = makeBookData({
        id: "book-data-2",
        piece: bookPiece,
        isHighlighted: true,
      });
      const data = makeSectionData({
        shadow: shadowPiece,
        childrenData: [[piecelessBook, book]],
      });

      await service.deselect(data);

      expect(
        pieceHighlighterPort.tryUnhighlightPiece
      ).toHaveBeenCalledExactlyOnceWith({
        piece: bookPiece,
        source: UnhighlightRequestSources.Transition,
        pacing: HighlightPacings.Fast,
      });
      expect(
        sectionSelectionAdapterPort.deselect
      ).toHaveBeenCalledExactlyOnceWith(data);
      expect(stackUpdateServicePort.updateStack).toHaveBeenCalledOnce();
    });

    it("logs an error and omits any book that has no attached piece", async () => {
      const piecelessBook_1 = makeBookData({
        id: "book-data-1",
        piece: null,
        isHighlighted: true,
      });
      const piecelessBook_2 = makeBookData({
        id: "book-data-2",
        piece: null,
        isHighlighted: true,
      });
      const data = makeSectionData({
        shadow: shadowPiece,
        childrenData: [[piecelessBook_1], [piecelessBook_2]],
      });

      await service.deselect(data);

      expect(loggerPort.error.mock.calls).toEqual([
        ["SectionSelectionService: book not defined at deselect."],
        ["SectionSelectionService: book not defined at deselect."],
      ]);
      expect(pieceHighlighterPort.tryUnhighlightPiece).not.toHaveBeenCalled();
      expect(
        sectionSelectionAdapterPort.deselect
      ).toHaveBeenCalledExactlyOnceWith(data);
    });

    it("throws if any of the book unhighlight sequences rejects", async () => {
      const book_1 = makeBookData({ id: "book-data-1", isHighlighted: true });
      const book_2 = makeBookData({ id: "book-data-2", isHighlighted: true });
      const selectedBook = makeBookData({
        id: "book-data-3",
        isSelected: true,
      });
      const data = makeSectionData({
        shadow: shadowPiece,
        childrenData: [[book_1, book_2, selectedBook]],
      });
      const error = new Error("unhighlight rejected");
      pieceHighlighterPort.tryUnhighlightPiece
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(error);

      await expect(service.deselect(data)).rejects.toBe(error);

      expect(pieceHighlighterPort.tryUnhighlightPiece).toHaveBeenCalledTimes(2);
      expect(bookSelectionServicePort.deselectBooks).not.toHaveBeenCalled();
      expect(sectionSelectionAdapterPort.deselect).not.toHaveBeenCalled();
      expect(pieceLifecycleServicePort.clearPiece).not.toHaveBeenCalled();
      expect(stackUpdateServicePort.updateStack).not.toHaveBeenCalled();
    });

    it("awaits for the deselection in batch for every actively selected book children, after the batch unhighlight if executed", async () => {
      const highlightedBook = makeBookData({
        id: "book-data-1",
        isHighlighted: true,
      });
      const selectedBook_1 = makeBookData({
        id: "book-data-2",
        isSelected: true,
      });
      const selectedBook_2 = makeBookData({
        id: "book-data-3",
        isSelected: true,
      });
      const inactiveSelectedBook = makeBookData({
        id: "book-data-4",
        isActive: false,
        isSelected: true,
      });
      const data = makeSectionData({
        shadow: shadowPiece,
        childrenData: [
          [highlightedBook, selectedBook_1],
          [inactiveSelectedBook, selectedBook_2],
        ],
      });
      const booksDeselection = makeDeferred();
      bookSelectionServicePort.deselectBooks.mockReturnValue(
        booksDeselection.promise
      );

      const deselection = service.deselect(data);
      await flush();

      expect(
        bookSelectionServicePort.deselectBooks
      ).toHaveBeenCalledExactlyOnceWith(
        [selectedBook_1, selectedBook_2],
        StackUpdatePacings.Fast
      );
      expect(
        bookSelectionServicePort.deselectBooks.mock.invocationCallOrder[0]!
      ).toBeGreaterThan(unhighlightOrders()[0]!);
      expect(sectionSelectionAdapterPort.deselect).not.toHaveBeenCalled();

      booksDeselection.resolve();
      await deselection;

      expect(sectionSelectionAdapterPort.deselect).toHaveBeenCalledOnce();

      bookSelectionServicePort.deselectBooks.mockClear();
      const idleData = makeSectionData({
        id: "idle-section-data",
        shadow: shadowPiece,
        childrenData: [[makeBookData({ id: "book-data-5" })]],
      });

      await service.deselect(idleData);

      expect(bookSelectionServicePort.deselectBooks).not.toHaveBeenCalled();
    });

    it("throws if the batch deselection for the books rejects", async () => {
      const selectedBook = makeBookData({ id: "book-data", isSelected: true });
      const data = makeSectionData({
        shadow: shadowPiece,
        childrenData: [[selectedBook]],
      });
      const error = new Error("books deselection rejected");
      bookSelectionServicePort.deselectBooks.mockRejectedValue(error);

      await expect(service.deselect(data)).rejects.toBe(error);

      expect(sectionSelectionAdapterPort.deselect).not.toHaveBeenCalled();
      expect(pieceLifecycleServicePort.clearPiece).not.toHaveBeenCalled();
      expect(stackUpdateServicePort.updateStack).not.toHaveBeenCalled();
    });

    it("awaits for the section deselection sequence, after the batch deselect if executed", async () => {
      const selectedBook = makeBookData({ id: "book-data", isSelected: true });
      const data = makeSectionData({
        shadow: shadowPiece,
        childrenData: [[selectedBook]],
      });
      labelDataStorePort.getDataByOwnerId.mockReturnValue(makeInfoLabelData());
      const sectionDeselection = makeDeferred();
      sectionSelectionAdapterPort.deselect.mockReturnValue(
        sectionDeselection.promise
      );

      const deselection = service.deselect(data);
      await flush();

      expect(
        sectionSelectionAdapterPort.deselect
      ).toHaveBeenCalledExactlyOnceWith(data);
      expect(
        sectionSelectionAdapterPort.deselect.mock.invocationCallOrder[0]!
      ).toBeGreaterThan(
        bookSelectionServicePort.deselectBooks.mock.invocationCallOrder[0]!
      );
      expect(pieceLabelServicePort.hideLabel).not.toHaveBeenCalled();
      expect(pieceLifecycleServicePort.clearPiece).not.toHaveBeenCalled();
      expect(stackUpdateServicePort.updateStack).not.toHaveBeenCalled();
      expect(data.shadow).toBe(shadowPiece);

      sectionDeselection.resolve();
      await deselection;

      expect(stackUpdateServicePort.updateStack).toHaveBeenCalledOnce();
    });

    it("throws if the section deselection sequence rejects", async () => {
      const data = makeSectionData({ shadow: shadowPiece });
      labelDataStorePort.getDataByOwnerId.mockReturnValue(makeInfoLabelData());
      const error = new Error("section deselection rejected");
      sectionSelectionAdapterPort.deselect.mockRejectedValue(error);

      await expect(service.deselect(data)).rejects.toBe(error);

      expect(pieceLabelServicePort.hideLabel).not.toHaveBeenCalled();
      expect(pieceLifecycleServicePort.clearPiece).not.toHaveBeenCalled();
      expect(stackUpdateServicePort.updateStack).not.toHaveBeenCalled();
      expect(data.shadow).toBe(shadowPiece);
    });

    it("awaits for the hide label sequence if there's a label attached to the section shadow, after the section deselection sequence", async () => {
      const book = makeBookData({ id: "book-data" });
      const data = makeSectionData({
        shadow: shadowPiece,
        childrenData: [[book]],
      });
      labelDataStorePort.getDataByOwnerId.mockReturnValue(makeInfoLabelData());
      const hide = makeDeferred();
      pieceLabelServicePort.hideLabel.mockReturnValue(hide.promise);

      const deselection = service.deselect(data);
      await flush();

      expect(
        labelDataStorePort.getDataByOwnerId
      ).toHaveBeenCalledExactlyOnceWith(shadowPiece.id);
      expect(pieceLabelServicePort.hideLabel).toHaveBeenCalledExactlyOnceWith(
        shadowPiece
      );
      expect(
        pieceLabelServicePort.hideLabel.mock.invocationCallOrder[0]!
      ).toBeGreaterThan(
        sectionSelectionAdapterPort.deselect.mock.invocationCallOrder[0]!
      );
      expect(pieceLifecycleServicePort.clearPiece).not.toHaveBeenCalled();
      expect(data.shadow).toBe(shadowPiece);

      hide.resolve();
      await deselection;

      expect(pieceLifecycleServicePort.clearPiece).toHaveBeenCalled();

      pieceLabelServicePort.hideLabel.mockClear();
      labelDataStorePort.getDataByOwnerId.mockReturnValue(undefined);
      const unlabeledData = makeSectionData({
        id: "unlabeled-section-data",
        shadow: shadowPiece,
      });

      await service.deselect(unlabeledData);

      expect(pieceLabelServicePort.hideLabel).not.toHaveBeenCalled();
    });

    it("resets the hierarchy, and awaits the clear of every released piece in batch", async () => {
      const piece_1 = makeBookPiece("book-piece-1");
      const piece_2 = makeBookPiece("book-piece-2");
      const book_1 = makeBookData({ id: "book-data-1", piece: piece_1 });
      const book_2 = makeBookData({ id: "book-data-2", piece: piece_2 });
      const data = makeSectionData({
        shadow: shadowPiece,
        isSelected: true,
        isInExplodedView: true,
        childrenData: [[book_1], [book_2]],
      });
      const clears = [makeDeferred(), makeDeferred(), makeDeferred()];
      pieceLifecycleServicePort.clearPiece
        .mockReturnValueOnce(clears[0]!.promise)
        .mockReturnValueOnce(clears[1]!.promise)
        .mockReturnValueOnce(clears[2]!.promise);

      const deselection = service.deselect(data);
      await flush();

      expect(pieceLifecycleServicePort.clearPiece.mock.calls).toEqual([
        [shadowPiece],
        [piece_1],
        [piece_2],
      ]);
      expect(data.shadow).toBeUndefined();
      expect(data.isInExplodedView).toBe(false);
      expect(data.selectionState).toBe(SelectionStates.Idle);
      expect(data.piece).toBe(sectionPiece);
      expect(
        [book_1, book_2].map((book) => ({
          piece: book.piece,
          isActive: book.isActive,
        }))
      ).toEqual([
        { piece: undefined, isActive: false },
        { piece: undefined, isActive: false },
      ]);

      clears[0]!.resolve();
      clears[1]!.resolve();
      await flush();

      expect(stackUpdateServicePort.updateStack).not.toHaveBeenCalled();

      clears[2]!.resolve();
      await deselection;

      expect(stackUpdateServicePort.updateStack).toHaveBeenCalledOnce();
    });

    it("throws if the batch piece clear sequence rejects", async () => {
      const book = makeBookData({ id: "book-data" });
      const data = makeSectionData({
        shadow: shadowPiece,
        childrenData: [[book]],
      });
      const error = new Error("piece clear rejected");
      pieceLifecycleServicePort.clearPiece
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(error);

      await expect(service.deselect(data)).rejects.toBe(error);

      expect(stackUpdateServicePort.updateStack).not.toHaveBeenCalled();
    });

    it("awaits for the stack update for the correct ancestor", async () => {
      const data = makeSectionData({ shadow: shadowPiece });
      const update = makeDeferred();
      stackUpdateServicePort.updateStack.mockReturnValue(update.promise);
      let isSettled = false;

      const deselection = service.deselect(data).then(() => {
        isSettled = true;
      });
      await flush();

      expect(
        stackUpdateServicePort.updateStack
      ).toHaveBeenCalledExactlyOnceWith(
        BIBLE_ID,
        "StackBible",
        StackUpdatePacings.Regular
      );
      expect(isSettled).toBe(false);

      update.resolve();
      await deselection;

      expect(isSettled).toBe(true);

      const rootData = makeSectionData({
        id: "root-section-data",
        parentDataIds: {},
        shadow: shadowPiece,
      });

      await service.deselect(rootData);

      expect(stackUpdateServicePort.updateStack).toHaveBeenLastCalledWith(
        "root-section-data",
        "StackSection",
        StackUpdatePacings.Regular
      );
    });

    it("throws if the stack update sequence rejects", async () => {
      const data = makeSectionData({ shadow: shadowPiece });
      const error = new Error("stack update rejected");
      stackUpdateServicePort.updateStack.mockRejectedValue(error);

      await expect(service.deselect(data)).rejects.toBe(error);
    });
  });

  describe("hasSectionEverBeenSelected", () => {
    it("returns true if the provided section name is registered in the selection registry, returns false otherwise", async () => {
      expect(service.hasSectionEverBeenSelected(SECTION_NAME)).toBe(false);

      await select(makeSectionData());

      expect(service.hasSectionEverBeenSelected(SECTION_NAME)).toBe(true);
      expect(service.hasSectionEverBeenSelected("unselected")).toBe(false);
    });
  });
});
