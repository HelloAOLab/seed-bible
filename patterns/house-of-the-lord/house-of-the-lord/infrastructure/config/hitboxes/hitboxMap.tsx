import {
  EXPERIENCE_KEYS,
  type ExperienceKey,
  type ExperienceKeyMap,
} from "../../../domain/models/experience";
import type { HitboxData } from "../../../domain/models/hitbox";
import { TABERNACLE_PIECE_KEYS } from "../../../domain/models/piece";

export type HitboxMap = {
  [E in ExperienceKey]: {
    [K in ExperienceKeyMap[E]]?: HitboxData;
  };
};

export const HITBOX_MAP: HitboxMap = {
  [EXPERIENCE_KEYS.TABERNACLE]: {
    [TABERNACLE_PIECE_KEYS.ALTAR_OF_SACRIFICE]: {
      position: { x: 0, y: 0, z: -0.5 },
      scaleX: 1,
      scaleY: 0.65,
      scaleZ: 0.25,
    },
    [TABERNACLE_PIECE_KEYS.ARK_OF_COVENANT]: {
      position: { x: 0, y: 0, z: -0.5 },
      scaleX: 0.65,
      scaleY: 0.4,
      scaleZ: 0.57,
    },
    [TABERNACLE_PIECE_KEYS.BARS]: {
      position: { x: 0, y: 0, z: -0.5 },
      scaleX: 1,
      scaleY: 0.3,
      scaleZ: 0.2,
    },
    [TABERNACLE_PIECE_KEYS.BRONZE_LAVER]: {
      position: { x: 0, y: 0, z: -0.5 },
      scaleX: 0.9,
      scaleY: 0.9,
      scaleZ: 0.57,
      form: "hex",
    },
    [TABERNACLE_PIECE_KEYS.BROWN_CURTAIN]: {
      position: { x: 0, y: 0, z: -0.49 },
      scaleX: 1,
      scaleY: 0.35,
      scaleZ: 0.26,
    },
    [TABERNACLE_PIECE_KEYS.FRONT_CURTAIN]: {
      position: { x: 0, y: 0, z: -0.5 },
      scaleX: 0.05,
      scaleY: 0.85,
      scaleZ: 1,
    },
    [TABERNACLE_PIECE_KEYS.FRONT_PILLARS]: {
      position: { x: -0.005, y: 0, z: -0.5 },
      scaleX: 0.07,
      scaleY: 0.94,
      scaleZ: 1,
    },
    [TABERNACLE_PIECE_KEYS.GREY_CURTAIN]: {
      position: { x: 0, y: 0, z: -0.5 },
      scaleX: 1,
      scaleY: 0.6,
      scaleZ: 0.25,
    },
    [TABERNACLE_PIECE_KEYS.INCENSE_ALTAR]: {
      position: { x: 0, y: 0, z: -0.52 },
      scaleX: 0.45,
      scaleY: 0.45,
      scaleZ: 0.73,
    },
    [TABERNACLE_PIECE_KEYS.INNER_CURTAIN]: {
      position: { x: 0, y: 0, z: -0.5 },
      scaleX: 0.04,
      scaleY: 0.79,
      scaleZ: 1,
    },
    [TABERNACLE_PIECE_KEYS.INNER_PILLARS]: {
      position: { x: -0.005, y: 0, z: -0.5 },
      scaleX: 0.07,
      scaleY: 0.89,
      scaleZ: 1,
    },
    [TABERNACLE_PIECE_KEYS.MENORAH]: {
      position: { x: 0, y: 0, z: -0.5 },
      scaleX: 0.7,
      scaleY: 0.3,
      scaleZ: 1,
    },
    [TABERNACLE_PIECE_KEYS.PURPLE_CURTAIN]: {
      position: { x: 0.015, y: 0, z: -0.5 },
      scaleX: 0.97,
      scaleY: 0.29,
      scaleZ: 0.25,
    },
    [TABERNACLE_PIECE_KEYS.RED_CURTAIN]: {
      position: { x: 0, y: 0, z: -0.5 },
      scaleX: 0.97,
      scaleY: 0.6,
      scaleZ: 0.3,
    },
    [TABERNACLE_PIECE_KEYS.RINGS]: {
      position: { x: 0, y: 0, z: -0.5 },
      scaleX: 1,
      scaleY: 0.31,
      scaleZ: 0.22,
    },
    [TABERNACLE_PIECE_KEYS.TABLE_OF_SHOWBREAD]: {
      position: { x: 0, y: 0, z: -0.51 },
      scaleX: 0.59,
      scaleY: 0.3,
      scaleZ: 0.45,
    },
    [TABERNACLE_PIECE_KEYS.WALLS]: {
      position: { x: 0, y: 0, z: -0.5 },
      scaleX: 1,
      scaleY: 0.3,
      scaleZ: 0.32,
    },
  },
};
