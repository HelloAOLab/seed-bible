import type { SequenceStateServicePort } from "../ports/verses";
import type { VersesInteractionServicePort } from "../ports/in/VersesInteraction";
import type { Piece } from "../../domain/models/canvas";
import type { PaintPort } from "../ports/in/Paint";

interface ServiceParams {
  sequenceStateServicePort: SequenceStateServicePort;
  paintPort: PaintPort;
}

export class VersesInteractionService implements VersesInteractionServicePort {
  #sequenceStateServicePort: ServiceParams["sequenceStateServicePort"];
  #paintPort: ServiceParams["paintPort"];

  constructor({ sequenceStateServicePort, paintPort }: ServiceParams) {
    this.#sequenceStateServicePort = sequenceStateServicePort;
    this.#paintPort = paintPort;
  }

  handleVerseSelection(verse: Piece<"Verse">) {
    if (this.#sequenceStateServicePort.isThereAnOngoingSequence()) return;

    if (this.#paintPort.isActive) {
      this.#paintPort.paint(verse);
    } else {
      // Open verse at seed bible?
    }
  }
}
