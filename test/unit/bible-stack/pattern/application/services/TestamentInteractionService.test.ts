import { describe, it, expect, beforeEach, type Mocked } from "vitest";
import { TestamentInteractionService } from "../../../../../../patterns/bible-stack/bible-stack/application/services/TestamentInteractionService";
import type { PaintPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/Paint";
import type { PieceHierarchyServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/PieceHierarchy";
import type { PieceHighlighterPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/PieceHighlight";
import type { SequenceStateServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/SequenceState";
import type { TestamentSelectionPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/TestamentSelection";
import type { TourGuideServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/TourGuide";
import type { LoggerPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/out/Logger";
import type { ParentDataChain } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/pieces";
import type { TestamentDataRepositoryPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/testaments";
import { StackBibleData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackBibleData";
import { StackTestamentData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackTestamentData";
import type { TestamentInfo } from "../../../../../../patterns/bible-stack/bible-stack/domain/models/arrangement";
import {
  BibleStates,
  BibleTypes,
  BibleVisualizationStates,
  CrossPositions,
  PieceSelectionSources,
  SelectionModalities,
  type BibleState,
  type Piece,
} from "../../../../../../patterns/bible-stack/bible-stack/domain/models/canvas";
import {
  HighlightEvents,
  HighlightStates,
  type HighlightState,
} from "../../../../../../patterns/bible-stack/bible-stack/domain/models/highlight";
import { HighlightRequestSources } from "../../../../../../patterns/bible-stack/bible-stack/domain/models/pieces";

const BIBLE_ID = "bible-id";
const TESTAMENT_ID = "testament-id";

const testamentPiece: Piece<"StackTestament"> = {
  id: "testament-piece",
  type: "StackTestament",
};

const testamentInfo: TestamentInfo = {
  name: "testament",
  sections: [],
};

const applyHighlightState = (
  data: StackTestamentData,
  state: HighlightState
) => {
  if (state === HighlightStates.Idle) return;

  data.changeHighlightState(HighlightEvents.RequestHighlight);

  if (state === HighlightStates.Highlighting) return;

  data.changeHighlightState(HighlightEvents.SequenceComplete);

  if (state === HighlightStates.Unhighlighting) {
    data.changeHighlightState(HighlightEvents.RequestUnhighlight);
  }
};

const makeTestamentData = ({
  highlightState = HighlightStates.Idle,
  isFocused = false,
}: {
  highlightState?: HighlightState;
  isFocused?: boolean;
} = {}): StackTestamentData => {
  const testamentData = new StackTestamentData({
    id: TESTAMENT_ID,
    piece: testamentPiece,
    pieceInfo: testamentInfo,
    parentDataIds: { stackBibleId: BIBLE_ID },
    creationParams: { arrangementIndex: 0, testamentIndex: 0 },
  });

  applyHighlightState(testamentData, highlightState);
  if (isFocused) {
    testamentData.beginFocus();
  }

  return testamentData;
};

const makeBibleData = ({
  currentState = BibleStates.Open,
}: {
  currentState?: BibleState;
} = {}): StackBibleData => {
  const bibleData = new StackBibleData({
    id: BIBLE_ID,
    childrenData: [],
    currentCrossPosition: CrossPositions.Top,
    currentStackVizState: BibleVisualizationStates.Regular,
    arrangementIndex: 0,
    bibleType: BibleTypes.Default,
  });
  bibleData.changeState(currentState);
  return bibleData;
};

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

describe("pattern.bible-stack.application.services.TestamentInteractionService", () => {
  let service: TestamentInteractionService;
  let sequenceStateServicePort: Mocked<SequenceStateServicePort>;
  let testamentDataRepositoryPort: Mocked<TestamentDataRepositoryPort>;
  let pieceHierarchyServicePort: Mocked<PieceHierarchyServicePort>;
  let tourGuideServicePort: Mocked<TourGuideServicePort>;
  let testamentSelectionServicePort: Mocked<TestamentSelectionPort>;
  let pieceHighlightServicePort: Mocked<PieceHighlighterPort>;
  let paintPort: Mocked<PaintPort>;
  let loggerPort: Mocked<LoggerPort>;

  beforeEach(() => {
    sequenceStateServicePort = {
      isThereAnOngoingSequence: vi.fn(() => false),
      executeAsSequence: vi.fn(async (task: () => Promise<void>) => {
        await task();
      }),
    };

    testamentDataRepositoryPort = {
      getPieceData: vi.fn(),
    } as unknown as Mocked<TestamentDataRepositoryPort>;

    pieceHierarchyServicePort = {
      getParentDataChain: vi.fn(() => makeParentDataChain()),
    };

    tourGuideServicePort = {
      ongoingTourGuideSectionData:
        undefined as unknown as TourGuideServicePort["ongoingTourGuideSectionData"],
      isThereAnOngoingTourGuide: vi.fn(() => false),
      beginTourGuide: vi.fn(),
      stopTourGuide: vi.fn(),
    };

    testamentSelectionServicePort = {
      select: vi.fn(async () => {}),
      deselect: vi.fn(async () => {}),
    };

    pieceHighlightServicePort = {
      tryHighlightPiece: vi.fn(),
      tryUnhighlightPiece: vi.fn(),
      isUnhighlightScheduled: vi.fn(() => false),
      changeHighlightIntensity: vi.fn(),
      clearScheduledUnhighlights: vi.fn(),
      clearHighlightedPieces: vi.fn(),
      forgetPiece: vi.fn(),
      unhighlightBiblePieces: vi.fn(),
    };

    paintPort = {
      changeColor: vi.fn(),
      paint: vi.fn(),
      unpaint: vi.fn(),
      activate: vi.fn(),
      deactivate: vi.fn(),
      isActive: false,
    } as unknown as Mocked<PaintPort>;

    loggerPort = {
      error: vi.fn(),
      warn: vi.fn(),
      log: vi.fn(),
    };

    service = new TestamentInteractionService({
      sequenceStateServicePort,
      testamentDataRepositoryPort,
      pieceHierarchyServicePort,
      tourGuideServicePort,
      testamentSelectionServicePort,
      pieceHighlightServicePort,
      paintPort,
      loggerPort,
    });
  });

  describe("handleTestamentSelection", () => {
    it("logs an error and no-ops if no data found", () => {
      testamentDataRepositoryPort.getPieceData.mockReturnValue(undefined);

      service.handleTestamentSelection({
        testament: testamentPiece,
        interaction: SelectionModalities.Precise,
      });

      expect(loggerPort.error).toHaveBeenCalledWith(
        "TestamentInteractionService: testamentData not found at handleTestamentSelection"
      );
      expect(
        sequenceStateServicePort.isThereAnOngoingSequence
      ).not.toHaveBeenCalled();
      expect(
        pieceHierarchyServicePort.getParentDataChain
      ).not.toHaveBeenCalled();
      expect(paintPort.paint).not.toHaveBeenCalled();
      expect(sequenceStateServicePort.executeAsSequence).not.toHaveBeenCalled();
      expect(
        pieceHighlightServicePort.tryHighlightPiece
      ).not.toHaveBeenCalled();
    });

    it("no-ops if there's an ongoing sequence", () => {
      const testamentData = makeTestamentData();
      testamentDataRepositoryPort.getPieceData.mockReturnValue(testamentData);
      sequenceStateServicePort.isThereAnOngoingSequence.mockReturnValue(true);
      paintPort.isActive = true;

      service.handleTestamentSelection({
        testament: testamentPiece,
        interaction: SelectionModalities.Coarse,
      });

      expect(
        pieceHierarchyServicePort.getParentDataChain
      ).not.toHaveBeenCalled();
      expect(paintPort.paint).not.toHaveBeenCalled();
      expect(sequenceStateServicePort.executeAsSequence).not.toHaveBeenCalled();
      expect(
        pieceHighlightServicePort.tryHighlightPiece
      ).not.toHaveBeenCalled();
    });

    it("no-ops if testament is within a closed bible", () => {
      const testamentData = makeTestamentData();
      testamentDataRepositoryPort.getPieceData.mockReturnValue(testamentData);
      pieceHierarchyServicePort.getParentDataChain.mockReturnValue(
        makeParentDataChain({
          bibleData: makeBibleData({ currentState: BibleStates.Closed }),
        })
      );
      paintPort.isActive = true;

      service.handleTestamentSelection({
        testament: testamentPiece,
        interaction: SelectionModalities.Coarse,
      });

      expect(paintPort.paint).not.toHaveBeenCalled();
      expect(sequenceStateServicePort.executeAsSequence).not.toHaveBeenCalled();
      expect(
        pieceHighlightServicePort.tryHighlightPiece
      ).not.toHaveBeenCalled();
      expect(loggerPort.error).not.toHaveBeenCalled();
    });

    it("no-ops if there's an ongoing tour guide", () => {
      const testamentData = makeTestamentData();
      testamentDataRepositoryPort.getPieceData.mockReturnValue(testamentData);
      pieceHierarchyServicePort.getParentDataChain.mockReturnValue(
        makeParentDataChain({ bibleData: makeBibleData() })
      );
      tourGuideServicePort.isThereAnOngoingTourGuide.mockReturnValue(true);
      paintPort.isActive = true;

      service.handleTestamentSelection({
        testament: testamentPiece,
        interaction: SelectionModalities.Coarse,
      });

      expect(paintPort.paint).not.toHaveBeenCalled();
      expect(sequenceStateServicePort.executeAsSequence).not.toHaveBeenCalled();
      expect(
        pieceHighlightServicePort.tryHighlightPiece
      ).not.toHaveBeenCalled();
      expect(loggerPort.error).not.toHaveBeenCalled();
    });

    it("paints the testament if the paint feature is active", () => {
      const testamentData = makeTestamentData({
        highlightState: HighlightStates.Highlighted,
      });
      testamentDataRepositoryPort.getPieceData.mockReturnValue(testamentData);
      paintPort.isActive = true;

      service.handleTestamentSelection({
        testament: testamentPiece,
        interaction: SelectionModalities.Precise,
      });

      expect(paintPort.paint).toHaveBeenCalledWith(testamentData);
      expect(sequenceStateServicePort.executeAsSequence).not.toHaveBeenCalled();
      expect(testamentSelectionServicePort.select).not.toHaveBeenCalled();
      expect(
        pieceHighlightServicePort.tryHighlightPiece
      ).not.toHaveBeenCalled();
    });

    it("executes a selection as a sequence if the testament is highlighted, the selection modality is precise and paint feature is not active", () => {
      const testamentData = makeTestamentData({
        highlightState: HighlightStates.Highlighted,
      });
      testamentDataRepositoryPort.getPieceData.mockReturnValue(testamentData);

      service.handleTestamentSelection({
        testament: testamentPiece,
        interaction: SelectionModalities.Precise,
      });

      expect(sequenceStateServicePort.executeAsSequence).toHaveBeenCalledOnce();
      expect(testamentSelectionServicePort.select).toHaveBeenCalledWith({
        data: testamentData,
        source: PieceSelectionSources.UserSelection,
      });
      expect(paintPort.paint).not.toHaveBeenCalled();
      expect(
        pieceHighlightServicePort.tryHighlightPiece
      ).not.toHaveBeenCalled();
    });

    it("tries to highlight the testament if it is not highlighted, the selection modality is precise and paint feature is not active", () => {
      for (const highlightState of [
        HighlightStates.Idle,
        HighlightStates.Highlighting,
        HighlightStates.Unhighlighting,
      ]) {
        vi.clearAllMocks();

        const testamentData = makeTestamentData({ highlightState });
        testamentDataRepositoryPort.getPieceData.mockReturnValue(testamentData);

        service.handleTestamentSelection({
          testament: testamentPiece,
          interaction: SelectionModalities.Precise,
        });

        expect(
          pieceHighlightServicePort.tryHighlightPiece
        ).toHaveBeenCalledWith({
          piece: testamentPiece,
          source: HighlightRequestSources.UserSelection,
        });
        expect(
          sequenceStateServicePort.executeAsSequence
        ).not.toHaveBeenCalled();
        expect(testamentSelectionServicePort.select).not.toHaveBeenCalled();
        expect(paintPort.paint).not.toHaveBeenCalled();
      }
    });

    it("executes a selection as a sequence if the selection modality is coarse and paint feature is not active, regardless of its highlight state", () => {
      const testamentData = makeTestamentData({
        highlightState: HighlightStates.Idle,
      });
      testamentDataRepositoryPort.getPieceData.mockReturnValue(testamentData);

      service.handleTestamentSelection({
        testament: testamentPiece,
        interaction: SelectionModalities.Coarse,
      });

      expect(sequenceStateServicePort.executeAsSequence).toHaveBeenCalledOnce();
      expect(testamentSelectionServicePort.select).toHaveBeenCalledWith({
        data: testamentData,
        source: PieceSelectionSources.UserSelection,
      });
      expect(paintPort.paint).not.toHaveBeenCalled();
      expect(
        pieceHighlightServicePort.tryHighlightPiece
      ).not.toHaveBeenCalled();
    });
  });

  describe("handleTestamentFocusBegin", () => {
    it("logs an error and no-ops if no data found", () => {
      testamentDataRepositoryPort.getPieceData.mockReturnValue(undefined);

      service.handleTestamentFocusBegin(testamentPiece);

      expect(loggerPort.error).toHaveBeenCalledWith(
        "TestamentInteractionService: testamentData not found at handleTestamentFocusBegin"
      );
      expect(
        sequenceStateServicePort.isThereAnOngoingSequence
      ).not.toHaveBeenCalled();
      expect(
        pieceHierarchyServicePort.getParentDataChain
      ).not.toHaveBeenCalled();
      expect(
        pieceHighlightServicePort.tryHighlightPiece
      ).not.toHaveBeenCalled();
    });

    it("focuses the testament if data found", () => {
      const testamentData = makeTestamentData();
      testamentDataRepositoryPort.getPieceData.mockReturnValue(testamentData);

      expect(testamentData.isFocused).toBe(false);

      service.handleTestamentFocusBegin(testamentPiece);

      expect(testamentData.isFocused).toBe(true);
    });

    it("no-ops if there's an ongoing sequence, after focusing the testament", () => {
      const testamentData = makeTestamentData();
      testamentDataRepositoryPort.getPieceData.mockReturnValue(testamentData);
      sequenceStateServicePort.isThereAnOngoingSequence.mockReturnValue(true);

      service.handleTestamentFocusBegin(testamentPiece);

      expect(testamentData.isFocused).toBe(true);
      expect(
        pieceHierarchyServicePort.getParentDataChain
      ).not.toHaveBeenCalled();
      expect(
        pieceHighlightServicePort.tryHighlightPiece
      ).not.toHaveBeenCalled();
    });

    it("no-ops if testament is within a closed bible, or if there's an ongoing tour guide, after focusing the testament", () => {
      const cases = [
        {
          chain: makeParentDataChain({
            bibleData: makeBibleData({ currentState: BibleStates.Closed }),
          }),
          isThereAnOngoingTourGuide: false,
        },
        {
          chain: makeParentDataChain({ bibleData: makeBibleData() }),
          isThereAnOngoingTourGuide: true,
        },
      ] as const;

      for (const testCase of cases) {
        vi.clearAllMocks();

        const testamentData = makeTestamentData();
        testamentDataRepositoryPort.getPieceData.mockReturnValue(testamentData);
        pieceHierarchyServicePort.getParentDataChain.mockReturnValue(
          testCase.chain
        );
        tourGuideServicePort.isThereAnOngoingTourGuide.mockReturnValue(
          testCase.isThereAnOngoingTourGuide
        );

        service.handleTestamentFocusBegin(testamentPiece);

        expect(testamentData.isFocused).toBe(true);
        expect(
          pieceHighlightServicePort.tryHighlightPiece
        ).not.toHaveBeenCalled();
        expect(loggerPort.error).not.toHaveBeenCalled();
      }
    });

    it("tries to highlight the testament with UserFocus as source", () => {
      const testamentData = makeTestamentData();
      testamentDataRepositoryPort.getPieceData.mockReturnValue(testamentData);
      pieceHierarchyServicePort.getParentDataChain.mockReturnValue(
        makeParentDataChain({ bibleData: makeBibleData() })
      );

      service.handleTestamentFocusBegin(testamentPiece);

      expect(pieceHighlightServicePort.tryHighlightPiece).toHaveBeenCalledWith({
        piece: testamentPiece,
        source: HighlightRequestSources.UserFocus,
      });
      expect(loggerPort.error).not.toHaveBeenCalled();
    });
  });

  describe("handleTestamentFocusEnd", () => {
    it("logs an error if no data found", () => {
      testamentDataRepositoryPort.getPieceData.mockReturnValue(undefined);

      service.handleTestamentFocusEnd(testamentPiece);

      expect(loggerPort.error).toHaveBeenCalledWith(
        "TestamentInteractionService: testamentData not found at handleTestamentFocusEnd"
      );
    });

    it("unfocuses the testament if data found, even if there's an ongoing sequence", () => {
      const testamentData = makeTestamentData({ isFocused: true });
      testamentDataRepositoryPort.getPieceData.mockReturnValue(testamentData);
      sequenceStateServicePort.isThereAnOngoingSequence.mockReturnValue(true);

      expect(testamentData.isFocused).toBe(true);

      service.handleTestamentFocusEnd(testamentPiece);

      expect(testamentData.isFocused).toBe(false);
      expect(
        pieceHighlightServicePort.tryUnhighlightPiece
      ).not.toHaveBeenCalled();
      expect(loggerPort.error).not.toHaveBeenCalled();
    });
  });
});
