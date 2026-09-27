import type { StackTestamentData } from "../../../domain/entities/StackTestamentData";
import type { Piece } from "../../../domain/models/canvas";
import type { StackUpdatePacing } from "../../../domain/models/stacks";

export interface TestamentSelectionAdapterPort {
  select: (
    data: StackTestamentData,
    pacing?: StackUpdatePacing | undefined
  ) => Promise<void>;
  // deselect: (data: StackTestamentData) => Promise<void>;
}

export interface AwaiterPort {
  sleep(ms: number): Promise<void>;
}

export interface PieceAdapterPort {
  makeInteractable(piece: Piece): void;
}

export interface TestamentSelectionPort {
  select(data: StackTestamentData, pacing?: StackUpdatePacing): Promise<void>;
}
