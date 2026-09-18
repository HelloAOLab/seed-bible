import { describe, it, expect, beforeEach, type Mocked } from "vitest";
import { SpatialNavigationService } from "../../../../../../patterns/bible-stack/bible-stack/application/services/SpatialNavigationService";
import type { SequenceStateServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/SequenceState";
import type {
  BibleDataRepositoryPort,
  BibleRecenterAdapterPort,
} from "../../../../../../patterns/bible-stack/bible-stack/application/ports/out/SpatialNavigation";

describe("pattern.bible-stack.application.services.SpatialNavigationService", () => {
  let service: SpatialNavigationService;
  let sequenceStateServicePort: Mocked<SequenceStateServicePort>;
  let bibleDataRepositoryPort: Mocked<BibleDataRepositoryPort>;
  let bibleRecenterAdapterPort: Mocked<BibleRecenterAdapterPort>;

  beforeEach(() => {
    sequenceStateServicePort = {
      isThereAnOngoingSequence: vi.fn(),
      executeAsSequence: vi.fn(),
    };

    bibleDataRepositoryPort = {
      getAllBiblesData: vi.fn(),
    };

    bibleRecenterAdapterPort = {
      isBibleOffScreen: vi.fn(),
      recenter: vi.fn(),
    };

    service = new SpatialNavigationService({
      sequenceStateServicePort,
      bibleDataRepositoryPort,
      bibleRecenterAdapterPort,
    });
  });

  it("is constructed with its ports wired", () => {
    expect(service).toBeInstanceOf(SpatialNavigationService);
  });
});
