import type { TabernaclePieceKey, SolomonTemplePieceKey } from "./pieceKeys";

// Duplicate of EXPERIENCE_KEYS in patterns/house-of-the-lord/.../domain/models/experience.tsx — separate runtimes, keep in sync.
export const EXPERIENCE_KEYS = {
  TABERNACLE: "tabernacle",
  SOLOMON_TEMPLE: "solomon-temple",
} as const;

export type ExperienceKey =
  (typeof EXPERIENCE_KEYS)[keyof typeof EXPERIENCE_KEYS];

export type ExperienceKeyMap = {
  [EXPERIENCE_KEYS.TABERNACLE]: TabernaclePieceKey;
  [EXPERIENCE_KEYS.SOLOMON_TEMPLE]: SolomonTemplePieceKey;
};

export type AnyPieceKey = ExperienceKeyMap[ExperienceKey];
