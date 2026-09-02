import type { PieceHighlightPort } from "../ports/in/PieceHighlight";
import type { NavMenuStatePort } from "../ports/in/NavMenuState";

interface ServiceParams {
  pieceHighlight: PieceHighlightPort;
  navMenuStatePort: NavMenuStatePort;
}

export class EnvironmentInteractionService {
  #pieceHighlight: ServiceParams["pieceHighlight"];
  #navMenuStatePort: ServiceParams["navMenuStatePort"];

  constructor({ pieceHighlight, navMenuStatePort }: ServiceParams) {
    this.#pieceHighlight = pieceHighlight;
    this.#navMenuStatePort = navMenuStatePort;
  }

  handleBlur(): void {
    this.#pieceHighlight.stopHighlight();
    this.#navMenuStatePort.clearSelection();
  }
}
