import type { Piece } from "../../domain/models/canvas";
import type { ReadingInstance } from "../../domain/models/userPresence";

export interface PresenceProviderPort {
  getActiveTab(): ReadingInstance | undefined;
}

export interface DimensionProviderPort {
  getDimension(): string;
}

export interface PieceAdapterPort {
  isPieceBeingUsed(piece: Piece): boolean;
}

export interface AwaiterPort {
  sleep(ms: number): Promise<void>;
}
