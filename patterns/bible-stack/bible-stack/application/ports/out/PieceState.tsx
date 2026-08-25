import type { StackChapterData } from "../../../domain/entities/StackChapterData";
import type { Piece, PieceDataMap } from "../../../domain/models/canvas";

export interface PieceDataRepositoryPort {
  getPieceData: <K extends keyof PieceDataMap>(
    piece: Piece<K>
  ) => PieceDataMap[K] | undefined;
}

export interface ActivityIndicatorsAdapterPort {
  updateIndicatorsPosition: (container: StackChapterData) => void;
}

export interface ActivityNotificationAdapterPort {
  updateNotificationPosition: (container: StackChapterData) => void;
}
