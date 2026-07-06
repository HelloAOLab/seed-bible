import type { PiecesProviderPort } from "tabernacle.application.ports.out.piecePosition";
import type { Piece, PieceKey } from "../../domain/models/piece";

interface ProviderParams {
  piecesMap: { [K in PieceKey]: Piece<K> };
}

export class PiecesProvider implements PiecesProviderPort {
  #piecesMap: ProviderParams["piecesMap"];

  constructor({ piecesMap }: ProviderParams) {
    this.#piecesMap = piecesMap;
  }

  getAllPieces(): Piece[] {
    return Object.values(this.#piecesMap);
  }

  getPiece<K extends PieceKey>(key: K): Piece<K> {
    return this.#piecesMap[key];
  }
}
