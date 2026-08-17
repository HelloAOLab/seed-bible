import type { TabernaclePieceKey } from "./piece";

export const EXPERIENCE_KEYS = {
  TABERNACLE: "tabernacle",
} as const;

export type ExperienceKey =
  (typeof EXPERIENCE_KEYS)[keyof typeof EXPERIENCE_KEYS];

export type ExperienceKeyMap = {
  [EXPERIENCE_KEYS.TABERNACLE]: TabernaclePieceKey;
};
