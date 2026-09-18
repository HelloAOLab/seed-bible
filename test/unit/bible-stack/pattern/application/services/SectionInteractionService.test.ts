import { describe, it, expect, beforeEach, type Mocked } from "vitest";
import { SectionInteractionService } from "../../../../../../patterns/bible-stack/bible-stack/application/services/SectionInteractionService";
import type { PaintPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/Paint";
import type { PieceHierarchyServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/PieceHierarchy";
import type { PieceHighlighterPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/PieceHighlight";
import type { SectionSelectionServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/SectionSelection";
import type { SequenceStateServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/SequenceState";
import type { TourGuideServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/TourGuide";
import type { SectionInteractionConfigProviderPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/out/SectionInteraction";

describe("pattern.bible-stack.application.services.SectionInteractionService", () => {
  let service: SectionInteractionService;
  let pieceHierarchyServicePort: Mocked<PieceHierarchyServicePort>;
  let tourGuideServicePort: Mocked<TourGuideServicePort>;
  let pieceHighlightServicePort: Mocked<PieceHighlighterPort>;
  let sectionInteractionConfigProviderPort: Mocked<SectionInteractionConfigProviderPort>;
  let sequenceStateServicePort: Mocked<SequenceStateServicePort>;
  let sectionSelectionServicePort: Mocked<SectionSelectionServicePort>;
  let paintPort: Mocked<PaintPort>;

  beforeEach(() => {
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

    sectionInteractionConfigProviderPort = {
      getDelay: vi.fn(),
    };

    sequenceStateServicePort = {
      isThereAnOngoingSequence: vi.fn(),
      executeAsSequence: vi.fn(),
    };

    sectionSelectionServicePort = {
      select: vi.fn(),
      deselect: vi.fn(),
    };

    paintPort = {
      changeColor: vi.fn(),
      paint: vi.fn(),
      unpaint: vi.fn(),
      activate: vi.fn(),
      deactivate: vi.fn(),
      isActive: undefined as unknown as PaintPort["isActive"],
    } as unknown as Mocked<PaintPort>;

    service = new SectionInteractionService({
      sectionDataRepositoryPort: {} as unknown as NonNullable<
        ConstructorParameters<typeof SectionInteractionService>[0]
      >["sectionDataRepositoryPort"],
      pieceHierarchyServicePort,
      tourGuideServicePort,
      pieceHighlightServicePort,
      sectionInteractionConfigProviderPort,
      sequenceStateServicePort,
      sectionSelectionServicePort,
      paintPort,
    });
  });

  it("is constructed with its ports wired", () => {
    expect(service).toBeInstanceOf(SectionInteractionService);
  });
});
