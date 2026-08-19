import type { Point3D } from "../../../domain/models/commonTypes";
import type { PiecePositionProviderPort } from "../../../application/ports/out/piecePosition";
import { POSITIONS_MAP } from "./positionsMap";
import type {
  ExperienceKey,
  ExperienceKeyMap,
} from "../../../domain/models/experience";

export class PiecePositionConfigProvider implements PiecePositionProviderPort {
  getPiecePosition<E extends ExperienceKey>(
    experienceKey: E,
    pieceKey: ExperienceKeyMap[E]
  ): Point3D {
    return POSITIONS_MAP[experienceKey][pieceKey];
  }
}
