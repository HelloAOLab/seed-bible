import type { TabernaclePieceKey } from "./piece";

// EXPERIENCE_KEYS duplicated in packages/house-of-the-lord/experience.ts — separate runtimes, keep in sync.
export const EXPERIENCE_KEYS = {
  TABERNACLE: "tabernacle",
} as const;

export type ExperienceKey =
  (typeof EXPERIENCE_KEYS)[keyof typeof EXPERIENCE_KEYS];

export type ExperienceKeyMap = {
  [EXPERIENCE_KEYS.TABERNACLE]: TabernaclePieceKey;
};
