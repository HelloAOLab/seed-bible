import type { Piece, PieceDataMap } from "../../../domain/models/canvas";

export interface PieceDataRepositoryPort {
  getPieceData: <K extends keyof PieceDataMap>(
    piece: Piece<K>
  ) => PieceDataMap[K] | undefined;
}
