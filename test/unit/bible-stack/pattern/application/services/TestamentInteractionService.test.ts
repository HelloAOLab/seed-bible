import { describe, it, expect, beforeEach, type Mocked } from "vitest";
import { TestamentInteractionService } from "../../../../../../patterns/bible-stack/bible-stack/application/services/TestamentInteractionService";
import type { PaintPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/Paint";
import type { PieceHierarchyServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/PieceHierarchy";
import type { PieceHighlighterPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/PieceHighlight";
import type { SequenceStateServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/SequenceState";
import type { TestamentSelectionPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/TestamentSelection";
import type { TourGuideServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/TourGuide";
import type { TestamentDataRepositoryPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/testaments";

describe("pattern.bible-stack.application.services.TestamentInteractionService", () => {
  let service: TestamentInteractionService;
  let sequenceStateServicePort: Mocked<SequenceStateServicePort>;
  let pieceHierarchyServicePort: Mocked<PieceHierarchyServicePort>;
  let tourGuideServicePort: Mocked<TourGuideServicePort>;
  let testamentSelectionServicePort: Mocked<TestamentSelectionPort>;
  let pieceHighlightServicePort: Mocked<PieceHighlighterPort>;
  let paintPort: Mocked<PaintPort>;

  beforeEach(() => {
    sequenceStateServicePort = {
      isThereAnOngoingSequence: vi.fn(),
      executeAsSequence: vi.fn(),
    };

    pieceHierarchyServicePort = {
      getParentDataChain: vi.fn(),
    };

    tourGuideServicePort = {
      ongoingTourGuideSectionData:
        undefined as unknown as TourGuideServicePort["ongoingTourGuideSectionData"],
      isThereAnOngoingTourGuide: vi.fn(),
      beginTourGuide: vi.fn(),
      stopTourGuide: vi.fn(),
    };

    testamentSelectionServicePort = {
      select: vi.fn(),
      deselect: vi.fn(),
    };

    pieceHighlightServicePort = {
      tryHighlightPiece: vi.fn(),
      tryUnhighlightPiece: vi.fn(),
      isUnhighlightScheduled: vi.fn(),
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
      isActive: undefined as unknown as PaintPort["isActive"],
    } as unknown as Mocked<PaintPort>;

    service = new TestamentInteractionService({
      sequenceStateServicePort,
      testamentDataRepositoryPort: {} as unknown as TestamentDataRepositoryPort,
      pieceHierarchyServicePort,
      tourGuideServicePort,
      testamentSelectionServicePort,
      pieceHighlightServicePort,
      paintPort,
    });
  });

  it("is constructed with its ports wired", () => {
    expect(service).toBeInstanceOf(TestamentInteractionService);
  });
});
