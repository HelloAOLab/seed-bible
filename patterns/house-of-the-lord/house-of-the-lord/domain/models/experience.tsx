import { TABERNACLE_PIECE_KEYS, type TabernaclePieceKey } from "./piece";

// EXPERIENCE_KEYS duplicated in packages/house-of-the-lord/experience.ts — separate runtimes, keep in sync.
export const EXPERIENCE_KEYS = {
  TABERNACLE: "tabernacle",
} as const;

export type ExperienceKey =
  (typeof EXPERIENCE_KEYS)[keyof typeof EXPERIENCE_KEYS];

export type ExperienceKeyMap = {
  [EXPERIENCE_KEYS.TABERNACLE]: TabernaclePieceKey;
};

/**
 * Runtime companion to `ExperienceKeyMap`, derived from the key objects rather
 * than listed again — a hand-written copy is what goes stale when a piece is
 * added, and the symptom is a valid piece being rejected as unknown.
 */
export const EXPERIENCE_PIECE_KEYS: {
  [E in ExperienceKey]: readonly ExperienceKeyMap[E][];
} = {
  [EXPERIENCE_KEYS.TABERNACLE]: Object.values(TABERNACLE_PIECE_KEYS),
};
