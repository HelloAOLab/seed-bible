import type { Point3D } from "../../../domain/models/commonTypes";
import type {
  ExperienceKey,
  ExperienceKeyMap,
} from "../../../domain/models/experience";

export interface PiecePositionProviderPort {
  getPiecePosition<E extends ExperienceKey>(
    experienceKey: E,
    pieceKey: ExperienceKeyMap[E]
  ): Point3D;
}
