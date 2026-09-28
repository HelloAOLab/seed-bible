import {
  EXPERIENCE_KEYS,
  type ExperienceKey,
  type ExperienceKeyMap,
} from "../../../domain/models/experience";
import type { HitboxData } from "../../../domain/models/hitbox";
import { TABERNACLE_PIECE_KEYS } from "../../../domain/models/piece";

export type HitboxMap = {
  [E in ExperienceKey]: {
    [K in ExperienceKeyMap[E]]?: HitboxData[];
  };
};

export const HITBOX_MAP: HitboxMap = {
  [EXPERIENCE_KEYS.TABERNACLE]: {
    [TABERNACLE_PIECE_KEYS.ALTAR_OF_SACRIFICE]: [
      {
        position: { x: 0, y: 0, z: -0.5 },
        scaleX: 1,
        scaleY: 0.65,
        scaleZ: 0.25,
      },
    ],
    [TABERNACLE_PIECE_KEYS.ARK_OF_COVENANT]: [
      {
        position: { x: 0, y: 0, z: -0.5 },
        scaleX: 0.65,
        scaleY: 0.4,
        scaleZ: 0.57,
      },
    ],
    [TABERNACLE_PIECE_KEYS.BARS]: [
      {
        position: { x: 0.016, y: 0.152, z: -0.4 },
        scaleX: 0.969,
        scaleY: 0.006,
        scaleZ: 0.013,
      },
      {
        position: { x: 0.016, y: 0.152, z: -0.45 },
        scaleX: 0.969,
        scaleY: 0.006,
        scaleZ: 0.013,
      },
      {
        position: { x: 0, y: 0.152, z: -0.5 },
        scaleX: 1,
        scaleY: 0.006,
        scaleZ: 0.013,
      },
      {
        position: { x: 0.016, y: 0.152, z: -0.55 },
        scaleX: 0.969,
        scaleY: 0.006,
        scaleZ: 0.013,
      },
      {
        position: { x: 0.016, y: 0.152, z: -0.6 },
        scaleX: 0.969,
        scaleY: 0.006,
        scaleZ: 0.013,
      },

      {
        position: { x: -0.498, y: -0.001, z: -0.4 },
        scaleX: 0.006,
        scaleY: 0.28,
        scaleZ: 0.013,
      },
      {
        position: { x: -0.498, y: -0.001, z: -0.45 },
        scaleX: 0.006,
        scaleY: 0.28,
        scaleZ: 0.013,
      },
      {
        position: { x: -0.498, y: -0.001, z: -0.5 },
        scaleX: 0.006,
        scaleY: 0.31,
        scaleZ: 0.013,
      },
      {
        position: { x: -0.498, y: -0.001, z: -0.55 },
        scaleX: 0.006,
        scaleY: 0.28,
        scaleZ: 0.013,
      },
      {
        position: { x: -0.498, y: -0.001, z: -0.6 },
        scaleX: 0.006,
        scaleY: 0.28,
        scaleZ: 0.013,
      },

      {
        position: { x: 0.016, y: -0.152, z: -0.4 },
        scaleX: 0.969,
        scaleY: 0.006,
        scaleZ: 0.013,
      },
      {
        position: { x: 0.016, y: -0.152, z: -0.45 },
        scaleX: 0.969,
        scaleY: 0.006,
        scaleZ: 0.013,
      },
      {
        position: { x: 0, y: -0.152, z: -0.5 },
        scaleX: 1,
        scaleY: 0.006,
        scaleZ: 0.013,
      },
      {
        position: { x: 0.016, y: -0.152, z: -0.55 },
        scaleX: 0.969,
        scaleY: 0.006,
        scaleZ: 0.013,
      },
      {
        position: { x: 0.016, y: -0.152, z: -0.6 },
        scaleX: 0.969,
        scaleY: 0.006,
        scaleZ: 0.013,
      },
    ],
    [TABERNACLE_PIECE_KEYS.BRONZE_LAVER]: [
      {
        position: { x: 0, y: 0, z: -0.5 },
        scaleX: 0.9,
        scaleY: 0.9,
        scaleZ: 0.57,
        form: "hex",
      },
    ],
    [TABERNACLE_PIECE_KEYS.BROWN_CURTAIN]: [
      {
        position: { x: 0.034, y: -0.01, z: -0.364 },
        scaleX: 0.91,
        scaleY: 0.28,
        scaleZ: 0.001,
      },
      {
        position: { x: 0.034, y: -0.15, z: -0.484 },
        scaleX: 0.91,
        scaleY: 0.001,
        scaleZ: 0.24,
      },
      {
        position: { x: 0.034, y: 0.13, z: -0.484 },
        scaleX: 0.91,
        scaleY: 0.001,
        scaleZ: 0.24,
      },
      {
        position: { x: -0.421, y: -0.01, z: -0.484 },
        scaleX: 0.001,
        scaleY: 0.28,
        scaleZ: 0.24,
      },
    ],
    [TABERNACLE_PIECE_KEYS.FRONT_CURTAIN]: [
      {
        position: { x: 0, y: -0.24, z: -0.88 },
        scaleX: 0.02,
        scaleY: 0.36,
        scaleZ: 0.2,
      },
      {
        position: { x: 0, y: -0.195, z: -0.68 },
        scaleX: 0.02,
        scaleY: 0.45,
        scaleZ: 0.2,
      },
      {
        position: { x: 0, y: -0.145, z: -0.48 },
        scaleX: 0.02,
        scaleY: 0.55,
        scaleZ: 0.2,
      },
      {
        position: { x: 0, y: -0.1, z: -0.28 },
        scaleX: 0.02,
        scaleY: 0.64,
        scaleZ: 0.2,
      },
      {
        position: { x: 0, y: 0, z: -0.1 },
        scaleX: 0.02,
        scaleY: 0.84,
        scaleZ: 0.16,
      },
    ],
    [TABERNACLE_PIECE_KEYS.FRONT_PILLARS]: [
      {
        position: { x: 0, y: -0.437, z: -0.5 },
        scaleX: 0.07,
        scaleY: 0.07,
        scaleZ: 1,
        form: "hex",
      },
      {
        position: { x: 0, y: -0.24, z: -0.5 },
        scaleX: 0.07,
        scaleY: 0.07,
        scaleZ: 1,
        form: "hex",
      },
      {
        position: { x: 0, y: 0.008, z: -0.5 },
        scaleX: 0.07,
        scaleY: 0.07,
        scaleZ: 1,
        form: "hex",
      },
      {
        position: { x: 0, y: 0.263, z: -0.5 },
        scaleX: 0.07,
        scaleY: 0.07,
        scaleZ: 1,
        form: "hex",
      },
      {
        position: { x: 0, y: 0.437, z: -0.5 },
        scaleX: 0.07,
        scaleY: 0.07,
        scaleZ: 1,
        form: "hex",
      },
    ],
    [TABERNACLE_PIECE_KEYS.GREY_CURTAIN]: [
      {
        position: { x: 0, y: -0.003, z: -0.364 },
        scaleX: 1,
        scaleY: 0.3,
        scaleZ: 0.001,
      },
      {
        position: { x: 0, y: -0.252, z: -0.5088 },
        scaleX: 1,
        scaleY: 0.001,
        scaleZ: 0.35,
        rotation: {
          x: -0.6,
          y: 0,
          z: 0,
        },
      },
      {
        position: { x: 0, y: 0.246, z: -0.5088 },
        scaleX: 1,
        scaleY: 0.001,
        scaleZ: 0.35,
        rotation: {
          x: 0.6,
          y: 0,
          z: 0,
        },
      },
    ],
    [TABERNACLE_PIECE_KEYS.INCENSE_ALTAR]: [
      {
        position: { x: 0, y: 0, z: -0.52 },
        scaleX: 0.45,
        scaleY: 0.45,
        scaleZ: 0.73,
      },
    ],
    [TABERNACLE_PIECE_KEYS.INNER_CURTAIN]: [
      {
        position: { x: 0, y: 0, z: -0.5 },
        scaleX: 0.04,
        scaleY: 0.79,
        scaleZ: 1,
      },
    ],
    [TABERNACLE_PIECE_KEYS.INNER_PILLARS]: [
      {
        position: { x: 0, y: -0.363, z: -0.5 },
        scaleX: 0.07,
        scaleY: 0.07,
        scaleZ: 1,
        form: "hex",
      },
      {
        position: { x: 0, y: -0.171, z: -0.5 },
        scaleX: 0.07,
        scaleY: 0.07,
        scaleZ: 1,
        form: "hex",
      },
      {
        position: { x: 0, y: 0.174, z: -0.5 },
        scaleX: 0.07,
        scaleY: 0.07,
        scaleZ: 1,
        form: "hex",
      },
      {
        position: { x: 0, y: 0.374, z: -0.5 },
        scaleX: 0.07,
        scaleY: 0.07,
        scaleZ: 1,
        form: "hex",
      },
    ],
    [TABERNACLE_PIECE_KEYS.MENORAH]: [
      {
        position: { x: 0, y: 0, z: -0.5 },
        scaleX: 0.7,
        scaleY: 0.3,
        scaleZ: 1,
      },
    ],
    [TABERNACLE_PIECE_KEYS.PURPLE_CURTAIN]: [
      {
        position: { x: 0.015, y: 0, z: -0.363 },
        scaleX: 0.97,
        scaleY: 0.29,
        scaleZ: 0.001,
      },
      {
        position: { x: 0.015, y: -0.145, z: -0.44 },
        scaleX: 0.97,
        scaleY: 0.001,
        scaleZ: 0.154,
      },
      {
        position: { x: 0.015, y: 0.145, z: -0.44 },
        scaleX: 0.97,
        scaleY: 0.001,
        scaleZ: 0.154,
      },
      {
        position: { x: -0.47, y: 0, z: -0.478 },
        scaleX: 0.001,
        scaleY: 0.29,
        scaleZ: 0.23,
      },
    ],
    [TABERNACLE_PIECE_KEYS.RED_CURTAIN]: [
      {
        position: { x: 0, y: 0, z: -0.353 },
        scaleX: 0.98,
        scaleY: 0.3,
        scaleZ: 0.001,
      },
      {
        position: { x: 0, y: -0.249, z: -0.498 },
        scaleX: 0.98,
        scaleY: 0.001,
        scaleZ: 0.35,
        rotation: { x: -0.6, y: 0, z: 0 },
      },
      {
        position: { x: 0, y: 0.249, z: -0.498 },
        scaleX: 0.98,
        scaleY: 0.001,
        scaleZ: 0.35,
        rotation: { x: 0.6, y: 0, z: 0 },
      },
    ],
    [TABERNACLE_PIECE_KEYS.RINGS]: [
      {
        position: { x: 0.019, y: 0.152, z: -0.4 },
        scaleX: 0.975,
        scaleY: 0.0066,
        scaleZ: 0.015,
      },
      {
        position: { x: 0.019, y: 0.152, z: -0.45 },
        scaleX: 0.975,
        scaleY: 0.0066,
        scaleZ: 0.015,
      },
      {
        position: { x: 0.003, y: 0.152, z: -0.5 },
        scaleX: 1.0056,
        scaleY: 0.0066,
        scaleZ: 0.015,
      },
      {
        position: { x: 0.019, y: 0.152, z: -0.55 },
        scaleX: 0.975,
        scaleY: 0.0066,
        scaleZ: 0.015,
      },
      {
        position: { x: 0.019, y: 0.152, z: -0.6 },
        scaleX: 0.975,
        scaleY: 0.0066,
        scaleZ: 0.015,
      },

      {
        position: { x: -0.498, y: -0.001, z: -0.4 },
        scaleX: 0.008,
        scaleY: 0.285,
        scaleZ: 0.015,
      },
      {
        position: { x: -0.498, y: -0.001, z: -0.45 },
        scaleX: 0.008,
        scaleY: 0.285,
        scaleZ: 0.015,
      },
      {
        position: { x: -0.498, y: -0.001, z: -0.5 },
        scaleX: 0.008,
        scaleY: 0.313,
        scaleZ: 0.015,
      },
      {
        position: { x: -0.498, y: -0.001, z: -0.55 },
        scaleX: 0.008,
        scaleY: 0.285,
        scaleZ: 0.015,
      },
      {
        position: { x: -0.498, y: -0.001, z: -0.6 },
        scaleX: 0.008,
        scaleY: 0.285,
        scaleZ: 0.015,
      },

      {
        position: { x: 0.019, y: -0.152, z: -0.4 },
        scaleX: 0.975,
        scaleY: 0.0066,
        scaleZ: 0.015,
      },
      {
        position: { x: 0.019, y: -0.152, z: -0.45 },
        scaleX: 0.975,
        scaleY: 0.0066,
        scaleZ: 0.015,
      },
      {
        position: { x: 0.003, y: -0.152, z: -0.5 },
        scaleX: 1.0056,
        scaleY: 0.0066,
        scaleZ: 0.015,
      },
      {
        position: { x: 0.019, y: -0.152, z: -0.55 },
        scaleX: 0.975,
        scaleY: 0.0066,
        scaleZ: 0.015,
      },
      {
        position: { x: 0.019, y: -0.152, z: -0.6 },
        scaleX: 0.975,
        scaleY: 0.0066,
        scaleZ: 0.015,
      },
    ],
    [TABERNACLE_PIECE_KEYS.TABLE_OF_SHOWBREAD]: [
      {
        position: { x: 0, y: 0, z: -0.51 },
        scaleX: 0.59,
        scaleY: 0.3,
        scaleZ: 0.45,
      },
    ],
    [TABERNACLE_PIECE_KEYS.WALLS]: [
      {
        position: { x: 0, y: 0.139, z: -0.5 },
        scaleX: 1,
        scaleY: 0.017,
        scaleZ: 0.32,
      },
      {
        position: { x: 0, y: -0.139, z: -0.5 },
        scaleX: 1,
        scaleY: 0.017,
        scaleZ: 0.32,
      },
      {
        position: { x: -0.4835, y: 0, z: -0.5 },
        scaleX: 0.034,
        scaleY: 0.295,
        scaleZ: 0.32,
      },
    ],
    [TABERNACLE_PIECE_KEYS.GROUND]: [
      // {
      //   position: { x: 0, y: 0, z: -0.5 },
      //   scaleX: 1,
      //   scaleY: 0.498,
      //   scaleZ: 0.0001,
      // }
    ],
    [TABERNACLE_PIECE_KEYS.FENCE]: [
      {
        position: { x: 0, y: -0.2445, z: -0.5 },
        scaleX: 1,
        scaleY: 0.008,
        scaleZ: 0.047,
      },
      {
        position: { x: 0, y: 0.2445, z: -0.5 },
        scaleX: 1,
        scaleY: 0.008,
        scaleZ: 0.047,
      },
      {
        position: { x: -0.4957, y: 0, z: -0.5 },
        scaleX: 0.0085,
        scaleY: 0.498,
        scaleZ: 0.047,
      },
      {
        position: { x: 0.4951, y: 0, z: -0.5 },
        scaleX: 0.0085,
        scaleY: 0.498,
        scaleZ: 0.047,
      },
    ],
  },
};
