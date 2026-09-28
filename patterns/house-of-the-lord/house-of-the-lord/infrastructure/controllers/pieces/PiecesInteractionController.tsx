import type { PieceInteractionService } from "../../../application/services/PieceInteractionService";
import type { PieceKey } from "../../../domain/models/piece";

interface PiecesInteractionControllerParams {
  pieceInteractionService: PieceInteractionService;
}

export class PiecesInteractionController {
  #pieceInteractionService: PieceInteractionService;

  constructor({ pieceInteractionService }: PiecesInteractionControllerParams) {
    this.#pieceInteractionService = pieceInteractionService;
  }

  handlePieceClick(key: PieceKey): void {
    this.#pieceInteractionService.handlePieceSelection(key);
  }
}
