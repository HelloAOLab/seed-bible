import { describe, it, expect, beforeEach, type Mocked } from "vitest";
import { VersesBundleInteractionService } from "../../../../../../patterns/bible-stack/bible-stack/application/services/VersesBundleInteractionService";
import type { PaintPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/Paint";
import type { SequenceStateServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/SequenceState";
import type { VersesBundleSelectionServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/VersesBundleSelection";
import type {
  VersesBundleAdapterPort,
  VersesBundleDataRepositoryPort,
} from "../../../../../../patterns/bible-stack/bible-stack/application/ports/versesBundle";

describe("pattern.bible-stack.application.services.VersesBundleInteractionService", () => {
  let service: VersesBundleInteractionService;
  let sequenceStateServicePort: Mocked<SequenceStateServicePort>;
  let versesBundleDataRepositoryPort: Mocked<VersesBundleDataRepositoryPort>;
  let versesBundleSelectionServicePort: Mocked<VersesBundleSelectionServicePort>;
  let versesBundleAdapterPort: Mocked<VersesBundleAdapterPort>;
  let paintPort: Mocked<PaintPort>;

  beforeEach(() => {
    sequenceStateServicePort = {
      isThereAnOngoingSequence: vi.fn(),
      executeAsSequence: vi.fn(),
    };

    versesBundleDataRepositoryPort = {
      getBundleData: vi.fn(),
    };

    versesBundleSelectionServicePort = {
      selectBundle: vi.fn(),
    };

    versesBundleAdapterPort = {
      highlight: vi.fn(),
      unhighlight: vi.fn(),
    };

    paintPort = {
      changeColor: vi.fn(),
      paint: vi.fn(),
      unpaint: vi.fn(),
      activate: vi.fn(),
      deactivate: vi.fn(),
      isActive: undefined as unknown as PaintPort["isActive"],
    } as unknown as Mocked<PaintPort>;

    service = new VersesBundleInteractionService({
      sequenceStateServicePort,
      versesBundleDataRepositoryPort,
      versesBundleSelectionServicePort,
      versesBundleAdapterPort,
      paintPort,
    });
  });

  it("is constructed with its ports wired", () => {
    expect(service).toBeInstanceOf(VersesBundleInteractionService);
  });
});
