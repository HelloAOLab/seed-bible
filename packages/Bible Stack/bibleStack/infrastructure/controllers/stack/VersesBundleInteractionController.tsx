import type { VersesBundleInteractionServicePort } from "bibleStack.application.ports.versesBundle";
import type { PieceMapperPort } from "bibleStack.infrastructure.ports.versesBundleInteraction";
import type { VersesBundleBot } from "bibleStack.models.stack";

interface ControllerParams {
  versesBundleInteractionServicePort: VersesBundleInteractionServicePort;
  pieceMapperPort: PieceMapperPort;
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
    this.#versesBundleInteractionServicePort.handleVersesBundleFocusBegin(
      piece
    );
  }

  handleVersesBundlePointerExit(bundle: VersesBundleBot) {
    const piece = this.#pieceMapperPort.toDomain(bundle);
    this.#versesBundleInteractionServicePort.handleVersesBundleFocusEnd(piece);
  }
}
