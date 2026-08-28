export const VFX_PIECE_KEYS = {
  CONE: "cone",
  GLOW: "glow",
} as const;

export type VFXPieceKey = (typeof VFX_PIECE_KEYS)[keyof typeof VFX_PIECE_KEYS];
