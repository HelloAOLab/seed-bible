import { describe, it, expect, beforeEach, type Mocked } from "vitest";
import { SpatialNavigationService } from "../../../../../../patterns/bible-stack/bible-stack/application/services/SpatialNavigationService";
import type { SequenceStateServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/SequenceState";
import type {
  BibleDataRepositoryPort,
  BibleRecenterAdapterPort,
} from "../../../../../../patterns/bible-stack/bible-stack/application/ports/out/SpatialNavigation";
import { StackBibleData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackBibleData";
import {
  BibleTypes,
  BibleVisualizationStates,
  CrossPositions,
} from "../../../../../../patterns/bible-stack/bible-stack/domain/models/canvas";
import { makeSequenceStateServiceDouble } from "../serviceDoubles";

const makeBibleData = (id: string): StackBibleData =>
  new StackBibleData({
    id,
    currentCrossPosition: CrossPositions.Top,
    currentStackVizState: BibleVisualizationStates.Regular,
    arrangementIndex: 0,
    bibleType: BibleTypes.Default,
  });

describe("pattern.bible-stack.application.services.SpatialNavigationService", () => {
  let service: SpatialNavigationService;
  let sequenceStateServicePort: Mocked<SequenceStateServicePort>;
  let bibleDataRepositoryPort: Mocked<BibleDataRepositoryPort>;
  let bibleRecenterAdapterPort: Mocked<BibleRecenterAdapterPort>;
  let isInsideSequence: boolean;

  beforeEach(() => {
    isInsideSequence = false;

    sequenceStateServicePort = makeSequenceStateServiceDouble({
      isThereAnOngoingSequence: vi.fn(() => false),
      executeAsSequence: vi.fn(async (task) => {
        isInsideSequence = true;
        try {
          await task();
        } finally {
          isInsideSequence = false;
        }
      }),
    });

    bibleDataRepositoryPort = {
      getAllBiblesData: vi.fn(() => [makeBibleData("bible-id")]),
    };

    bibleRecenterAdapterPort = {
      isBibleOffScreen: vi.fn(async () => true),
      recenter: vi.fn(async () => {}),
    };

    service = new SpatialNavigationService({
      sequenceStateServicePort,
      bibleDataRepositoryPort,
      bibleRecenterAdapterPort,
    });
  });

  describe("handleUserStoppedNavigation", () => {
    it("no-ops if there's an ongoing sequence", async () => {
      sequenceStateServicePort.isThereAnOngoingSequence.mockReturnValue(true);

      await expect(
        service.handleUserStoppedNavigation()
      ).resolves.toBeUndefined();

      expect(bibleRecenterAdapterPort.isBibleOffScreen).not.toHaveBeenCalled();
      expect(sequenceStateServicePort.executeAsSequence).not.toHaveBeenCalled();
      expect(bibleRecenterAdapterPort.recenter).not.toHaveBeenCalled();
    });

    it("no-ops if no bible found", async () => {
      bibleDataRepositoryPort.getAllBiblesData.mockReturnValue([]);

      await expect(
        service.handleUserStoppedNavigation()
      ).resolves.toBeUndefined();

      expect(bibleRecenterAdapterPort.isBibleOffScreen).not.toHaveBeenCalled();
      expect(sequenceStateServicePort.executeAsSequence).not.toHaveBeenCalled();
      expect(bibleRecenterAdapterPort.recenter).not.toHaveBeenCalled();
    });

    it("executes the recenter as a sequence if the found bible is off screen", async () => {
      const bible = makeBibleData("bible-id");
      const otherBible = makeBibleData("other-bible-id");
      bibleDataRepositoryPort.getAllBiblesData.mockReturnValue([
        bible,
        otherBible,
      ]);
      let recenteredInsideSequence: boolean | undefined;
      bibleRecenterAdapterPort.recenter.mockImplementation(async () => {
        recenteredInsideSequence = isInsideSequence;
      });

      await service.handleUserStoppedNavigation();

      expect(bibleRecenterAdapterPort.isBibleOffScreen).toHaveBeenCalledWith(
        bible
      );
      expect(sequenceStateServicePort.executeAsSequence).toHaveBeenCalledTimes(
        1
      );
      expect(bibleRecenterAdapterPort.recenter).toHaveBeenCalledTimes(1);
      expect(bibleRecenterAdapterPort.recenter).toHaveBeenCalledWith(bible);
      expect(recenteredInsideSequence).toBe(true);

      vi.clearAllMocks();
      bibleRecenterAdapterPort.isBibleOffScreen.mockResolvedValue(false);

      await service.handleUserStoppedNavigation();

      expect(bibleRecenterAdapterPort.isBibleOffScreen).toHaveBeenCalledWith(
        bible
      );
      expect(sequenceStateServicePort.executeAsSequence).not.toHaveBeenCalled();
      expect(bibleRecenterAdapterPort.recenter).not.toHaveBeenCalled();
    });
  });
});
