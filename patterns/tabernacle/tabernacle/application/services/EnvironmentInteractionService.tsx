import type { PieceHighlightPort } from "../../domain/ports/pieceHighlight";
import type { ContextMenuRendererPort } from "../../domain/ports/contextMenuRenderer";

interface EnvironmentInteractionServiceParams {
  pieceHighlight: PieceHighlightPort;
  contextMenu: ContextMenuRendererPort;
}

export class EnvironmentInteractionService {
  #pieceHighlight: PieceHighlightPort;
  #contextMenu: ContextMenuRendererPort;

  constructor({
    pieceHighlight,
    contextMenu,
  }: EnvironmentInteractionServiceParams) {
    this.#pieceHighlight = pieceHighlight;
    this.#contextMenu = contextMenu;
  }

  handleBlur(): void {
    this.#pieceHighlight.stopHighlight();
    this.#contextMenu.hideContextMenu();
  }
}
