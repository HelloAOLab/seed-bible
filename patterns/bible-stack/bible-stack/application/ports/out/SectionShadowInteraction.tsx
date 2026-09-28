import type { StackPieceDataMap } from "../pieces";

export interface PieceDataRepositoryPort {
  getDataById: <K extends "StackSection">(params: {
    type: K;
    id: StackPieceDataMap[K]["id"];
  }) => StackPieceDataMap[K] | undefined;
}
