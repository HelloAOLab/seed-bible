import type { PieceMapperPort } from "bibleStack.application.ports.verses";
import type { VersesInteractionServicePort } from "bibleStack.application.ports.in.VersesInteraction";
import type { VerseBot } from "bibleStack.models.stack";

interface ControllerParams {
  versesInteractionServicePort: VersesInteractionServicePort;
  pieceMapperPort: PieceMapperPort;
}

export class VerseInteractionController {
  #versesInteractionServicePort: ControllerParams["versesInteractionServicePort"];
  #pieceMapperPort: ControllerParams["pieceMapperPort"];

  constructor({
    versesInteractionServicePort,
    pieceMapperPort,
  }: ControllerParams) {
    this.#versesInteractionServicePort = versesInteractionServicePort;
    this.#pieceMapperPort = pieceMapperPort;
  }

  handleVerseClick(verse: VerseBot) {
    const piece = this.#pieceMapperPort.toDomain(verse);
    if (!piece) {
      throw new Error(
        `VerseInteractionController: piece not found at handleVerseClick`
      );
    }
    this.#versesInteractionServicePort.handleVerseSelection(piece);
  }
}
