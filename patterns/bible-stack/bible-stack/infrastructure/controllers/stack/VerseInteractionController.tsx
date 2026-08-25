import type { VersesInteractionServicePort } from "../../../application/ports/in/VersesInteraction";
import type { PieceMapper } from "../../mappers/PieceMapper";
import type { VerseBot } from "../../models/stack";

interface ControllerParams {
  versesInteractionServicePort: VersesInteractionServicePort;
  pieceMapperPort: PieceMapper;
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
