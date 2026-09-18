import { describe, it, expect, beforeEach, type Mocked } from "vitest";
import { BibleModeService } from "../../../../../../patterns/bible-stack/bible-stack/application/services/BibleModeService";
import type { BibleStackUpdaterPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/BibleStackUpdater";
import type { DomainEventManager } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/EventManager";
import type { ExplodedViewServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/ExplodedView";
import type { SectionSelectionServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/SectionSelection";
import type { SequenceStateServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/SequenceState";
import type { TestamentSelectionPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/TestamentSelection";
import type {
  BibleModeSequenceAdapterPort,
  LoggerPort,
  PieceDataRepositoryPort,
} from "../../../../../../patterns/bible-stack/bible-stack/application/ports/out/BibleMode";
import {
  BibleStates,
  BibleVisualizationStates,
  ExplodeStackActions,
  type BibleState,
  type BibleVisualizationState,
  type ExplodeStackCommand,
  type Piece,
} from "../../../../../../patterns/bible-stack/bible-stack/domain/models/canvas";
import type { StackBibleData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackBibleData";
import type { StackSectionData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackSectionData";
import type { StackTestamentData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackTestamentData";
import type { StackCrossLine } from "../../../../../../patterns/bible-stack/bible-stack/domain/models/pieces";

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
};

const makeCrossLine = (id: string) => ({ id }) as unknown as StackCrossLine;

const makePiece = (id: string) => ({ id }) as unknown as Piece;

const makeSectionData = (id: string) => ({ id }) as unknown as StackSectionData;

const makeTestamentData = (id: string) =>
  ({ id }) as unknown as StackTestamentData;

type StaticCrossLines = Partial<
  Record<"crossHorizontalLine" | "crossVerticalLine", StackCrossLine>
>;

interface BibleDataOptions {
  currentState?: BibleState;
  currentStackVizState?: BibleVisualizationState;
  staticPieces?: StaticCrossLines;
  hasSplitSectionsToExplode?: boolean;
  explodePlans?: ExplodeStackCommand[][];
}

const makeBibleData = ({
  currentState = BibleStates.Open,
  currentStackVizState = BibleVisualizationStates.Regular,
  staticPieces = {
    crossHorizontalLine: makeCrossLine("cross-horizontal-line"),
    crossVerticalLine: makeCrossLine("cross-vertical-line"),
  },
  hasSplitSectionsToExplode = false,
  explodePlans = [],
}: BibleDataOptions = {}) => {
  const remainingPlans = explodePlans.map((plan) => [...plan]);
  return {
    currentState,
    currentStackVizState,
    getStaticPiece: vi.fn(
      (key: keyof StaticCrossLines) => staticPieces[key] as unknown
    ),
    changeVizState: vi.fn(),
    implodeAllSections: vi.fn(),
    tryExplodeSplitSections: vi.fn(() => hasSplitSectionsToExplode),
    getExplodeAnimationPlan: vi.fn(() => remainingPlans.shift() ?? []),
  };
};

type BibleDataDouble = ReturnType<typeof makeBibleData>;

describe("pattern.bible-stack.application.services.BibleModeService", () => {
  let service: BibleModeService;
  let sequenceStateServicePort: Mocked<SequenceStateServicePort>;
  let sequenceAdapterPort: Mocked<BibleModeSequenceAdapterPort>;
  let bibleStackUpdaterPort: Mocked<BibleStackUpdaterPort>;
  let explodedViewServicePort: Mocked<ExplodedViewServicePort>;
  let pieceDataRepository: Mocked<PieceDataRepositoryPort>;
  let sectionSelectionServicePort: Mocked<SectionSelectionServicePort>;
  let testamentSelectionServicePort: Mocked<TestamentSelectionPort>;
  let eventManager: Mocked<DomainEventManager>;
  let loggerPort: Mocked<LoggerPort>;
  let pendingSequences: Promise<void>[];
  let dataByPieceId: Map<string, StackSectionData | StackTestamentData>;

  const tryToggleMode = (bibleData: BibleDataDouble) =>
    service.tryToggleMode(bibleData as unknown as StackBibleData);

  const tryStopToggle = (bibleData: BibleDataDouble) =>
    service.tryStopToggle(bibleData as unknown as StackBibleData);

  const flushSequences = async () => {
    await Promise.all(pendingSequences);
  };

  const toggleAndFlush = async (bibleData: BibleDataDouble) => {
    await tryToggleMode(bibleData);
    await flushSequences();
  };

  const startPendingToggle = (bibleData: BibleDataDouble) => {
    const feedback = deferred<void[]>();
    sequenceAdapterPort.showToggleAttemptFeedback.mockReturnValue(
      feedback.promise
    );
    return { feedback, pending: tryToggleMode(bibleData) };
  };

  beforeEach(() => {
    pendingSequences = [];
    dataByPieceId = new Map();

    sequenceStateServicePort = {
      isThereAnOngoingSequence: vi.fn(() => false),
      executeAsSequence: vi.fn((task: () => Promise<void>) => {
        const running = task();
        pendingSequences.push(running);
        return running;
      }),
    };

    sequenceAdapterPort = {
      showToggleAttemptFeedback: vi.fn(async () => []),
      finishToggleAttemptFeedback: vi.fn(),
      showAttemptStopFeedback: vi.fn(async () => {}),
    };

    bibleStackUpdaterPort = {
      update: vi.fn(async () => {}),
    };

    explodedViewServicePort = {
      explodeSection: vi.fn(async () => {}),
      registerExplodedSection: vi.fn(),
      currentExplodedSection:
        undefined as unknown as ExplodedViewServicePort["currentExplodedSection"],
    };

    pieceDataRepository = {
      getPieceData: vi.fn((piece: Piece) => dataByPieceId.get(piece.id)),
    } as unknown as Mocked<PieceDataRepositoryPort>;

    sectionSelectionServicePort = {
      select: vi.fn(async () => {}),
      deselect: vi.fn(async () => {}),
    };

    testamentSelectionServicePort = {
      select: vi.fn(async () => {}),
      deselect: vi.fn(async () => {}),
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

    service = new BibleModeService({
      sequenceStateServicePort,
      sequenceAdapterPort,
      bibleStackUpdaterPort,
      explodedViewServicePort,
      pieceDataRepository,
      sectionSelectionServicePort,
      testamentSelectionServicePort,
      eventManager,
      loggerPort,
    });
  });

  describe("tryToggleMode", () => {
    it("ignores the attempt while another sequence is running", async () => {
      sequenceStateServicePort.isThereAnOngoingSequence.mockReturnValue(true);
      const bibleData = makeBibleData();

      await toggleAndFlush(bibleData);

      expect(eventManager.emit).not.toHaveBeenCalled();
      expect(
        sequenceAdapterPort.showToggleAttemptFeedback
      ).not.toHaveBeenCalled();
      expect(bibleData.changeVizState).not.toHaveBeenCalled();
    });

    it("ignores the attempt when the bible is not open", async () => {
      const bibleData = makeBibleData({ currentState: BibleStates.Closed });

      await toggleAndFlush(bibleData);

      expect(eventManager.emit).not.toHaveBeenCalled();
      expect(
        sequenceAdapterPort.showToggleAttemptFeedback
      ).not.toHaveBeenCalled();
      expect(bibleData.changeVizState).not.toHaveBeenCalled();
    });

    it("ignores a second attempt while the first one is still showing feedback", async () => {
      const bibleData = makeBibleData();
      const { feedback, pending } = startPendingToggle(bibleData);

      await tryToggleMode(bibleData);

      expect(
        sequenceAdapterPort.showToggleAttemptFeedback
      ).toHaveBeenCalledOnce();
      expect(eventManager.emit).toHaveBeenCalledOnce();

      feedback.resolve([]);
      await pending;
      await flushSequences();
    });

    it("logs an error and gives up when the horizontal cross line is missing", async () => {
      const bibleData = makeBibleData({
        staticPieces: { crossVerticalLine: makeCrossLine("vertical") },
      });

      await toggleAndFlush(bibleData);

      expect(loggerPort.error).toHaveBeenCalledExactlyOnceWith(
        "BibleModeService: crossHorizontalLine not found at tryToggleMode."
      );
      expect(eventManager.emit).not.toHaveBeenCalled();
      expect(
        sequenceAdapterPort.showToggleAttemptFeedback
      ).not.toHaveBeenCalled();
    });

    it("logs an error and gives up when the vertical cross line is missing", async () => {
      const bibleData = makeBibleData({
        staticPieces: { crossHorizontalLine: makeCrossLine("horizontal") },
      });

      await toggleAndFlush(bibleData);

      expect(loggerPort.error).toHaveBeenCalledExactlyOnceWith(
        "BibleModeService: crossVerticalLine not found at tryToggleMode."
      );
      expect(eventManager.emit).not.toHaveBeenCalled();
      expect(
        sequenceAdapterPort.showToggleAttemptFeedback
      ).not.toHaveBeenCalled();
    });

    it("stays usable after giving up on a bible with a missing cross line", async () => {
      const brokenBibleData = makeBibleData({ staticPieces: {} });
      const healthyBibleData = makeBibleData();

      await toggleAndFlush(brokenBibleData);
      await toggleAndFlush(healthyBibleData);

      expect(
        sequenceAdapterPort.showToggleAttemptFeedback
      ).toHaveBeenCalledOnce();
      expect(healthyBibleData.changeVizState).toHaveBeenCalledOnce();
    });

    it("drops the toggle when another sequence started during the attempt feedback", async () => {
      const bibleData = makeBibleData();
      const { feedback, pending } = startPendingToggle(bibleData);
      sequenceStateServicePort.isThereAnOngoingSequence.mockReturnValue(true);

      feedback.resolve([]);
      await pending;
      await flushSequences();

      expect(
        sequenceAdapterPort.finishToggleAttemptFeedback
      ).toHaveBeenCalledOnce();
      expect(sequenceStateServicePort.executeAsSequence).not.toHaveBeenCalled();
      expect(bibleData.changeVizState).not.toHaveBeenCalled();
      expect(bibleStackUpdaterPort.update).not.toHaveBeenCalled();
    });

    it("announces the attempt and shows the feedback with both cross lines", async () => {
      const crossHorizontalLine = makeCrossLine("horizontal");
      const crossVerticalLine = makeCrossLine("vertical");
      const bibleData = makeBibleData({
        staticPieces: { crossHorizontalLine, crossVerticalLine },
      });

      await toggleAndFlush(bibleData);

      expect(eventManager.emit).toHaveBeenCalledExactlyOnceWith(
        "OnBibleAttemptToggleMode",
        { data: bibleData }
      );
      expect(
        sequenceAdapterPort.showToggleAttemptFeedback
      ).toHaveBeenCalledExactlyOnceWith({
        crossHorizontalLine,
        crossVerticalLine,
      });
      expect(
        sequenceAdapterPort.finishToggleAttemptFeedback
      ).toHaveBeenCalledExactlyOnceWith({
        crossHorizontalLine,
        crossVerticalLine,
      });
    });

    it("only toggles once the attempt feedback finished", async () => {
      const executionOrder: string[] = [];
      const feedback = deferred<void[]>();
      sequenceAdapterPort.showToggleAttemptFeedback.mockImplementation(() => {
        executionOrder.push("showToggleAttemptFeedback");
        return feedback.promise;
      });
      sequenceAdapterPort.finishToggleAttemptFeedback.mockImplementation(() => {
        executionOrder.push("finishToggleAttemptFeedback");
      });
      bibleStackUpdaterPort.update.mockImplementation(async () => {
        executionOrder.push("update");
      });
      const bibleData = makeBibleData();
      bibleData.changeVizState.mockImplementation(() => {
        executionOrder.push("changeVizState");
      });

      const pending = tryToggleMode(bibleData);

      expect(executionOrder).toEqual(["showToggleAttemptFeedback"]);

      feedback.resolve([]);
      await pending;
      await flushSequences();

      expect(executionOrder).toEqual([
        "showToggleAttemptFeedback",
        "finishToggleAttemptFeedback",
        "changeVizState",
        "update",
      ]);
    });

    it("expands the bible when it is in regular state", async () => {
      const bibleData = makeBibleData({
        currentStackVizState: BibleVisualizationStates.Regular,
      });

      await toggleAndFlush(bibleData);

      expect(bibleData.changeVizState).toHaveBeenCalledExactlyOnceWith(
        BibleVisualizationStates.Expanded
      );
      expect(bibleData.implodeAllSections).not.toHaveBeenCalled();
      expect(bibleStackUpdaterPort.update).toHaveBeenCalledExactlyOnceWith({
        data: bibleData,
        pacing: "Regular",
      });
    });

    it("brings the bible back to regular state when it is expanded", async () => {
      const bibleData = makeBibleData({
        currentStackVizState: BibleVisualizationStates.Expanded,
      });

      await toggleAndFlush(bibleData);

      expect(bibleData.changeVizState).toHaveBeenCalledExactlyOnceWith(
        BibleVisualizationStates.Regular
      );
      expect(bibleData.implodeAllSections).toHaveBeenCalledOnce();
      expect(bibleData.getExplodeAnimationPlan).not.toHaveBeenCalled();
      expect(explodedViewServicePort.explodeSection).not.toHaveBeenCalled();
      expect(bibleStackUpdaterPort.update).toHaveBeenCalledExactlyOnceWith({
        data: bibleData,
        pacing: "Regular",
      });
    });

    it("allows a new attempt once the previous one finished", async () => {
      const bibleData = makeBibleData();

      await toggleAndFlush(bibleData);
      await toggleAndFlush(bibleData);

      expect(
        sequenceAdapterPort.showToggleAttemptFeedback
      ).toHaveBeenCalledTimes(2);
    });
  });

  describe("tryToggleMode > exploding the sections", () => {
    it("updates the stack with fast pacing when split sections were exploded", async () => {
      const bibleData = makeBibleData({ hasSplitSectionsToExplode: true });

      await toggleAndFlush(bibleData);

      expect(bibleStackUpdaterPort.update.mock.calls).toEqual([
        [{ data: bibleData, pacing: "Fast" }],
        [{ data: bibleData, pacing: "Regular" }],
      ]);
    });

    it("does not pre-update the stack when no split section was exploded", async () => {
      const bibleData = makeBibleData({ hasSplitSectionsToExplode: false });

      await toggleAndFlush(bibleData);

      expect(bibleStackUpdaterPort.update).toHaveBeenCalledExactlyOnceWith({
        data: bibleData,
        pacing: "Regular",
      });
    });

    it("explodes every section the plan asks for", async () => {
      const firstPiece = makePiece("section-piece-1");
      const secondPiece = makePiece("section-piece-2");
      const firstSection = makeSectionData("section-data-1");
      const secondSection = makeSectionData("section-data-2");
      dataByPieceId.set(firstPiece.id, firstSection);
      dataByPieceId.set(secondPiece.id, secondSection);
      const bibleData = makeBibleData({
        explodePlans: [
          [
            { action: ExplodeStackActions.ExplodeSection, piece: firstPiece },
            { action: ExplodeStackActions.ExplodeSection, piece: secondPiece },
          ],
        ],
      });

      await toggleAndFlush(bibleData);

      expect(explodedViewServicePort.explodeSection).toHaveBeenCalledTimes(2);
      expect(explodedViewServicePort.explodeSection.mock.calls).toEqual(
        expect.arrayContaining([
          [{ data: firstSection, pacing: "Fast" }],
          [{ data: secondSection, pacing: "Fast" }],
        ])
      );
    });

    it("selects the sections and the testaments the plan asks for", async () => {
      const sectionPiece = makePiece("section-piece");
      const testamentPiece = makePiece("testament-piece");
      const sectionData = makeSectionData("section-data");
      const testamentData = makeTestamentData("testament-data");
      dataByPieceId.set(sectionPiece.id, sectionData);
      dataByPieceId.set(testamentPiece.id, testamentData);
      const bibleData = makeBibleData({
        explodePlans: [
          [
            { action: ExplodeStackActions.SelectSection, piece: sectionPiece },
            {
              action: ExplodeStackActions.SelectTestament,
              piece: testamentPiece,
            },
          ],
        ],
      });

      await toggleAndFlush(bibleData);

      expect(
        sectionSelectionServicePort.select
      ).toHaveBeenCalledExactlyOnceWith({
        data: sectionData,
        source: "Unknown",
        makeTourGuide: false,
        pacing: "Double",
      });
      expect(
        testamentSelectionServicePort.select
      ).toHaveBeenCalledExactlyOnceWith({
        data: testamentData,
        source: "Unknown",
        pacing: "Fast",
      });
      expect(explodedViewServicePort.explodeSection).not.toHaveBeenCalled();
    });

    it("keeps applying plans until there is nothing left to do", async () => {
      const explodePiece = makePiece("section-piece-1");
      const selectPiece = makePiece("section-piece-2");
      const explodeSectionData = makeSectionData("section-data-1");
      const selectSectionData = makeSectionData("section-data-2");
      dataByPieceId.set(explodePiece.id, explodeSectionData);
      dataByPieceId.set(selectPiece.id, selectSectionData);
      const bibleData = makeBibleData({
        explodePlans: [
          [{ action: ExplodeStackActions.ExplodeSection, piece: explodePiece }],
          [{ action: ExplodeStackActions.SelectSection, piece: selectPiece }],
          [],
        ],
      });

      await toggleAndFlush(bibleData);

      expect(bibleData.getExplodeAnimationPlan).toHaveBeenCalledTimes(3);
      expect(explodedViewServicePort.explodeSection).toHaveBeenCalledOnce();
      expect(sectionSelectionServicePort.select).toHaveBeenCalledOnce();
    });

    it("stops applying plans when the plan repeats itself", async () => {
      const piece = makePiece("section-piece");
      dataByPieceId.set(piece.id, makeSectionData("section-data"));
      const repeatedPlan: ExplodeStackCommand[] = [
        { action: ExplodeStackActions.ExplodeSection, piece },
      ];
      const bibleData = makeBibleData({
        explodePlans: [repeatedPlan, repeatedPlan, repeatedPlan],
      });

      await toggleAndFlush(bibleData);

      expect(explodedViewServicePort.explodeSection).toHaveBeenCalledOnce();
      expect(bibleData.getExplodeAnimationPlan).toHaveBeenCalledTimes(2);
    });

    it("throws when the section data of an explode command is missing", async () => {
      const bibleData = makeBibleData({
        explodePlans: [
          [
            {
              action: ExplodeStackActions.ExplodeSection,
              piece: makePiece("unknown-piece"),
            },
          ],
        ],
      });

      await tryToggleMode(bibleData);

      await expect(flushSequences()).rejects.toThrow(
        "BibleModeService: sectionData not found at explodeAllSections"
      );
      expect(explodedViewServicePort.explodeSection).not.toHaveBeenCalled();
    });

    it("throws when the testament data of a select command is missing", async () => {
      const bibleData = makeBibleData({
        explodePlans: [
          [
            {
              action: ExplodeStackActions.SelectTestament,
              piece: makePiece("unknown-piece"),
            },
          ],
        ],
      });

      await tryToggleMode(bibleData);

      await expect(flushSequences()).rejects.toThrow(
        "BibleModeService: testamentData not found at explodeAllSections"
      );
      expect(testamentSelectionServicePort.select).not.toHaveBeenCalled();
    });
  });

  describe("tryStopToggle", () => {
    it("does nothing when there is no toggle attempt in flight", async () => {
      const bibleData = makeBibleData();

      await tryStopToggle(bibleData);

      expect(
        sequenceAdapterPort.showAttemptStopFeedback
      ).not.toHaveBeenCalled();
    });

    it("shows the stop feedback with both cross lines while an attempt is in flight", async () => {
      const crossHorizontalLine = makeCrossLine("horizontal");
      const crossVerticalLine = makeCrossLine("vertical");
      const bibleData = makeBibleData({
        staticPieces: { crossHorizontalLine, crossVerticalLine },
      });
      startPendingToggle(bibleData);

      await tryStopToggle(bibleData);

      expect(
        sequenceAdapterPort.showAttemptStopFeedback
      ).toHaveBeenCalledExactlyOnceWith({
        crossHorizontalLine,
        crossVerticalLine,
      });
    });

    it("ignores a second stop while the first one is in flight", async () => {
      const bibleData = makeBibleData();
      startPendingToggle(bibleData);
      const stopFeedback = deferred<void>();
      sequenceAdapterPort.showAttemptStopFeedback.mockReturnValue(
        stopFeedback.promise
      );
      const firstStop = tryStopToggle(bibleData);

      await tryStopToggle(bibleData);

      expect(
        sequenceAdapterPort.showAttemptStopFeedback
      ).toHaveBeenCalledOnce();

      stopFeedback.resolve();
      await firstStop;
    });

    it("does nothing once the stop already finished", async () => {
      const bibleData = makeBibleData();
      startPendingToggle(bibleData);

      await tryStopToggle(bibleData);
      await tryStopToggle(bibleData);

      expect(
        sequenceAdapterPort.showAttemptStopFeedback
      ).toHaveBeenCalledOnce();
    });

    it("allows a new toggle attempt after the stop finished", async () => {
      const bibleData = makeBibleData();
      startPendingToggle(bibleData);
      await tryStopToggle(bibleData);

      startPendingToggle(bibleData);

      expect(
        sequenceAdapterPort.showToggleAttemptFeedback
      ).toHaveBeenCalledTimes(2);
    });

    it("logs an error and gives up when a cross line is missing", async () => {
      const bibleData = makeBibleData();
      startPendingToggle(bibleData);
      bibleData.getStaticPiece.mockReturnValue(undefined);

      await tryStopToggle(bibleData);

      expect(loggerPort.error).toHaveBeenCalledExactlyOnceWith(
        "BibleModeService: crossHorizontalLine not found at tryStopToggle."
      );
      expect(
        sequenceAdapterPort.showAttemptStopFeedback
      ).not.toHaveBeenCalled();
    });

    it("logs the failure when the stop feedback rejects", async () => {
      const failure = new Error("stop feedback exploded");
      sequenceAdapterPort.showAttemptStopFeedback.mockRejectedValue(failure);
      const bibleData = makeBibleData();
      startPendingToggle(bibleData);

      await expect(tryStopToggle(bibleData)).resolves.toBeUndefined();

      expect(loggerPort.error).toHaveBeenCalledExactlyOnceWith(
        "BibleModeService: showAttemptStopFeedback failed at tryStopToggle.",
        failure
      );
    });

    it("releases the attempt flags even when the stop feedback rejects", async () => {
      sequenceAdapterPort.showAttemptStopFeedback.mockRejectedValue(
        new Error("stop feedback exploded")
      );
      const bibleData = makeBibleData();
      startPendingToggle(bibleData);
      await tryStopToggle(bibleData);

      startPendingToggle(bibleData);
      await tryStopToggle(bibleData);

      expect(
        sequenceAdapterPort.showToggleAttemptFeedback
      ).toHaveBeenCalledTimes(2);
      expect(sequenceAdapterPort.showAttemptStopFeedback).toHaveBeenCalledTimes(
        2
      );
    });
  });
});
