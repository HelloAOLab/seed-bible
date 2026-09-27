import type { SectionShadow } from "../../domain/models/canvas";
import type { SectionSelectionServicePort } from "../ports/in/SectionSelection";
import type { SequenceStateServicePort } from "../ports/in/SequenceState";
import type { TourGuideServicePort } from "../ports/in/TourGuide";
import type { LoggerPort } from "../ports/out/Logger";
import type { PieceDataRepositoryPort } from "../ports/out/SectionShadowInteraction";
import type { SectionShadowInteractionServicePort } from "../ports/in/SectionShadowInteraction";

interface ServiceParams {
  pieceDataRepositoryPort: PieceDataRepositoryPort;
  sectionSelectionServicePort: SectionSelectionServicePort;
  sequenceStateServicePort: SequenceStateServicePort;
  tourGuideServicePort: TourGuideServicePort;
  loggerPort: LoggerPort;
}

export class SectionShadowInteractionService implements SectionShadowInteractionServicePort {
  #pieceDataRepositoryPort: ServiceParams["pieceDataRepositoryPort"];
  #sectionSelectionServicePort: ServiceParams["sectionSelectionServicePort"];
  #sequenceStateServicePort: ServiceParams["sequenceStateServicePort"];
  #tourGuideServicePort: ServiceParams["tourGuideServicePort"];
  #loggerPort: ServiceParams["loggerPort"];

  constructor({
    pieceDataRepositoryPort,
    sectionSelectionServicePort,
    sequenceStateServicePort,
    tourGuideServicePort,
    loggerPort,
  }: ServiceParams) {
    this.#pieceDataRepositoryPort = pieceDataRepositoryPort;
    this.#sectionSelectionServicePort = sectionSelectionServicePort;
    this.#sequenceStateServicePort = sequenceStateServicePort;
    this.#tourGuideServicePort = tourGuideServicePort;
    this.#loggerPort = loggerPort;
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
      this.#loggerPort.error(
        "SectionShadowInteractionService: sectionData not found at handleSectionShadowSelected."
      );
      return;
    }

    this.#sequenceStateServicePort.executeAsSequence(() =>
      this.#sectionSelectionServicePort.deselect(sectionData)
    );
  }
}
