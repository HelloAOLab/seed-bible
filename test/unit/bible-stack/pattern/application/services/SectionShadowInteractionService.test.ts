import { describe, it, expect, beforeEach, type Mocked } from "vitest";
import { SectionShadowInteractionService } from "../../../../../../patterns/bible-stack/bible-stack/application/services/SectionShadowInteractionService";
import type { SectionSelectionServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/SectionSelection";
import type { SequenceStateServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/SequenceState";
import type { TourGuideServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/TourGuide";
import type { PieceDataRepositoryPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/out/SectionShadowInteraction";

describe("pattern.bible-stack.application.services.SectionShadowInteractionService", () => {
  let service: SectionShadowInteractionService;
  let pieceDataRepositoryPort: Mocked<PieceDataRepositoryPort>;
  let sectionSelectionServicePort: Mocked<SectionSelectionServicePort>;
  let sequenceStateServicePort: Mocked<SequenceStateServicePort>;
  let tourGuideServicePort: Mocked<TourGuideServicePort>;

  beforeEach(() => {
    pieceDataRepositoryPort = {
      getDataById: vi.fn(),
    } as unknown as Mocked<PieceDataRepositoryPort>;

    sectionSelectionServicePort = {
      select: vi.fn(),
      deselect: vi.fn(),
    };

    sequenceStateServicePort = {
      isThereAnOngoingSequence: vi.fn(),
      executeAsSequence: vi.fn(),
    };

    tourGuideServicePort = {
      ongoingTourGuideSectionData:
        undefined as unknown as TourGuideServicePort["ongoingTourGuideSectionData"],
      isThereAnOngoingTourGuide: vi.fn(),
      beginTourGuide: vi.fn(),
      stopTourGuide: vi.fn(),
    };

    service = new SectionShadowInteractionService({
      pieceDataRepositoryPort,
      sectionSelectionServicePort,
      sequenceStateServicePort,
      tourGuideServicePort,
    });
  });

  it("is constructed with its ports wired", () => {
    expect(service).toBeInstanceOf(SectionShadowInteractionService);
  });
});
