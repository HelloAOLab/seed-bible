import type {
  VersesInteractionServicePort,
  SequenceStateServicePort,
} from "bibleStack.application.ports.verses";
import type { Piece } from "bibleVizUtils.domain.models.canvas";

interface ServiceParams {
  sequenceStateServicePort: SequenceStateServicePort;
}

export class VersesInteractionService implements VersesInteractionServicePort {
  #sequenceStateServicePort: ServiceParams["sequenceStateServicePort"];

  constructor({ sequenceStateServicePort }: ServiceParams) {
    this.#sequenceStateServicePort = sequenceStateServicePort;
  }

  handleVerseSelection(verse: Piece<"Verse">) {
    if (this.#sequenceStateServicePort.isThereAnOngoingSequence()) return;

    if (BibleVizUtils.Data.masks.isHighlightToolEnabled) {
      // TODO: Refactor this to its own service/adapter
      BibleVizUtils.Functions.HighlightBiblePiece({ piece: verse });
    } else {
      // Open verse at seed bible?
    }
  }
}
