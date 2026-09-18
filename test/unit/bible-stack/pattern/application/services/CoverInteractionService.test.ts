import { describe, it, expect, beforeEach, type Mocked } from "vitest";
import { CoverInteractionService } from "../../../../../../patterns/bible-stack/bible-stack/application/services/CoverInteractionService";
import type { BibleSequenceServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/BibleSequence";
import type { SequenceStateServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/SequenceState";
import type { BibleDataRepositoryPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/stacks";

describe("pattern.bible-stack.application.services.CoverInteractionService", () => {
  let service: CoverInteractionService;
  let bibleDataRepositoryPort: Mocked<BibleDataRepositoryPort>;
  let bibleSequenceServicePort: Mocked<BibleSequenceServicePort>;
  let sequenceStateServicePort: Mocked<SequenceStateServicePort>;

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
      executeAsSequence: vi.fn(),
    };

    service = new CoverInteractionService({
      bibleDataRepositoryPort,
      bibleSequenceServicePort,
      sequenceStateServicePort,
    });
  });

  it("is constructed with its ports wired", () => {
    expect(service).toBeInstanceOf(CoverInteractionService);
  });
});
