import type { Piece } from "../../../domain/models/canvas";

export interface PieceAdapterPort {
  makeInteractable(piece: Piece<"StackBook" | "StackSectionBook">): void;
  makeNonInteractable(piece: Piece<"StackBook" | "StackSectionBook">): void;
}
