import { type BiblePieceType } from "bibleVizUtils.domain.models.canvas";
import type {
  GetPieceData,
  PieceDataMap,
  GetPieceDataParams,
  GetAllPiecesDataByType,
} from "bibleVizUtils.domain.models.pieceData";

export class PieceDataRegistry {
  #providers = new Map<
    BiblePieceType,
    {
      getPieceData: GetPieceData;
      getAllPiecesDataByType: GetAllPiecesDataByType;
    }
  >();

  registerProvider(
    typeOfPiece: BiblePieceType,
    providerGetPieceData: GetPieceData,
    providerGetAllPiecesDataByType: GetAllPiecesDataByType
  ): void {
    this.#providers.set(typeOfPiece, {
      getPieceData: providerGetPieceData,
      getAllPiecesDataByType: providerGetAllPiecesDataByType,
    });
  }

  getPieceData<T extends keyof PieceDataMap>(
    getDataParams: GetPieceDataParams<T>
  ): PieceDataMap[T] {
    if (!getDataParams.pieceType) {
      throw new Error(`PieceDataRegistry: typeOfPiece not defined`);
    }

    const provider = this.#providers.get(getDataParams.pieceType);

    if (!provider) {
      throw new Error(
        `PieceDataRegistry: No PieceData provider registered for typeOfPiece: ${getDataParams.pieceType}`
      );
    }

    return provider.getPieceData(getDataParams);
  }

  getAllPiecesDataByType<T extends keyof PieceDataMap>(
    type: T
  ): PieceDataMap[T][] {
    const provider = this.#providers.get(type);

    if (!provider) {
      return [];
    }

    return provider.getAllPiecesDataByType(type);
  }
}
