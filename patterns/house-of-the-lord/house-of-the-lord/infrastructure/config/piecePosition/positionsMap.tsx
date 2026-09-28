import type { Point3D } from "../../../domain/models/commonTypes";
import type {
  ExperienceKey,
  ExperienceKeyMap,
} from "../../../domain/models/experience";
import { EXPERIENCE_KEYS } from "../../../domain/models/experience";
import { TABERNACLE_PIECE_KEYS } from "../../../domain/models/piece";

type PositionsMap = {
  [E in ExperienceKey]: {
    [K in ExperienceKeyMap[E]]: Point3D;
  };
};

export const POSITIONS_MAP: PositionsMap = {
  [EXPERIENCE_KEYS.TABERNACLE]: {
    [TABERNACLE_PIECE_KEYS.ALTAR_OF_SACRIFICE]: { x: 8.26, y: 0, z: -1.695 },
    [TABERNACLE_PIECE_KEYS.ARK_OF_COVENANT]: { x: -7.48, y: 0, z: -0.28 },
    [TABERNACLE_PIECE_KEYS.BARS]: { x: -4.853, y: 0.15, z: -3.07 },
    [TABERNACLE_PIECE_KEYS.BRONZE_LAVER]: { x: 3.3, y: 0, z: -0.2 },
    [TABERNACLE_PIECE_KEYS.BROWN_CURTAIN]: { x: -4.9, y: 0.249, z: -3.9 },
    [TABERNACLE_PIECE_KEYS.FENCE]: { x: 0, y: 0, z: -14.3 },
    [TABERNACLE_PIECE_KEYS.FRONT_CURTAIN]: { x: -0.02, y: 0, z: 0 },
    [TABERNACLE_PIECE_KEYS.FRONT_PILLARS]: { x: 0.104, y: 0.15, z: 0 },
    [TABERNACLE_PIECE_KEYS.GREY_CURTAIN]: { x: -4.9, y: 0.18, z: -3.96 },
    [TABERNACLE_PIECE_KEYS.GROUND]: { x: 0, y: 0, z: -15 },
    [TABERNACLE_PIECE_KEYS.INCENSE_ALTAR]: { x: -5.1, y: 0, z: -0.1 },
    [TABERNACLE_PIECE_KEYS.INNER_CURTAIN]: { x: -6.16, y: 0.16, z: 0 },
    [TABERNACLE_PIECE_KEYS.INNER_PILLARS]: { x: -6.036, y: 0.134, z: 0 },
    [TABERNACLE_PIECE_KEYS.MENORAH]: { x: -3.1, y: -0.85, z: 0 },
    [TABERNACLE_PIECE_KEYS.PURPLE_CURTAIN]: { x: -4.66, y: 0.15, z: -3.59 },
    [TABERNACLE_PIECE_KEYS.RED_CURTAIN]: { x: -4.7, y: 0.15, z: -3.85 },
    [TABERNACLE_PIECE_KEYS.RINGS]: { x: -4.88, y: 0.15, z: -3.05 },
    [TABERNACLE_PIECE_KEYS.TABLE_OF_SHOWBREAD]: { x: -3.05, y: 1.1, z: -0.4 },
    [TABERNACLE_PIECE_KEYS.WALLS]: { x: -4.75, y: 0.15, z: -3.23 },
  },
};
