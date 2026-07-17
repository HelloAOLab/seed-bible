import type { CrossLineBot } from "../../models/stack";
import type { PieceMapperPort } from "../../mappers/PieceMapper";

interface ControllerParams {
  pieceMapperPort: PieceMapperPort;
}

export class CrossLineInteractionController {
  #pieceMapperPort: ControllerParams["pieceMapperPort"];

  constructor({ pieceMapperPort }: ControllerParams) {
    this.#pieceMapperPort = pieceMapperPort;
  }

  handleCrossLinePointerDown(crossLine: CrossLineBot) {
    const piece = this.#pieceMapperPort.toDomain(crossLine);
    // TODO: drive the stack-viz toggle service (not defined yet).
  }

  handleCrossLinePointerUp(crossLine: CrossLineBot) {
    const piece = this.#pieceMapperPort.toDomain(crossLine);
    // TODO: stop the stack-viz toggle (not defined yet).
  }
}
