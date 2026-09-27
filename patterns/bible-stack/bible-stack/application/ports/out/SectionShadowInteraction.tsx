import type { PieceDataMap } from "../../../domain/models/canvas";

export interface PieceDataRepositoryPort {
  getDataById: <K extends "StackSection">(params: {
    type: K;
    id: PieceDataMap[K]["id"];
  }) => PieceDataMap[K] | undefined;
}
