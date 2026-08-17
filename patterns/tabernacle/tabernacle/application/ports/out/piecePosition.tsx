import type { Point3D } from "../../../domain/models/commonTypes";
import type { Piece } from "../../../domain/models/piece";
import type {
  ExperienceKey,
  ExperienceKeyMap,
} from "../../../domain/models/experience";

export interface PiecesProviderPort {
  getPieces: <E extends ExperienceKey>(key: E) => Piece<ExperienceKeyMap[E]>[];
}

export interface PiecePositionUpdaterPort {
  setPosition(piece: Piece, position: Point3D): void;
}

export interface PiecePositionProviderPort {
  getPiecePosition<E extends ExperienceKey>(
    experienceKey: E,
    pieceKey: ExperienceKeyMap[E]
  ): Point3D;
}
