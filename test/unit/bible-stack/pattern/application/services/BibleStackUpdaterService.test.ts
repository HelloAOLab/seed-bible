import { describe, it, expect, beforeEach, type Mocked } from "vitest";
import { BibleStackUpdaterService } from "../../../../../../patterns/bible-stack/bible-stack/application/services/BibleStackUpdaterService";
import type { LoggerPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/Logger";
import type { TestamentStackUpdaterPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/TestamentStackUpdater";
import type { BibleStackUpdaterAdapterPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/out/BibleStackUpdater";
import {
  StackBibleData,
  type StaticBiblePieces,
} from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackBibleData";
import type { StackTestamentData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackTestamentData";
import {
  BibleTypes,
  BibleVisualizationStates,
  CrossPositions,
  type CrossPosition,
} from "../../../../../../patterns/bible-stack/bible-stack/domain/models/canvas";
import { StackUpdatePacings } from "../../../../../../patterns/bible-stack/bible-stack/domain/models/stacks";

describe("pattern.bible-stack.application.services.BibleStackUpdaterService", () => {
  let service: BibleStackUpdaterService;
  let updaterAdapterPort: Mocked<BibleStackUpdaterAdapterPort>;
  let testamentUpdaterPort: Mocked<TestamentStackUpdaterPort>;
  let loggerPort: Mocked<LoggerPort>;
  let executionOrder: string[];

  const pacing = StackUpdatePacings.Regular;

  const makeStaticPieces = (
    missingPiece?: keyof StaticBiblePieces
  ): StaticBiblePieces => {
    const pieces = {
      bibleTransformer: { id: "bible-transformer" },
      upperCover: { id: "upper-cover" },
      leftCover: { id: "left-cover" },
      lowerCover: { id: "lower-cover" },
      crossVerticalLine: { id: "cross-vertical-line" },
      crossHorizontalLine: { id: "cross-horizontal-line" },
      bibleShadow: { id: "bible-shadow" },
    };

    if (missingPiece) delete pieces[missingPiece];

    return pieces as unknown as StaticBiblePieces;
  };

  const makeTestament = ({
    id,
    hasActiveContent = true,
    isSplitIntoSections = true,
  }: {
    id: string;
    hasActiveContent?: boolean;
    isSplitIntoSections?: boolean;
  }): StackTestamentData =>
    ({
      id,
      isSplitIntoSections,
      hasActiveContent: () => hasActiveContent,
      isEmpty: () => !hasActiveContent,
    }) as unknown as StackTestamentData;

  const makeBible = ({
    testaments = [],
    staticPieces = makeStaticPieces(),
    crossPosition = CrossPositions.Top,
  }: {
    testaments?: StackTestamentData[];
    staticPieces?: StaticBiblePieces;
    crossPosition?: CrossPosition;
  } = {}) =>
    new StackBibleData({
      id: "bible-id",
      childrenData: testaments,
      currentCrossPosition: crossPosition,
      currentStackVizState: BibleVisualizationStates.Regular,
      staticBiblePieces: staticPieces,
      arrangementIndex: 0,
      bibleType: BibleTypes.Default,
    });

  beforeEach(() => {
    executionOrder = [];

    updaterAdapterPort = {
      update: vi.fn(async () => {
        executionOrder.push("update");
        return { targetCrossPosition: CrossPositions.Top };
      }),
    };

    testamentUpdaterPort = {
      prepareTestament: vi.fn((testament) => {
        executionOrder.push(`prepare:${testament.id}`);
      }),
      finalizeTestament: vi.fn(async (testament) => {
        executionOrder.push(`finalize:${testament.id}`);
      }),
      update: vi.fn(),
    };

    loggerPort = {
      error: vi.fn(),
      warn: vi.fn(),
      log: vi.fn(),
    };

    service = new BibleStackUpdaterService({
      updaterAdapterPort,
      testamentUpdaterPort,
      loggerPort,
    });
  });

  describe("update", () => {
    it("logs an error and returns if any of the static pieces is not found", async () => {
      const requiredPieces = [
        "lowerCover",
        "upperCover",
        "crossHorizontalLine",
        "crossVerticalLine",
      ] as const;

      for (const missingPiece of requiredPieces) {
        vi.clearAllMocks();
        executionOrder = [];

        const staticPieces = makeStaticPieces(missingPiece);
        const data = makeBible({
          testaments: [makeTestament({ id: "t1" })],
          staticPieces,
        });

        await service.update({ data, pacing });

        expect(loggerPort.error).toHaveBeenCalledExactlyOnceWith(
          "BibleStackUpdaterService: Static pieces not found",
          {
            lowerCover: staticPieces.lowerCover,
            upperCover: staticPieces.upperCover,
            crossHorizontalLine: staticPieces.crossHorizontalLine,
            crossVerticalLine: staticPieces.crossVerticalLine,
          }
        );
        expect(executionOrder).toEqual([]);
      }
    });

    it("prepares every active testament before the update sequence", async () => {
      const activeTestament = makeTestament({ id: "t1" });
      const inactiveTestament = makeTestament({
        id: "t2",
        hasActiveContent: false,
      });
      const otherActiveTestament = makeTestament({ id: "t3" });
      const data = makeBible({
        testaments: [activeTestament, inactiveTestament, otherActiveTestament],
      });

      await service.update({ data, pacing });

      expect(testamentUpdaterPort.prepareTestament.mock.calls).toEqual([
        [activeTestament],
        [otherActiveTestament],
      ]);
      expect(executionOrder.slice(0, 3)).toEqual([
        "prepare:t1",
        "prepare:t3",
        "update",
      ]);
    });

    it("executes the update sequence with the correct arguments", async () => {
      const firstTestament = makeTestament({ id: "t1" });
      const secondTestament = makeTestament({ id: "t2" });
      const staticPieces = makeStaticPieces();
      const data = makeBible({
        testaments: [firstTestament, secondTestament],
        staticPieces,
        crossPosition: CrossPositions.Top,
      });

      await service.update({ data, pacing });

      expect(updaterAdapterPort.update).toHaveBeenCalledExactlyOnceWith({
        pacing,
        lowerCover: staticPieces.lowerCover,
        upperCover: staticPieces.upperCover,
        crossHorizontalLine: staticPieces.crossHorizontalLine,
        crossVerticalLine: staticPieces.crossVerticalLine,
        isBibleEmpty: false,
        shouldCrossGoInMiddle: true,
        activeTestaments: [firstTestament, secondTestament],
        currentCrossPosition: CrossPositions.Top,
      });

      vi.clearAllMocks();

      const emptyTestament = makeTestament({
        id: "t3",
        hasActiveContent: false,
        isSplitIntoSections: false,
      });
      const emptyData = makeBible({
        testaments: [emptyTestament],
        staticPieces,
        crossPosition: CrossPositions.Middle,
      });

      await service.update({ data: emptyData, pacing });

      expect(updaterAdapterPort.update).toHaveBeenCalledExactlyOnceWith({
        pacing,
        lowerCover: staticPieces.lowerCover,
        upperCover: staticPieces.upperCover,
        crossHorizontalLine: staticPieces.crossHorizontalLine,
        crossVerticalLine: staticPieces.crossVerticalLine,
        isBibleEmpty: true,
        shouldCrossGoInMiddle: false,
        activeTestaments: [],
        currentCrossPosition: CrossPositions.Middle,
      });
    });

    it("finalizes every active testament after the update sequence", async () => {
      const activeTestament = makeTestament({ id: "t1" });
      const inactiveTestament = makeTestament({
        id: "t2",
        hasActiveContent: false,
      });
      const otherActiveTestament = makeTestament({ id: "t3" });
      const data = makeBible({
        testaments: [activeTestament, inactiveTestament, otherActiveTestament],
      });

      await service.update({ data, pacing });

      expect(testamentUpdaterPort.finalizeTestament.mock.calls).toEqual([
        [activeTestament],
        [otherActiveTestament],
      ]);
      expect(executionOrder.slice(2)).toEqual([
        "update",
        "finalize:t1",
        "finalize:t3",
      ]);
    });

    it("leaves the cross position value as the returned from the update sequence.", async () => {
      updaterAdapterPort.update.mockResolvedValue({
        targetCrossPosition: CrossPositions.Middle,
      });
      const data = makeBible({
        testaments: [makeTestament({ id: "t1" })],
        crossPosition: CrossPositions.Top,
      });

      await service.update({ data, pacing });

      expect(data.currentCrossPosition).toBe(CrossPositions.Middle);

      await service.update({ data, pacing });

      expect(data.currentCrossPosition).toBe(CrossPositions.Middle);
    });
  });
});
