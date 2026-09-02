import type { PieceKey } from "../../domain/models/piece";
import type { NavMenuStatePort } from "../ports/in/NavMenuState";
import type { PieceFocusPort } from "../ports/in/PieceFocus";
import type { PieceHighlightPort } from "../ports/in/PieceHighlight";
import type { PieceStatePort } from "../ports/in/PieceState";

interface ServiceParams {
  pieceHighlightPort: PieceHighlightPort;
  navMenuStatePort: NavMenuStatePort;
  pieceStatePort: PieceStatePort;
}
export class PieceFocusService implements PieceFocusPort {
  #pieceHighlightPort: ServiceParams["pieceHighlightPort"];
  #navMenuStatePort: ServiceParams["navMenuStatePort"];
  #pieceStatePort: ServiceParams["pieceStatePort"];

  constructor({
    pieceHighlightPort,
    navMenuStatePort,
    pieceStatePort,
  }: ServiceParams) {
    this.#pieceHighlightPort = pieceHighlightPort;
    this.#navMenuStatePort = navMenuStatePort;
    this.#pieceStatePort = pieceStatePort;
  }

  focus(key: PieceKey): void {
    this.#pieceHighlightPort.highlight(key);
    this.#navMenuStatePort.open();
    this.#navMenuStatePort.selectPiece(key);
  }

  clearFocus(): void {
    this.#pieceHighlightPort.stopHighlight();
    this.#pieceStatePort.showAll();
    this.#navMenuStatePort.clearSelection();
  }
}
