import { describe, it, expect, beforeEach, type Mocked } from "vitest";
import { CoverInteractionService } from "../../../../../../patterns/bible-stack/bible-stack/application/services/CoverInteractionService";
import type { BibleSequenceServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/BibleSequence";
import type { SequenceStateServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/SequenceState";
import type { BibleDataRepositoryPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/stacks";
import type { LoggerPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/out/Logger";
import { StackBibleData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackBibleData";
import {
  BibleTypes,
  BibleVisualizationStates,
  CrossPositions,
} from "../../../../../../patterns/bible-stack/bible-stack/domain/models/canvas";
import type { StackCover } from "../../../../../../patterns/bible-stack/bible-stack/domain/models/pieces";
import { StackPresenceNavigationPacings } from "../../../../../../patterns/bible-stack/bible-stack/domain/models/userPresence";

const BIBLE_ID = "bible-id";

const coverPiece: StackCover = {
  id: "cover-piece",
  type: "StackCover",
  bibleId: BIBLE_ID,
};

const makeBibleData = (): StackBibleData =>
  new StackBibleData({
    id: BIBLE_ID,
    childrenData: [],
    currentCrossPosition: CrossPositions.Top,
    currentStackVizState: BibleVisualizationStates.Regular,
    arrangementIndex: 0,
    bibleType: BibleTypes.Default,
  });

describe("pattern.bible-stack.application.services.CoverInteractionService", () => {
  let service: CoverInteractionService;
  let bibleDataRepositoryPort: Mocked<BibleDataRepositoryPort>;
  let bibleSequenceServicePort: Mocked<BibleSequenceServicePort>;
  let sequenceStateServicePort: Mocked<SequenceStateServicePort>;
  let loggerPort: Mocked<LoggerPort>;

  beforeEach(() => {
    bibleDataRepositoryPort = {
      addBibleData: vi.fn(),
      removeBibleData: vi.fn(),
      clearBiblesData: vi.fn(),
      getBibleDataById: vi.fn(),
      getAllBiblesData: vi.fn(),
    };

    bibleSequenceServicePort = {
      resetBible: vi.fn(),
      closeBible: vi.fn(),
      openBible: vi.fn(),
      crackOpenBible: vi.fn(),
    };

    sequenceStateServicePort = {
      isThereAnOngoingSequence: vi.fn(),
      executeAsSequence: vi.fn(async (task: () => Promise<void>) => {
        await task();
      }),
    };

    loggerPort = {
      error: vi.fn(),
      warn: vi.fn(),
      log: vi.fn(),
    };

    service = new CoverInteractionService({
      bibleDataRepositoryPort,
      bibleSequenceServicePort,
      sequenceStateServicePort,
      loggerPort,
    });
  });

  describe("handleCoverClick", () => {
    it("logs an error and no-ops if no bibleData found", () => {
      bibleDataRepositoryPort.getBibleDataById.mockReturnValue(undefined);

      service.handleCoverClick(coverPiece);

      expect(loggerPort.error).toHaveBeenCalledExactlyOnceWith(
        "CoverInteractionService: bibleData not found at handleCoverClick"
      );
      expect(sequenceStateServicePort.executeAsSequence).not.toHaveBeenCalled();
      expect(bibleSequenceServicePort.resetBible).not.toHaveBeenCalled();
    });

    it("successfully resets the bible as a sequence with the correct arguments", () => {
      const bibleData = makeBibleData();
      bibleDataRepositoryPort.getBibleDataById.mockReturnValue(bibleData);

      service.handleCoverClick(coverPiece);

      expect(
        bibleDataRepositoryPort.getBibleDataById
      ).toHaveBeenCalledExactlyOnceWith(BIBLE_ID);
      expect(sequenceStateServicePort.executeAsSequence).toHaveBeenCalledOnce();
      expect(
        bibleSequenceServicePort.resetBible
      ).toHaveBeenCalledExactlyOnceWith({
        bibleData,
        pacing: StackPresenceNavigationPacings.Double,
      });
      expect(loggerPort.error).not.toHaveBeenCalled();
    });
  });
});
