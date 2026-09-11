import type { PiecePositionProviderPort } from "../ports/out/piecePosition";
import type { UpdatePiecesPositionPort } from "../ports/in/piecePosition";
import type { ExperienceKey } from "../../domain/models/experience";
import type { PiecesProviderAdapterPort } from "../ports/out/PiecesProviderAdapter";
import type { PieceAdapterPort } from "../ports/out/PieceAdapter";

interface ServiceParams {
  piecesProviderPort: PiecesProviderAdapterPort;
  piecePositionUpdaterPort: PieceAdapterPort;
  piecePositionProviderPort: PiecePositionProviderPort;
}

export class PiecePositionService implements UpdatePiecesPositionPort {
  #piecesProviderPort: ServiceParams["piecesProviderPort"];
  #piecePositionUpdaterPort: ServiceParams["piecePositionUpdaterPort"];
  #piecePositionProviderPort: ServiceParams["piecePositionProviderPort"];

  constructor({
    piecesProviderPort,
    piecePositionUpdaterPort,
    piecePositionProviderPort,
  }: ServiceParams) {
    this.#piecesProviderPort = piecesProviderPort;
    this.#piecePositionUpdaterPort = piecePositionUpdaterPort;
    this.#piecePositionProviderPort = piecePositionProviderPort;
  }

  updatePositions(experience: ExperienceKey) {
    const pieces = this.#piecesProviderPort.getPieces(experience);
    const data = pieces.map((piece) => {
      return {
        piece,
        position: this.#piecePositionProviderPort.getPiecePosition(
          experience,
          piece.key
        ),
      };
    });
    data.forEach(({ piece, position }) => {
      this.#piecePositionUpdaterPort.setPosition(piece, position);
    });
  }
}
