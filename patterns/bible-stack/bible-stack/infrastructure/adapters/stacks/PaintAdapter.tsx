import type { PaintAdapterPort } from "../../../application/ports/out/Paint";
import type { PaintablePieceData } from "../../../domain/models/pieces";
import { SetStrictTag } from "../../functions/casualos";
import type { PieceMapper } from "../../mappers/PieceMapper";
import type { VisualStateRegistry } from "./VisualStateRegistry";

interface AdapterParams {
  pieceMapper: PieceMapper;
  visualStateRegistry: VisualStateRegistry;
}

export class PaintAdapter implements PaintAdapterPort {
  #pieceMapper: AdapterParams["pieceMapper"];
  #visualStateRegistry: AdapterParams["visualStateRegistry"];

  constructor({ pieceMapper, visualStateRegistry }: AdapterParams) {
    this.#pieceMapper = pieceMapper;
    this.#visualStateRegistry = visualStateRegistry;
  }
  paint(piece: NonNullable<PaintablePieceData["piece"]>, color: string): void {
    const bot = this.#pieceMapper.toInfrastructure(piece);
    if (!bot) {
      throw new Error("PaintAdapter: bot not found at paint");
    }
    SetStrictTag(bot, "color", color);
  }
  unpaint(piece: NonNullable<PaintablePieceData["piece"]>): void {
    const initialColor = this.#visualStateRegistry.getStateProperty({
      piece,
      property: "initialColor",
    });
    const bot = this.#pieceMapper.toInfrastructure(piece);
    if (!bot) {
      throw new Error("PaintAdapter: bot not found at paint");
    }
    SetStrictTag(bot, "color", initialColor);
  }
}
