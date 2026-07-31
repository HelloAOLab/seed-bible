import type {
  DimensionProviderPort,
  PiecesProviderPort,
  PiecePositionUpdaterPort,
  PiecePositionProviderPort,
} from "tabernacle.application.ports.out.piecePosition";
import type { UpdatePiecesPositionPort } from "tabernacle.application.ports.in.piecePosition";

interface ServiceParams {
  piecesProviderPort: PiecesProviderPort;
  dimensionProviderPort: DimensionProviderPort;
  piecePositionUpdaterPort: PiecePositionUpdaterPort;
  piecePositionProviderPort: PiecePositionProviderPort;
}

export class PiecePositionService implements UpdatePiecesPositionPort {
  #piecesProviderPort: ServiceParams["piecesProviderPort"];
  #dimensionProviderPort: ServiceParams["dimensionProviderPort"];
  #piecePositionUpdaterPort: ServiceParams["piecePositionUpdaterPort"];
  #piecePositionProviderPort: ServiceParams["piecePositionProviderPort"];

  constructor({
    piecesProviderPort,
    dimensionProviderPort,
    piecePositionUpdaterPort,
    piecePositionProviderPort,
  }: ServiceParams) {
    this.#piecesProviderPort = piecesProviderPort;
    this.#dimensionProviderPort = dimensionProviderPort;
    this.#piecePositionUpdaterPort = piecePositionUpdaterPort;
    this.#piecePositionProviderPort = piecePositionProviderPort;
  }

  updatePositions() {
    const pieces = this.#piecesProviderPort.getAllPieces();
    const dimension = this.#dimensionProviderPort.getDimension();
    const data = pieces.map((piece) => {
      return {
        piece,
        position: this.#piecePositionProviderPort.getPiecePosition(piece.key),
      };
    });
    this.#piecePositionUpdaterPort.updatePiecesPosition(data, dimension);
  }
}
