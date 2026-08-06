import type { SectionShadow } from "../../domain/models/canvas";
import type { SectionSelectionServicePort } from "../ports/in/SectionSelection";
import type { SectionShadowInteractionPort } from "../ports/in/SectionShadowInteraction";
import type { SequenceStateServicePort } from "../ports/in/SequenceState";
import type { PieceDataRepositoryPort } from "../ports/out/SectionShadowInteraction";

interface ServiceParams {
  pieceDataRepositoryPort: PieceDataRepositoryPort;
  sectionSelectionServicePort: SectionSelectionServicePort;
  sequenceStateServicePort: SequenceStateServicePort;
}

export class SectionShadowInteractionService implements SectionShadowInteractionPort {
  #pieceDataRepositoryPort: ServiceParams["pieceDataRepositoryPort"];
  #sectionSelectionServicePort: ServiceParams["sectionSelectionServicePort"];
  #sequenceStateServicePort: ServiceParams["sequenceStateServicePort"];

  constructor({
    pieceDataRepositoryPort,
    sectionSelectionServicePort,
    sequenceStateServicePort,
  }: ServiceParams) {
    this.#pieceDataRepositoryPort = pieceDataRepositoryPort;
    this.#sectionSelectionServicePort = sectionSelectionServicePort;
    this.#sequenceStateServicePort = sequenceStateServicePort;
  }

  handleSectionShadowSelected(shadow: SectionShadow) {
    if (this.#sequenceStateServicePort.isThereAnOngoingSequence()) {
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
