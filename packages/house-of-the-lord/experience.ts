import type { TabernaclePieceKey } from "./pieceKeys";

export const EXPERIENCE_KEYS = {
  TABERNACLE: "tabernacle",
} as const;

export type ExperienceKey =
  (typeof EXPERIENCE_KEYS)[keyof typeof EXPERIENCE_KEYS];

export type ExperienceKeyMap = {
  [EXPERIENCE_KEYS.TABERNACLE]: TabernaclePieceKey;
};

export type AnyPieceKey = ExperienceKeyMap[ExperienceKey];
