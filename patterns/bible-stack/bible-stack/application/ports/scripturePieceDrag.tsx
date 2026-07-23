import type { Piece } from "../../domain/models/canvas";
import type { PieceDataRepositoryPort } from "./pieces";

export interface SequenceStateServicePort {
  isThereAnOngoingSequence: () => boolean;
}

export interface PieceAdapterPort {
  isPieceAnchored: (piece: Piece) => boolean;
}

export type ScripturePieceDataRepositoryPort = Pick<
  PieceDataRepositoryPort,
  "getPieceData"
>;
