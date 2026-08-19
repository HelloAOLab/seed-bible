// import type { Point3D } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/models/commonTypes";
import type { PiecePositionUpdaterPort } from "../../../application/ports/out/piecePosition";
import type { Piece } from "../../../domain/models/piece";
import type { Vector3 } from "../../../../../pattern-typings/AuxLibraryDefinitions";
import type { PieceMapper } from "../../mappers/PieceMapper";
// import type { Piece } from "../../domain/models/piece";

interface AdapterParams {
  pieceMapper: PieceMapper;
  getDimension: () => string;
}

export class PieceAdapter implements PiecePositionUpdaterPort {
  #pieceMapper: AdapterParams["pieceMapper"];
  #getDimension: AdapterParams["getDimension"];

  constructor({ pieceMapper, getDimension }: AdapterParams) {
    this.#pieceMapper = pieceMapper;
    this.#getDimension = getDimension;
  }

  setPosition(piece: Piece, position: Vector3) {
    const bot = this.#pieceMapper.toInfrastructure(piece);
    if (!bot) {
      throw new Error("PieceAdapter: bot not found at ");
    }
    const dimension = this.#getDimension();

    applyMod(bot, {
      [dimension + "X"]: position.x,
      [dimension + "Y"]: position.y,
      [dimension + "Z"]: position.z,
    });
  }
}
