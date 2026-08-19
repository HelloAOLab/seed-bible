import type { TabernaclePieceKey, SolomonTemplePieceKey } from "./pieceKeys";

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
