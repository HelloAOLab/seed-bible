import {
  EXPERIENCE_KEYS,
  type ExperienceKey,
  type ExperienceKeyMap,
} from "../../../domain/models/experience";

export interface CameraFramingOverride {
  zoom?: number;
  rotation?: {
    polar?: number;
    azimuth?: number;
  };
}

export const CAMERA_FRAMING_MAP: {
  [E in ExperienceKey]: {
    [K in ExperienceKeyMap[E]]?: CameraFramingOverride;
  };
} = {
  [EXPERIENCE_KEYS.TABERNACLE]: {
    "brown-curtain": { zoom: 15 },
    "purple-curtain": { zoom: 15 },
    "red-curtain": { zoom: 15 },
    "grey-curtain": { zoom: 15 },
    "altar-of-sacrifice": { zoom: 35 },
    ground: { zoom: 8.5 },
    fence: { zoom: 8.5 },
    walls: { zoom: 20 },
    bars: { zoom: 20 },
    rings: { zoom: 20 },
  },
};
