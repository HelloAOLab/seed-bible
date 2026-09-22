import {
  describe,
  it,
  expect,
  beforeEach,
  type Mocked,
  type Mock,
} from "vitest";
import { BibleSequenceService } from "../../../../../../patterns/bible-stack/bible-stack/application/services/BibleSequenceService";
import type {
  BibleSequenceAdapterPort,
  BibleSequenceEventPort,
  BibleSequenceServiceConfigProviderPort,
  BookChaptersManagementServicePort,
  LabelDataRepositoryPort,
  PieceAdapterPort,
  RenderOrderAdapterPort,
  StackPieceLifecycleAdapterPort,
} from "../../../../../../patterns/bible-stack/bible-stack/application/ports/bibleLifecycle";
import type { AwaiterPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/experience";
import type { PieceHighlighterPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/PieceHighlight";
import type {
  PieceDataRepositoryPort,
  PieceLabelServicePort,
} from "../../../../../../patterns/bible-stack/bible-stack/application/ports/pieces";
import type { LoggerPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/out/Logger";
import type {
  ActiveBibleHierarchy,
  StackBibleData,
  StaticBiblePieces,
} from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackBibleData";
import { StackPresenceNavigationPacings } from "../../../../../../patterns/bible-stack/bible-stack/domain/models/userPresence";
import type { StackTestamentData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackTestamentData";
import {
  BibleStates,
  BibleTypes,
  BibleVisualizationStates,
  type BiblePiece,
  type BibleState,
  type BibleType,
  type BibleVisualizationState,
  type Piece,
} from "../../../../../../patterns/bible-stack/bible-stack/domain/models/canvas";
import type {
  PieceDataMap,
  SectionShadow,
} from "../../../../../../patterns/bible-stack/bible-stack/domain/models/canvas";
import {
  HighlightPacings,
  UnhighlightRequestSources,
  type PieceTypeMap,
} from "../../../../../../patterns/bible-stack/bible-stack/domain/models/pieces";
import {
  SelectionStates,
  simpleSelectionFSM,
  type SelectionEvent,
  type SelectionState,
} from "../../../../../../patterns/bible-stack/bible-stack/domain/models/selection";
import type { InfoLabelData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/InfoLabelData";
import { ShowSequencePacings } from "../../../../../../patterns/bible-stack/bible-stack/domain/models/label";

interface MockedDataProps {
  id?: string;
}

interface MockedBibleDataProps extends MockedDataProps {
  staticPieces?: Partial<StaticBiblePieces>;
  activeHierarchy?: ActiveBibleHierarchy;
  childrenData?: StackTestamentData[];
  currentState?: BibleState;
  currentStackVizState?: BibleVisualizationState;
  bibleType?: BibleType;
}

const makeStaticPiece = <K extends keyof StaticBiblePieces>(
  key: K,
  id: StaticBiblePieces[K]["id"]
) => ({ id }) as unknown as StaticBiblePieces[K];

const makePiece = <T extends BiblePiece>(type: T, id: string): Piece<T> => {
  const piece = {
    type,
    id,
  };

  return piece;
};
const makePieceData = <T extends keyof PieceDataMap>({
  type,
  id,
  piece,
  selectionState = SelectionStates.Idle,
  overrides = {},
}: {
  type: T;
  id?: string;
  piece?: PieceTypeMap[T];
  selectionState?: SelectionState;
  overrides?: Partial<PieceDataMap[T]>;
}): PieceDataMap[T] => {
  const actualId = id ?? `${type}-data-id`;
  const pieceId = actualId + `-piece-id`;
  const actualPiece = piece ?? makePiece(type, pieceId);
  const data = {
    id: actualId,
    piece: actualPiece,
    type,
    selectionState,
    ...overrides,
  };

  return data as unknown as PieceDataMap[T];
};
const makeStaticBiblePieces = (): StaticBiblePieces => ({
  bibleTransformer: makeStaticPiece("bibleTransformer", "bible-transformer"),
  upperCover: makeStaticPiece("upperCover", "upper-cover"),
  leftCover: makeStaticPiece("leftCover", "left-cover"),
  lowerCover: makeStaticPiece("lowerCover", "lower-cover"),
  bibleShadow: makeStaticPiece("bibleShadow", "bible-shadow"),
  crossHorizontalLine: makeStaticPiece(
    "crossHorizontalLine",
    "cross-horizontal-line"
  ),
  crossVerticalLine: makeStaticPiece(
    "crossVerticalLine",
    "cross-vertical-line"
  ),
});

const makeBibleData = ({
  staticPieces = makeStaticBiblePieces(),
  activeHierarchy = {
    testamentsData: [],
    sectionsData: [],
    booksData: [],
  },
  childrenData = [],
  currentState = BibleStates.Open,
  currentStackVizState = BibleVisualizationStates.Expanded,
  bibleType = BibleTypes.Default,
  id = "bible-id",
}: MockedBibleDataProps = {}) => {
  const data = {
    getStaticPiece: vi.fn((key: keyof StaticBiblePieces) => staticPieces[key]),
    getActiveHierarchy: vi.fn(() => activeHierarchy),
    resetHierarchy: vi.fn(() => []),
    changeState: vi.fn((state: BibleState) => {
      data.currentState = state;
    }),
    changeVizState: vi.fn((state: BibleVisualizationState) => {
      data.currentStackVizState = state;
    }),
    childrenData,
    getAllSectionsData: vi.fn(() => []),
    currentState,
    currentStackVizState,
    bibleType,
    id,
  };
  return data as unknown as Mocked<StackBibleData>;
};

describe("pattern.bible-stack.application.services.BibleSequenceService", () => {
  let service: BibleSequenceService;
  let eventPort: Mocked<BibleSequenceEventPort>;
  let bibleSequenceAdapterPort: Mocked<BibleSequenceAdapterPort>;
  let awaiterPort: Mocked<AwaiterPort>;
  let configProviderPort: Mocked<BibleSequenceServiceConfigProviderPort>;
  let pieceHighlightServicePort: Mocked<PieceHighlighterPort>;
  let pieceLabelServicePort: Mocked<PieceLabelServicePort>;
  let labelDataRepositoryPort: Mocked<LabelDataRepositoryPort>;
  let pieceAdapterPort: Mocked<PieceAdapterPort>;
  let stackPieceLifecycleAdapterPort: Mocked<StackPieceLifecycleAdapterPort>;
  let bookChaptersManagementServicePort: Mocked<BookChaptersManagementServicePort>;
  let renderOrderAdapterPort: Mocked<RenderOrderAdapterPort>;
  let loggerPort: Mocked<LoggerPort>;
  let pieceDataRepositoryPort: Mocked<
    Pick<
      PieceDataRepositoryPort,
      | "getAllTestaments"
      | "getAllSections"
      | "getAllSectionBooks"
      | "getAllBooks"
      | "getAllChapters"
    >
  >;

  beforeEach(() => {
    eventPort = {
      emit: vi.fn(),
    } as unknown as Mocked<BibleSequenceEventPort>;

    bibleSequenceAdapterPort = {
      displayCrackOpenBibleSequence: vi.fn(),
      displayCloseBibleSequence: vi.fn(() => Promise.resolve()),
      displayOpenBibleSequence: vi.fn(),
    };

    awaiterPort = {
      sleep: vi.fn(),
    };

    configProviderPort = {
      getTestamentHighlightSequenceConfig: vi.fn(),
    } as unknown as Mocked<BibleSequenceServiceConfigProviderPort>;

    pieceHighlightServicePort = {
      tryHighlightPiece: vi.fn(),
      tryUnhighlightPiece: vi.fn(() => Promise.resolve()),
      isUnhighlightScheduled: vi.fn(),
      changeHighlightIntensity: vi.fn(),
      clearScheduledUnhighlights: vi.fn(),
      clearHighlightedPieces: vi.fn(),
      forgetPiece: vi.fn(),
      unhighlightBiblePieces: vi.fn(),
    };

    pieceLabelServicePort = {
      hideLabel: vi.fn(() => Promise.resolve()),
    };

    labelDataRepositoryPort = {
      getDataByOwnerId: vi.fn(),
    };

    pieceAdapterPort = {
      makeNonInteractable: vi.fn(),
      makeInteractable: vi.fn(),
      isPieceBeingUsed: vi.fn(),
    };

    stackPieceLifecycleAdapterPort = {
      spawnBibleTransformer: vi.fn(),
      spawnCover: vi.fn(),
      spawnCrossLine: vi.fn(),
      spawnShadow: vi.fn(),
      despawnSectionShadow: vi.fn(),
      despawnTestament: vi.fn(),
      despawnSection: vi.fn(),
      despawnBook: vi.fn(),
      despawnSectionBook: vi.fn(),
      spawnSectionDomain: vi.fn(),
      spawnSectionBookDomain: vi.fn(),
    };

    bookChaptersManagementServicePort = {
      showChapters: vi.fn(),
      hideChapters: vi.fn(),
    };

    renderOrderAdapterPort = {
      setSortedRenderOrder: vi.fn(),
    };

    loggerPort = {
      error: vi.fn(),
      warn: vi.fn(),
      log: vi.fn(),
    };

    pieceDataRepositoryPort = {
      getAllTestaments: vi.fn(() => []),
      getAllSections: vi.fn(() => []),
      getAllSectionBooks: vi.fn(() => []),
      getAllBooks: vi.fn(() => []),
      getAllChapters: vi.fn(() => []),
    };

    service = new BibleSequenceService({
      eventPort,
      bibleSequenceAdapterPort,
      scripturePiecesStateServicePort: {
        arePiecesDraggable: false,
      },
      awaiterPort,
      configProviderPort,
      pieceHighlightServicePort,
      pieceLabelServicePort,
      labelDataRepositoryPort,
      pieceAdapterPort,
      stackPieceLifecycleAdapterPort,
      bookChaptersManagementServicePort,
      renderOrderAdapterPort,
      loggerPort,
      pieceDataRepositoryPort,
    });
  });

  describe("resetBible", () => {
    it("performs closeBible, then openBible", async () => {
      const executionOrder: string[] = [];
      const pacing = StackPresenceNavigationPacings.Regular;
      bibleSequenceAdapterPort.displayOpenBibleSequence.mockImplementation(
        () => {
          executionOrder.push("open-sequence");
          return Promise.resolve();
        }
      );
      bibleSequenceAdapterPort.displayCloseBibleSequence.mockImplementation(
        () => {
          executionOrder.push("close-sequence");
          return Promise.resolve();
        }
      );
      const bibleData = makeBibleData();
      await service.resetBible({ bibleData, pacing });
      expect(executionOrder).toEqual(["close-sequence", "open-sequence"]);
      expect(loggerPort.error).not.toHaveBeenCalledWith(
        "BibleSequenceService: Failed to display reset sequence at resetBible."
      );
    });

    it("emits at start, then at end, and doesn't logs an error", async () => {
      const bibleData = makeBibleData();
      await service.resetBible({
        bibleData,
        pacing: StackPresenceNavigationPacings.Regular,
      });
      const emitCalls = eventPort.emit.mock.calls;
      expect(emitCalls[0]).toEqual([
        "OnBibleResetSequenceStart",
        { bibleData },
      ]);
      expect(emitCalls[emitCalls.length - 1]).toEqual([
        "OnBibleResetSequenceEnd",
        { bibleData },
      ]);
      expect(loggerPort.error).not.toHaveBeenCalledWith(
        "BibleSequenceService: Failed to display reset sequence at resetBible.",
        expect.anything()
      );
    });

    it.each([
      {
        message: "displayCloseBibleSequence error",
        sequence: "close",
      },
      {
        message: "displayOpenBibleSequence error",
        sequence: "open",
      },
    ])(
      "does not throw, does not emit at the end and logs an error if the $sequence sequence fails.",
      async ({ sequence, message }) => {
        const bibleData = makeBibleData();

        const method =
          sequence === "close"
            ? bibleSequenceAdapterPort.displayCloseBibleSequence
            : bibleSequenceAdapterPort.displayOpenBibleSequence;

        method.mockRejectedValueOnce(message);
        await expect(
          service.resetBible({
            bibleData,
            pacing: StackPresenceNavigationPacings.Regular,
          })
        ).resolves.toBeUndefined();
        expect(eventPort.emit).not.toHaveBeenCalledWith(
          "OnBibleResetSequenceEnd",
          { bibleData }
        );
        expect(loggerPort.error).toHaveBeenCalledExactlyOnceWith(
          "BibleSequenceService: Failed to display reset sequence at resetBible.",
          {
            error: message,
          }
        );
      }
    );
  });

  describe("closeBible", () => {
    const makeClosingBibleData = () => {
      const sectionShadow_1 = {
        id: "sec-1-sh",
        type: "StackSectionShadow",
        sectionDataId: "sec-1",
      } as SectionShadow;
      const testament_1 = makePieceData({
        type: "StackTestament",
        id: "tes-1",
      });
      const testament_2 = makePieceData({
        type: "StackTestament",
        id: "tes-2",
      });
      const sectionBook_1 = makePieceData({
        type: "StackSectionBook",
        id: "secbook-1",
      });
      const sectionBook_2 = makePieceData({
        type: "StackSectionBook",
        id: "secbook-2",
      });
      const section_1 = makePieceData({
        type: "StackSection",
        id: "sec-1",
        overrides: {
          shadow: sectionShadow_1,
        },
      });
      const section_2 = makePieceData({ type: "StackSection", id: "sec-2" });
      const book_1 = makePieceData({ type: "StackBook", id: "book-1" });
      const book_2 = makePieceData({ type: "StackBook", id: "book-2" });

      const scripturePiecesData = [
        testament_1,
        testament_2,
        sectionBook_1,
        sectionBook_2,
        section_1,
        section_2,
        book_1,
        book_2,
      ];
      const scripturePieces = scripturePiecesData.map((data) => data.piece!);
      const piecesToCollapse = [...scripturePieces, sectionShadow_1];

      const bibleData = makeBibleData({
        activeHierarchy: {
          testamentsData: [testament_1, testament_2],
          sectionsData: [sectionBook_1, sectionBook_2, section_1, section_2],
          booksData: [book_1, book_2],
        },
      });
      bibleData.resetHierarchy.mockReturnValue(piecesToCollapse);

      return {
        bibleData,
        testament_1,
        testament_2,
        sectionBook_1,
        sectionBook_2,
        section_1,
        section_2,
        book_1,
        book_2,
        sectionShadow_1,
        scripturePiecesData,
        scripturePieces,
        piecesToCollapse,
      };
    };

    type ClosingBibleData = ReturnType<typeof makeClosingBibleData>;

    interface DespawnCase {
      despawn: keyof Pick<
        StackPieceLifecycleAdapterPort,
        | "despawnTestament"
        | "despawnSection"
        | "despawnSectionBook"
        | "despawnBook"
        | "despawnSectionShadow"
      >;
      getPieces: (data: ClosingBibleData) => Piece[];
    }

    it("successfuly closes the bible", async () => {
      const bibleData = makeBibleData();

      expect(bibleData.currentState).toBe(BibleStates.Open);
      await service.closeBible({ bibleData });
      expect(bibleData.currentState).toBe(BibleStates.Closed);
    });

    it("emits at start, then at end", async () => {
      const bibleData = makeBibleData();
      await service.closeBible({ bibleData });
      const calls = eventPort.emit.mock.calls;
      expect(calls[0]).toEqual(["OnBibleCloseSequenceStart", { bibleData }]);
      expect(calls[calls.length - 1]).toEqual([
        "OnBibleCloseSequenceEnd",
        { bibleData },
      ]);
    });

    it("only requests label for selected books", async () => {
      const sectionBook_1 = makePieceData({
        type: "StackSectionBook",
        selectionState: "Selected",
        id: "secbook-1-id",
      });
      const sectionBook_2 = makePieceData({
        type: "StackSectionBook",
        selectionState: "Selected",
        id: "secbook-2-id",
      });
      const sectionBook_3 = makePieceData({
        type: "StackSectionBook",
        selectionState: "Idle",
        id: "secbook-3-id",
      });
      const sectionBook_4 = makePieceData({
        type: "StackSectionBook",
        selectionState: "Idle",
        id: "secbook-4-id",
      });
      const section_1 = makePieceData({
        type: "StackSection",
        selectionState: "Idle",
        id: "sec-1-id",
      });
      const section_2 = makePieceData({
        type: "StackSection",
        selectionState: "Selected",
        id: "sec-2-id",
      });
      const book_1 = makePieceData({
        type: "StackBook",
        selectionState: "Idle",
        id: "book-1-id",
      });
      const book_2 = makePieceData({
        type: "StackBook",
        selectionState: "Selected",
        id: "book-2-id",
      });
      const book_3 = makePieceData({
        type: "StackBook",
        selectionState: "Idle",
        id: "book-3-id",
      });
      const book_4 = makePieceData({
        type: "StackBook",
        selectionState: "Selected",
        id: "book-4-id",
      });

      const bibleData = makeBibleData({
        activeHierarchy: {
          testamentsData: [],
          sectionsData: [
            sectionBook_1,
            sectionBook_2,
            sectionBook_3,
            sectionBook_4,
            section_1,
            section_2,
          ],
          booksData: [book_1, book_2, book_3, book_4],
        },
      });
      await service.closeBible({ bibleData });

      const requestedIds =
        labelDataRepositoryPort.getDataByOwnerId.mock.calls.flat();
      expect(requestedIds).toHaveLength(4);
      expect(requestedIds).toEqual(
        expect.arrayContaining([
          sectionBook_1.piece?.id,
          sectionBook_2.piece?.id,
          book_2.piece?.id,
          book_4.piece?.id,
        ])
      );
    });

    it("only hides chapters on books showing them", async () => {
      const sectionBook_1 = makePieceData({
        type: "StackSectionBook",
        id: "secbook-1-id",
        overrides: { isShowingChapters: true },
      });
      const sectionBook_2 = makePieceData({
        type: "StackSectionBook",
        id: "secbook-2-id",
        overrides: { isShowingChapters: false },
      });
      const book_1 = makePieceData({
        type: "StackBook",
        id: "book-1-id",
        overrides: { isShowingChapters: true },
      });
      const book_2 = makePieceData({
        type: "StackBook",
        id: "book-2-id",
        overrides: { isShowingChapters: false },
      });

      const bibleData = makeBibleData({
        activeHierarchy: {
          testamentsData: [],
          sectionsData: [sectionBook_1, sectionBook_2],
          booksData: [book_1, book_2],
        },
      });
      await service.closeBible({ bibleData });

      const hiddenChaptersBooks =
        bookChaptersManagementServicePort.hideChapters.mock.calls.flat();
      expect(hiddenChaptersBooks).toHaveLength(2);
      expect(hiddenChaptersBooks).toEqual(
        expect.arrayContaining([sectionBook_1, book_1])
      );
    });

    it("makes all testaments, sections and books non interactable", async () => {
      const { bibleData, scripturePieces } = makeClosingBibleData();

      await service.closeBible({ bibleData });

      const pieces = pieceAdapterPort.makeNonInteractable.mock.calls.flat();
      expect(pieces).toHaveLength(scripturePieces.length);
      expect(pieces).toEqual(expect.arrayContaining(scripturePieces));
    });

    it("tries to unhighlight all pieces before displaying the close sequence", async () => {
      const { bibleData, scripturePieces } = makeClosingBibleData();

      await service.closeBible({ bibleData });

      const unhighlights =
        pieceHighlightServicePort.tryUnhighlightPiece.mock.calls.flat();
      const unhighlightsCallOrders =
        pieceHighlightServicePort.tryUnhighlightPiece.mock.invocationCallOrder;
      const [sequenceCallOrder] =
        bibleSequenceAdapterPort.displayCloseBibleSequence.mock
          .invocationCallOrder;
      expect(unhighlights).toHaveLength(scripturePieces.length);
      expect(unhighlights).toEqual(
        expect.arrayContaining(
          scripturePieces.map((piece) => ({
            piece,
            source: UnhighlightRequestSources.Transition,
            pacing: HighlightPacings.Instant,
          }))
        )
      );
      expect(sequenceCallOrder).toBeDefined();
      expect(Math.max(...unhighlightsCallOrders)).toBeLessThan(
        sequenceCallOrder!
      );
    });

    it("hides all found labels for selected books before displaying the close sequence", async () => {
      const sectionBook_1 = makePieceData({
        selectionState: "Selected",
        type: "StackSectionBook",
        id: "secbook-1-id",
      });
      const sectionBook_2 = makePieceData({
        type: "StackSectionBook",
        id: "secbook-2-id",
      });
      const book_1 = makePieceData({
        selectionState: "Selected",
        type: "StackBook",
        id: "book-1-id",
      });
      const book_2 = makePieceData({ type: "StackBook", id: "book-2-id" });

      const testLabelData = {
        owner: book_1.piece,
      } as InfoLabelData;

      labelDataRepositoryPort.getDataByOwnerId.mockImplementation(
        (id: string) => {
          if (id === "book-1-id-piece-id") {
            return testLabelData;
          }
          return undefined;
        }
      );

      const bibleData = makeBibleData({
        activeHierarchy: {
          testamentsData: [],
          sectionsData: [sectionBook_1, sectionBook_2],
          booksData: [book_1, book_2],
        },
      });
      await service.closeBible({ bibleData });

      const hides = pieceLabelServicePort.hideLabel.mock.calls;
      const hidesCallOrder =
        pieceLabelServicePort.hideLabel.mock.invocationCallOrder;
      const [sequenceCallOrder] =
        bibleSequenceAdapterPort.displayCloseBibleSequence.mock
          .invocationCallOrder;
      expect(hides).toEqual([[book_1.piece, "Instant"]]);
      expect(sequenceCallOrder).toBeDefined();
      expect(Math.max(...hidesCallOrder)).toBeLessThan(sequenceCallOrder!);
    });

    it("hides all found labels for section shadows before displaying the close sequence", async () => {
      const section_1 = makePieceData({
        type: "StackSection",
        id: "sec-1",
        overrides: {
          shadow: {
            id: "sec-1-sh",
            type: "StackSectionShadow",
            sectionDataId: "sec-1",
          },
        },
      });
      const section_2 = makePieceData({
        type: "StackSection",
        id: "sec-2",
      });
      const section_3 = makePieceData({
        type: "StackSection",
        id: "sec-3",
        overrides: {
          shadow: {
            id: "sec-3-sh",
            type: "StackSectionShadow",
            sectionDataId: "sec-3",
          },
        },
      });

      const bibleData = makeBibleData({
        activeHierarchy: {
          testamentsData: [],
          sectionsData: [section_1, section_2, section_3],
          booksData: [],
        },
      });
      await service.closeBible({ bibleData });

      const hides = pieceLabelServicePort.hideLabel.mock.calls;
      const hidesCallOrder =
        pieceLabelServicePort.hideLabel.mock.invocationCallOrder;
      const [sequenceCallOrder] =
        bibleSequenceAdapterPort.displayCloseBibleSequence.mock
          .invocationCallOrder;
      expect(hides).toHaveLength(2);
      expect(hides).toEqual(
        expect.arrayContaining([
          [section_1.shadow, ShowSequencePacings.Instant],
          [section_3.shadow, ShowSequencePacings.Instant],
        ])
      );
      expect(sequenceCallOrder).toBeDefined();
      expect(Math.max(...hidesCallOrder)).toBeLessThan(sequenceCallOrder!);
    });

    it("displays the close sequence with the correct arguments, after the first emit, before the last emit", async () => {
      const pacing = StackPresenceNavigationPacings.Regular;
      const { bibleData, piecesToCollapse } = makeClosingBibleData();

      await service.closeBible({ bibleData, pacing });

      const [sequenceCallOrder] =
        bibleSequenceAdapterPort.displayCloseBibleSequence.mock
          .invocationCallOrder;
      const eventsCallOrder = eventPort.emit.mock.invocationCallOrder;

      expect(
        bibleSequenceAdapterPort.displayCloseBibleSequence
      ).toHaveBeenCalledExactlyOnceWith({
        lowerCover: bibleData.getStaticPiece("lowerCover"),
        upperCover: bibleData.getStaticPiece("upperCover"),
        verticalLine: bibleData.getStaticPiece("crossVerticalLine"),
        horizontalLine: bibleData.getStaticPiece("crossHorizontalLine"),
        pacing,
        piecesToCollapse,
      });
      expect(sequenceCallOrder!).toBeGreaterThan(eventsCallOrder[0]!);
      expect(sequenceCallOrder!).toBeLessThan(
        eventsCallOrder[eventsCallOrder.length - 1]!
      );
    });

    it.each<DespawnCase>([
      {
        despawn: "despawnTestament",
        getPieces: (data: ClosingBibleData) => [
          data.testament_1.piece!,
          data.testament_2.piece!,
        ],
      },
      {
        despawn: "despawnSection",
        getPieces: (data: ClosingBibleData) => [
          data.section_1.piece!,
          data.section_2.piece!,
        ],
      },
      {
        despawn: "despawnSectionBook",
        getPieces: (data: ClosingBibleData) => [
          data.sectionBook_1.piece!,
          data.sectionBook_2.piece!,
        ],
      },
      {
        despawn: "despawnBook",
        getPieces: (data: ClosingBibleData) => [
          data.book_1.piece!,
          data.book_2.piece!,
        ],
      },
      {
        despawn: "despawnSectionShadow",
        getPieces: (data: ClosingBibleData) => [data.sectionShadow_1],
      },
    ])(
      "calls $despawn for every piece of its type, after the sequence and before the last emit",
      async ({ despawn, getPieces }) => {
        const pacing = StackPresenceNavigationPacings.Regular;
        const closingData = makeClosingBibleData();
        const expectedPieces = getPieces(closingData);

        await service.closeBible({ bibleData: closingData.bibleData, pacing });

        const despawnMock = stackPieceLifecycleAdapterPort[
          despawn
        ] as unknown as Mock<(piece: Piece) => void>;
        const despawnedPieces = despawnMock.mock.calls.flat();
        const maxDespawnOrder = Math.max(
          ...despawnMock.mock.invocationCallOrder
        );
        const [sequenceCallOrder] =
          bibleSequenceAdapterPort.displayCloseBibleSequence.mock
            .invocationCallOrder;
        const eventEmitCallOrder = eventPort.emit.mock.invocationCallOrder;
        const lastEmitCallOrder =
          eventEmitCallOrder[eventEmitCallOrder.length - 1];

        expect(despawnedPieces).toHaveLength(expectedPieces.length);
        expect(despawnedPieces).toEqual(expect.arrayContaining(expectedPieces));
        expect(maxDespawnOrder).toBeGreaterThan(sequenceCallOrder!);
        expect(maxDespawnOrder).toBeLessThan(lastEmitCallOrder!);
      }
    );

    it("excludes sections split into books from the closing pieces", async () => {
      const splitSection = makePieceData({
        type: "StackSection",
        id: "sec-split",
        overrides: {
          isSplitIntoBooks: true,
        },
      });
      const regularSection = makePieceData({
        type: "StackSection",
        id: "sec-regular",
      });

      const bibleData = makeBibleData({
        activeHierarchy: {
          testamentsData: [],
          sectionsData: [splitSection, regularSection],
          booksData: [],
        },
      });
      await service.closeBible({ bibleData });

      const unhighlightedPieces =
        pieceHighlightServicePort.tryUnhighlightPiece.mock.calls
          .flat()
          .map((request) => request.piece);

      expect(pieceAdapterPort.makeNonInteractable.mock.calls.flat()).toEqual([
        regularSection.piece,
      ]);
      expect(unhighlightedPieces).toEqual([regularSection.piece]);
      expect(
        bibleSequenceAdapterPort.displayCloseBibleSequence
      ).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({
          piecesToCollapse: [regularSection.piece],
        })
      );
    });

    it("defaults the pacing to Regular", async () => {
      const bibleData = makeBibleData();

      await service.closeBible({ bibleData });

      expect(
        bibleSequenceAdapterPort.displayCloseBibleSequence
      ).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({
          pacing: StackPresenceNavigationPacings.Regular,
        })
      );
    });

    it.each([
      { missingPiece: "upperCover", reportedAs: "upperCover" },
      { missingPiece: "crossVerticalLine", reportedAs: "verticalLine" },
      { missingPiece: "crossHorizontalLine", reportedAs: "horizontalLine" },
      { missingPiece: "lowerCover", reportedAs: "lowerCover" },
    ] as { missingPiece: keyof StaticBiblePieces; reportedAs: string }[])(
      "throws when $reportedAs is not found",
      async ({ missingPiece, reportedAs }) => {
        const staticPieces = makeStaticBiblePieces();
        delete staticPieces[missingPiece];
        const bibleData = makeBibleData({ staticPieces });

        await expect(service.closeBible({ bibleData })).rejects.toThrow(
          `BibleSequenceService: ${reportedAs} not found at closeBible`
        );
        expect(
          bibleSequenceAdapterPort.displayCloseBibleSequence
        ).not.toHaveBeenCalled();
      }
    );

    it("throws when a released piece has an unrecognized type", async () => {
      const bibleData = makeBibleData();
      bibleData.resetHierarchy.mockReturnValue([
        { id: "unknown-piece", type: "StackUnknown" } as unknown as Piece,
      ]);

      await expect(service.closeBible({ bibleData })).rejects.toThrow(
        "BibleSequenceService: Unrecognized piece type StackUnknown at closeBible"
      );
    });
  });

  describe("openBible", () => {
    const makeSectionDataDouble = (
      type: "StackSection" | "StackSectionBook",
      id: string
    ) => {
      const sectionData = {
        id,
        type,
        piece: undefined as
          | Piece<"StackSection">
          | Piece<"StackSectionBook">
          | undefined,
        isActive: false,
        isHighlightable: false,
        setPiece: vi.fn(
          (piece: Piece<"StackSection"> | Piece<"StackSectionBook">) => {
            sectionData.piece = piece;
          }
        ),
        activate: vi.fn(() => {
          sectionData.isActive = true;
        }),
        becomeHighlightable: vi.fn(() => {
          sectionData.isHighlightable = true;
        }),
      };

      return sectionData;
    };

    type SectionDataDouble = ReturnType<typeof makeSectionDataDouble>;

    const makeTestamentDataDouble = (
      id: string,
      childrenData: SectionDataDouble[]
    ) => {
      const testamentData = {
        id,
        type: "StackTestament",
        childrenData,
        selectionState: SelectionStates.Idle as SelectionState,
        changeSelectionState: vi.fn((event: SelectionEvent) => {
          const nextState =
            simpleSelectionFSM[testamentData.selectionState][event];
          if (!nextState) return false;

          const changed = nextState !== testamentData.selectionState;
          testamentData.selectionState = nextState;

          return changed;
        }),
      };

      return testamentData;
    };

    const makeOpeningBibleData = () => {
      const section_1 = makeSectionDataDouble("StackSection", "sec-1");
      const section_2 = makeSectionDataDouble("StackSection", "sec-2");
      const sectionBook_1 = makeSectionDataDouble(
        "StackSectionBook",
        "secbook-1"
      );
      const pieceLessSection = makeSectionDataDouble(
        "StackSection",
        "sec-without-piece"
      );

      const testament_1 = makeTestamentDataDouble("tes-1", [
        section_1,
        section_2,
      ]);
      const testament_2 = makeTestamentDataDouble("tes-2", [
        sectionBook_1,
        pieceLessSection,
      ]);

      const sectionsData = [section_1, section_2, sectionBook_1];

      let spawnCount = 0;
      stackPieceLifecycleAdapterPort.spawnSectionDomain.mockImplementation(() =>
        makePiece("StackSection", `spawned-section-${++spawnCount}`)
      );
      stackPieceLifecycleAdapterPort.spawnSectionBookDomain.mockImplementation(
        () =>
          makePiece("StackSectionBook", `spawned-section-book-${++spawnCount}`)
      );

      const bibleData = makeBibleData({
        currentState: BibleStates.Closed,
        currentStackVizState: BibleVisualizationStates.Expanded,
        childrenData: [
          testament_1,
          testament_2,
        ] as unknown as StackTestamentData[],
      });
      bibleData.getAllSectionsData.mockReturnValue(
        sectionsData as unknown as ReturnType<
          StackBibleData["getAllSectionsData"]
        >
      );

      return {
        bibleData,
        testament_1,
        testament_2,
        section_1,
        section_2,
        sectionBook_1,
        pieceLessSection,
        sectionsData,
      };
    };

    it("successfully opens the bible", async () => {
      const { bibleData } = makeOpeningBibleData();

      expect(bibleData.currentState).toBe(BibleStates.Closed);
      await service.openBible({ bibleData });
      expect(bibleData.currentState).toBe(BibleStates.Open);
    });

    it("emits at start, then at end", async () => {
      const { bibleData } = makeOpeningBibleData();

      await service.openBible({ bibleData });

      const calls = eventPort.emit.mock.calls;
      expect(calls[0]).toEqual(["OnBibleOpenSequenceStart", { bibleData }]);
      expect(calls[calls.length - 1]).toEqual([
        "OnBibleOpenSequenceEnd",
        { bibleData },
      ]);
    });

    it.each([
      { piece: "upperCover", reportedAs: "upperCover" },
      { piece: "crossVerticalLine", reportedAs: "verticalLine" },
      { piece: "crossHorizontalLine", reportedAs: "horizontalLine" },
      { piece: "lowerCover", reportedAs: "lowerCover" },
    ] as { piece: keyof StaticBiblePieces; reportedAs: string }[])(
      "throws if the static piece $piece is not found",
      async ({ piece, reportedAs }) => {
        const staticPieces = makeStaticBiblePieces();
        delete staticPieces[piece];
        const { bibleData } = makeOpeningBibleData();
        bibleData.getStaticPiece.mockImplementation(
          ((key: keyof StaticBiblePieces) =>
            staticPieces[key]) as StackBibleData["getStaticPiece"]
        );

        await expect(service.openBible({ bibleData })).rejects.toThrow(
          `BibleSequenceService: ${reportedAs} not found at openBible`
        );
        expect(
          bibleSequenceAdapterPort.displayOpenBibleSequence
        ).not.toHaveBeenCalled();
      }
    );

    it("sets the viz state of bibleData to Regular", async () => {
      const { bibleData } = makeOpeningBibleData();

      expect(bibleData.currentStackVizState).toBe(
        BibleVisualizationStates.Expanded
      );
      await service.openBible({ bibleData });
      expect(bibleData.currentStackVizState).toBe(
        BibleVisualizationStates.Regular
      );
    });

    it("leaves every testamentData selected before displaying the sequence", async () => {
      const { bibleData, testament_1, testament_2 } = makeOpeningBibleData();

      await service.openBible({ bibleData });

      const lastSelectionOrder = Math.max(
        ...testament_1.changeSelectionState.mock.invocationCallOrder,
        ...testament_2.changeSelectionState.mock.invocationCallOrder
      );
      const [sequenceCallOrder] =
        bibleSequenceAdapterPort.displayOpenBibleSequence.mock
          .invocationCallOrder;

      expect(testament_1.selectionState).toBe(SelectionStates.Selected);
      expect(testament_2.selectionState).toBe(SelectionStates.Selected);
      expect(sequenceCallOrder).toBeDefined();
      expect(lastSelectionOrder).toBeLessThan(sequenceCallOrder!);
    });

    it("throws if a testamentData is not getting selected", async () => {
      const { bibleData, testament_2 } = makeOpeningBibleData();
      testament_2.selectionState = SelectionStates.Selected;

      await expect(service.openBible({ bibleData })).rejects.toThrow(
        "BibleSequenceService: testamentData should be selecting now."
      );
      expect(
        bibleSequenceAdapterPort.displayOpenBibleSequence
      ).not.toHaveBeenCalled();
    });

    it("attaches a new piece and activates every section data before displaying the sequence", async () => {
      const { bibleData, section_1, section_2, sectionBook_1, sectionsData } =
        makeOpeningBibleData();

      await service.openBible({ bibleData });

      const spawnedSections =
        stackPieceLifecycleAdapterPort.spawnSectionDomain.mock.results.map(
          (result) => result.value
        );
      const spawnedSectionBooks =
        stackPieceLifecycleAdapterPort.spawnSectionBookDomain.mock.results.map(
          (result) => result.value
        );
      const lastActivationOrder = Math.max(
        ...sectionsData.flatMap((sectionData) => [
          ...sectionData.setPiece.mock.invocationCallOrder,
          ...sectionData.activate.mock.invocationCallOrder,
        ])
      );
      const [sequenceCallOrder] =
        bibleSequenceAdapterPort.displayOpenBibleSequence.mock
          .invocationCallOrder;

      expect(spawnedSections).toHaveLength(2);
      expect(spawnedSectionBooks).toHaveLength(1);
      expect(section_1.piece).toBe(spawnedSections[0]);
      expect(section_2.piece).toBe(spawnedSections[1]);
      expect(sectionBook_1.piece).toBe(spawnedSectionBooks[0]);
      expect(sectionsData.map((sectionData) => sectionData.isActive)).toEqual([
        true,
        true,
        true,
      ]);
      expect(sequenceCallOrder).toBeDefined();
      expect(lastActivationOrder).toBeLessThan(sequenceCallOrder!);
    });

    it("successfully displays the sequence with the correct arguments, after the initial emit, before the final emit", async () => {
      const pacing = StackPresenceNavigationPacings.Double;
      const { bibleData } = makeOpeningBibleData();

      await service.openBible({ bibleData, pacing });

      const [sequenceCallOrder] =
        bibleSequenceAdapterPort.displayOpenBibleSequence.mock
          .invocationCallOrder;
      const eventsCallOrder = eventPort.emit.mock.invocationCallOrder;

      expect(
        bibleSequenceAdapterPort.displayOpenBibleSequence
      ).toHaveBeenCalledExactlyOnceWith({
        lowerCover: bibleData.getStaticPiece("lowerCover"),
        upperCover: bibleData.getStaticPiece("upperCover"),
        verticalLine: bibleData.getStaticPiece("crossVerticalLine"),
        horizontalLine: bibleData.getStaticPiece("crossHorizontalLine"),
        pacing,
        bibleData,
        arePiecesDraggable: false,
      });
      expect(sequenceCallOrder!).toBeGreaterThan(eventsCallOrder[0]!);
      expect(sequenceCallOrder!).toBeLessThan(
        eventsCallOrder[eventsCallOrder.length - 1]!
      );
    });

    it("makes every section data highlightable after displaying the sequence, before the final emit", async () => {
      const { bibleData, sectionsData } = makeOpeningBibleData();

      await service.openBible({ bibleData });

      const highlightableOrders = sectionsData.flatMap(
        (sectionData) =>
          sectionData.becomeHighlightable.mock.invocationCallOrder
      );
      const [sequenceCallOrder] =
        bibleSequenceAdapterPort.displayOpenBibleSequence.mock
          .invocationCallOrder;
      const eventsCallOrder = eventPort.emit.mock.invocationCallOrder;
      const lastEmitCallOrder = eventsCallOrder[eventsCallOrder.length - 1];

      expect(
        sectionsData.map((sectionData) => sectionData.isHighlightable)
      ).toEqual([true, true, true]);
      expect(sequenceCallOrder).toBeDefined();
      expect(Math.min(...highlightableOrders)).toBeGreaterThan(
        sequenceCallOrder!
      );
      expect(Math.max(...highlightableOrders)).toBeLessThan(lastEmitCallOrder!);
    });

    it("updates the render order for every active piece, after the sequence", async () => {
      const { bibleData } = makeOpeningBibleData();
      const usedBookData = {
        piece: makePiece("StackBook", "used-book-piece"),
        isPieceAvailable: () => true,
      };
      const unusedBookData = {
        piece: makePiece("StackBook", "unused-book-piece"),
        isPieceAvailable: () => true,
      };
      const unavailableChapterData = {
        piece: makePiece("StackChapter", "unavailable-chapter-piece"),
        isPieceAvailable: () => false,
      };
      pieceDataRepositoryPort.getAllBooks.mockReturnValue([
        usedBookData,
        unusedBookData,
      ] as unknown as ReturnType<PieceDataRepositoryPort["getAllBooks"]>);
      pieceDataRepositoryPort.getAllChapters.mockReturnValue([
        unavailableChapterData,
      ] as unknown as ReturnType<PieceDataRepositoryPort["getAllChapters"]>);
      pieceAdapterPort.isPieceBeingUsed.mockImplementation(
        (piece) => piece !== unusedBookData.piece
      );

      await service.openBible({ bibleData });

      const [renderOrderCallOrder] =
        renderOrderAdapterPort.setSortedRenderOrder.mock.invocationCallOrder;
      const [sequenceCallOrder] =
        bibleSequenceAdapterPort.displayOpenBibleSequence.mock
          .invocationCallOrder;

      expect(
        renderOrderAdapterPort.setSortedRenderOrder
      ).toHaveBeenCalledExactlyOnceWith([usedBookData.piece]);
      expect(sequenceCallOrder).toBeDefined();
      expect(renderOrderCallOrder!).toBeGreaterThan(sequenceCallOrder!);
    });

    it("tries to highlight every section that has a piece attached to it, after the sequence", async () => {
      const { bibleData, section_1, section_2, sectionBook_1 } =
        makeOpeningBibleData();

      await service.openBible({ bibleData });

      const highlightRequest = (
        piece: Piece<"StackSection"> | Piece<"StackSectionBook"> | undefined
      ) => [
        {
          piece,
          source: "Transition",
          scheduledUnhighlightData: {
            delay: 2000,
            pacing: "Regular",
          },
        },
      ];
      const highlightOrders =
        pieceHighlightServicePort.tryHighlightPiece.mock.invocationCallOrder;
      const [sequenceCallOrder] =
        bibleSequenceAdapterPort.displayOpenBibleSequence.mock
          .invocationCallOrder;

      expect(pieceHighlightServicePort.tryHighlightPiece.mock.calls).toEqual([
        highlightRequest(sectionBook_1.piece),
        highlightRequest(section_2.piece),
        highlightRequest(section_1.piece),
      ]);
      expect(sequenceCallOrder).toBeDefined();
      expect(Math.min(...highlightOrders)).toBeGreaterThan(sequenceCallOrder!);
    });

    it("makes every section within the bible interactable, after the sequence", async () => {
      const { bibleData, sectionsData } = makeOpeningBibleData();

      await service.openBible({ bibleData });

      const interactablePieces =
        pieceAdapterPort.makeInteractable.mock.calls.flat();
      const interactableOrders =
        pieceAdapterPort.makeInteractable.mock.invocationCallOrder;
      const [sequenceCallOrder] =
        bibleSequenceAdapterPort.displayOpenBibleSequence.mock
          .invocationCallOrder;

      expect(interactablePieces).toHaveLength(sectionsData.length);
      expect(interactablePieces).toEqual(
        expect.arrayContaining(
          sectionsData.map((sectionData) => sectionData.piece)
        )
      );
      expect(sequenceCallOrder).toBeDefined();
      expect(Math.min(...interactableOrders)).toBeGreaterThan(
        sequenceCallOrder!
      );
    });

    it("throws if not piece found for section", async () => {
      const { bibleData } = makeOpeningBibleData();
      stackPieceLifecycleAdapterPort.spawnSectionDomain.mockReturnValueOnce(
        undefined as unknown as Piece<"StackSection">
      );

      await expect(service.openBible({ bibleData })).rejects.toThrow(
        "BibleSequenceService: sectionData.piece not defined at openBible"
      );
    });
  });

  describe("crackOpenBible", () => {
    const testamentHighlightConfig = {
      initialDelay: 700,
      staggerDelay: 150,
      unhighlightDelay: 2500,
    };

    const makeCrackOpeningBibleData = ({
      bibleType = BibleTypes.Default,
      initialHighlightable = false,
    }: {
      bibleType?: BibleType;
      initialHighlightable?: boolean;
    } = {}) => {
      const makeTestamentDataDouble = (id: string) => {
        const testamentData = {
          id,
          type: "StackTestament",
          piece: makePiece("StackTestament", `${id}-piece`) as
            | Piece<"StackTestament">
            | undefined,
          isInsideBible: false,
          isHighlightable: initialHighlightable,
          attachToBible: vi.fn(() => {
            testamentData.isInsideBible = true;
          }),
          becomeHighlightable: vi.fn(() => {
            testamentData.isHighlightable = true;
          }),
          becomeNonHighlightable: vi.fn(() => {
            testamentData.isHighlightable = false;
          }),
        };

        return testamentData;
      };

      const testament_1 = makeTestamentDataDouble("tes-1");
      const testament_2 = makeTestamentDataDouble("tes-2");
      const testamentsData = [testament_1, testament_2];

      configProviderPort.getTestamentHighlightSequenceConfig.mockImplementation(
        (key) => testamentHighlightConfig[key]
      );

      const bibleData = makeBibleData({
        currentState: BibleStates.Closed,
        bibleType,
        childrenData: testamentsData as unknown as StackTestamentData[],
      });

      return { bibleData, testament_1, testament_2, testamentsData };
    };

    it("sucessfully opens the bible", async () => {
      const { bibleData } = makeCrackOpeningBibleData();

      expect(bibleData.currentState).toBe(BibleStates.Closed);
      await service.crackOpenBible(bibleData);
      expect(bibleData.currentState).toBe(BibleStates.Open);
    });

    it("emits at start, then at end", async () => {
      const { bibleData } = makeCrackOpeningBibleData();

      await service.crackOpenBible(bibleData);

      const calls = eventPort.emit.mock.calls;
      expect(calls[0]).toEqual(["OnBibleCrackOpenSequenceStart"]);
      expect(calls[calls.length - 1]).toEqual(["OnBibleCrackOpenSequenceEnd"]);
    });

    it("makes all testaments within the bible attached to a bible before displaying the sequence", async () => {
      const { bibleData, testamentsData } = makeCrackOpeningBibleData();

      await service.crackOpenBible(bibleData);

      const lastAttachOrder = Math.max(
        ...testamentsData.flatMap(
          (testamentData) =>
            testamentData.attachToBible.mock.invocationCallOrder
        )
      );
      const [sequenceCallOrder] =
        bibleSequenceAdapterPort.displayCrackOpenBibleSequence.mock
          .invocationCallOrder;

      expect(
        testamentsData.map((testamentData) => testamentData.isInsideBible)
      ).toEqual([true, true]);
      expect(sequenceCallOrder).toBeDefined();
      expect(lastAttachOrder).toBeLessThan(sequenceCallOrder!);
    });

    it("Successfully displays the crack open sequence with the correct arguments, after the initial emit, before the final emit", async () => {
      const { bibleData } = makeCrackOpeningBibleData();

      await service.crackOpenBible(bibleData);

      const [sequenceCallOrder] =
        bibleSequenceAdapterPort.displayCrackOpenBibleSequence.mock
          .invocationCallOrder;
      const eventsCallOrder = eventPort.emit.mock.invocationCallOrder;

      expect(
        bibleSequenceAdapterPort.displayCrackOpenBibleSequence
      ).toHaveBeenCalledExactlyOnceWith(bibleData, false);
      expect(sequenceCallOrder!).toBeGreaterThan(eventsCallOrder[0]!);
      expect(sequenceCallOrder!).toBeLessThan(
        eventsCallOrder[eventsCallOrder.length - 1]!
      );
    });

    it("make testaments highlightable if the type of the bible is Default after the sequence", async () => {
      const { bibleData, testamentsData } = makeCrackOpeningBibleData({
        bibleType: BibleTypes.Default,
        initialHighlightable: false,
      });

      await service.crackOpenBible(bibleData);

      const firstHighlightableOrder = Math.min(
        ...testamentsData.flatMap(
          (testamentData) =>
            testamentData.becomeHighlightable.mock.invocationCallOrder
        )
      );
      const [sequenceCallOrder] =
        bibleSequenceAdapterPort.displayCrackOpenBibleSequence.mock
          .invocationCallOrder;

      expect(
        testamentsData.map((testamentData) => testamentData.isHighlightable)
      ).toEqual([true, true]);
      expect(sequenceCallOrder).toBeDefined();
      expect(firstHighlightableOrder).toBeGreaterThan(sequenceCallOrder!);
    });

    it("make testaments non-highlightable if the type of the bible is PlatformerGame after the sequence", async () => {
      const { bibleData, testamentsData } = makeCrackOpeningBibleData({
        bibleType: BibleTypes.PlatformerGame,
        initialHighlightable: true,
      });

      await service.crackOpenBible(bibleData);

      const firstNonHighlightableOrder = Math.min(
        ...testamentsData.flatMap(
          (testamentData) =>
            testamentData.becomeNonHighlightable.mock.invocationCallOrder
        )
      );
      const [sequenceCallOrder] =
        bibleSequenceAdapterPort.displayCrackOpenBibleSequence.mock
          .invocationCallOrder;

      expect(
        testamentsData.map((testamentData) => testamentData.isHighlightable)
      ).toEqual([false, false]);
      expect(sequenceCallOrder).toBeDefined();
      expect(firstNonHighlightableOrder).toBeGreaterThan(sequenceCallOrder!);
      expect(awaiterPort.sleep).not.toHaveBeenCalled();
      expect(
        pieceHighlightServicePort.tryHighlightPiece
      ).not.toHaveBeenCalled();
    });

    it("awaits the provided amount of time after the last emit if the bible type is Default", async () => {
      const { bibleData } = makeCrackOpeningBibleData();

      await service.crackOpenBible(bibleData);

      const [initialDelayOrder] = awaiterPort.sleep.mock.invocationCallOrder;
      const eventsCallOrder = eventPort.emit.mock.invocationCallOrder;
      const lastEmitCallOrder = eventsCallOrder[eventsCallOrder.length - 1];

      expect(awaiterPort.sleep.mock.calls[0]).toEqual([
        testamentHighlightConfig.initialDelay,
      ]);
      expect(initialDelayOrder).toBeDefined();
      expect(initialDelayOrder!).toBeGreaterThan(lastEmitCallOrder!);
    });

    it("tries to highlight every piece-containing testament withing the bible, with a stagger dealy in between, after the initial delay", async () => {
      const { bibleData, testament_1, testament_2 } =
        makeCrackOpeningBibleData();

      await service.crackOpenBible(bibleData);

      const highlightRequest = (piece: Piece<"StackTestament"> | undefined) => [
        {
          piece,
          source: "Transition",
          scheduledUnhighlightData: {
            delay: testamentHighlightConfig.unhighlightDelay,
          },
        },
      ];
      const timeline = [
        ...awaiterPort.sleep.mock.invocationCallOrder.map((order, index) => ({
          order,
          step: `sleep:${awaiterPort.sleep.mock.calls[index]![0]}`,
        })),
        ...pieceHighlightServicePort.tryHighlightPiece.mock.invocationCallOrder.map(
          (order, index) => ({
            order,
            step: `highlight:${pieceHighlightServicePort.tryHighlightPiece.mock.calls[index]![0].piece.id}`,
          })
        ),
      ]
        .sort((first, second) => first.order - second.order)
        .map((entry) => entry.step);

      expect(pieceHighlightServicePort.tryHighlightPiece.mock.calls).toEqual([
        highlightRequest(testament_1.piece),
        highlightRequest(testament_2.piece),
      ]);
      expect(timeline).toEqual([
        `sleep:${testamentHighlightConfig.initialDelay}`,
        "highlight:tes-1-piece",
        `sleep:${testamentHighlightConfig.staggerDelay}`,
        "highlight:tes-2-piece",
        `sleep:${testamentHighlightConfig.staggerDelay}`,
      ]);
    });

    it("throws if a testament has no piece attached", async () => {
      const { bibleData, testament_1, testament_2 } =
        makeCrackOpeningBibleData();
      testament_2.piece = undefined;

      await expect(service.crackOpenBible(bibleData)).rejects.toThrow(
        "testamentData.piece not found at crackOpenBible"
      );
      expect(
        pieceHighlightServicePort.tryHighlightPiece
      ).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({
          piece: testament_1.piece,
        })
      );
    });
  });
});
