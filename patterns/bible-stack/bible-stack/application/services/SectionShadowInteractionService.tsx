import type { SectionShadow } from "../../domain/models/canvas";
import type { SectionSelectionServicePort } from "../ports/in/SectionSelection";
import type { SectionShadowInteractionPort } from "../ports/in/SectionShadowInteraction";
import type { SequenceStateServicePort } from "../ports/in/SequenceState";
import type { TourGuideServicePort } from "../ports/in/TourGuide";
import type { PieceDataRepositoryPort } from "../ports/out/SectionShadowInteraction";

interface ServiceParams {
  pieceDataRepositoryPort: PieceDataRepositoryPort;
  sectionSelectionServicePort: SectionSelectionServicePort;
  sequenceStateServicePort: SequenceStateServicePort;
  tourGuideServicePort: TourGuideServicePort;
}

export class SectionShadowInteractionService implements SectionShadowInteractionPort {
  #pieceDataRepositoryPort: ServiceParams["pieceDataRepositoryPort"];
  #sectionSelectionServicePort: ServiceParams["sectionSelectionServicePort"];
  #sequenceStateServicePort: ServiceParams["sequenceStateServicePort"];
  #tourGuideServicePort: ServiceParams["tourGuideServicePort"];

  constructor({
    pieceDataRepositoryPort,
    sectionSelectionServicePort,
    sequenceStateServicePort,
    tourGuideServicePort,
  }: ServiceParams) {
    this.#pieceDataRepositoryPort = pieceDataRepositoryPort;
    this.#sectionSelectionServicePort = sectionSelectionServicePort;
    this.#sequenceStateServicePort = sequenceStateServicePort;
    this.#tourGuideServicePort = tourGuideServicePort;
  }

  handleSectionShadowSelected(shadow: SectionShadow) {
    if (
      this.#sequenceStateServicePort.isThereAnOngoingSequence() ||
      this.#tourGuideServicePort.isThereAnOngoingTourGuide()
    ) {
      return;
    }
    const sectionData = this.#pieceDataRepositoryPort.getDataById({
      type: "StackSection",
      id: shadow.sectionDataId,
    });

    if (!sectionData) {
      throw new Error(
        "SectionShadowInteractionService: sectionData not found at handleSectionShadowSelected."
      );
    }

    this.#sequenceStateServicePort.executeAsSequence(() =>
      this.#sectionSelectionServicePort.deselect(sectionData)
    );
  }
}
