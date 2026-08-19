import type { ExperienceKey } from "../../../domain/models/experience";
import type { PiecesRenderOrderPort } from "../../../application/ports/out/piecesSetUp";
import type { LayerConfigProvider } from "../../config/layers/LayerConfigProvider";
import { SetStrictTag } from "../../functions/casualos";
import type { PieceMapper } from "../../mappers/PieceMapper";
import type { PiecesProvider } from "./PiecesProvider";

interface AdapterParams {
  layerConfigProvider: LayerConfigProvider;
  piecesProvider: PiecesProvider;
  pieceMapper: PieceMapper;
}

export class PiecesRenderOrderAdapter implements PiecesRenderOrderPort {
  #layerConfigProvider: AdapterParams["layerConfigProvider"];
  #piecesProvider: AdapterParams["piecesProvider"];
  #pieceMapper: AdapterParams["pieceMapper"];

  constructor({
    layerConfigProvider,
    piecesProvider,
    pieceMapper,
  }: AdapterParams) {
    this.#layerConfigProvider = layerConfigProvider;
    this.#piecesProvider = piecesProvider;
    this.#pieceMapper = pieceMapper;
  }

  setOrder(experience: ExperienceKey): void {
    const keys = this.#layerConfigProvider.getAllLayers(experience).flat();
    for (let i = 0; i < keys.length; i++) {
      const value = keys.length - i;
      const key = keys[i]!;
      const piece = this.#piecesProvider.getPiece(experience, key);
      const pieceBot = this.#pieceMapper.toInfrastructure(piece);
      if (!pieceBot) {
        throw new Error(
          "PiecesRenderOrderAdapter: pieceBot not found at setOrder"
        );
      }
      SetStrictTag(pieceBot, "formRenderOrder", value);
    }
  }
}
