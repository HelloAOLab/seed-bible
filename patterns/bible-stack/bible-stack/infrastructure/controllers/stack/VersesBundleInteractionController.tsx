import type { VersesBundleInteractionServicePort } from "../../../application/ports/in/VersesBundleInteraction";
import type { PieceMapper } from "../../mappers/PieceMapper";
import type { VersesBundleBot } from "../../models/stack";

interface ControllerParams {
  versesBundleInteractionServicePort: VersesBundleInteractionServicePort;
  pieceMapperPort: PieceMapper;
}

export class VersesBundleInteractionController {
  #versesBundleInteractionServicePort: ControllerParams["versesBundleInteractionServicePort"];
  #pieceMapperPort: ControllerParams["pieceMapperPort"];

  constructor({
    versesBundleInteractionServicePort,
    pieceMapperPort,
  }: ControllerParams) {
    this.#versesBundleInteractionServicePort =
      versesBundleInteractionServicePort;
    this.#pieceMapperPort = pieceMapperPort;
  }

  handleBundleClick(bundle: VersesBundleBot) {
    const piece = this.#pieceMapperPort.toDomain(bundle);
    this.#versesBundleInteractionServicePort.handleBundleSelection(piece);
  }

  handleVersesBundlePointerEnter(bundle: VersesBundleBot) {
    const piece = this.#pieceMapperPort.toDomain(bundle);
    this.#versesBundleInteractionServicePort.handleBundleFocusBegin(piece);
  }

  handleVersesBundlePointerExit(bundle: VersesBundleBot) {
    const piece = this.#pieceMapperPort.toDomain(bundle);
    this.#versesBundleInteractionServicePort.handleBundleFocusEnd(piece);
  }
}
