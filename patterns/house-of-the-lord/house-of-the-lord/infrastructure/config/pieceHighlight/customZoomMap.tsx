import {
  EXPERIENCE_KEYS,
  type ExperienceKey,
  type ExperienceKeyMap,
} from "../../../domain/models/experience";

export const CUSTOM_ZOOM_MAP: {
  [E in ExperienceKey]: Partial<Record<ExperienceKeyMap[E], number>>;
} = {
  [EXPERIENCE_KEYS.TABERNACLE]: {
    "brown-curtain": 20,
    "purple-curtain": 20,
    "red-curtain": 20,
    "grey-curtain": 20,
    "altar-of-sacrifice": 35,
    ground: 10,
    fence: 10,
    walls: 25,
    bars: 25,
    rings: 25,
  },
};
